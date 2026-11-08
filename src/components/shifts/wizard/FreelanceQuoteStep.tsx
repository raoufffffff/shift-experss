import { useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Euro, ArrowRight, ArrowLeft, Calculator, TrendingUp, Zap, Minus, Plus, Car } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StepProps } from './types';
// ✅ جديد — الأعياد الرسمية الفرنسية (⚠️ عدّل المسار حسب مكان holidays.ts)
import { getHolidaysInRange, getHoliday } from '@/pages/shifts/holidays';
import { HolidayIcon } from '@/pages/shifts/holidayIcons';

interface FreelanceQuoteStepProps extends StepProps {
    positionName?: string;
    city?: string;
    recommendedRateMin?: number | null;
    recommendedRateMax?: number | null;
    platformFeeRate?: number;
    // true si le shift publie (aussi) vers les freelances — le tarif reste
    // obligatoire et borné par recommendedRateMin/Max dans ce cas. Quand
    // false (shift employés uniquement), le tarif devient optionnel et le
    // min/max recommandé (spécifique aux freelances) ne s'applique pas —
    // sans tarif renseigné, l'employé verra son propre tarif habituel dans
    // l'app (comportement existant, inchangé).
    isFreelanceRate?: boolean;
    // 🚗 Frais de déplacement : case « le shift propose un remboursement de transport » (freelances uniquement)
    // + plafond optionnel par shift. État porté par useCreateShift.
    offersTransportFee?: boolean;
    onOffersTransportFeeChange?: (value: boolean) => void;
    transportFeeCap?: string;
    onTransportFeeCapChange?: (value: string) => void;
}

// CHANGE: step increment for the +/- buttons that replaced the range
// slider -- kept in sync with the input's own `step="0.5"`.
const RATE_STEP = 0.5;

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

