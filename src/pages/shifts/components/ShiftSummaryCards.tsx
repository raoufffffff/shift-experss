import { useMemo } from 'react';
import { Clock, Banknote, Users, Link2, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { format } from 'date-fns';
import { DEFAULT_PLATFORM_FEE_RATE } from '@shift-express/shared';
import type { Shift } from '../../../components/shifts/shift-detail/types';
import type { EventGroupSummary } from '../hooks/useShiftDetail';

interface ShiftSummaryCardsProps {
    shift: Shift;
    totalAssignedStaff: number;
    effectiveDuration: number;
    formatDuration: (d: number) => string;
    t: (key: string, options?: Record<string, unknown>) => string;
    i18n: { language: string };
    // ✅ optionnel : présent uniquement si le shift fait partie d'une série (event_id)
    eventGroupSummary?: EventGroupSummary | null;
}

export function ShiftSummaryCards({
    shift,
    totalAssignedStaff,
    effectiveDuration,
    formatDuration,
    t,
    i18n,
    eventGroupSummary,
}: ShiftSummaryCardsProps) {
    const isGrouped = !!eventGroupSummary && eventGroupSummary.daysCount > 1;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(amount);

    // ✅ Coût affiché : agrégé sur toute la série si groupée, sinon comportement d'origine
    const estimatedCost = useMemo(() => {
        if (isGrouped && eventGroupSummary) {
            return formatCurrency(eventGroupSummary.totalCost);
        }
        const rate = shift.freelance_hourly_rate || shift.hourly_rate || 0;
        const total = effectiveDuration * rate;
        return formatCurrency(total);
    }, [shift, effectiveDuration, i18n.language, isGrouped, eventGroupSummary]);

    // ✅ Durée affichée : somme des heures nettes de la série si groupée
    const durationLabel = isGrouped && eventGroupSummary
        ? `${formatDuration(eventGroupSummary.totalNetHours)}`
        : formatDuration(effectiveDuration);

    const hourlyRate = isGrouped && eventGroupSummary
        ? eventGroupSummary.hourlyRate
        : (shift.freelance_hourly_rate || 0);

    const fillPercentage = shift.required_employees
        ? (totalAssignedStaff / shift.required_employees) * 100
        : 0;

    return (
        <div className="space-y-4 mb-8">
            {/* ✅ Bandeau "vacation étendue" — visible seulement si la série a plus d'un jour */}
            {isGrouped && eventGroupSummary && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-sm text-blue-700 dark:text-blue-400">
                    <Link2 className="w-4 h-4 shrink-0" />
                    <span className="font-medium">
                        {t('shifts.extend.groupSummary', {
                            count: eventGroupSummary.daysCount,
                            defaultValue: 'Vacation étendue sur {{count}} jours — les montants ci-dessous sont cumulés',
                        })}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Duration Card */}
                <Card className="border-border/60 shadow-sm bg-blue-50/30 dark:bg-blue-950/10">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider">
                                {isGrouped
                                    ? t('shifts.totalDuration', { defaultValue: 'Durée totale' })
                                    : t('shifts.duration', { defaultValue: 'Durée idéale' })}
                            </p>
                            <p className="text-xl font-bold text-foreground">
                                {durationLabel}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Freelance Rate Card */}
                <Card className="border-border/60 shadow-sm bg-purple-50/30 dark:bg-purple-950/10">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Banknote className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-purple-600/80 dark:text-purple-400/80 uppercase tracking-wider">
                                {t('shifts.freelanceRate', { defaultValue: 'Taux freelance' })}
                            </p>
                            <p className="text-xl font-bold text-foreground">
                                {formatCurrency(hourlyRate)}/h
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Cost Card */}
                <Card className="border-border/60 shadow-sm bg-emerald-50/30 dark:bg-emerald-950/10">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Banknote className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider">
                                {isGrouped
                                    ? t('shifts.groupTotalCost', { defaultValue: 'Coût total (série)' })
                                    : t('shifts.estimatedTotal', { defaultValue: 'Coût estimé' })}
                            </p>
                            <p className="text-xl font-bold text-foreground">
                                {estimatedCost}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Staffing Card */}
                <Card className="border-border/60 shadow-sm bg-amber-50/30 dark:bg-amber-950/10 lg:col-span-1">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider">
                                    {t('shifts.assignedStaff', { defaultValue: 'Remplissage' })}
                                </p>
                                <p className="text-xl font-bold text-foreground">
                                    {totalAssignedStaff} / {shift.required_employees}
                                </p>
                            </div>
                        </div>
                        <div className="w-full bg-amber-100/50 dark:bg-amber-900/20 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ✅ Détail jour par jour de la série */}
            {isGrouped && eventGroupSummary && (
                <LinkedDaysBreakdown
                    summary={eventGroupSummary}
                    currentShiftId={shift.id}
                    formatCurrency={formatCurrency}
                    getDateLocale={i18n.language}
                    t={t}
                />
            )}
        </div>
    );
}

// ─── Détail des jours liés (repliable) ─────────────────────────────────────

