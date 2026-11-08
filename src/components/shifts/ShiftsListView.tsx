import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Briefcase,
    List,
    CalendarDays,
    Users as UsersIcon,
    Zap,
    Eye,
    Receipt,
    Monitor,
    Package,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
} from 'lucide-react';
import { BoostShiftDialog } from './BoostShiftDialog';
import { ValidateShiftDialog } from './ValidateShiftDialog';
import { useQueryClient } from '@tanstack/react-query';
import { LocalizedLink as Link } from '@/components/LocalizedLink';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ShiftsCalendarView } from '@/components/shifts/ShiftsCalendarView';
import { ShiftTypeBadge } from '@/components/shifts/ShiftTypeBadge';
import { Shift, ShiftStatus } from '@/api/shifts';
import { DEFAULT_PLATFORM_FEE_RATE } from '@shift-express/shared';
import { getShiftDurationMinutes } from '@/lib/Shifttime' // ✅ جديد — عدّل المسار حسب مكان الملف
import type { Locale } from 'date-fns';
import type { ShiftDisplayItem } from '@/pages/shifts/hooks/useShiftsPage';

type ChipVariant = 'default' | 'secondary' | 'success' | 'danger' | 'warning';

// ✅ timezone افتراضي إن كانت المؤسسة بدون قيمة بعد (مرحلة انتقالية بعد الـ migration)
const DEFAULT_TZ = 'Europe/Paris';

function getEstablishmentTz(shift: Pick<Shift, 'establishment'>): string {
    return (shift.establishment as any)?.timezone || DEFAULT_TZ;
}

