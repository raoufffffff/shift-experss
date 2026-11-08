import { useTranslation } from 'react-i18next';
import { format, Locale } from 'date-fns';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';
import {
    X, Briefcase, Calendar, Clock, Coffee, Banknote,
} from 'lucide-react';
import { formatTimeUTC } from '@/utils/formatTime';
import type { Shift } from './types';

interface ShiftInfoHeaderProps {
    shift: Shift;
    effectiveDuration: number;
    onClose: () => void;
}

export function ShiftInfoHeader({ shift, effectiveDuration, onClose }: ShiftInfoHeaderProps) {
    const { t, i18n } = useTranslation();

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

    const extractTime = (datetime: string): string => {
        if (!datetime) return '--:--';
        return formatTimeUTC(datetime, i18n.language === 'en');
    };

    const extractDate = (datetime: string): Date => {
        if (!datetime) return new Date();
        const [datePart] = datetime.split('T');
        if (!datePart) return new Date();
        const [year, month, day] = datePart.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    return (
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-emerald-600/5 dark:from-blue-600/20 dark:to-emerald-600/20 opacity-100" />
            <div className="relative px-6 py-6 md:px-8 md:py-8">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {t('shifts.applicants')}
                        </h2>
                        <p className="text-blue-600 dark:text-blue-200 font-medium flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            {shift.position_name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-all text-slate-500 dark:text-white"
                        aria-label={t('common.close')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10">
                            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{t('shifts.shiftDate')}</p>
                            <p className="text-sm font-semibold">
                                {shift.start_time ? format(extractDate(shift.start_time), 'dd MMM yyyy', { locale: getDateLocale() }) : '---'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{t('shifts.hours')}</p>
                            <p className="text-sm font-semibold">
                                {shift.start_time ? extractTime(shift.start_time) : '--:--'} - {shift.end_time ? extractTime(shift.end_time) : '--:--'}
                            </p>
                        </div>
                    </div>
                    {/* Break hidden */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-white/10 border border-emerald-100 dark:border-white/10 text-emerald-600 dark:text-emerald-300">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{t('shifts.estimatedCost')}</p>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                {(() => {
                                    const rate = shift.freelance_hourly_rate || shift.hourly_rate || 0;
                                    const total = (effectiveDuration || 0) * rate;
                                    if (!shift.start_time || isNaN(total)) return '0,00 \u20AC';
                                    return new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(total);
                                })()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
