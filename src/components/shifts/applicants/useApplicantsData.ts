import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { handleSupabaseError } from '@/lib/error-handler';
import { computeCompatibilityScores } from '@/utils/compatibilityScore';
import { useAuthStore } from '@/stores/authStore';
import type { Shift, FreelancerApplication } from './types';

interface UseApplicantsDataParams {
    shiftId: string | null;
    isOpen: boolean;
}

export function useApplicantsData({ shiftId, isOpen }: UseApplicantsDataParams) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Helper: send employer confirmation email (best-effort)
    const sendEmployerConfirmation = async (workerName: string, workerType: 'employee' | 'freelancer', workerProfilePath: string, workerPhotoUrl?: string | null) => {
        logger.log('📧 sendEmployerConfirmation called', { workerName, workerType, userEmail: user?.email, hasShift: !!shift });
        if (!user?.email || !shift) return;
        try {
            const { data: fnData, error: fnError } = await supabase.functions.invoke('send-employer-acceptance-confirmation', {
                body: {
                    employer_email: user.email,
                    employer_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                    worker_name: workerName,
                    worker_type: workerType,
                    worker_photo_url: workerPhotoUrl || null,
                    worker_profile_path: workerProfilePath,
                    position_name: shift.position_name || '',
                    start_time: shift.start_time || '',
                    end_time: shift.end_time || '',
                    establishment_name: shift.establishment?.name || '',
                    establishment_city: shift.establishment?.city || '',
                },
            });
            logger.log('📧 Employer confirmation result', { fnData, fnError });
            if (fnError) logger.error('📧 Edge function error:', fnError);
        } catch (err) {
            logger.error('Failed to send employer confirmation:', err instanceof Error ? err : String(err));
        }
    };

    // Fetch shift with applications
    const { data: shift, isLoading } = useQuery({
        queryKey: ['shift-applicants', shiftId],
        queryFn: async () => {
            if (!shiftId) throw new Error('Shift ID is required');

            const { data, error } = await supabase
                .from('shifts')
                .select(`
                    *,
                    establishment:establishments(name, city),
                    shift_applications(
                        id,
                        shift_id,
                        user_id,
                        status,
                        applied_at,
                        reviewed_at,
                        user:users!user_id(id, email, first_name, last_name)
                    )
                `)
                .eq('id', shiftId)
                .single();

            if (error) {
                const message = handleSupabaseError(error, {
                    context: 'ApplicantsModal',
                    operation: 'query'
                });
                throw new Error(message);
            }

            // Fetch employees data
            if (data?.shift_applications && data.shift_applications.length > 0) {
                const userIds = data.shift_applications.map((app: { user_id: string }) => app.user_id);

                const { data: employeesData, error: employeesError } = await supabase
                    .from('employees')
                    .select('*')
                    .in('user_id', userIds);

                if (!employeesError && employeesData) {
                    const employeesMap = new Map(employeesData.map(emp => [emp.user_id, emp]));
                    data.shift_applications = data.shift_applications.map((app) => ({
                        ...app,
                        employee: employeesMap.get(app.user_id) || null
                    }));
                }
            }

            return data as unknown as Shift;
        },
        enabled: !!shiftId && isOpen,
    });

    // Fetch freelancer applications
    const { data: freelancerApplications = [] } = useQuery({
        queryKey: ['shift-freelancer-applicants', shiftId],
        queryFn: async () => {
            if (!shiftId) return [];

            const { data, error } = await supabase
                .from('shift_freelancer_applications')
                .select(`
                    id,
                    shift_id,
                    freelancer_id,
                    status,
                    applied_at,
                    responded_at,
                    freelancer:freelancers(id, first_name, last_name, email, profile_photo_url)
                `)
                .eq('shift_id', shiftId)
                .order('applied_at', { ascending: false });

            if (error) {
                logger.error('Error fetching freelancer applications:', error);
                return [];
            }

            return data as FreelancerApplication[];
        },
        enabled: !!shiftId && !!shift?.published_to_freelancers && isOpen,
    });

    // Compute compatibility scores (algorithmic)
    const { data: matchingScores = {} } = useQuery({
        queryKey: ['compatibility-scores-modal', shiftId, freelancerApplications.map(a => a.freelancer_id).join(',')],
        queryFn: async () => {
            if (!shiftId || freelancerApplications.length === 0) return {};
            return computeCompatibilityScores(shiftId, freelancerApplications.map(a => a.freelancer_id));
        },
        enabled: !!shiftId && freelancerApplications.length > 0 && isOpen,
        staleTime: 5 * 60 * 1000,
    });

    // Mutations
    const assignEmployeeMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { error } = await supabase
                .from('shift_applications')
                .update({
                    status: 'accepted',
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', applicationId);

            if (error) throw error;

            // Send employer confirmation email (best-effort)
            const app = shift?.shift_applications?.find(a => a.id === applicationId);
            if (app?.user) {
                const name = `${app.user.first_name || ''} ${app.user.last_name || ''}`.trim() || app.user.email;
                sendEmployerConfirmation(name, 'employee', `/employees/${app.user_id}`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift-applicants', shiftId] });
            toast.success(t('shifts.assignSuccess'));
        },
    });

    const acceptFreelancerMutation = useMutation({
        mutationFn: async (app: FreelancerApplication) => {
            const { error } = await supabase
                .from('shift_freelancer_applications')
                .update({
                    status: 'accepted',
                    responded_at: new Date().toISOString(),
                })
                .eq('id', app.id);

            if (error) throw error;

            // Notify freelancer via email + push (best-effort, doesn't block success)
            const freelancerName = `${app.freelancer?.first_name || ''} ${app.freelancer?.last_name || ''}`.trim();
            try {
                await supabase.functions.invoke('send-freelancer-shift-accepted', {
                    body: {
                        freelancer_id: app.freelancer_id,
                        freelancer_name: freelancerName,
                        freelancer_email: app.freelancer?.email || '',
                        freelancer_user_id: app.freelancer_id,
                        shift_id: app.shift_id,
                        position_name: shift?.position_name || '',
                        start_time: shift?.start_time || '',
                        end_time: shift?.end_time || '',
                        establishment_name: shift?.establishment?.name || '',
                        establishment_city: shift?.establishment?.city || '',
                    },
                });
            } catch (err) {
                logger.error('Failed to notify freelancer (shift accepted):', err instanceof Error ? err : String(err));
            }

            // Send employer confirmation email (best-effort)
            sendEmployerConfirmation(
                freelancerName || 'Freelance',
                'freelancer',
                `/freelancers/${app.freelancer_id}`,
                app.freelancer?.profile_photo_url,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applicants', shiftId] });
            toast.success(t('shifts.freelancerAccepted'));
        },
    });

    const rejectFreelancerMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { error } = await supabase
                .from('shift_freelancer_applications')
                .update({
                    status: 'rejected',
                    responded_at: new Date().toISOString(),
                })
                .eq('id', applicationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applicants', shiftId] });
            toast.success(t('shifts.freelancerRejected'));
        },
    });

    return {
        shift,
        isLoading,
        freelancerApplications,
        matchingScores,
        assignEmployeeMutation,
        acceptFreelancerMutation,
        rejectFreelancerMutation,
    };
}