interface ShiftsListViewProps {
    canCreate: boolean;
    viewMode: 'list' | 'calendar';
    setViewMode: (mode: 'list' | 'calendar') => void;
    filteredShifts: Shift[];
    displayedShifts: Shift[];
    displayItems: ShiftDisplayItem[];
    getDisplayStatus: (shift: Shift) => ShiftStatus;
    getAssignedStaffCount: (shift: Shift) => number;
    getDateFormat: () => string;
    getDateLocale: () => Locale;
     calculateDuration: (start: string, end: string, breakMinutes: number, establishmentTimezone?: string | null) => string;
    extractTime: (dt: string, establishmentTimezone?: string | null) => string;
    extractDate: (dt: string) => Date;
    setSelectedApplicantsShiftId: (id: string) => void;
    currentPage?: number;
    setCurrentPage?: (page: number) => void;
    totalPages?: number;
    totalItems?: number;
    ITEMS_PER_PAGE?: number;
    hasMore?: boolean;
    loadMore?: () => void;
    statusVariants: Record<ShiftStatus, ChipVariant>;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

// ✅ معاد بناؤها بالكامل: تحسب المدة بتوقيت establishment.timezone
// بدل new Date(shift.start_time).getHours() اللي كانت تعتمد على جهاز المتصفح
function getShiftQuote(shift: Shift) {
    const rate = shift.freelance_hourly_rate || shift.hourly_rate || 0;
    if (rate === 0) return null;

    const timezone = getEstablishmentTz(shift);
    const diffMinutes = getShiftDurationMinutes(shift.start_time, shift.end_time, timezone);

    const breakMinutes = (shift as any).break_duration_minutes || 0;
    const netHours = (diffMinutes - breakMinutes) / 60;

    if (netHours <= 0) return null;

    const staffCount = Math.max(shift.required_employees || 1, 1);
    const feeRate = (shift as any).platform_fee_rate ?? DEFAULT_PLATFORM_FEE_RATE;

    const baseCost = Math.round(rate * netHours * staffCount * 100) / 100;
    const commission = Math.round(baseCost * (feeRate / 100) * 100) / 100;
    const totalTTC = Math.round((baseCost + commission) * 100) / 100;

    return { rate, baseCost, commission, totalTTC, feeRate, netHours, staffCount };
}

function getEventGroupQuote(shifts: Shift[]) {
    let totalBaseCost = 0;
    let totalCommission = 0;
    let totalTTC = 0;
    let rate = 0;
    let feeRate = 0;

    for (const shift of shifts) {
        const q = getShiftQuote(shift);
        if (q) {
            totalBaseCost += q.baseCost;
            totalCommission += q.commission;
            totalTTC += q.totalTTC;
            rate = q.rate;
            feeRate = q.feeRate;
        }
    }

    if (totalTTC === 0) return null;

    return {
        rate,
        baseCost: Math.round(totalBaseCost * 100) / 100,
        commission: Math.round(totalCommission * 100) / 100,
        totalTTC: Math.round(totalTTC * 100) / 100,
        feeRate,
    };
}

function getAggregateStatus(shifts: Shift[], getDisplayStatus: (s: Shift) => ShiftStatus): ShiftStatus {
    const statuses = shifts.map(s => getDisplayStatus(s));
    if (statuses.every(s => s === 'completed' || s === 'closed')) return 'completed';
    if (statuses.every(s => s === 'filled')) return 'filled';
    if (statuses.some(s => s === 'pending')) return 'pending';
    if (statuses.some(s => s === 'partially_filled')) return 'partially_filled';
    if (statuses.some(s => s === 'pending_validation')) return 'pending_validation';
    return statuses[0];
}

// ✅ ملخص التقدّمات لمناوبة واحدة: الإجمالي (كل الحالات) + المعلّق فقط
function getApplicantsSummary(shift: Shift) {
    const allApps = [
        ...(shift.shift_applications || []),
        ...(shift.shift_freelancer_applications || []),
    ];
    const total = allApps.length;
    const pending = allApps.filter(
        (a) => a.status === 'applied' || a.status === 'pending'
    ).length;
    return { total, pending };
}

// ✅ Event Group كيان واحد للتقدّم: نأخذ ملخص أول مناوبة فقط، لا نجمع عبر المناوبات
function getEventApplicantsSummary(shifts: Shift[]) {
    return getApplicantsSummary(shifts[0]);
}

// ✅ زر شارة التقدّمات القابلة لإعادة الاستخدام، مع نبضة تنبيه إذا وُجد معلّق
function ApplicantsBadgeButton({
    total,
    pending,
    label,
    size = 'sm',
    fullWidthMobile = false,
    onClick,
}: {
    total: number;
    pending: number;
    label: string;
    size?: 'sm';
    fullWidthMobile?: boolean;
    onClick: (e: React.MouseEvent) => void;
}) {
    if (total === 0) return null;
    return (
        <Button
            variant="outline"
            size={size}
            className={`relative hover:bg-primary/5 border-primary/30 text-primary ${fullWidthMobile ? 'flex-1' : ''} ${pending > 0 ? 'ring-2 ring-primary/30' : ''}`}
            onClick={onClick}
        >
            <UsersIcon className="w-3.5 h-3.5 mr-1.5" />
            {label} ({total})
            {pending > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[9px] text-primary-foreground items-center justify-center font-bold">
                        {pending}
                    </span>
                </span>
            )}
        </Button>
    );
}

