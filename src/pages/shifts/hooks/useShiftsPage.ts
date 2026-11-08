import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { calculateUsage } from '@shared/subscription-limits';
import { formatTimeUTC } from '@/utils/formatTime';
import { fetchShifts, ShiftStatus, Shift } from '@/api/shifts';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';
import { Locale } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export type ShiftTab = 'all' | 'sent' | 'applications' | 'filled' | 'pending_validation' | 'completed';
export type DateRange = 'today' | '7d' | '30d' | '90d' | 'custom';
// ✅ جديد — فلتر نوع الشيفت
export type ShiftTypeFilter = 'all' | 'freelance' | 'employee';

export type ShiftDisplayItem =
    | { type: 'shift'; shift: Shift }
    | { type: 'event'; eventId: string; shifts: Shift[] };

// ✅ جديد — موظف متاح للفلترة (مبني من employees + users)
// avatarUrl: users.avatar_url — لعرض صورته فـ dropdown الفلتر (بدل الحرف الأول فقط)
export interface FilterableEmployee {
    userId: string;
    name: string;
    email: string;
    avatarUrl: string | null;
}

export function useShiftsPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const company = useAuthStore((state) => state.company);
    const { selectedEstablishmentId } = useEstablishmentStore();

    useEffect(() => {
        if (!company?.id) return;
        const channel = supabase
            .channel('shifts-list-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `company_id=eq.${company.id}` },
                () => queryClient.invalidateQueries({ queryKey: ['shifts'] }))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_applications' },
                () => queryClient.invalidateQueries({ queryKey: ['shifts'] }))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_freelancer_applications' },
                () => queryClient.invalidateQueries({ queryKey: ['shifts'] }))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [company?.id, queryClient]);

    const [activeTab, setActiveTab] = useState<ShiftTab>('all');
    const [dateRange, setDateRange] = useState<DateRange>('90d');
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 3;

    // ✅ جديد — فلتر نوع الشيفت (الكل / فريلانس / موظف) + فلتر فرعي باسم الموظف
    const [shiftTypeFilter, setShiftTypeFilter] = useState<ShiftTypeFilter>('all');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'list' | 'calendar'>(() => {
        if (window.innerWidth < 1024) return 'list';
        const saved = localStorage.getItem('viewMode');
        return saved === 'list' || saved === 'calendar' ? saved : 'list';
    });

    const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
    const [selectedApplicantsShiftId, setSelectedApplicantsShiftId] = useState<string | null>(null);

    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

    const { data: usage } = useQuery({
        queryKey: ['plan-usage', company?.id, selectedEstablishmentId],
        queryFn: async () => {
            if (!company?.id) return null;
            const { count: establishmentsCount } = await supabase
                .from('establishments')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .eq('status', 'active');

            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            let shiftsQuery = supabase
                .from('shifts')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .gte('created_at', monthStart);
            if (selectedEstablishmentId) shiftsQuery = shiftsQuery.eq('establishment_id', selectedEstablishmentId);
            const { count: shiftsCount } = await shiftsQuery;

            let employeesQuery = supabase
                .from('employees')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id);
            if (selectedEstablishmentId) employeesQuery = employeesQuery.eq('establishment_id', selectedEstablishmentId);
            const { count: employeesCount } = await employeesQuery;

            return calculateUsage(
                establishmentsCount || 0,
                shiftsCount || 0,
                employeesCount || 0,
                company.subscription_plan || 'free'
            );
        },
        enabled: !!company?.id,
    });

    const getDateLocale = useCallback((): Locale => {
        const localeMap: Record<string, Locale> = { fr, en: enUS, es, it, zh: zhCN };
        return localeMap[i18n.language] || enUS;
    }, [i18n.language]);

    const getDateFormat = useCallback((): string => {
        const formatMap: Record<string, string> = {
            en: 'MMM dd, yyyy', fr: 'dd MMM yyyy', es: 'dd MMM yyyy',
            it: 'dd MMM yyyy', zh: 'yyyy年MM月dd日',
        };
        return formatMap[i18n.language] || 'MMM dd, yyyy';
    }, [i18n.language]);

    const now = useMemo(() => new Date(), []);

    const rangeStartDate = useMemo(() => {
        if (dateRange === 'custom' && customStartDate && customEndDate) return customStartDate;
        if (dateRange === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const daysCount = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        return new Date(now.getTime() - daysCount * 24 * 60 * 60 * 1000);
    }, [dateRange, customStartDate, customEndDate, now]);

    useEffect(() => { setCurrentPage(1); }, [activeTab, dateRange, customStartDate, customEndDate, shiftTypeFilter, selectedEmployeeId]);

    // ✅ إذا رجعنا لفلتر "الكل" أو "فريلانس"، الفلتر الفرعي (موظف محدد) ما عاد له معنى
    useEffect(() => {
        if (shiftTypeFilter !== 'employee') setSelectedEmployeeId(null);
    }, [shiftTypeFilter]);

    const { data: shifts = [], isLoading, error } = useQuery({
        queryKey: ['shifts', dateRange, customStartDate, customEndDate, company?.id, user?.role, selectedEstablishmentId],
        queryFn: async () => {
            if (!company?.id) return [];
            return fetchShifts({
                companyId: company.id,
                userRole: user?.role,
                assignedEstablishmentId: user?.assigned_establishment_id,
                selectedEstablishmentId,
                status: 'all',
                startDate: rangeStartDate,
                endDate: customEndDate || undefined,
            });
        },
        enabled: !!company?.id,
    });

    // ✅ جديد — liste des employés de l'entreprise, pour le filtre "par employé"
    // Construite à partir de employees (company_id) + users (nom/email/avatar_url)
    // avatar_url ajouté pour afficher la photo de l'employé dans le dropdown du filtre.
    const { data: filterableEmployees = [] } = useQuery({
        queryKey: ['filterable-employees', company?.id],
        queryFn: async (): Promise<FilterableEmployee[]> => {
            if (!company?.id) return [];
            const { data, error } = await supabase
                .from('employees')
                .select('user_id, users:user_id(id, first_name, last_name, full_name, email, avatar_url)')
                .eq('company_id', company.id)
                .eq('active', true);

            if (error) throw error;

            return (data || [])
                .map((row: any) => {
                    const u = row.users;
                    if (!u) return null;
                    return {
                        userId: u.id,
                        name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
                        email: u.email,
                        avatarUrl: u.avatar_url || null,
                    };
                })
                .filter(Boolean) as FilterableEmployee[];
        },
        enabled: !!company?.id && isAdminOrManager,
    });

    const getAssignedStaffCount = useCallback((shift: Shift): number => {
        const acceptedEmployees = (shift.shift_applications || []).filter((a) => a.status === 'accepted').length;
        const acceptedFreelancers = (shift.shift_freelancer_applications || []).filter((a) => a.status === 'accepted').length;
        return acceptedEmployees + acceptedFreelancers;
    }, []);

    const hasPendingApplications = useCallback((shift: Shift): boolean => {
        const pendingEmployees = (shift.shift_applications || []).filter((a) => a.status === 'applied').length;
        const pendingFreelancers = (shift.shift_freelancer_applications || []).filter((a) => a.status === 'applied').length;
        return pendingEmployees > 0 || pendingFreelancers > 0;
    }, []);

    const getDisplayStatus = useCallback((shift: Shift): ShiftStatus => {
        if (['canceled', 'closed', 'completed', 'pending_validation', 'filled', 'expired'].includes(shift.status)) {
            return shift.status as ShiftStatus;
        }
        const assignedCount = getAssignedStaffCount(shift);
        const required = shift.required_employees || 1;
        if (assignedCount >= required) return 'filled';
        if (hasPendingApplications(shift) || assignedCount > 0) return 'partially_filled';
        return 'pending';
    }, [getAssignedStaffCount, hasPendingApplications]);

    // ─── Helpers مشتركة ──────────────────────────────────────────────────────

    const isShiftPast = useCallback((s: Shift) => new Date(s.end_time) < new Date(), []);

    const isTerminalStatus = useCallback((status: ShiftStatus) =>
        status === 'completed' || status === 'closed' || status === 'expired' || status === 'canceled',
    []);

    const isEventFullyDone = useCallback((eventId: string) => {
        const siblings = shifts.filter(s => s.event_id === eventId);
        return siblings.every(s => {
            const st = getDisplayStatus(s);
            return isTerminalStatus(st) || isShiftPast(s);
        });
    }, [shifts, getDisplayStatus, isTerminalStatus, isShiftPast]);

    // ✅ معدّل — un shift "appartient" à un employé s'il a UNE candidature
    // dans shift_applications, quel que soit son statut : en attente
    // (applied), acceptée (accepted), refusée (rejected/declined) OU
    // retirée après acceptation (withdrawn). Avant, seuls applied/accepted
    // comptaient — un shift dont l'employé s'était désisté ou avait été
    // refusé disparaissait du filtre par employé, alors que le client veut
    // voir tout l'historique de cet employé, quelle que soit l'issue.
    const shiftBelongsToEmployee = useCallback((shift: Shift, employeeUserId: string): boolean => {
        return (shift.shift_applications || []).some(
            (a) => a.user?.id === employeeUserId
        );
    }, []);

    // ─── filteredShifts ───────────────────────────────────────────────────────

    const filteredShifts = useMemo(() => {
        const filtered = shifts.filter((shift) => {
            const displayStatus = getDisplayStatus(shift);
            const past          = isShiftPast(shift);
            const terminal      = isTerminalStatus(displayStatus);

            // ✅ جديد — فلتر نوع الشيفت (فريلانس / موظف)
            if (shiftTypeFilter === 'freelance' && !shift.published_to_freelancers) return false;
            if (shiftTypeFilter === 'employee' && !shift.targets_employees) return false;

            // ✅ جديد — فلتر فرعي: موظف محدد بالاسم
            if (shiftTypeFilter === 'employee' && selectedEmployeeId) {
                if (!shiftBelongsToEmployee(shift, selectedEmployeeId)) return false;
            }

            switch (activeTab) {
                case 'all': {

                    if (terminal || past) return false;
                    if (shift.event_id) return !isEventFullyDone(shift.event_id);
                    return true;
                }
                case 'sent':               return displayStatus === 'pending';
                case 'applications':       return displayStatus === 'partially_filled';
                case 'filled':             return displayStatus === 'filled';
                case 'pending_validation': return displayStatus === 'pending_validation';
                case 'completed': {
                     if (!terminal && !past) return false;
                     if (displayStatus === 'canceled') return false;
                     if (shift.event_id) return isEventFullyDone(shift.event_id);
                    return true;
                }
                default: return true;
            }
        });

        // ✅ عند فلترة "موظف محدد"، نعرض تاريخه الكامل (كل الحالات) بلا تفعيل
        // terminal/past exclusion لتبويب "all" — نُبقي المنطق أعلاه كما هو، لكن
        // إذا selectedEmployeeId محدد، الأولوية لعرض كل شيفت له علاقة بالموظف
        // حتى لو كان منتهي/منسحب/مرفوض، بدل الالتزام الصارم بمنطق activeTab.
        if (shiftTypeFilter === 'employee' && selectedEmployeeId && activeTab === 'all') {
            return shifts
                .filter((shift) => shift.targets_employees && shiftBelongsToEmployee(shift, selectedEmployeeId))
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        }

        return filtered.sort((a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
    }, [shifts, activeTab, getDisplayStatus, isShiftPast, isTerminalStatus, isEventFullyDone, shiftTypeFilter, selectedEmployeeId, shiftBelongsToEmployee]);

    // ─── tabCounts ────────────────────────────────────────────────────────────
    // ✅ ملاحظة: tabCounts يُحسب على شيفتات مفلترة بنوع الشيفت أيضاً، حتى تبقى
    // الأعداد متسقة مع ما يظهر فعلياً عند تفعيل shiftTypeFilter

    const shiftsForCounts = useMemo(() => {
        if (shiftTypeFilter === 'all') return shifts;
        return shifts.filter((shift) => {
            if (shiftTypeFilter === 'freelance') return !!shift.published_to_freelancers;
            if (shiftTypeFilter === 'employee') {
                if (!shift.targets_employees) return false;
                if (selectedEmployeeId) return shiftBelongsToEmployee(shift, selectedEmployeeId);
                return true;
            }
            return true;
        });
    }, [shifts, shiftTypeFilter, selectedEmployeeId, shiftBelongsToEmployee]);

    const tabCounts = useMemo(() => {
        const counts = { all: 0, sent: 0, applications: 0, filled: 0, pending_validation: 0, completed: 0 };

        shiftsForCounts.forEach((shift) => {
            const displayStatus = getDisplayStatus(shift);
            const past          = isShiftPast(shift);
            const terminal      = isTerminalStatus(displayStatus);

            if (displayStatus === 'pending_validation') {
                counts.pending_validation++;
                return;
            }

            // منتهية (terminal أو past) → completed فقط، عدا canceled
            if (terminal || past) {
                if (displayStatus !== 'canceled') counts.completed++;
                return;
            }

            // نشطة → all + tab الخاص
            counts.all++;
            if (displayStatus === 'pending')          counts.sent++;
            if (displayStatus === 'partially_filled') counts.applications++;
            if (displayStatus === 'filled')           counts.filled++;
        });

        return counts;
    }, [shiftsForCounts, getDisplayStatus, isShiftPast, isTerminalStatus]);

    // ─── displayItems ─────────────────────────────────────────────────────────

    const displayItems = useMemo((): ShiftDisplayItem[] => {
        const eventGroups = new Map<string, Shift[]>();
        const items: ShiftDisplayItem[] = [];

        for (const shift of filteredShifts) {
            if (shift.event_id) {
                if (!eventGroups.has(shift.event_id)) eventGroups.set(shift.event_id, []);
                eventGroups.get(shift.event_id)!.push(shift);
            } else {
                items.push({ type: 'shift', shift });
            }
        }

        for (const [eventId, eventShifts] of eventGroups) {
            const sorted = [...eventShifts].sort((a, b) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );
            items.push({ type: 'event', eventId, shifts: sorted });
        }

        items.sort((a, b) => {
            const aTime = a.type === 'shift'
                ? new Date(a.shift.start_time).getTime()
                : new Date(a.shifts[0].start_time).getTime();
            const bTime = b.type === 'shift'
                ? new Date(b.shift.start_time).getTime()
                : new Date(b.shifts[0].start_time).getTime();
            return activeTab === 'completed' ? bTime - aTime : aTime - bTime;
        });

        return items;
    }, [filteredShifts, activeTab]);

    const totalPages    = Math.max(1, Math.ceil(displayItems.length / ITEMS_PER_PAGE));
    const displayedItems = useMemo(() =>
        displayItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [displayItems, currentPage, ITEMS_PER_PAGE]
    );
    const displayedShifts = useMemo(() =>
        filteredShifts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [filteredShifts, currentPage, ITEMS_PER_PAGE]
    );

    return {
        t, i18n, navigate, usage, isAdminOrManager,
        activeTab, setActiveTab,
        dateRange, setDateRange,
        customStartDate, setCustomStartDate,
        customEndDate, setCustomEndDate,
        // ✅ جديد
        shiftTypeFilter, setShiftTypeFilter,
        selectedEmployeeId, setSelectedEmployeeId,
        filterableEmployees,
        viewMode, setViewMode,
        selectedShiftId, setSelectedShiftId,
        selectedApplicantsShiftId, setSelectedApplicantsShiftId,
        isLoading, error, shifts, filteredShifts,
        displayedShifts, displayedItems, displayItems,
        tabCounts, currentPage, setCurrentPage,
        totalPages, totalItems: displayItems.length, ITEMS_PER_PAGE,
        getDisplayStatus, getAssignedStaffCount, hasPendingApplications,
        getDateLocale, getDateFormat,
    };
}