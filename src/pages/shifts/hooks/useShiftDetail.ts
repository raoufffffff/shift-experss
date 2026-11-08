import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useLocale } from '@/hooks/useLocale';
import { logger } from '@/utils/logger';
import { handleSupabaseError } from '@/lib/error-handler';
import { computeCompatibilityScores } from '@/utils/compatibilityScore';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { DEFAULT_PLATFORM_FEE_RATE } from '@shift-express/shared';
import { getShiftDurationMinutes } from '@/lib/Shifttime';
import type {
    Shift,
    ShiftStatus,
    FreelancerApplication,
} from '../../../components/shifts/shift-detail/types';

interface FreelancerUsageStats {
    total_shifts: number;
    total_hours: number;
}

export interface EmployeeUsageStats {
    completed: number;
    withdrawn: number;
}

// ✅ جديد — حالة "Relance par appel" كما ترجعها get_shift_auto_call_status.
// أرقام تجميعية فقط: لا أسماء ولا أرقام هواتف قبل تقديم الفريلانس.
export interface AutoCallStatus {
    feature_available: boolean;
    live: boolean;
    visible: boolean;
    enabled: boolean;
    price_cents: number;
    max_calls: number;
    available_count: number;
    will_call: number;
    max_cost_cents: number;
    calls_made: number;
    calls_answered: number;
    cost_cents: number;
    applications_via_call: number;
    can_enable: boolean;
    reason: string | null;
}

export const AUTO_CALL_REASON_FR: Record<string, string> = {
    unavailable: "La relance par appel n'est pas disponible pour le moment.",
    already_enabled: 'La relance par appel est déjà activée.',
    not_published: "Ce shift n'est pas publié aux freelances.",
    status: "Ce shift n'est plus ouvert aux candidatures.",
    too_late: 'Le shift commence trop tôt pour lancer des appels.',
    too_far: 'Les appels peuvent être lancés dans les 7 jours qui précèdent le shift.',
};

const DEFAULT_TZ = 'Europe/Paris';

const RESCHEDULE_WINDOW_MS = 4 * 60 * 60 * 1000;

const PENDING_APPLICATION_STATUSES = ['applied', 'pending'];

export interface LinkedShift {
    id: string;
    start_time: string;
    end_time: string;
    break_duration_minutes: number | null;
    status: string;
    required_employees: number;
    filled_employees: number;
    freelance_hourly_rate: number | null;
    hourly_rate: number | null;
    platform_fee_rate: number | null;
    establishment?: { timezone: string | null } | null;
    shift_applications: { id: string; user_id: string; status: string }[];
    shift_freelancer_applications: { id: string; freelancer_id: string; status: string; freelance_hourly_rate: number | null }[];
}

export interface EventGroupSummary {
    eventId: string;
    daysCount: number;
    totalNetHours: number;
    totalCost: number;
    totalCommission: number;
    hourlyRate: number;
    feeRate: number;
    shifts: LinkedShift[];
}

export interface RescheduleEntry {
    shiftId: string;
    newStartTime: string;
    newEndTime: string;
}

function computeShiftQuote(s: LinkedShift) {
    const rate = s.freelance_hourly_rate || s.hourly_rate || 0;
    if (rate === 0) return null;

    const timezone = s.establishment?.timezone || DEFAULT_TZ;
    const diffMinutes = getShiftDurationMinutes(s.start_time, s.end_time, timezone);

    const breakMinutes = s.break_duration_minutes || 0;
    const netHours = (diffMinutes - breakMinutes) / 60;
    if (netHours <= 0) return null;

    const staffCount = Math.max(s.required_employees || 1, 1);
    const feeRate = s.platform_fee_rate ?? DEFAULT_PLATFORM_FEE_RATE;

    const baseCost = Math.round(rate * netHours * staffCount * 100) / 100;
    const commission = Math.round(baseCost * (feeRate / 100) * 100) / 100;
    const totalTTC = Math.round((baseCost + commission) * 100) / 100;

    return { rate, netHours, staffCount, baseCost, commission, totalTTC, feeRate };
}