export function ShiftsListView({
    viewMode,
    canCreate,
    setViewMode,
    filteredShifts,
    displayedShifts,
    displayItems,
    getDisplayStatus,
    getAssignedStaffCount,
    getDateFormat,
    getDateLocale,
    calculateDuration,
    extractTime,
    extractDate,
    setSelectedApplicantsShiftId,
    currentPage = 1,
    setCurrentPage,
    totalPages = 1,
    totalItems = 0,
    ITEMS_PER_PAGE = 5,
    hasMore,
    loadMore,
    statusVariants,
}: ShiftsListViewProps) {
    const { t } = useTranslation();
    const { navigate } = useLocale();
    const queryClient = useQueryClient();
    const [boostShift, setBoostShift] = React.useState<Shift | null>(null);
    const [validateShift, setValidateShift] = React.useState<Shift | null>(null);
    const [expandedEvents, setExpandedEvents] = React.useState<Set<string>>(new Set());

    const toggleEvent = (eventId: string) => {
        setExpandedEvents(prev => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
            }
            return next;
        });
    };

    const isBoostable = (shift: Shift) => {
        if (!shift.published_to_freelancers) return false;

        const hasAccepted = [
            ...(shift.shift_applications || []),
            ...(shift.shift_freelancer_applications || [])
        ].some((a) => a.status === 'accepted');

        if (hasAccepted) return false;

        if (shift.boosted_at) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (new Date(shift.boosted_at) > oneHourAgo) return false;
        }

        return true;
    };

    // --- Mobile shift card ---
    const renderMobileShiftCard = (shift: Shift) => {
        const displayStatus = getDisplayStatus(shift);
        const { total: totalApps, pending: pendingCount } = getApplicantsSummary(shift);
        const quote = getShiftQuote(shift);
        const tz = getEstablishmentTz(shift); // ✅ timezone هذا الشيفت تحديداً

        return (
            <div key={shift.id} className="cursor-pointer" onClick={() => navigate(`/shifts/${shift.id}`)}>
                <div className="p-4 bg-card border border-border/60 rounded-lg hover:shadow-md transition-all">
                    {/* Header: badges + rate */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Chip variant={statusVariants[displayStatus]}>{t(`shifts.status.${displayStatus}`)}</Chip>
                            <ShiftTypeBadge
                                publishedToFreelancers={shift.published_to_freelancers}
                                targetsEmployees={shift.targets_employees}
                                variant="full"
                            />
                            {(shift.boost_count ?? 0) > 0 && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                                    <Zap className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">{t('shifts.boosted')}</span>
                                </div>
                            )}
                            {shift.public_id && (
                                <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">
                                    {shift.public_id}
                                </span>
                            )}
                        </div>
                        {quote && (
                            <span className="text-sm font-bold text-primary">{formatCurrency(quote.rate)}/h</span>
                        )}
                    </div>

                    {/* Position */}
                    <h3 className="font-semibold text-foreground mb-1">
                        {shift.position_name || shift.position?.title || t('shifts.undefinedPosition')}
                    </h3>

                    {/* Establishment */}
                    {shift.establishment && (
                        <div className="flex items-center text-xs text-muted-foreground mb-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {shift.establishment.name}
                        </div>
                    )}

                    {/* Required PMS */}
                    {shift.shift_required_pms && shift.shift_required_pms.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mb-2">
                            <Monitor className="w-3 h-3 text-muted-foreground" />
                            {shift.shift_required_pms.map((srp) => (
                                <span key={srp.id} className={`text-[10px] border px-1.5 py-0.5 rounded-full ${
                                    srp.pms.type === 'pms'
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                }`}>
                                    <span className="font-semibold">{srp.pms.type?.toUpperCase()}</span> {srp.pms.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Date / Time / Duration */}
                    <div className="space-y-1.5 text-sm mb-3">
                        <div className="flex items-center text-foreground">
                            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                            {format(extractDate(shift.start_time), getDateFormat(), { locale: getDateLocale() })}
                            <span className="mx-1.5 text-muted-foreground">·</span>
                            <Clock className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                            {extractTime(shift.start_time, tz)} - {extractTime(shift.end_time, tz)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{calculateDuration(shift.start_time, shift.end_time, 0, tz)}</span>
                            <span>·</span>
                            <span className="flex items-center">
                                <UsersIcon className="w-3 h-3 mr-1" />
                                {getAssignedStaffCount(shift)} / {shift.required_employees || 1}
                            </span>
                        </div>
                    </div>

                    {/* Mini devis */}
                    {quote && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10 mb-3">
                            <div className="flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs text-muted-foreground">{t('shifts.quote.totalTTC', { defaultValue: 'Devis TTC' })}</span>
                            </div>
                            <span className="text-sm font-bold text-primary">{formatCurrency(quote.totalTTC)}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                        {shift.status === 'pending_validation' && (
                            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setValidateShift(shift); }}>
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />{t('shifts.validate', { defaultValue: 'Valider' })}
                            </Button>
                        )}
                        <ApplicantsBadgeButton
                            total={totalApps}
                            pending={pendingCount}
                            label={t('shifts.applicants')}
                            fullWidthMobile
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedApplicantsShiftId(shift.public_id || shift.id); }}
                        />
                        {!shift.event_id && isBoostable(shift) && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-amber-200 bg-amber-50/50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBoostShift(shift); }}
                            >
                                <Zap className="w-4 h-4 mr-1.5 fill-current" />{t('shifts.boost.button')}
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" className="flex-1">{t('shifts.viewDetails')}</Button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Desktop shift card ---
    const renderDesktopShiftCard = (shift: Shift) => {
        const displayStatus = getDisplayStatus(shift);
        const allApps = [
            ...(shift.shift_applications || []).filter((a) => a.status !== 'rejected' && a.status !== 'declined'),
            ...(shift.shift_freelancer_applications || []).filter((a) => a.status !== 'rejected' && a.status !== 'declined'),
        ];
        const { total: totalApps, pending: pendingCount } = getApplicantsSummary(shift);
        const pendingApps = allApps.filter(a => a.status === 'applied' || a.status === 'pending');
        const acceptedApps = allApps.filter(a => a.status === 'accepted');
        const quote = getShiftQuote(shift);
        const assignedCount = getAssignedStaffCount(shift);
        const requiredCount = shift.required_employees || 1;
        const tz = getEstablishmentTz(shift); // ✅ timezone هذا الشيفت تحديداً

        return (
            <div key={shift.id} className="cursor-pointer group" onClick={() => navigate(`/shifts/${shift.id}`)}>
                <div className="flex gap-4 p-4 bg-card border border-border/60 rounded-lg hover:shadow-md hover:border-primary/20 transition-all">
                    {/* Left: main info */}
                    <div className="flex-1 min-w-0 space-y-2">
                        {/* Row 1: Badges + ID + Rate */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Chip variant={statusVariants[displayStatus]}>{t(`shifts.status.${displayStatus}`)}</Chip>
                            <ShiftTypeBadge
                                publishedToFreelancers={shift.published_to_freelancers}
                                targetsEmployees={shift.targets_employees}
                                variant="full"
                            />
                            {(shift.boost_count ?? 0) > 0 && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                                    <Zap className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">{t('shifts.boosted')}</span>
                                </div>
                            )}
                            {shift.public_id && (
                                <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-tight">
                                    ID: {shift.public_id}
                                </span>
                            )}
                            {quote && (
                                <span className="ml-auto text-base font-bold text-primary">{formatCurrency(quote.rate)}<span className="text-xs font-normal text-muted-foreground">/h</span></span>
                            )}
                        </div>

                        {/* Row 2: Position title */}
                        <h3 className="text-base font-semibold text-foreground truncate">
                            {shift.position_name || shift.position?.title || t('shifts.undefinedPosition')}
                        </h3>

                        {/* Row 3: Establishment */}
                        {shift.establishment && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                {shift.establishment.name}
                            </div>
                        )}

                        {/* Row 3b: Required PMS/POS */}
                        {shift.shift_required_pms && shift.shift_required_pms.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                                {shift.shift_required_pms.map((srp) => (
                                    <span key={srp.id} className={`text-[11px] border px-2 py-0.5 rounded-full ${
                                        srp.pms.type === 'pms'
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    }`}>
                                        <span className="font-semibold">{srp.pms.type?.toUpperCase()}</span> {srp.pms.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Row 4: Date + Time + Duration + Staff */}
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                            <div className="flex items-center text-foreground">
                                <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                {format(extractDate(shift.start_time), getDateFormat(), { locale: getDateLocale() })}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                {extractTime(shift.start_time, tz)} - {extractTime(shift.end_time, tz)}
                            </div>
                            <div className="text-muted-foreground">
                                {calculateDuration(shift.start_time, shift.end_time, 0, tz)}
                            </div>
                            <div className={`flex items-center font-medium ${assignedCount >= requiredCount ? 'text-green-600' : assignedCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                <UsersIcon className="w-3.5 h-3.5 mr-1" />
                                {assignedCount} / {requiredCount}
                            </div>
                        </div>

                        {/* Row 5: Actions */}
                        <div className="flex items-center gap-2 pt-1">
                            <Link to={`/shifts/${shift.id}`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="sm">
                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                    {t('shifts.viewDetails')}
                                </Button>
                            </Link>
                            {shift.status === 'pending_validation' && (
                                <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setValidateShift(shift);
                                    }}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                    {t('shifts.validate', { defaultValue: 'Valider' })}
                                </Button>
                            )}
                            <ApplicantsBadgeButton
                                total={totalApps}
                                pending={pendingCount}
                                label={t('shifts.applicants')}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedApplicantsShiftId(shift.public_id || shift.id);
                                }}
                            />
                            {!shift.event_id && isBoostable(shift) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-amber-200 bg-amber-50/50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setBoostShift(shift);
                                    }}
                                >
                                    <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                    {t('shifts.boost.button')}
                                </Button>
                            )}
                        {/* Applicants preview (up to 4) */}
                        {pendingApps.length > 0 && (
                            <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                                <span className="text-xs text-muted-foreground mr-1">{t('shifts.pendingApplicants', { defaultValue: 'Candidats' })} :</span>
                                <div className="flex -space-x-2">
                                    {pendingApps.slice(0, 4).map((app, i) => {
                                        const fa = (app as any).freelancer;
                                        const ua = (app as any).user;
                                        const name = fa ? `${fa.first_name || ''} ${fa.last_name || ''}`.trim() : ua ? `${ua.first_name || ''} ${ua.last_name || ''}`.trim() : '?';
                                        const photo = fa?.profile_photo_url;
                                        return (
                                            <div key={i} className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden" title={name}>
                                                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : name.substring(0, 2).toUpperCase()}
                                            </div>
                                        );
                                    })}
                                </div>
                                {pendingApps.length > 4 && (
                                    <span className="text-xs text-muted-foreground">+{pendingApps.length - 4}</span>
                                )}
                                <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setSelectedApplicantsShiftId(shift.public_id || shift.id)}>
                                    {t('shifts.viewAll', { defaultValue: 'Voir tout' })}
                                </Button>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Right panels */}
                    <div className="flex gap-3 shrink-0">
                        {/* Accepted workers panel */}
                        {acceptedApps.length > 0 && (
                            <div className="w-44 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 flex flex-col gap-2">
                                <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">{t('shifts.assignedWorkers', { defaultValue: 'Affectés' })}</p>
                                {acceptedApps.slice(0, 3).map((app, i) => {
                                    const fa = (app as any).freelancer;
                                    const ua = (app as any).user;
                                    const name = fa ? `${fa.first_name || ''} ${fa.last_name || ''}`.trim() : ua ? `${ua.first_name || ''} ${ua.last_name || ''}`.trim() : '?';
                                    const photo = fa?.profile_photo_url;
                                    const profilePath = fa ? `/freelancers/${fa.id}` : null;
                                    return (
                                        <div key={i} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 overflow-hidden shrink-0">
                                                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium text-foreground truncate">{name}</p>
                                                {profilePath && (
                                                    <Link to={profilePath} onClick={(e) => e.stopPropagation()} className="text-[10px] text-emerald-600 hover:underline">
                                                        Voir le profil
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Quote panel */}
                        {quote && (
                            <div className="w-48 rounded-lg border border-primary/15 bg-gradient-to-b from-primary/5 to-primary/10 p-4 flex flex-col justify-center">
                                <div className="text-center mb-3">
                                    <p className="text-2xl font-bold text-primary">{formatCurrency(quote.totalTTC)}</p>
                                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t('shifts.quote.totalTTC', { defaultValue: 'Devis Total TTC' })}</p>
                            </div>
                            <div className="border-t border-primary/10 pt-2 space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{t('shifts.quote.candidate', { defaultValue: 'Candidat' })}</span>
                                    <span className="font-medium text-foreground">{formatCurrency(quote.baseCost)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-emerald-600 dark:text-emerald-400">{t('shifts.quote.commission', { defaultValue: 'Commission' })} ({quote.feeRate}%)</span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(quote.commission)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </div>
        );
    };

    // --- Mobile event group ---
    const renderMobileEventGroup = (eventId: string, shifts: Shift[]) => {
        const isOpen = expandedEvents.has(eventId);
        const firstShift = shifts[0];
        const lastShift = shifts[shifts.length - 1];
        const aggStatus = getAggregateStatus(shifts, getDisplayStatus);
        const eventQuote = getEventGroupQuote(shifts);
        const { total: totalApps, pending: pendingCount } = getEventApplicantsSummary(shifts);
        // Event = single mission for 1 person, use first shift's requirement
        const assignedCount = Math.max(...shifts.map(s => getAssignedStaffCount(s)));
        const requiredCount = firstShift.required_employees || 1;
        const anyBoostable = shifts.some(s => isBoostable(s));
        const tz = getEstablishmentTz(firstShift); // ✅ نفس المؤسسة عادة لكل شيفتات الحدث

        return (
            <div key={eventId}>
                <div className="p-4 bg-card border border-border/60 rounded-lg hover:shadow-md transition-all">
                    {/* Header: badges + rate */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Chip variant={statusVariants[aggStatus]}>{t(`shifts.status.${aggStatus}`)}</Chip>
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
                                <Package className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300">{t('shifts.eventBadge')}</span>
                            </div>
                            <ShiftTypeBadge
                                publishedToFreelancers={firstShift.published_to_freelancers}
                                targetsEmployees={firstShift.targets_employees}
                                variant="full"
                            />
                        </div>
                        {eventQuote && (
                            <span className="text-sm font-bold text-primary">{formatCurrency(eventQuote.rate)}/h</span>
                        )}
                    </div>

                    {/* Position */}
                    <h3 className="font-semibold text-foreground mb-1">
                        {firstShift.position_name || firstShift.position?.title || t('shifts.undefinedPosition')}
                    </h3>

                    {/* Establishment */}
                    {firstShift.establishment && (
                        <div className="flex items-center text-xs text-muted-foreground mb-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {firstShift.establishment.name}
                        </div>
                    )}

                    {/* Date range / Time / Duration */}
                    <div className="space-y-1.5 text-sm mb-3">
                        <div className="flex items-center text-foreground">
                            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                            {format(extractDate(firstShift.start_time), getDateFormat(), { locale: getDateLocale() })}
                            {' → '}
                            {format(extractDate(lastShift.start_time), getDateFormat(), { locale: getDateLocale() })}
                            <span className="mx-1.5 text-muted-foreground">·</span>
                            <Clock className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                            {extractTime(firstShift.start_time, tz)} - {extractTime(firstShift.end_time, tz)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{t('shifts.eventGroup.shifts', { count: shifts.length })}</span>
                            <span>·</span>
                            <span className="flex items-center">
                                <UsersIcon className="w-3 h-3 mr-1" />
                                {assignedCount} / {requiredCount}
                            </span>
                        </div>
                    </div>

                    {/* Combined devis */}
                    {eventQuote && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10 mb-3">
                            <div className="flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs text-muted-foreground">{t('shifts.quote.totalTTC', { defaultValue: 'Devis TTC' })}</span>
                            </div>
                            <span className="text-sm font-bold text-primary">{formatCurrency(eventQuote.totalTTC)}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                        {anyBoostable && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-amber-200 bg-amber-50/50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                onClick={() => setBoostShift(firstShift)}
                            >
                                <Zap className="w-4 h-4 mr-1.5 fill-current" />{t('shifts.boost.button')}
                            </Button>
                        )}
                        {/* ✅ زر واحد يعرض الملخص الإجمالي ويفتح كرود المناوبات الفردية بالأسفل */}
                        <div className="flex-1 relative">
                            <Button
                                variant="outline"
                                size="sm"
                                className={`w-full ${pendingCount > 0 ? 'ring-2 ring-primary/30 border-primary/40' : ''}`}
                                onClick={() => toggleEvent(eventId)}
                            >
                                <Eye className="w-4 h-4 mr-1.5" />
                                {t('shifts.viewDetails')}
                                {totalApps > 0 && (
                                    <span className="ml-1.5 inline-flex items-center gap-1">
                                        <UsersIcon className="w-3.5 h-3.5" />
                                        {totalApps}
                                    </span>
                                )}
                                <ChevronDown className={`w-4 h-4 ml-1.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </Button>
                            {pendingCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[9px] text-primary-foreground items-center justify-center font-bold">
                                        {pendingCount}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expanded: individual shift cards */}
                {isOpen && (
                    <div className="ml-4 border-l-2 border-indigo-200 dark:border-indigo-800 pl-3 mt-2 space-y-3">
                        {shifts.map(shift => renderMobileShiftCard(shift))}
                    </div>
                )}
            </div>
        );
    };

    // --- Desktop event group ---
    const renderDesktopEventGroup = (eventId: string, shifts: Shift[]) => {
        const isOpen = expandedEvents.has(eventId);
        const firstShift = shifts[0];
        const lastShift = shifts[shifts.length - 1];
        const aggStatus = getAggregateStatus(shifts, getDisplayStatus);
        const eventQuote = getEventGroupQuote(shifts);
        const { total: totalApps, pending: pendingCount } = getEventApplicantsSummary(shifts);
        // Event = single mission for 1 person, use first shift's requirement
        const assignedCount = Math.max(...shifts.map(s => getAssignedStaffCount(s)));
        const requiredCount = firstShift.required_employees || 1;
        const anyBoostable = shifts.some(s => isBoostable(s));
        const tz = getEstablishmentTz(firstShift); // ✅ نفس المؤسسة عادة لكل شيفتات الحدث

        return (
            <div key={eventId}>
                <div className="flex gap-4 p-4 bg-card border border-border/60 rounded-lg hover:shadow-md hover:border-primary/20 transition-all">
                    {/* Left: main info */}
                    <div className="flex-1 min-w-0 space-y-2">
                        {/* Row 1: Badges + Rate */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Chip variant={statusVariants[aggStatus]}>{t(`shifts.status.${aggStatus}`)}</Chip>
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
                                <Package className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300">{t('shifts.eventBadge')}</span>
                            </div>
                            <ShiftTypeBadge
                                publishedToFreelancers={firstShift.published_to_freelancers}
                                targetsEmployees={firstShift.targets_employees}
                                variant="full"
                            />
                            {eventQuote && (
                                <span className="ml-auto text-base font-bold text-primary">{formatCurrency(eventQuote.rate)}<span className="text-xs font-normal text-muted-foreground">/h</span></span>
                            )}
                        </div>

                        {/* Row 2: Position title */}
                        <h3 className="text-base font-semibold text-foreground truncate">
                            {firstShift.position_name || firstShift.position?.title || t('shifts.undefinedPosition')}
                        </h3>

                        {/* Row 3: Establishment */}
                        {firstShift.establishment && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                {firstShift.establishment.name}
                            </div>
                        )}

                        {/* Row 4: Date range + Time + Count + Staff */}
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                            <div className="flex items-center text-foreground">
                                <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                {format(extractDate(firstShift.start_time), getDateFormat(), { locale: getDateLocale() })}
                                {' → '}
                                {format(extractDate(lastShift.start_time), getDateFormat(), { locale: getDateLocale() })}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                {extractTime(firstShift.start_time, tz)} - {extractTime(firstShift.end_time, tz)}
                            </div>
                            <div className="text-muted-foreground">
                                {t('shifts.eventGroup.shifts', { count: shifts.length })}
                            </div>
                            <div className={`flex items-center font-medium ${assignedCount >= requiredCount ? 'text-green-600' : assignedCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                <UsersIcon className="w-3.5 h-3.5 mr-1" />
                                {assignedCount} / {requiredCount}
                            </div>
                        </div>

                        {/* Row 5: Actions */}
                        <div className="flex items-center gap-2 pt-1">
                            {/* ✅ زر واحد يعرض الملخص الإجمالي ويفتح كرود المناوبات الفردية بالأسفل */}
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={pendingCount > 0 ? 'ring-2 ring-primary/30 border-primary/40' : ''}
                                    onClick={() => toggleEvent(eventId)}
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                    {t('shifts.viewDetails')}
                                    {totalApps > 0 && (
                                        <span className="ml-1.5 inline-flex items-center gap-1">
                                            <UsersIcon className="w-3.5 h-3.5" />
                                            {totalApps}
                                        </span>
                                    )}
                                    <ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </Button>
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[9px] text-primary-foreground items-center justify-center font-bold">
                                            {pendingCount}
                                        </span>
                                    </span>
                                )}
                            </div>
                            {anyBoostable && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-amber-200 bg-amber-50/50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                    onClick={() => setBoostShift(firstShift)}
                                >
                                    <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                    {t('shifts.boost.button')}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Right: Combined Quote panel */}
                    {eventQuote && (
                        <div className="w-52 flex-shrink-0 rounded-lg border border-primary/15 bg-gradient-to-b from-primary/5 to-primary/10 p-4 flex flex-col justify-center">
                            <div className="text-center mb-3">
                                <p className="text-2xl font-bold text-primary">{formatCurrency(eventQuote.totalTTC)}</p>
                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t('shifts.quote.totalTTC', { defaultValue: 'Devis Total TTC' })}</p>
                            </div>
                            <div className="border-t border-primary/10 pt-2 space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{t('shifts.quote.candidate', { defaultValue: 'Candidat' })}</span>
                                    <span className="font-medium text-foreground">{formatCurrency(eventQuote.baseCost)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-emerald-600 dark:text-emerald-400">{t('shifts.quote.commission', { defaultValue: 'Commission' })} ({eventQuote.feeRate}%)</span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(eventQuote.commission)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Expanded: individual shift cards */}
                {isOpen && (
                    <div className="ml-6 border-l-2 border-indigo-200 dark:border-indigo-800 pl-4 mt-2 space-y-3">
                        {shifts.map(shift => renderDesktopShiftCard(shift))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card className="border-border/60 shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/20">
                <span className="text-sm font-medium text-muted-foreground">
                    {filteredShifts.length > 1 ? t('shifts.countPlural', { count: filteredShifts.length }) : t('shifts.count', { count: filteredShifts.length })}
                    {viewMode === 'list' && displayedShifts.length < filteredShifts.length && (
                        <span className="ml-1">
                            ({t('shifts.displaying', { displayed: displayedShifts.length, total: filteredShifts.length })})
                        </span>
                    )}
                </span>

                <div className="hidden md:flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/60">
                    <button
                        onClick={() =>{
                          localStorage.setItem('viewMode', 'list');
                          setViewMode('list');}
                           }
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        title="Vue liste"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                          onClick={() =>{
                          localStorage.setItem('viewMode', 'calendar');
                          setViewMode('calendar');}
                           }
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        title="Vue calendrier"
                    >
                        <CalendarDays className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <CardContent className="p-0">
                {viewMode === 'calendar' ? (
                    <ShiftsCalendarView
                    canCreate={canCreate}
                        shifts={filteredShifts}
                        getDisplayStatus={getDisplayStatus}
                        statusVariants={statusVariants}
                    />
                ) : displayItems.length === 0 ? (
                    <div className="text-center py-12 px-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                            <Briefcase className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">{t('shifts.noResults')}</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="lg:hidden space-y-3 p-4">
                            {displayItems.map((item) => (
                                item.type === 'event'
                                    ? renderMobileEventGroup(item.eventId, item.shifts)
                                    : renderMobileShiftCard(item.shift)
                            ))}
                        </div>

                        {/* Desktop Card View */}
                        <div className="hidden lg:block space-y-3 p-4">
                            {displayItems.map((item) => (
                                item.type === 'event'
                                    ? renderDesktopEventGroup(item.eventId, item.shifts)
                                    : renderDesktopShiftCard(item.shift)
                            ))}
                        </div>

                        {totalPages > 1 && setCurrentPage && (
                            <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} {t('common.of', { defaultValue: 'sur' })} {totalItems}
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                                        .reduce<(number | string)[]>((acc, page, idx, arr) => {
                                            if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('...');
                                            acc.push(page);
                                            return acc;
                                        }, [])
                                        .map((item, idx) =>
                                            typeof item === 'string' ? (
                                                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">...</span>
                                            ) : (
                                                <Button
                                                    key={item}
                                                    variant={item === currentPage ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(item)}
                                                    className="w-9"
                                                >
                                                    {item}
                                                </Button>
                                            )
                                        )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>

            <BoostShiftDialog
                shift={boostShift}
                isOpen={!!boostShift}
                onClose={() => setBoostShift(null)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['shifts'] });
                }}
            />

            <ValidateShiftDialog
                shift={validateShift}
                isOpen={!!validateShift}
                onClose={() => setValidateShift(null)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['shifts'] });
                    setValidateShift(null);
                }}
            />
        </Card>
    );
}