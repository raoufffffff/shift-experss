import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Coffee, CalendarDays, Settings } from 'lucide-react';

interface DefaultConfigPanelProps {
    // For calculating KPIs
    startDate: Date | null;
    endDate: Date | null;
    excludedDays: Set<string>;
    exceptionsCount: number;
    // Config values
    defaultStartTime: string;
    defaultEndTime: string;
    defaultBreakMinutes: number;
    // Callbacks
    onDefaultStartTimeChange: (value: string) => void;
    onDefaultEndTimeChange: (value: string) => void;
    onDefaultBreakMinutesChange: (value: number) => void;
}

export function DefaultConfigPanel({
    startDate,
    endDate,
    excludedDays,
    exceptionsCount,
    defaultStartTime,
    defaultEndTime,
    defaultBreakMinutes,
    onDefaultStartTimeChange,
    onDefaultEndTimeChange,
    onDefaultBreakMinutesChange,
}: DefaultConfigPanelProps) {
    const { t } = useTranslation();

    // Calculate included days count
    const includedDaysCount = useMemo(() => {
        if (!startDate) return 0;
        const effectiveEnd = endDate || startDate;
        let count = 0;
        const current = new Date(startDate);
        while (current <= effectiveEnd) {
            const isoKey = current.toISOString().split('T')[0];
            if (!excludedDays.has(isoKey)) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    }, [startDate, endDate, excludedDays]);

    // Calculate duration
    const duration = useMemo(() => {
        if (!defaultStartTime || !defaultEndTime) return null;
        const [startH, startM] = defaultStartTime.split(':').map(Number);
        const [endH, endM] = defaultEndTime.split(':').map(Number);
        let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const workMinutes = Math.max(0, totalMinutes - defaultBreakMinutes);
        const hours = Math.floor(workMinutes / 60);
        const mins = workMinutes % 60;
        return { hours, mins, workMinutes };
    }, [defaultStartTime, defaultEndTime, defaultBreakMinutes]);

    if (!startDate) return null;

    return (
        <div className="space-y-4">
            {/* KPIs Row */}
            <div className="flex items-center gap-3">
                {/* Shifts to create */}
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">{includedDaysCount}</span>
                    <span className="text-xs text-primary/80">{t('shifts.shiftsToCreate', { defaultValue: 'shift(s)' })}</span>
                </div>

                {/* Exceptions count - only show if > 0 */}
                {exceptionsCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Settings className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{exceptionsCount}</span>
                        <span className="text-xs text-orange-600/80 dark:text-orange-400/80">{t('shifts.customized', { defaultValue: 'personnalisé(s)' })}</span>
                    </div>
                )}

                {/* Duration */}
                {duration && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg ml-auto">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {duration.hours}h{duration.mins > 0 ? duration.mins : ''}
                        </span>
                        <span className="text-xs text-blue-600/80 dark:text-blue-400/80">/{t('shifts.perDay', { defaultValue: 'jour' })}</span>
                    </div>
                )}
            </div>

            {/* Default Configuration */}
            <div className="bg-muted/30 border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">
                        {t('shifts.defaultConfig', { defaultValue: 'Configuration par défaut' })}
                    </h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {/* Start Time */}
                    <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                            <Clock className="w-3 h-3" />
                            {t('shifts.startTime')}
                        </label>
                        <input
                            type="time"
                            value={defaultStartTime}
                            onChange={(e) => onDefaultStartTimeChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* End Time */}
                    <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                            <Clock className="w-3 h-3" />
                            {t('shifts.endTime')}
                        </label>
                        <input
                            type="time"
                            value={defaultEndTime}
                            onChange={(e) => onDefaultEndTimeChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* Break hidden */}
                </div>
            </div>
        </div>
    );
}