function LinkedDaysBreakdown({
    summary,
    currentShiftId,
    formatCurrency,
    t,
}: {
    summary: EventGroupSummary;
    currentShiftId: string;
    formatCurrency: (n: number) => string;
    getDateLocale: string;
    t: (key: string, options?: Record<string, unknown>) => string;
}) {
    const extractTime = (dt: string) => {
        const tm = dt.split('T')[1];
        return tm ? tm.substring(0, 5) : '00:00';
    };
    const extractDate = (dt: string) => {
        const [p] = dt.split('T');
        const [y, m, d] = p.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    // ✅ Heures nettes + coût total (TTC, commission incluse) pour un jour de la série
    const getDayQuote = (s: EventGroupSummary['shifts'][number]) => {
        const rate = s.freelance_hourly_rate || s.hourly_rate || 0;
        if (rate === 0) return { netHours: 0, totalTTC: 0 };

        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const endMinutes = end.getHours() * 60 + end.getMinutes();

        let diffMinutes = endMinutes - startMinutes;
        if (diffMinutes <= 0) diffMinutes += 24 * 60;

        const breakMinutes = s.break_duration_minutes || 0;
        const netHours = (diffMinutes - breakMinutes) / 60;
        if (netHours <= 0) return { netHours: 0, totalTTC: 0 };

        const staffCount = Math.max(s.required_employees || 1, 1);
        const feeRate = s.platform_fee_rate ?? DEFAULT_PLATFORM_FEE_RATE;
        const baseCost = Math.round(rate * netHours * staffCount * 100) / 100;
        const commission = Math.round(baseCost * (feeRate / 100) * 100) / 100;
        const totalTTC = Math.round((baseCost + commission) * 100) / 100;

        return { netHours: Math.round(netHours * 100) / 100, totalTTC };
    };

    const formatHours = (h: number) => {
        const hours = Math.floor(h);
        const minutes = Math.round((h - hours) * 60);
        return minutes === 0 ? `${hours}h` : `${hours}h${minutes.toString().padStart(2, '0')}`;
    };

    const STATUS_COLOR: Record<string, string> = {
        filled: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        canceled: 'bg-red-100 text-red-700 border-red-200',
        closed: 'bg-red-100 text-red-700 border-red-200',
        expired: 'bg-red-100 text-red-700 border-red-200',
        pending: 'bg-orange-100 text-orange-700 border-orange-200',
        partially_filled: 'bg-orange-100 text-orange-700 border-orange-200',
        pending_validation: 'bg-purple-100 text-purple-700 border-purple-200',
    };

    return (
        <details className="group rounded-xl border border-border/50 bg-card overflow-hidden" open>
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    {t('shifts.extend.dayByDay', { defaultValue: 'Détail par jour' })} ({summary.daysCount})
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex items-center justify-between gap-3 px-4 py-1.5 border-t border-border/40 bg-muted/10">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('shifts.extend.date', { defaultValue: 'Date' })}
                </span>
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-[52px] text-center">
                        {t('shifts.extend.statusCol', { defaultValue: 'Statut' })}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('shifts.extend.staffCol', { defaultValue: 'Staff' })}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-14 text-right">
                        {t('shifts.extend.hoursCol', { defaultValue: 'Heures' })}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-20 text-right">
                        {t('shifts.extend.totalCol', { defaultValue: 'Total' })}
                    </span>
                </div>
            </div>
            <div className="divide-y divide-border/40 border-t border-border/40">
                {summary.shifts.map((s) => {
                    const isCurrent = s.id === currentShiftId;
                    const assigned = (s.shift_applications || []).filter(a => a.status === 'accepted').length
                        + (s.shift_freelancer_applications || []).filter(a => a.status === 'accepted').length;
                    const { netHours, totalTTC } = getDayQuote(s);

                    return (
                        <div
                            key={s.id}
                            className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${isCurrent ? 'bg-primary/[0.04]' : ''}`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="font-medium text-foreground whitespace-nowrap">
                                    {format(extractDate(s.start_time), 'dd/MM/yyyy')}
                                </span>
                                <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                                    {extractTime(s.start_time)} – {extractTime(s.end_time)}
                                </span>
                                {isCurrent && (
                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                                        {t('shifts.extend.currentDay', { defaultValue: 'Ce jour' })}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[s.status] || 'bg-muted text-muted-foreground border-border'}`}>
                                    {t(`shifts.status.${s.status}`, { defaultValue: s.status })}
                                </span>
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {assigned}/{s.required_employees}
                                </span>
                                {/* ✅ ساعات العمل الصافية لهذا اليوم */}
                                <span className="text-xs font-medium text-foreground tabular-nums w-14 text-right">
                                    {netHours > 0 ? formatHours(netHours) : '—'}
                                </span>
                                {/* ✅ المبلغ الإجمالي لهذا اليوم (شامل العمولة) */}
                                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums w-20 text-right">
                                    {totalTTC > 0 ? formatCurrency(totalTTC) : '—'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border/40 text-sm">
                <span className="text-muted-foreground">{t('shifts.extend.commissionIncluded', { defaultValue: 'Commission incluse' })}</span>
                <span className="font-semibold text-foreground">{formatCurrency(summary.totalCommission)}</span>
            </div>
        </details>
    );
}