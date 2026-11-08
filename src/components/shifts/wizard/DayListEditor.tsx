import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Clock, Coffee, Trash2, RotateCcw, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DayShiftException } from '@/components/shifts/MultiDayShiftConfig';

interface DayListEditorProps {
    startDate: Date | null;
    endDate: Date | null;
    excludedDays: Set<string>;
    onExcludedDaysChange: (days: Set<string>) => void;
    // For single day mode
    startTime?: string;
    endTime?: string;
    breakMinutes?: number;
    onStartTimeChange?: (value: string) => void;
    onEndTimeChange?: (value: string) => void;
    onBreakMinutesChange?: (value: number) => void;
    // For multi-day mode (exceptions)
    exceptions?: Map<string, DayShiftException>;
    onExceptionsChange?: (exceptions: Map<string, DayShiftException>) => void;
    defaultStartTime?: string;
    defaultEndTime?: string;
    defaultBreakMinutes?: number;
}

export function DayListEditor({
    startDate,
    endDate,
    excludedDays,
    onExcludedDaysChange,
    startTime,
    endTime,
    breakMinutes,
    onStartTimeChange,
    onEndTimeChange,
    onBreakMinutesChange,
    exceptions,
    onExceptionsChange,
    defaultStartTime = '09:00',
    defaultEndTime = '18:00',
    defaultBreakMinutes = 30,
}: DayListEditorProps) {
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language === 'fr' ? fr : enUS;
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingDay, setEditingDay] = useState<string | null>(null);

    // Generate list of days in the range
    const days = useMemo(() => {
        if (!startDate) return [];
        const effectiveEndDate = endDate || startDate;
        const result: Date[] = [];
        const current = new Date(startDate);

        while (current <= effectiveEndDate) {
            result.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return result;
    }, [startDate, endDate]);

    // Count of included days
    const includedDaysCount = useMemo(() => {
        return days.filter(day => {
            const isoKey = day.toISOString().split('T')[0];
            return !excludedDays.has(isoKey);
        }).length;
    }, [days, excludedDays]);

    // Check if it's multi-day mode
    const isMultiDay = days.length > 1;

    // Toggle day exclusion
    const toggleDayExclusion = (isoKey: string) => {
        const newExcludedDays = new Set(excludedDays);
        if (newExcludedDays.has(isoKey)) {
            newExcludedDays.delete(isoKey);
        } else {
            newExcludedDays.add(isoKey);
            // Also remove any exception for this day
            if (exceptions && onExceptionsChange) {
                const newExceptions = new Map(exceptions);
                newExceptions.delete(isoKey);
                onExceptionsChange(newExceptions);
            }
        }
        onExcludedDaysChange(newExcludedDays);
    };

    // Start editing a day's exception
    const startEditing = (isoKey: string, day: Date) => {
        if (editingDay === isoKey) {
            setEditingDay(null);
            return;
        }

        // Create exception if it doesn't exist
        if (exceptions && onExceptionsChange && !exceptions.has(isoKey)) {
            const newExceptions = new Map(exceptions);
            newExceptions.set(isoKey, {
                date: day,
                dateKey: isoKey,
                startTime: defaultStartTime,
                endTime: defaultEndTime,
                breakMinutes: defaultBreakMinutes,
                requiredEmployees: 1,
                hourlyRate: '',
            });
            onExceptionsChange(newExceptions);
        }
        setEditingDay(isoKey);
    };

    // Update exception field
    const updateException = (isoKey: string, field: keyof DayShiftException, value: string | number | Date) => {
        if (!exceptions || !onExceptionsChange) return;
        const exception = exceptions.get(isoKey);
        if (!exception) return;

        const newExceptions = new Map(exceptions);
        newExceptions.set(isoKey, { ...exception, [field]: value });
        onExceptionsChange(newExceptions);
    };

    // Reset exception to defaults
    const resetException = (isoKey: string) => {
        if (!exceptions || !onExceptionsChange) return;
        const newExceptions = new Map(exceptions);
        newExceptions.delete(isoKey);
        onExceptionsChange(newExceptions);
        setEditingDay(null);
    };

    if (days.length === 0) return null;

    return (
        <div className="border border-border rounded-xl overflow-hidden">
            {/* Header - Collapsible */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                            {t('shifts.selectedDays', { defaultValue: 'Jours sélectionnés' })}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            {includedDaysCount} {includedDaysCount > 1 ? t('shifts.days', { defaultValue: 'jours' }) : t('shifts.day', { defaultValue: 'jour' })}
                        </span>
                        {excludedDays.size > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                {excludedDays.size} {t('shifts.excluded', { defaultValue: 'exclu(s)' })}
                            </span>
                        )}
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                    {days.map((day) => {
                        const isoKey = day.toISOString().split('T')[0];
                        const isExcluded = excludedDays.has(isoKey);
                        const exception = exceptions?.get(isoKey);
                        const isEditing = editingDay === isoKey;
                        const hasCustomConfig = !!exception;

                        return (
                            <div
                                key={isoKey}
                                className={cn(
                                    'transition-colors',
                                    isExcluded ? 'bg-red-50/50 dark:bg-red-950/20' : 'bg-background'
                                )}
                            >
                                {/* Day Row */}
                                <div className="px-4 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            'text-sm font-medium capitalize',
                                            isExcluded ? 'text-muted-foreground line-through' : 'text-foreground'
                                        )}>
                                            {format(day, 'EEEE d MMMM', { locale: dateLocale })}
                                        </span>
                                        {hasCustomConfig && !isExcluded && (
                                            <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">
                                                {t('shifts.customized', { defaultValue: 'Personnalisé' })}
                                            </span>
                                        )}
                                        {!isExcluded && !isMultiDay && startTime && endTime && (
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit',  })} - {new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit',  })}
                                            </span>
                                        )}
                                        {!isExcluded && isMultiDay && (
                                            <span className="text-xs text-muted-foreground">
                                                {exception?.startTime || defaultStartTime} - {exception?.endTime || defaultEndTime}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Edit button - only for multi-day */}
                                        {isMultiDay && !isExcluded && (
                                            <button
                                                type="button"
                                                onClick={() => startEditing(isoKey, day)}
                                                className={cn(
                                                    'p-1.5 rounded transition-colors',
                                                    isEditing
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                                )}
                                                title={t('shifts.editDay', { defaultValue: 'Modifier ce jour' })}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        )}

                                        {/* Delete/Restore button */}
                                        <button
                                            type="button"
                                            onClick={() => toggleDayExclusion(isoKey)}
                                            className={cn(
                                                'p-1.5 rounded transition-colors',
                                                isExcluded
                                                    ? 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400'
                                                    : 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400'
                                            )}
                                            title={isExcluded
                                                ? t('shifts.restoreDay', { defaultValue: 'Restaurer ce jour' })
                                                : t('shifts.excludeDay', { defaultValue: 'Exclure ce jour' })
                                            }
                                        >
                                            {isExcluded ? (
                                                <RotateCcw className="w-4 h-4" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Editing Panel - Only for multi-day mode */}
                                {isEditing && isMultiDay && !isExcluded && (
                                    <div className="px-4 pb-3 pt-1 bg-muted/20">
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                                    <Clock className="w-3 h-3" />
                                                    {t('shifts.startTime')}
                                                </label>
                                                <input
                                                    type="time"
                                                    value={exception?.startTime || defaultStartTime}
                                                    onChange={(e) => updateException(isoKey, 'startTime', e.target.value)}
                                                    className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                                    <Clock className="w-3 h-3" />
                                                    {t('shifts.endTime')}
                                                </label>
                                                <input
                                                    type="time"
                                                    value={exception?.endTime || defaultEndTime}
                                                    onChange={(e) => updateException(isoKey, 'endTime', e.target.value)}
                                                    className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                />
                                            </div>
                                            {/* Break hidden */}
                                        </div>
                                        <div className="mt-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => resetException(isoKey)}
                                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                {t('shifts.resetToDefault', { defaultValue: 'Réinitialiser' })}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