export function FreelanceQuoteStep({
    formData,
    updateFormData,
    onNext,
    onPrevious,
    positionName,
    city,
    recommendedRateMin,
    recommendedRateMax,
    platformFeeRate = 15, // Default to 10% if not provided
    isFreelanceRate = true,
    offersTransportFee = false,
    onOffersTransportFeeChange,
    transportFeeCap = '',
    onTransportFeeCapChange,
}: FreelanceQuoteStepProps) {
    const { t } = useTranslation();

    // Le min/max recommandé (establishment_job_rates) est spécifique aux
    // freelances — on l'ignore complètement pour un shift employés-only.
    const effectiveRateMin = isFreelanceRate ? recommendedRateMin : null;
    const effectiveRateMax = isFreelanceRate ? recommendedRateMax : null;

    // CHANGE: default the field to the midpoint between
    // recommendedRateMin and recommendedRateMax, once both are known
    // and the admin hasn't already entered a rate. Runs once (tracked
    // via the ref below) rather than on every render, so it never
    // overwrites a rate the admin is actively editing.
    const didApplyDefaultRef = useRef(false);
    useEffect(() => {
        if (didApplyDefaultRef.current) return;
        if (formData.freelanceHourlyRate) {
            // Already has a value (e.g. editing an existing shift, or
            // the admin already typed something before this ran) --
            // never override it.
            didApplyDefaultRef.current = true;
            return;
        }
        if (effectiveRateMin == null || effectiveRateMax == null) return;

        const midpoint = (effectiveRateMin + effectiveRateMax) / 2;
        updateFormData({ freelanceHourlyRate: midpoint.toFixed(2) });
        didApplyDefaultRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveRateMin, effectiveRateMax]);

    // ✅ جديد — الأعياد التي تقع ضمن أيام هذا الشيفت (نصيحة فقط، لا تمنع شيئاً)
    const shiftHolidays = useMemo(() => {
        if (!formData.dateRangeStart) return [];
        const start = formData.dateRangeStart;
        const end = formData.dateRangeEnd || formData.dateRangeStart;
        if (!formData.isMultiDay) {
            const h = getHoliday(start);
            return h ? [h] : [];
        }
        // نفس منطق مفاتيح الأيام المستبعدة المستعمل في useCreateShift (toISOString)
        return getHolidaysInRange(start, end).filter((h) => {
            const [y, m, d] = h.date.split('-').map(Number);
            const isoKey = new Date(y, m - 1, d, start.getHours(), start.getMinutes()).toISOString().split('T')[0];
            return !formData.excludedDays.has(isoKey) && !formData.excludedDays.has(h.date);
        });
    }, [formData.dateRangeStart, formData.dateRangeEnd, formData.isMultiDay, formData.excludedDays]);

    // Calculate duration for hourly rate display
   const duration = useMemo(() => {
    if (formData.isMultiDay || !formData.startTime || !formData.endTime) return null;

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);

     const startMins = start.getHours() * 60 + start.getMinutes();
    const endMins = end.getHours() * 60 + end.getMinutes();

    // حساب فرق الدقائق مع معالجة حالة العبور (مثلاً من 22:00 إلى 03:00)
    let diffMinutes = endMins - startMins;
    if (diffMinutes <= 0) diffMinutes += 24 * 60;

    // حساب دقائق العمل الفعلية بعد خصم الاستراحة
    const breakDuration = formData.breakDurationMinutes || 0;
    const workMinutes = diffMinutes - breakDuration;

    if (workMinutes <= 0) return null;

    const hours = Math.floor(workMinutes / 60);
    const minutes = workMinutes % 60;

    return { hours, minutes, totalMinutes: workMinutes };
}, [formData.startTime, formData.endTime, formData.breakDurationMinutes, formData.isMultiDay]);

    // Check if shift starts within 2 hours (urgent)
    const urgentBoost = useMemo(() => {
        if (!formData.startTime) return null;
        const start = new Date(formData.startTime);
        const now = new Date();
        const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilStart > 2 || hoursUntilStart < 0) return null;
        const boostPercent = hoursUntilStart <= 1 ? 30 : 20;
        return { hoursUntilStart, boostPercent };
    }, [formData.startTime]);

    // Check if form is valid
    // Freelance : tarif obligatoire, borné par le min/max recommandé.
    // Employés-only : tarif optionnel — vide ou 0 est valide (l'employé
    // gardera alors son propre tarif habituel côté app).
