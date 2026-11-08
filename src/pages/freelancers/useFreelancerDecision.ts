import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/error-handler';
import type { FreelancerApplication } from '../../../components/shifts/shift-detail/types';

// ✅ Helper: renvoie tous les shift_id appartenant au même event_id qu'un shift donné
// (retourne juste [shiftId] si le shift n'a pas d'event_id — comportement identique
// pour les shifts non-étendus). Extrait de useShiftDetail.ts pour être réutilisable
// depuis n'importe quelle page (shift detail, page freelance, etc.)
export async function getEventGroupShiftIds(
    shiftId: string
): Promise<{ ids: string[]; eventId: string | null }> {
    const { data: baseShift, error } = await supabase
        .from('shifts')
        .select('id, event_id')
        .eq('id', shiftId)
        .single();
    if (error) throw new Error(handleSupabaseError(error, { context: 'useFreelancerDecision', operation: 'query' }));

    const evtId = (baseShift as unknown as { event_id: string | null }).event_id;
    if (!evtId) return { ids: [shiftId], eventId: null };

    const { data: groupShifts, error: groupError } = await supabase
        .from('shifts')
        .select('id')
        .eq('event_id', evtId);
    if (groupError) throw new Error(handleSupabaseError(groupError, { context: 'useFreelancerDecision', operation: 'query' }));

    return { ids: (groupShifts || []).map((s) => s.id), eventId: evtId };
}

interface UseFreelancerDecisionOptions {
    // ✅ Query keys إضافية للـ invalidation بعد القبول/الرفض — كل صفحة تعطي القيم
    // المناسبة ليها (صفحة الشيفت تعطي ['shift', id]، صفحة الفريلانس تعطي المفتاح ديالها)
    invalidateQueryKeys?: unknown[][];
}

// ✅ هوك مشترك لقبول/رفض عرض فريلانسر — يُستعمل من صفحة الشيفت (CRM) وصفحة الفريلانس
// (client website). يحافظ على منطق event group بالكامل: عند القبول/الرفض، كل طلبات
// نفس الفريلانسر عبر كل شيفتات السلسلة (event_id) تتقبل/تترفض دفعة واحدة.
export function useFreelancerDecision(options: UseFreelancerDecisionOptions = {}) {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const extraKeys = options.invalidateQueryKeys || [];

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applications'] });
        queryClient.invalidateQueries({ queryKey: ['shift-event-group'] });
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
        extraKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    };

    const acceptFreelancerMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { data: application, error: fetchAppError } = await supabase
                .from('shift_freelancer_applications')
                .select('id, shift_id, freelancer_id, freelance_hourly_rate')
                .eq('id', applicationId)
                .single();
            if (fetchAppError) throw fetchAppError;

            const { ids: groupShiftIds } = await getEventGroupShiftIds(application.shift_id);

            // ✅ كل طلبات نفس الفريلانسر المعلّقة عبر كل السلسلة
            const { data: groupApps, error: groupAppsError } = await supabase
                .from('shift_freelancer_applications')
                .select('id, shift_id')
                .eq('freelancer_id', application.freelancer_id)
                .in('shift_id', groupShiftIds)
                .in('status', ['applied']); // ✅ 'pending' ماشي status موجود في shift_freelancer_applications (حسب CHECK constraint)، حذفتها
            if (groupAppsError) throw groupAppsError;

            const idsToAccept = Array.from(new Set([applicationId, ...(groupApps || []).map((a) => a.id)]));

            const { error } = await supabase.from('shift_freelancer_applications').update({
                status: 'accepted', responded_at: new Date().toISOString(),
            }).in('id', idsToAccept);
            if (error) throw error;

            if (
                application?.freelance_hourly_rate !== null &&
                application?.freelance_hourly_rate !== undefined
            ) {
                // ✅ تطبيق السعر المقبول على كل شيفتات السلسلة (مش فقط هذا الواحد)
                const { error: shiftError } = await supabase
                    .from('shifts')
                    .update({ freelance_hourly_rate: application.freelance_hourly_rate })
                    .in('id', groupShiftIds);
                if (shiftError) throw shiftError;
            }
        },
        onSuccess: () => {
            invalidateAll();
            toast.success(t('shifts.freelancerAccepted'));
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const rejectFreelancerMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { data: application, error: fetchAppError } = await supabase
                .from('shift_freelancer_applications')
                .select('id, shift_id, freelancer_id')
                .eq('id', applicationId)
                .single();
            if (fetchAppError) throw fetchAppError;

            const { ids: groupShiftIds } = await getEventGroupShiftIds(application.shift_id);

            const { data: groupApps, error: groupAppsError } = await supabase
                .from('shift_freelancer_applications')
                .select('id')
                .eq('freelancer_id', application.freelancer_id)
                .in('shift_id', groupShiftIds)
                .in('status', ['applied']); // ✅ 'pending' ماشي status موجود في shift_freelancer_applications (حسب CHECK constraint)، حذفتها
            if (groupAppsError) throw groupAppsError;

            const idsToReject = Array.from(new Set([applicationId, ...(groupApps || []).map((a) => a.id)]));

            const { error } = await supabase.from('shift_freelancer_applications').update({
                status: 'rejected', responded_at: new Date().toISOString(),
            }).in('id', idsToReject);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidateAll();
            toast.success(t('shifts.freelancerRejected'));
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    return {
        acceptFreelancerMutation,
        rejectFreelancerMutation,
    };
}

// ✅ يجيب طلب فريلانسر محدد (freelancer_id + shift_id) — نسخة مصغّرة من الـ
// freelancerApplications query الموجودة فـ useShiftDetail، لكن بفلتر إضافي على
// الفريلانسر. تُستعمل فصفحة الفريلانس عندما تُزار عبر ?for=<shiftId> باش نعرف
// واش عند هذا الفريلانسر طلب على هذا الشيفت بالضبط (ونعرض له أزرار قبول/رفض إذا معلّق)
export function useFreelancerApplicationForShift(freelancerId: string | undefined, shiftId: string | undefined) {
    return useQuery({
        queryKey: ['shift-freelancer-applications', shiftId, freelancerId],
        queryFn: async () => {
            if (!freelancerId || !shiftId) return null;
            const { data, error } = await supabase
                .from('shift_freelancer_applications')
                .select(`
          id, shift_id, freelancer_id, status, applied_at, responded_at,
          freelance_hourly_rate,
          freelancer:freelancers(id, first_name, last_name, email, phone, city, profile_photo_url),
          shift:shifts(id, position_name, start_time, end_time, status, establishments(id, name))
        `)
                .eq('shift_id', shiftId)
                .eq('freelancer_id', freelancerId)
                .maybeSingle();

            if (error) return null;
            return data as unknown as FreelancerApplication | null;
        },
        enabled: !!freelancerId && !!shiftId,
    });
}