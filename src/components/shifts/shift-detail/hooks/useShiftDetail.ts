// Hook for fetching shift data and real-time subscriptions

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';
import { computeCompatibilityScores } from '@/utils/compatibilityScore';
import { useAuthStore } from '@/stores/authStore';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { TFunction, i18n as I18nInstance } from 'i18next';
import type { UseMutationResult } from '@tanstack/react-query';
import type { Shift, FreelancerApplication, MatchingResult, ShiftStatus } from '../types';

interface FreelancerUsageStats {
    total_shifts: number;
    total_hours: number;
}

interface ShiftApplicationStats {
    applications: Shift['shift_applications'];
    acceptedApplications: Shift['shift_applications'];
    availableApplications: Shift['shift_applications'];
    pendingApplications: Shift['shift_applications'];
    rejectedApplications: Shift['shift_applications'];
    withdrawnApplications: Shift['shift_applications'];
    acceptedFreelancers: FreelancerApplication[];
    pendingFreelancerApplications: FreelancerApplication[];
    totalAssignedStaff: number;
}

interface ShiftMutations {
    assignEmployee: UseMutationResult<void, Error, string>;
    closeShift: UseMutationResult<void, Error, void>;
    reportNoShow: UseMutationResult<void, Error, string>;
    cancelNoShow: UseMutationResult<void, Error, string>;
    sendReminder: UseMutationResult<unknown, Error, void>;
    acceptFreelancer: UseMutationResult<void, Error, string>;
    rejectFreelancer: UseMutationResult<void, Error, string>;
}

interface UseShiftDetailOptions {
    shiftId: string | null;
    isOpen: boolean;
}

interface UseShiftDetailResult {
    shift: Shift | undefined;
    isLoading: boolean;
    freelancerApplications: FreelancerApplication[];
    matchingScores: Record<string, MatchingResult>;
    usageStats: Record<string, FreelancerUsageStats>;
    displayStatus: ShiftStatus;
    duration: number;
    effectiveDuration: number;
    totalAssignedStaff: number;
    stats: ShiftApplicationStats | null;
    isAdminOrManager: boolean;
    t: TFunction;
    i18n: I18nInstance;
    getDateLocale: () => Locale;
    adjustHoursDialogOpen: boolean;
    setAdjustHoursDialogOpen: (open: boolean) => void;
    isValidateDialogOpen: boolean;
    setIsValidateDialogOpen: (open: boolean) => void;
    mutations: ShiftMutations;
}