const isValid = useMemo(() => {
    if (!isFreelanceRate) {
        if (!formData.freelanceHourlyRate) return true;
        const rate = parseFloat(formData.freelanceHourlyRate);
        return !isNaN(rate) && rate > 0;
    }
    const rate = parseFloat(formData.freelanceHourlyRate);
    if (!formData.freelanceHourlyRate || isNaN(rate) || rate <= 0) return false;
    if (effectiveRateMin && rate < effectiveRateMin) return false;
    if (effectiveRateMax && rate > effectiveRateMax) return false;
    return true;
}, [isFreelanceRate, formData.freelanceHourlyRate, effectiveRateMin, effectiveRateMax]);

 const rateError = useMemo(() => {
    const rate = parseFloat(formData.freelanceHourlyRate);
    if (!formData.freelanceHourlyRate || isNaN(rate)) return null;
    if (effectiveRateMin && rate < effectiveRateMin) {
        return t('shifts.freelancers.rateBelowMin', {
            min: effectiveRateMin,
            defaultValue: `Le taux doit être d'au moins ${effectiveRateMin}€/h`
        });
    }
    if (effectiveRateMax && rate > effectiveRateMax) {
        return t('shifts.freelancers.rateAboveMax', {
            max: effectiveRateMax,
            defaultValue: `Le taux ne peut pas dépasser ${effectiveRateMax}€/h`
        });
    }
    return null;
}, [formData.freelanceHourlyRate, effectiveRateMin, effectiveRateMax, t]);

    // Format rate with 2 decimals on blur
    const handleRateBlur = () => {
        if (formData.freelanceHourlyRate) {
            const value = parseFloat(formData.freelanceHourlyRate);
            if (!isNaN(value)) {
                updateFormData({ freelanceHourlyRate: value.toFixed(2) });
            }
        }
    };

    // CHANGE: +/- step handlers replacing the removed range slider.
    // Clamp at 0 minimum -- there's no reason to ever go negative,
    // and no upper clamp (recommendedRateMax is a guidance range
    // enforced via rateError/isValid, not a hard ceiling on the
    // input itself).
    const currentRate = formData.freelanceHourlyRate ? parseFloat(formData.freelanceHourlyRate) : 0;
    const decrementRate = () => {
        const next = Math.max(0, round2(currentRate - RATE_STEP));
        updateFormData({ freelanceHourlyRate: next.toFixed(2) });
    };
    const incrementRate = () => {
        const next = round2(currentRate + RATE_STEP);
        updateFormData({ freelanceHourlyRate: next.toFixed(2) });
    };

    // Cost calculations including commission
    const calculateTotalWithCommission = (baseAmount: number) => {
        return baseAmount * (1 + platformFeeRate / 100);
    };

    // Multi-day cost calculation
   const multiDayBreakdown = useMemo(() => {
    if (!formData.isMultiDay || !formData.dateRangeStart || !formData.dateRangeEnd) return null;

    const rate = parseFloat(formData.freelanceHourlyRate) || 0;

     const calculateMinutes = (startStr: string, endStr: string, breakM: number) => {
        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);

        let mins = (endH * 60 + endM) - (startH * 60 + startM);
        if (mins <= 0) mins += 24 * 60;

        return Math.max(0, mins - breakM);
    };


    const defaultMinutes = calculateMinutes(formData.defaultStartTime, formData.defaultEndTime, formData.defaultBreakMinutes);
    const defaultHours = defaultMinutes / 60;

     let standardDays = 0;
    const current = new Date(formData.dateRangeStart);
    const endDate = new Date(formData.dateRangeEnd);

    while (current <= endDate) {
        const isoDate = current.toISOString().split('T')[0];
        if (!formData.excludedDays.has(isoDate) && !formData.shiftExceptions.has(isoDate)) {
            standardDays++;
        }
        current.setDate(current.getDate() + 1);
    }

     const exceptions: Array<{ date: string; hours: number; cost: number; totalWithCommission: number }> = [];
    formData.shiftExceptions.forEach((exc, isoDate) => {
        const minutes = calculateMinutes(exc.startTime, exc.endTime, exc.breakMinutes);
        const hours = minutes / 60;
        const cost = hours * rate;

        exceptions.push({
            date: isoDate,
            hours,
            cost,
            totalWithCommission: calculateTotalWithCommission(cost)
        });
    });

    const standardCost = standardDays * defaultHours * rate;
    const standardTotalWithCommission = calculateTotalWithCommission(standardCost);
    const exceptionsCost = exceptions.reduce((sum, e) => sum + e.cost, 0);
    const exceptionsTotalWithCommission = exceptions.reduce((sum, e) => sum + e.totalWithCommission, 0);

    const totalCost = standardCost + exceptionsCost;
    const totalWithCommission = standardTotalWithCommission + exceptionsTotalWithCommission;

    return {
        standardDays,
        defaultHours,
        standardCost,
        standardTotalWithCommission,
        exceptions,
        exceptionsCost,
        exceptionsTotalWithCommission,
        totalCost,
        totalWithCommission
    };
}, [formData, platformFeeRate]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Step Title */}
            <div className="text-center">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    {isFreelanceRate
                        ? t('shifts.wizard.quoteTitle', { defaultValue: 'Devis freelance' })
                        : t('shifts.wizard.rateTitle', { defaultValue: 'Tarif horaire du shift' })}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {isFreelanceRate
                        ? t('shifts.wizard.quoteDesc', { defaultValue: 'Définissez le taux horaire pour les freelances' })
                        : t('shifts.wizard.rateDescEmployees', { defaultValue: "Optionnel — les employés invités verront ce tarif. Laissez vide pour garder leur tarif habituel." })}
                </p>
            </div>

            {/* Main Quote Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                        <Euro className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">
                                {t('shifts.freelancers.hourlyRateTitle')}
                            </h3>
                            {isFreelanceRate && (
                                <div className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    {t('shifts.freelancers.commissionInfo', { rate: platformFeeRate, defaultValue: `Commission : {{rate}}%` })}
                                </div>
                            )}
                        </div>
                        {isFreelanceRate && (
                            <p className="text-xs text-muted-foreground">
                                {formData.publishToFreelancers
                                    ? t('shifts.freelancers.publishImmediately')
                                    : t('shifts.freelancers.autoPublishAfter', {
                                        minutes: formData.autoPublishDelayMinutes,
                                        defaultValue: `Publication automatique après ${formData.autoPublishDelayMinutes} min`
                                    })
                                }
                            </p>
                        )}
                    </div>
                </div>

                {/* Recommended range — freelances uniquement */}
                {isFreelanceRate && (effectiveRateMin || effectiveRateMax) && (
                    <div className="bg-white/70 dark:bg-gray-900/50 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                {positionName && city
                                    ? t('shifts.freelancers.recommendedFor', {
                                        position: positionName,
                                        city: city,
                                        defaultValue: `Recommandé pour ${positionName} à ${city}`
                                    })
                                    : positionName
                                        ? t('shifts.freelancers.recommendedForPosition', {
                                            position: positionName,
                                            defaultValue: `Recommandé pour ${positionName}`
                                        })
                                        : t('shifts.freelancers.recommendedRange')
                                }
                            </p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                            {effectiveRateMin && effectiveRateMax
                                ? `${effectiveRateMin}€ - ${effectiveRateMax}€`
                                : effectiveRateMin
                                    ? `${effectiveRateMin}€+`
                                    : `≤ ${effectiveRateMax}€`
                            }
                            <span className="text-sm font-normal"> {t('shifts.freelancers.perHour')}</span>
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            {t('shifts.freelancers.recommendedRangeHint')}
                        </p>
                    </div>
                )}

                {/* Hourly Rate Input */}
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-100">
                        {t('shifts.freelancers.yourRate')} {isFreelanceRate && <span className="text-red-500">*</span>}
                    </label>
                    {/* CHANGE: +/- stepper replacing the input + separate
                        range slider below. The buttons flank the same
                        input, and the "slide to adjust" range control
                        (and its min/max labels) has been removed
                        entirely per the new design. */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={decrementRate}
                            aria-label={t('shifts.freelancers.decreaseRate', { defaultValue: 'Diminuer le taux' })}
                            className="flex items-center justify-center w-12 h-12 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition-colors flex-shrink-0"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                        <div className="relative flex-1">
                            <Input
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="15,00"
                                value={formData.freelanceHourlyRate}
                                onChange={(e) => updateFormData({ freelanceHourlyRate: e.target.value })}
                                onBlur={handleRateBlur}
                                className="bg-white dark:bg-gray-900 text-lg font-bold h-12 flex-1 pl-4 pr-12 border-2 border-emerald-100 dark:border-emerald-900 focus:border-emerald-500 transition-all rounded-xl text-center"
                                required={isFreelanceRate}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 font-bold">
                                €/h
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={incrementRate}
                            aria-label={t('shifts.freelancers.increaseRate', { defaultValue: 'Augmenter le taux' })}
                            className="flex items-center justify-center w-12 h-12 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition-colors flex-shrink-0"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* ✅ جديد — تنبيه عيد رسمي: اقتراح فقط، الحقل يبقى حراً */}
                    {shiftHolidays.length > 0 && (
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                            <HolidayIcon icon={shiftHolidays[0].icon} className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                                    {shiftHolidays.length === 1
                                        ? t('shifts.holiday.title', { name: shiftHolidays[0].name, defaultValue: `Jour férié : ${shiftHolidays[0].name}` })
                                        : t('shifts.holiday.titleMulti', { count: shiftHolidays.length, defaultValue: `${shiftHolidays.length} jours fériés dans cette période` })}
                                </p>
                                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                                    {shiftHolidays.length > 1 && (
                                        <span className="font-medium">
                                            {shiftHolidays.map((h) => `${h.name} (${h.date.split('-').reverse().slice(0, 2).join('/')})`).join(', ')}.{' '}
                                        </span>
                                    )}
                                    {t('shifts.holiday.hint', {
                                        defaultValue: "C'est un jour spécial : nous vous conseillons de proposer un tarif horaire légèrement plus élevé. Le choix reste le vôtre.",
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    {rateError && (
    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {rateError}
    </p>
)}

                    {/* Urgent boost recommendation — freelances uniquement (le boost concerne la publication marketplace) */}
                    {isFreelanceRate && urgentBoost && (
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 fill-current" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                    Shift urgent — début dans {urgentBoost.hoursUntilStart <= 1 ? 'moins d\'1 heure' : 'moins de 2 heures'}
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                    Shift Express vous recommande de booster le taux horaire d'environ <span className="font-bold">{urgentBoost.boostPercent}%</span> pour maximiser vos chances de remplir le shift rapidement.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Estimated cost */}
                {duration && formData.freelanceHourlyRate && parseFloat(formData.freelanceHourlyRate) > 0 && (
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded-lg p-4 border border-emerald-300 dark:border-emerald-600 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                    {t('shifts.freelancers.estimatedCost', { defaultValue: 'Coût estimé (hors commission)' })}
                                </p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    {formData.freelanceHourlyRate}€ × {duration.hours}h{duration.minutes > 0 ? `${duration.minutes}min` : ''}
                                </p>
                            </div>
                            <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">
                                {(parseFloat(formData.freelanceHourlyRate) * (duration.totalMinutes / 60)).toFixed(2)}€
                            </p>
                        </div>

                        {isFreelanceRate && (
                            <div className="flex items-center justify-between pt-2 border-t border-emerald-200 dark:border-emerald-800">
                                <div>
                                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                        {t('shifts.freelancers.totalQuote', { defaultValue: 'Total de votre devis' })}
                                    </p>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                        {t('shifts.freelancers.taxIncluded', { defaultValue: 'Taux horaire + commission de {{rate}}%', rate: platformFeeRate })}
                                    </p>
                                </div>
                                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                                    {calculateTotalWithCommission(parseFloat(formData.freelanceHourlyRate) * (duration.totalMinutes / 60)).toFixed(2)}€
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Multi-day breakdown */}
                {formData.isMultiDay && multiDayBreakdown && parseFloat(formData.freelanceHourlyRate) > 0 && (
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded-lg p-4 border border-emerald-300 dark:border-emerald-600 space-y-3">
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                            {t('shifts.freelancers.estimatedCostBreakdown', { defaultValue: 'Détail du devis (TTC)' })}
                        </p>

                        {/* Standard shifts */}
                        {multiDayBreakdown.standardDays > 0 && (() => {
                            const perShiftCost = multiDayBreakdown.defaultHours * parseFloat(formData.freelanceHourlyRate);
                            const perShiftTotal = calculateTotalWithCommission(perShiftCost);
                            return (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-emerald-700 dark:text-emerald-300">
                                        {multiDayBreakdown.standardDays} shift{multiDayBreakdown.standardDays > 1 ? 's' : ''} × {perShiftTotal.toFixed(2)}€
                                    </span>
                                    <span className="font-medium text-emerald-800 dark:text-emerald-200">
                                        {multiDayBreakdown.standardTotalWithCommission.toFixed(2)}€
                                    </span>
                                </div>
                            );
                        })()}

                        {/* Exceptions */}
                        {multiDayBreakdown.exceptions.map((exc) => (
                            <div key={exc.date} className="flex justify-between items-center text-sm">
                                <span className="text-amber-700 dark:text-amber-400">
                                    📌 Exception {new Date(exc.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} × {exc.hours.toFixed(1)}h
                                </span>
                                <span className="font-medium text-amber-800 dark:text-amber-300">
                                    {exc.totalWithCommission.toFixed(2)}€
                                </span>
                            </div>
                        ))}

                        {/* Total */}
                        <div className="flex justify-between items-center pt-2 border-t border-emerald-300 dark:border-emerald-600">
                            <div>
                                <span className="font-bold text-emerald-900 dark:text-emerald-100">Total</span>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                    {t('shifts.freelancers.allFeesIncluded', { defaultValue: 'Tous frais inclus (Commission {{rate}}% comprise)', rate: platformFeeRate })}
                                </p>
                            </div>
                            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                                {multiDayBreakdown.totalWithCommission.toFixed(2)}€
                            </span>
                        </div>
                    </div>
                )}

                {/* Simple multi-day message when no rate entered */}
                {formData.isMultiDay && (!formData.freelanceHourlyRate || parseFloat(formData.freelanceHourlyRate) <= 0) && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            {t('shifts.freelancers.enterRateForBreakdown', {
                                defaultValue: 'Entrez un taux horaire pour voir le détail des coûts'
                            })}
                        </p>
                    </div>
                )}

                {/* Validation */}
                {!isValid && isFreelanceRate && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {t('shifts.freelancers.hourlyRateRequired')}
                    </p>
                )}
            </div>

            {/* 🚗 Frais de déplacement — le freelance enverra un montant global + un justificatif après la mission ;
                le client valide, puis le montant est réglé à part (sans commission ni TVA) et reversé en totalité. */}
            {isFreelanceRate && onOffersTransportFeeChange && (
                <div className="border rounded-lg p-4 space-y-3">
                    <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={offersTransportFee}
                            onChange={(e) => onOffersTransportFeeChange(e.target.checked)}
                            className="w-4 h-4 mt-0.5 text-primary border-border"
                        />
                        <div>
                            <p className="text-sm font-medium flex items-center gap-2">
                                <Car className="w-4 h-4 text-primary" />
                                {t('shifts.transportFee.offer', { defaultValue: 'Proposer le remboursement des frais de déplacement' })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t('shifts.transportFee.offerDesc', {
                                    defaultValue: "Le freelance pourra demander un remboursement (montant global + justificatif). Vous validez chaque demande ; le montant est réglé à part, sans commission ni TVA, et reversé en totalité au freelance.",
                                })}
                            </p>
                        </div>
                    </label>

                    {offersTransportFee && onTransportFeeCapChange && (
                        <div className="pl-7 space-y-1">
                            <label className="block text-xs font-medium text-muted-foreground">
                                {t('shifts.transportFee.cap', { defaultValue: 'Plafond par shift (optionnel)' })}
                            </label>
                            <div className="relative max-w-[200px]">
                                <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder={t('shifts.transportFee.capPlaceholder', { defaultValue: 'Sans plafond' })}
                                    value={transportFeeCap}
                                    onChange={(e) => onTransportFeeCapChange(e.target.value)}
                                    className="pr-8"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</div>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                {t('shifts.transportFee.capHint', { defaultValue: 'Le freelance ne pourra pas demander plus que ce montant.' })}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={onPrevious}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('shifts.wizard.previous', { defaultValue: 'Précédent' })}
                </Button>
                <Button
                   type="button"
    onClick={onNext}
    className="min-w-32"
    disabled={!isValid}
                >
                    {t('shifts.wizard.next', { defaultValue: 'Suivant' })}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </motion.div>
    );
}