export function useShiftDetail(shiftIdOverride?: string) {
    const params = useParams<{ id: string }>();
    // La nouvelle fenêtre de mission passe l'id directement (pas de route /shifts/:id)
    const id = shiftIdOverride ?? params.id;
    const { navigate } = useLocale();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const company = useAuthStore((state) => state.company);
    const { t, i18n } = useTranslation();

    const [adjustHoursDialogOpen, setAdjustHoursDialogOpen] = useState(false);
    const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
    const [isBoostDialogOpen, setIsBoostDialogOpen] = useState(false);
    const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
    const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
    const [isAutoCallDialogOpen, setIsAutoCallDialogOpen] = useState(false);
    const [usageStats, setUsageStats] = useState<Record<string, FreelancerUsageStats>>({});

    const USAGE_WARNING_THRESHOLD_SHIFTS = 60;
    const USAGE_WARNING_THRESHOLD_HOURS = 400;

    const [, forceTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => forceTick((t) => t + 1), 60 * 1000);
        return () => clearInterval(interval);
    }, []);

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

    useEffect(() => {
        if (!id) return;

        const subscription = supabase
            .channel(`shift_${id}_changes`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shift_applications', filter: `shift_id=eq.${id}` },
                () => queryClient.invalidateQueries({ queryKey: ['shift', id] })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shifts', filter: `id=eq.${id}` },
                () => queryClient.invalidateQueries({ queryKey: ['shift', id] })
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [id, queryClient]);

    const { data: shift, isLoading } = useQuery({
        queryKey: ['shift', id],
        queryFn: async () => {
            if (!id) throw new Error('Shift ID is required');

            const { data, error } = await supabase
                .from('shifts')
                .select(`
          *,
          freelance_hourly_rate,
          establishment:establishments(id, name, address, city, timezone),
          shift_required_pms(id, pms:pms(id, name, type)),
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
            withdrawal_reason,
            user:users!shift_applications_user_id_fkey(id, email, first_name, last_name, avatar_url)
          )
        `)
                .eq('id', id)
                .single();

            if (error) {
                throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));
            }

            if (data?.shift_applications?.length > 0) {
                const userIds = data.shift_applications.map((app) => app.user_id);
                const { data: employeesData } = await supabase.from('employees').select('*').in('user_id', userIds);
                if (employeesData) {
                    const employeesMap = new Map(employeesData.map(emp => [emp.user_id, emp]));
                    data.shift_applications = data.shift_applications.map((app) => ({
                        ...app,
                        employee: employeesMap.get(app.user_id) || null
                    }));
                }
            }

            return data as unknown as Shift;
        },
        enabled: !!id,
    });

    const eventId = (shift as unknown as { event_id?: string | null })?.event_id ?? null;
    const { data: linkedShifts = [] } = useQuery({
        queryKey: ['shift-event-group', eventId],
        queryFn: async () => {
            if (!eventId) return [];
            const { data, error } = await supabase
                .from('shifts')
                .select(`
          id, start_time, end_time, break_duration_minutes, status,
          required_employees, filled_employees, freelance_hourly_rate, platform_fee_rate,
          establishment:establishments(timezone),
          shift_applications(id, user_id, status),
          shift_freelancer_applications(id, freelancer_id, status, freelance_hourly_rate)
        `)
                .eq('event_id', eventId)
                .order('start_time', { ascending: true });

            if (error) {
                throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'linkedShifts' }));
            }
            return data as unknown as LinkedShift[];
        },
        enabled: !!eventId,
    });

    const eventGroupSummary = useMemo<EventGroupSummary | null>(() => {
        if (!eventId || linkedShifts.length === 0) return null;

        let totalNetHours = 0;
        let totalCost = 0;
        let totalCommission = 0;
        let hourlyRate = 0;
        let feeRate = DEFAULT_PLATFORM_FEE_RATE;

        linkedShifts.forEach((s) => {
            const quote = computeShiftQuote(s);
            if (quote) {
                totalNetHours += quote.netHours * quote.staffCount;
                totalCost += quote.totalTTC;
                totalCommission += quote.commission;
                hourlyRate = quote.rate;
                feeRate = quote.feeRate;
            }
        });

        return {
            eventId,
            daysCount: linkedShifts.length,
            totalNetHours: Math.round(totalNetHours * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            totalCommission: Math.round(totalCommission * 100) / 100,
            hourlyRate,
            feeRate,
            shifts: linkedShifts,
        };
    }, [eventId, linkedShifts]);

    const rescheduleTargetShifts = useMemo<LinkedShift[]>(() => {
        if (eventId && linkedShifts.length > 0) return linkedShifts;
        if (!shift) return [];
        return [{
            id: shift.id,
            start_time: shift.start_time,
            end_time: shift.end_time,
            break_duration_minutes: shift.break_duration_minutes ?? null,
            status: shift.status,
            required_employees: shift.required_employees,
            filled_employees: shift.filled_employees,
            freelance_hourly_rate: shift.freelance_hourly_rate ?? null,
            hourly_rate: (shift as unknown as { hourly_rate?: number | null }).hourly_rate ?? null,
            platform_fee_rate: (shift as unknown as { platform_fee_rate?: number | null }).platform_fee_rate ?? null,
            establishment: (shift as unknown as { establishment?: { timezone: string | null } | null }).establishment ?? null,
            shift_applications: (shift.shift_applications || []).map((a) => ({ id: a.id, user_id: a.user_id, status: a.status })),
            shift_freelancer_applications: [],
        }];
    }, [eventId, linkedShifts, shift]);

    // Freelancer Applications Query
    const { data: freelancerApplications = [] } = useQuery({
        queryKey: ['shift-freelancer-applications', id],
        queryFn: async () => {
            if (!id) return [];
            const { data, error } = await supabase
                .from('shift_freelancer_applications')
                .select(`
          id, shift_id, freelancer_id, status, applied_at, responded_at,
          freelance_hourly_rate, applied_via_call,
          freelancer:freelancers(id, first_name, last_name, email, phone, city, profile_photo_url)
        `)
                .eq('shift_id', id)
                .order('applied_at', { ascending: false });

            if (error) return [];
            return data as FreelancerApplication[];
        },
        enabled: !!id,
    });

    // ✅ جديد — تمنع الشركة من إلغاء الوردية أو تغيير توقيتها إذا كان هناك
    // فريلانس أو موظف "accepted" على هذا الشفت، أو على أي شفت من سلسلة
    // الامتداد كاملة إذا كان الشفت جزءًا من event_id. هذا الفحص ضروري لأن
    // قبول فريلانس (acceptFreelancerMutation) لا يُحدّث shift.status، فلا
    // يمكن الاعتماد على status وحده لمعرفة وجود طلب مقبول.
    const hasAcceptedApplicant = useMemo(() => {
        if (eventId && linkedShifts.length > 0) {
            return linkedShifts.some((s) =>
                (s.shift_applications || []).some((a) => a.status === 'accepted') ||
                (s.shift_freelancer_applications || []).some((a) => a.status === 'accepted')
            );
        }
        const employeeAccepted = (shift?.shift_applications || []).some((a) => a.status === 'accepted');
        const freelancerAccepted = freelancerApplications.some((a) => a.status === 'accepted');
        return employeeAccepted || freelancerAccepted;
    }, [eventId, linkedShifts, shift, freelancerApplications]);

    // ✅ معدّل — أُضيف شرط !hasAcceptedApplicant: لا يمكن تغيير التوفيت
    // إذا كان هناك فريلانس أو موظف مقبول (على هذا الشفت أو السلسلة كاملة).
    const canReschedule = useMemo(() => {
        if (!shift || !isAdminOrManager) return false;
        if (shift.status !== 'pending') return false;
        if (hasAcceptedApplicant) return false;

        const now = Date.now();
        const startMs = new Date(shift.start_time).getTime();
        if (Number.isNaN(startMs)) return false;

        const elapsed = now - startMs;
        return elapsed < RESCHEDULE_WINDOW_MS;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shift, isAdminOrManager, hasAcceptedApplicant, forceTick]);

    // ✅ جديد — تحويل شيفت منشور للفريلانس (بلا أي فريلانس مقبول) إلى شيفت لموظفي الفرع.
    // يظهر الزر فقط إذا: منشور للفريلانس، مفتوح (pending/partially_filled)، لم يبدأ بعد،
    // ولا يوجد فريلانس مقبول على هذا الشفت أو على السلسلة كاملة (hasAcceptedApplicant).
    const canConvertToEmployees = useMemo(() => {
        if (!shift || !isAdminOrManager) return false;
        if (!shift.published_to_freelancers) return false;
        if (!['pending', 'partially_filled'].includes(shift.status)) return false;
        if (freelancerApplications.some((a) => a.status === 'accepted')) return false;
        if (eventId && linkedShifts.some((s) => (s.shift_freelancer_applications || []).some((a) => a.status === 'accepted'))) return false;
        const startMs = new Date(shift.start_time).getTime();
        if (Number.isNaN(startMs) || startMs <= Date.now()) return false;
        return true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shift, isAdminOrManager, freelancerApplications, eventId, linkedShifts, forceTick]);

    // IDs des shifts concernés (le shift seul, ou tous les jours de la série) — utilisé aussi
    // par la carte « Frais de déplacement » (une demande groupée est rattachée au shift du chef de groupe).
    const relatedShiftIds = useMemo<string[]>(() => {
        if (!shift) return [];
        if (eventId && linkedShifts.length > 0) return linkedShifts.map((s) => s.id);
        return [shift.id];
    }, [shift, eventId, linkedShifts]);

    // ✅ جديد — Relance par appel : أعداد فقط (متوفرون / مكالمات / تكلفة / تقديمات عبر مكالمة)
    const { data: autoCallStatus } = useQuery({
        queryKey: ['shift-auto-call-status', id],
        queryFn: async (): Promise<AutoCallStatus> => {
            const { data, error } = await (supabase as any).rpc('get_shift_auto_call_status', { p_shift_id: id });
            if (error) throw new Error(error.message || handleSupabaseError(error, { context: 'useShiftDetail', operation: 'autoCallStatus' }));
            return data as AutoCallStatus;
        },
        enabled: !!id && !!shift && isAdminOrManager,
        staleTime: 10 * 1000,
        // tant que la relance est active, on rafraîchit régulièrement (appels en cours)
        refetchInterval: (query) => (query.state.data?.enabled ? 15 * 1000 : false),
    });

    // quand un freelance postule via l'appel, on recharge la liste des candidatures
    useEffect(() => {
        if (autoCallStatus?.applications_via_call == null) return;
        queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applications', id] });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoCallStatus?.applications_via_call]);

    // Compatibility Scores (algorithmic)
    const { data: matchingScores = {} } = useQuery({
        queryKey: ['compatibility-scores', id, freelancerApplications.map(a => a.freelancer_id).join(',')],
        queryFn: async () => {
            if (!id || freelancerApplications.length === 0) return {};
            return computeCompatibilityScores(id, freelancerApplications.map(a => a.freelancer_id));
        },
        enabled: !!id && freelancerApplications.length > 0,
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
        freelancerApplications.forEach(app => fetchfreelancerUsage(app.freelancer_id));
    }, [freelancerApplications, company?.id]);

    const employeeUserIds = useMemo(
        () => Array.from(new Set((shift?.shift_applications || []).map((a) => a.user_id).filter(Boolean))),
        [shift?.shift_applications]
    );

    const { data: employeeUsageStats = {} } = useQuery({
        queryKey: ['employee-usage-stats', company?.id, employeeUserIds],
        queryFn: async (): Promise<Record<string, EmployeeUsageStats>> => {
            if (!company?.id || employeeUserIds.length === 0) return {};

            const { data, error } = await supabase
                .from('shift_applications')
                .select('user_id, status, shift:shifts!inner(company_id)')
                .eq('shift.company_id', company.id)
                .in('user_id', employeeUserIds);

            if (error) {
                logger.error('Failed to fetch employee usage stats:', error instanceof Error ? error : String(error));
                return {};
            }

            const map: Record<string, EmployeeUsageStats> = {};
            for (const uid of employeeUserIds) map[uid] = { completed: 0, withdrawn: 0 };

            for (const row of (data || []) as Array<{ user_id: string; status: string | null }>) {
                if (!map[row.user_id]) map[row.user_id] = { completed: 0, withdrawn: 0 };
                if (row.status === 'accepted') map[row.user_id].completed += 1;
                else if (row.status === 'withdrawn') map[row.user_id].withdrawn += 1;
            }

            return map;
        },
        enabled: !!company?.id && employeeUserIds.length > 0,
    });

    // Calculations
    const { duration, effectiveDuration, stats, displayStatus, totalAssignedStaff, isBoostable } = useMemo(() => {
        if (!shift) return { duration: 0, effectiveDuration: 0, stats: null, displayStatus: 'pending' as ShiftStatus, totalAssignedStaff: 0, isBoostable: false };

        const timezone = (shift as unknown as { establishment?: { timezone?: string | null } }).establishment?.timezone || DEFAULT_TZ;
        const diffMinutes = getShiftDurationMinutes(shift.start_time, shift.end_time, timezone);

        const dur = diffMinutes / 60;
        const effDur = dur - ((shift.break_duration_minutes || 0) / 60);

        const apps = shift.shift_applications || [];
        const acceptedApps = apps.filter((a) => a.status === 'accepted');
        const availableApps = apps.filter((a) => a.status === 'applied');
        const acceptedFree = freelancerApplications.filter((a) => a.status === 'accepted');
        const totalAssigned = acceptedApps.length + acceptedFree.length;

        let dStatus = shift.status;
        if (shift.status === 'pending' && availableApps.length > 0) dStatus = 'partially_filled';

        const isBoostable = (() => {
            if (!shift.published_to_freelancers) return false;
            if (totalAssigned > 0) return false;

            if (shift.boosted_at) {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                if (new Date(shift.boosted_at) > oneHourAgo) return false;
            }
            return true;
        })();

        return {
            duration: dur,
            effectiveDuration: effDur,
            displayStatus: dStatus,
            totalAssignedStaff: totalAssigned,
            isBoostable,
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

    const getEventGroupShiftIds = async (shiftId: string): Promise<{ ids: string[]; eventId: string | null }> => {
        const { data: baseShift, error } = await supabase
            .from('shifts')
            .select('id, event_id')
            .eq('id', shiftId)
            .single();
        if (error) throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));

        const evtId = (baseShift as unknown as { event_id: string | null }).event_id;
        if (!evtId) return { ids: [shiftId], eventId: null };

        const { data: groupShifts, error: groupError } = await supabase
            .from('shifts')
            .select('id')
            .eq('event_id', evtId);
        if (groupError) throw new Error(handleSupabaseError(groupError, { context: 'useShiftDetail', operation: 'query' }));

        return { ids: (groupShifts || []).map((s) => s.id), eventId: evtId };
    };

    // Mutations
    const assignEmployeeMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { data: application, error: fetchError } = await supabase.from('shift_applications').select('id, user_id, shift_id').eq('id', applicationId).single();
            if (fetchError) throw new Error(handleSupabaseError(fetchError, { context: 'useShiftDetail', operation: 'query' }));

            const { ids: groupShiftIds } = await getEventGroupShiftIds(application.shift_id);

            const { data: groupApps, error: groupAppsError } = await supabase
                .from('shift_applications')
                .select('id, shift_id')
                .eq('user_id', application.user_id)
                .in('shift_id', groupShiftIds)
                .in('status', ['applied', 'pending']);
            if (groupAppsError) throw new Error(handleSupabaseError(groupAppsError, { context: 'useShiftDetail', operation: 'query' }));

            const idsToAccept = Array.from(new Set([applicationId, ...(groupApps || []).map((a) => a.id)]));

            const { error } = await supabase.from('shift_applications').update({
                status: 'accepted',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user?.id ?? '',
            }).in('id', idsToAccept);
            if (error) throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));

            for (const gShiftId of groupShiftIds) {
                const { data: sData, error: sError } = await supabase
                    .from('shifts')
                    .select('id, filled_employees, required_employees')
                    .eq('id', gShiftId)
                    .single();
                if (sError || !sData) continue;

                const wasAccepted = idsToAccept.length > 0 && (groupApps || []).some((a) => a.shift_id === gShiftId) || gShiftId === application.shift_id;
                if (!wasAccepted) continue;

                const newFilledCount = sData.filled_employees + 1;
                const newStatus = newFilledCount >= sData.required_employees ? 'filled' : 'partially_filled';
                await supabase.from('shifts').update({
                    filled_employees: newFilledCount,
                    status: newStatus,
                    filled_at: newStatus === 'filled' ? new Date().toISOString() : null,
                }).eq('id', gShiftId);
            }

            await supabase.functions.invoke('send-shift-assignment-notification', {
                body: { shift_id: application.shift_id, user_id: application.user_id },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift', id] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['shift-event-group', eventId] });
            toast.success(t('shifts.assignSuccess'));
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    // ✅ معدّل — يرفض الإلغاء إن كان هناك فريلانس أو موظف مقبول (hasAcceptedApplicant)،
    // بدل الاعتماد فقط على shift.status الذي لا يتحدّث عند قبول فريلانس.
    const closeShiftMutation = useMutation({
        mutationFn: async () => {
        if (!id) throw new Error('Shift ID is required');

        if (hasAcceptedApplicant) {
            throw new Error(t('shifts.cancelBlockedAccepted', {
                defaultValue: "Impossible d'annuler : un(e) employé(e) ou freelance a déjà été accepté(e) sur ce shift.",
            }));
        }

        if (eventId) {
            const groupShiftIds = linkedShifts.map((s) => s.id);

            await supabase.from('shift_applications').update({
                status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user?.id ?? '',
            }).in('shift_id', groupShiftIds).in('status', ['applied', 'pending']);

            const { error } = await supabase.from('shifts')
                .update({ status: 'closed' })
                .in('id', groupShiftIds);
            if (error) throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));
        } else {
            await supabase.from('shift_applications').update({
                status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user?.id ?? '',
            }).eq('shift_id', id).in('status', ['applied', 'pending']);

            const { error } = await supabase.from('shifts').update({ status: 'closed' }).eq('id', id);
            if (error) throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'query' }));
        }
    },
        onSuccess: () => {
            toast.success(t('shifts.closeSuccess'));
            queryClient.invalidateQueries({ queryKey: ['shift', id] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['shift-event-group', eventId] });

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
            queryClient.invalidateQueries({ queryKey: ['shift', id] });
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
            queryClient.invalidateQueries({ queryKey: ['shift', id] });
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const sendReminderMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('send-reminder-notification', { body: { shift_id: id } });
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
            const { data: application, error: fetchAppError } = await supabase
                .from('shift_freelancer_applications')
                .select('id, shift_id, freelancer_id, freelance_hourly_rate')
                .eq('id', applicationId)
                .single();
            if (fetchAppError) throw fetchAppError;

            const { ids: groupShiftIds } = await getEventGroupShiftIds(application.shift_id);

            const { data: groupApps, error: groupAppsError } = await supabase
                .from('shift_freelancer_applications')
                .select('id, shift_id')
                .eq('freelancer_id', application.freelancer_id)
                .in('shift_id', groupShiftIds)
                .in('status', ['applied', 'pending']);
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
                const { error: shiftError } = await supabase
                    .from('shifts')
                    .update({ freelance_hourly_rate: application.freelance_hourly_rate })
                    .in('id', groupShiftIds);
                if (shiftError) throw shiftError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applications', id] });
            queryClient.invalidateQueries({ queryKey: ['shift', id] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['shift-event-group'] });
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
                .in('status', ['applied', 'pending']);
            if (groupAppsError) throw groupAppsError;

            const idsToReject = Array.from(new Set([applicationId, ...(groupApps || []).map((a) => a.id)]));

            const { error } = await supabase.from('shift_freelancer_applications').update({
                status: 'rejected', responded_at: new Date().toISOString(),
            }).in('id', idsToReject);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applications', id] });
            queryClient.invalidateQueries({ queryKey: ['shift-event-group'] });
            toast.success(t('shifts.freelancerRejected'));
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const rescheduleShiftMutation = useMutation({
        mutationFn: async (entries: RescheduleEntry[]) => {
            if (entries.length === 0) return;

            for (const entry of entries) {
                const { error } = await supabase
                    .from('shifts')
                    .update({
                        start_time: entry.newStartTime,
                        end_time: entry.newEndTime,
                    })
                    .eq('id', entry.shiftId);
                if (error) {
                    throw new Error(handleSupabaseError(error, { context: 'useShiftDetail', operation: 'reschedule' }));
                }
            }

            const shiftIds = entries.map((e) => e.shiftId);

            const { error: appsError } = await supabase
                .from('shift_applications')
                .delete()
                .in('shift_id', shiftIds)
                .in('status', PENDING_APPLICATION_STATUSES);
            if (appsError) {
                throw new Error(handleSupabaseError(appsError, { context: 'useShiftDetail', operation: 'reschedule' }));
            }

            const { error: freelanceError } = await supabase
                .from('shift_freelancer_applications')
                .delete()
                .in('shift_id', shiftIds)
                .in('status', PENDING_APPLICATION_STATUSES);
            if (freelanceError) {
                throw new Error(handleSupabaseError(freelanceError, { context: 'useShiftDetail', operation: 'reschedule' }));
            }
        },
        onSuccess: () => {
            toast.success(t('shifts.reschedule.success', { defaultValue: 'Le shift a été replanifié avec succès' }));
            queryClient.invalidateQueries({ queryKey: ['shift', id] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['shift-event-group', eventId] });
            queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applications', id] });
            setIsRescheduleDialogOpen(false);
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    const convertToEmployeesMutation = useMutation({
        mutationFn: async (userIds: string[]) => {
            if (!id) throw new Error('Shift ID is required');
            const { data, error } = await (supabase as any).rpc('convert_shift_to_employees', {
                p_shift_id: id,
                p_user_ids: userIds,
            });
            if (error) throw new Error(error.message || handleSupabaseError(error, { context: 'useShiftDetail', operation: 'convertToEmployees' }));

            // Notification push aux employés invités (best-effort : le trigger SQL ne l'envoie que si
            // app.settings.* est configuré). Même payload que notify_employees_of_new_shift.
            try {
                await supabase.functions.invoke('send-push-notification', {
                    body: { shiftId: id, userIds },
                });
            } catch (e) {
                logger.error('convertToEmployees push failed:', e instanceof Error ? e : String(e));
            }
            return data as { shifts_converted: number; employees: number; invitations: number; freelancers_rejected: number };
        },
        onSuccess: (res) => {
            toast.success(
                t('shifts.convert.success', {
                    count: res?.employees ?? 0,
                    defaultValue: `Shift confié à vos employés : ${res?.employees ?? 0} invitation(s) envoyée(s)`,
                })
            );
            queryClient.invalidateQueries({ queryKey: ['shift', id] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['shift-event-group'] });
            queryClient.invalidateQueries({ queryKey: ['shift-freelancer-applications', id] });
            setIsConvertDialogOpen(false);
        },
        onError: (error: Error) => {
            toast.error(error.message || t('common.error'));
        },
    });

    // ✅ جديد — تفعيل / إيقاف الاتصال التلقائي (يشمل كل أيام السلسلة لشيفت event)
    const setAutoCallsMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            if (!id) throw new Error('Shift ID is required');
            const { data, error } = await (supabase as any).rpc('set_shift_auto_calls', {
                p_shift_id: id,
                p_enabled: enabled,
            });
            if (error) throw new Error(error.message || handleSupabaseError(error, { context: 'useShiftDetail', operation: 'setAutoCalls' }));
            return data as AutoCallStatus;
        },
        onSuccess: (res, enabled) => {
            toast.success(
                enabled
                    ? t('shifts.autoCalls.enabledToast', { defaultValue: 'Relance par appel activée' })
                    : t('shifts.autoCalls.disabledToast', { defaultValue: 'Relance par appel arrêtée' })
            );
            queryClient.setQueryData(['shift-auto-call-status', id], res);
            queryClient.invalidateQueries({ queryKey: ['shift', id] });
            queryClient.invalidateQueries({ queryKey: ['shift-event-group', eventId] });
            setIsAutoCallDialogOpen(false);
        },
        onError: (error: Error) => {
            const code = error.message.startsWith('cannot_enable:') ? error.message.split(':')[1] : null;
            toast.error(
                code
                    ? t(`shifts.autoCalls.reasons.${code}`, { defaultValue: AUTO_CALL_REASON_FR[code] || t('common.error') })
                    : error.message || t('common.error')
            );
            queryClient.invalidateQueries({ queryKey: ['shift-auto-call-status', id] });
        },
    });

    return {
        shift,
        isLoading,
        freelancerApplications,
        matchingScores,
        usageStats,
        employeeUsageStats,
        displayStatus,
        duration,
        effectiveDuration,
        totalAssignedStaff,
        isBoostable,
        stats,
        isAdminOrManager,
        navigate,
        t,
        i18n,
        getDateLocale,
        adjustHoursDialogOpen,
        setAdjustHoursDialogOpen,
        isValidateDialogOpen,
        setIsValidateDialogOpen,
        isBoostDialogOpen,
        setIsBoostDialogOpen,
        USAGE_WARNING_THRESHOLD_SHIFTS,
        USAGE_WARNING_THRESHOLD_HOURS,
        eventGroupSummary,
        canReschedule,
        isRescheduleDialogOpen,
        setIsRescheduleDialogOpen,
        rescheduleTargetShifts,
        // ✅ جديد — تُستخدم فـ ShiftHeader لإخفاء زر "Annuler le shift"
        hasAcceptedApplicant,
        // ✅ جديد — تحويل الشيفت إلى موظفي الفرع + المعرّفات المرتبطة (للبطاقة التعويض)
        canConvertToEmployees,
        isConvertDialogOpen,
        setIsConvertDialogOpen,
        relatedShiftIds,
        // ✅ جديد — Relance par appel
        autoCallStatus,
        isAutoCallDialogOpen,
        setIsAutoCallDialogOpen,
        mutations: {
            setAutoCalls: setAutoCallsMutation,
            convertToEmployees: convertToEmployeesMutation,
            assignEmployee: assignEmployeeMutation,
            closeShift: closeShiftMutation,
            reportNoShow: reportNoShowMutation,
            cancelNoShow: cancelNoShowMutation,
            sendReminder: sendReminderMutation,
            acceptFreelancer: acceptFreelancerMutation,
            rejectFreelancer: rejectFreelancerMutation,
            rescheduleShift: rescheduleShiftMutation,
        }
    };
}