export function useShiftDetail({ shiftId, isOpen }: UseShiftDetailOptions): UseShiftDetailResult {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const company = useAuthStore((state) => state.company);
    const { t, i18n } = useTranslation();

    const [usageStats, setUsageStats] = useState<Record<string, FreelancerUsageStats>>({});
    const [adjustHoursDialogOpen, setAdjustHoursDialogOpen] = useState(false);
    const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);

    const getDateLocale = (): Locale => {
        const localeMap: Record<string, Locale> = {
            'fr': fr,
            'en': enUS,
            'es': es,
            'it': it,
            'zh': zhCN,
        };
        return localeMap[i18n.language] || enUS;
    };

    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

    // Subscribe to real-time updates
    useEffect(() => {
        if (!shiftId || !isOpen) return;

        const subscription = supabase
            .channel(`shift_${shiftId}_changes`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'shift_applications',
                    filter: `shift_id=eq.${shiftId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'shifts',
                    filter: `id=eq.${shiftId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [shiftId, queryClient, isOpen]);

    // Main shift query
    const { data: shift, isLoading } = useQuery({
        queryKey: ['shift', shiftId],
        queryFn: async () => {
            if (!shiftId) throw new Error('Shift ID is required');

            const { data, error } = await supabase
                .from('shifts')
                .select(
                    `
          *,
          freelance_hourly_rate,
          establishment:establishments(id, name, address, city),
          shift_applications(
            id,
            shift_id,
            user_id,
            status,
            applied_at,
            reviewed_at,
            reviewed_by,
            no_show,
            no_show_reported_by,
            no_show_reported_at,
            user:users!shift_applications_user_id_fkey(id, email, first_name, last_name)
          )
        `
                )
                .eq('id', shiftId)
                .single();

            if (error) {
                const message = handleSupabaseError(error, {
                    context: 'ShiftDetailModal',
                    operation: 'query'
                });
                throw new Error(message);
            }

            // Fetch employees data
            if (data?.shift_applications && data.shift_applications.length > 0) {
                const userIds = data.shift_applications.map((app) => app.user_id);

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
        queryKey: ['shift-freelancer-applications', shiftId],
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
          freelancer:freelancers(id, first_name, last_name, email, phone, city, profile_photo_url)
        `)
                .eq('shift_id', shiftId)
                .order('applied_at', { ascending: false });

            if (error) {
                logger.error('Error fetching freelancer applications:', error);
                return [];
            }

            return data as FreelancerApplication[];
        },
        enabled: !!shiftId && isOpen,
    });

    // Compute compatibility scores (algorithmic)
    const { data: matchingScores = {} } = useQuery({
        queryKey: ['compatibility-scores', shiftId, freelancerApplications.map(a => a.freelancer_id).join(',')],
        queryFn: async () => {
            if (!shiftId || freelancerApplications.length === 0) return {};
            return computeCompatibilityScores(shiftId, freelancerApplications.map(a => a.freelancer_id));
        },
        enabled: !!shiftId && freelancerApplications.length > 0 && isOpen,
        staleTime: 5 * 60 * 1000,
    });

    // Usage Stats Fetcher
    const fetchfreelancerUsage = async (freelancerId: string) => {
        if (usageStats[freelancerId] || !company?.id) return;
        try {
            const { data, error } = await supabase.rpc('get_freelancer_usage_stats', {
                p_company_id: company.id,
                p_freelancer_id: freelancerId
            });
            if (!error && data) {
                setUsageStats(prev => ({ ...prev, [freelancerId]: data as unknown as FreelancerUsageStats }));
            }
        } catch (error) {
            logger.error('Failed to fetch freelancer usage stats:', error instanceof Error ? error : String(error))
        }
    };

    useEffect(() => {
        if (isOpen) {
            freelancerApplications.forEach(app => fetchfreelancerUsage(app.freelancer_id));
        }
    }, [freelancerApplications, company?.id, isOpen]);

    // Calculations
    const { duration, effectiveDuration, stats, displayStatus, totalAssignedStaff } = useMemo(() => {
        if (!shift) return { duration: 0, effectiveDuration: 0, stats: null, displayStatus: 'pending' as ShiftStatus, totalAssignedStaff: 0 };

        const dur = (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60);
        const effDur = dur - (shift.break_duration_minutes / 60);

        const apps = shift.shift_applications || [];
        const acceptedApps = apps.filter((a) => a.status === 'accepted');
        const availableApps = apps.filter((a) => a.status === 'applied');
        const acceptedFree = freelancerApplications.filter((a) => a.status === 'accepted');
        const totalAssigned = acceptedApps.length + acceptedFree.length;

        let dStatus = shift.status;
        if (shift.status === 'pending' && availableApps.length > 0) dStatus = 'partially_filled';

        return {
            duration: dur,
            effectiveDuration: effDur,
            displayStatus: dStatus,
            totalAssignedStaff: totalAssigned,
            stats: {
                applications: apps,
                acceptedApplications: acceptedApps,
                availableApplications: availableApps,
                pendingApplications: apps.filter((a) => a.status === 'pending'),
                rejectedApplications: apps.filter((a) => a.status === 'rejected'),
                withdrawnApplications: apps.filter((a) => a.status === 'withdrawn'),
                acceptedFreelancers: acceptedFree,
                pendingFreelancerApplications: freelancerApplications.filter((a) => a.status === 'applied'),
                totalAssignedStaff: totalAssigned
            }
        };
    }, [shift, freelancerApplications]);

    // Mutations
    const assignEmployeeMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { data: application, error: fetchError } = await supabase.from('shift_applications').select('user_id, shift_id').eq('id', applicationId).single();
            if (fetchError) throw new Error(handleSupabaseError(fetchError, { context: 'useShiftDetail', operation: 'query' }));

            const { error } = await supabase.from('shift_applications').update({
                status: 'accepted',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user?.id ?? '',
            }).eq('id', applicationId);
            if (error) throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));

            if (shift) {
                const newFilledCount = shift.filled_employees + 1;
                const newStatus = newFilledCount >= shift.required_employees ? 'filled' : 'partially_filled';
                await supabase.from('shifts').update({
                    filled_employees: newFilledCount,
                    status: newStatus,
                    filled_at: newStatus === 'filled' ? new Date().toISOString() : null,
                }).eq('id', shift.id);
            }

            await supabase.functions.invoke('send-shift-assignment-notification', {
                body: { shift_id: application.shift_id, user_id: application.user_id },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            toast.success(t('shifts.assignSuccess'));
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const closeShiftMutation = useMutation({
        mutationFn: async () => {
            if (!shiftId) throw new Error('Shift ID is required');
            await supabase.from('shift_applications').update({
                status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? '',
            }).eq('shift_id', shiftId).in('status', ['applied', 'pending']);

            const { error } = await supabase.from('shifts').update({ status: 'closed' }).eq('id', shiftId);
            if (error) throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));
        },
        onSuccess: () => {
            toast.success(t('shifts.closeSuccess'));
            queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const reportNoShowMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { error } = await supabase.from('shift_applications').update({
                no_show: true, no_show_reported_by: user?.id ?? '', no_show_reported_at: new Date().toISOString(),
            }).eq('id', applicationId);
            if (error) throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));
        },
        onSuccess: () => {
            toast.success(t('shifts.noShow.reportSuccess'));
            queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const cancelNoShowMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { error } = await supabase.from('shift_applications').update({
                no_show: false, no_show_reported_by: null, no_show_reported_at: null,
            }).eq('id', applicationId);
            if (error) throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));
        },
        onSuccess: () => {
            toast.success(t('shifts.noShow.cancelSuccess'));
            queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const sendReminderMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('send-reminder-notification', { body: { shift_id: shiftId } });
            if (error) throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));
            return data;
        },
        onSuccess: (data) => {
            if (data?.sent > 0) toast.success(t('shifts.reminder.success', { count: data.sent }));
            else toast.info(t('shifts.reminder.noPending'));
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const acceptFreelancerMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { error } = await supabase.from('shift_freelancer_applications').update({
                status: 'accepted', responded_at: new Date().toISOString(),
            }).eq('id', applicationId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applications', shiftId] });
            queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
            toast.success(t('shifts.freelancerAccepted'));
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const rejectFreelancerMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { error } = await supabase.from('shift_freelancer_applications').update({
                status: 'rejected', responded_at: new Date().toISOString(),
            }).eq('id', applicationId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applications', shiftId] });
            queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
            toast.success(t('shifts.freelancerRejected'));
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    return {
        shift,
        isLoading,
        freelancerApplications,
        matchingScores,
        usageStats,
        displayStatus,
        duration,
        effectiveDuration,
        totalAssignedStaff,
        stats,
        isAdminOrManager,
        t,
        i18n,
        getDateLocale,
        adjustHoursDialogOpen,
        setAdjustHoursDialogOpen,
        isValidateDialogOpen,
        setIsValidateDialogOpen,
        mutations: {
            assignEmployee: assignEmployeeMutation,
            closeShift: closeShiftMutation,
            reportNoShow: reportNoShowMutation,
            cancelNoShow: cancelNoShowMutation,
            sendReminder: sendReminderMutation,
            acceptFreelancer: acceptFreelancerMutation,
            rejectFreelancer: rejectFreelancerMutation,
        }
    };
}
