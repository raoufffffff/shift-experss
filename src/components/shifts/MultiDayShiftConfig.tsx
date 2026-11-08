import { useState, useMemo } from 'react'
import { Clock, Euro, Users, Plus, Trash2, Settings, CalendarDays, Coffee } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

export interface DayShiftException {
    date: Date
    dateKey: string // ISO string
    startTime: string
    endTime: string
    breakMinutes: number
    requiredEmployees: number
    hourlyRate: string
}

interface MultiDayShiftConfigProps {
    startDate: Date
    endDate: Date
    excludedDays: Set<string>
    // Default config
    defaultStartTime: string
    defaultEndTime: string
    defaultBreakMinutes: number
    defaultRequiredEmployees: number
    defaultHourlyRate: string
    // Callbacks
    onDefaultStartTimeChange: (value: string) => void
    onDefaultEndTimeChange: (value: string) => void
    onDefaultBreakMinutesChange: (value: number) => void
    onDefaultRequiredEmployeesChange: (value: number) => void
    onDefaultHourlyRateChange: (value: string) => void
    // Exceptions
    exceptions: Map<string, DayShiftException>
    onExceptionsChange: (exceptions: Map<string, DayShiftException>) => void
    // Freelancer mode
    showHourlyRate: boolean
}

export function MultiDayShiftConfig({
    startDate,
    endDate,
    excludedDays,
    defaultStartTime,
    defaultEndTime,
    defaultBreakMinutes,
    defaultRequiredEmployees,
    defaultHourlyRate,
    onDefaultStartTimeChange,
    onDefaultEndTimeChange,
    onDefaultBreakMinutesChange,
    onDefaultRequiredEmployeesChange,
    onDefaultHourlyRateChange,
    exceptions,
    onExceptionsChange,
    showHourlyRate
}: MultiDayShiftConfigProps) {
    const { t, i18n } = useTranslation()
    const dateLocale = i18n.language === 'fr' ? fr : enUS

    const [showExceptionModal, setShowExceptionModal] = useState(false)
    const [editingExceptionDate, setEditingExceptionDate] = useState<string | null>(null)
    const [visibleDaysCount, setVisibleDaysCount] = useState(20)

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            // Load more when near bottom
            setVisibleDaysCount(prev => prev + 20)
        }
    }

    // Calculate included days
    const includedDays = useMemo(() => {
        const days: Date[] = []
        const current = new Date(startDate)
        while (current <= endDate) {
            const isoKey = current.toISOString().split('T')[0]
            if (!excludedDays.has(isoKey)) {
                days.push(new Date(current))
            }
            current.setDate(current.getDate() + 1)
        }
        return days
    }, [startDate, endDate, excludedDays])

    // Calculate duration from default times
    const defaultDuration = useMemo(() => {
        if (!defaultStartTime || !defaultEndTime) return null
        const [startH, startM] = defaultStartTime.split(':').map(Number)
        const [endH, endM] = defaultEndTime.split(':').map(Number)
        let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM)
        if (totalMinutes < 0) totalMinutes += 24 * 60
        const workMinutes = Math.max(0, totalMinutes - defaultBreakMinutes)
        const hours = Math.floor(workMinutes / 60)
        const mins = workMinutes % 60
        return { hours, mins, workMinutes }
    }, [defaultStartTime, defaultEndTime, defaultBreakMinutes])

    // Calculate total estimated cost
    const totalEstimatedCost = useMemo(() => {
        if (!showHourlyRate || !defaultDuration || !defaultHourlyRate) return null

        let total = 0
        const rate = parseFloat(defaultHourlyRate) || 0

        includedDays.forEach(day => {
            const isoKey = day.toISOString().split('T')[0]
            const exception = exceptions.get(isoKey)

            if (exception) {
                const [startH, startM] = exception.startTime.split(':').map(Number)
                const [endH, endM] = exception.endTime.split(':').map(Number)
                let mins = (endH * 60 + endM) - (startH * 60 + startM)
                if (mins < 0) mins += 24 * 60
                mins -= exception.breakMinutes
                const exRate = parseFloat(exception.hourlyRate) || rate
                total += (mins / 60) * exRate
            } else {
                total += (defaultDuration.workMinutes / 60) * rate
            }
        })

        return total
    }, [includedDays, exceptions, defaultDuration, defaultHourlyRate, showHourlyRate])

    const addException = (date: Date) => {
        const isoKey = date.toISOString().split('T')[0]
        const newExceptions = new Map(exceptions)
        newExceptions.set(isoKey, {
            date,
            dateKey: isoKey,
            startTime: defaultStartTime,
            endTime: defaultEndTime,
            breakMinutes: defaultBreakMinutes,
            requiredEmployees: defaultRequiredEmployees,
            hourlyRate: defaultHourlyRate
        })
        onExceptionsChange(newExceptions)
        setEditingExceptionDate(isoKey)
    }

    const removeException = (isoKey: string) => {
        const newExceptions = new Map(exceptions)
        newExceptions.delete(isoKey)
        onExceptionsChange(newExceptions)
        if (editingExceptionDate === isoKey) {
            setEditingExceptionDate(null)
        }
    }

    const updateException = (isoKey: string, field: keyof DayShiftException, value: string | number | Date) => {
        const exception = exceptions.get(isoKey)
        if (!exception) return

        const newExceptions = new Map(exceptions)
        newExceptions.set(isoKey, { ...exception, [field]: value })
        onExceptionsChange(newExceptions)
    }

    return (
        <div className="space-y-4">
            {/* Summary Stats - KPIs at top */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
                    <CalendarDays className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <div>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{includedDays.length}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">{t('shifts.shiftsToCreate', { defaultValue: 'shifts à créer' })}</p>
                    </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-center gap-3">
                    <Settings className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    <div>
                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{exceptions.size}</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">{t('shifts.exceptions', { defaultValue: 'exceptions' })}</p>
                    </div>
                </div>
            </div>

            {/* Default Configuration Card */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">
                        {t('shifts.defaultConfig', { defaultValue: 'Configuration par défaut' })}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded">
                        {t('shifts.appliedToAllDays', { defaultValue: 'Appliquée à tous les jours' })}
                    </span>
                </div>

                <div className={`grid gap-4 ${showHourlyRate ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
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

                    <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
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

                    <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                            <Coffee className="w-3 h-3" />
                            {t('shifts.break')}
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={defaultBreakMinutes}
                            onChange={(e) => onDefaultBreakMinutesChange(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>


                    {showHourlyRate && (
                        <div>
                            <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                <Euro className="w-3 h-3" />
                                {t('shifts.hourlyRate', { defaultValue: 'Taux/h' })}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={defaultHourlyRate}
                                onChange={(e) => onDefaultHourlyRateChange(e.target.value)}
                                placeholder="15.00"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>
                    )}
                </div>

                {/* Duration & Cost Summary */}
                {defaultDuration && (
                    <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                            {t('shifts.duration', { defaultValue: 'Durée' })}:
                            <span className="font-medium text-foreground ml-1">
                                {defaultDuration.hours}h{defaultDuration.mins > 0 ? defaultDuration.mins : ''}
                            </span>
                        </span>
                        {showHourlyRate && defaultHourlyRate && parseFloat(defaultHourlyRate) > 0 && (
                            <span className="text-muted-foreground">
                                {t('shifts.perShift', { defaultValue: 'Par shift' })}:
                                <span className="font-medium text-emerald-600 dark:text-emerald-400 ml-1">
                                    {((defaultDuration.workMinutes / 60) * parseFloat(defaultHourlyRate)).toFixed(2)}€
                                </span>
                            </span>
                        )}
                        {showHourlyRate && totalEstimatedCost !== null && (
                            <span className="text-muted-foreground ml-auto">
                                {t('shifts.totalEstimated', { defaultValue: 'Total estimé' })}:
                                <span className="font-medium text-emerald-600 dark:text-emerald-400 ml-1">
                                    {totalEstimatedCost.toFixed(0)}€
                                </span>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Exceptions Section */}
            <div className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        {t('shifts.exceptionsTitle', { defaultValue: 'Jours avec configuration spéciale' })}
                    </h4>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowExceptionModal(!showExceptionModal)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {t('shifts.addException', { defaultValue: 'Ajouter' })}
                        </button>

                        {showExceptionModal && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowExceptionModal(false)} />
                                <div
                                    className="absolute right-0 z-20 mt-2 p-3 bg-card rounded-lg shadow-xl border border-border w-64 max-h-64 overflow-y-auto"
                                    onScroll={handleScroll}
                                >
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {t('shifts.selectDayForException', { defaultValue: 'Sélectionner un jour' })}
                                    </p>
                                    <div className="space-y-1">
                                        {includedDays
                                            .filter(d => !exceptions.has(d.toISOString().split('T')[0]))
                                            .slice(0, visibleDaysCount)
                                            .map(day => (
                                                <button
                                                    key={day.toISOString()}
                                                    type="button"
                                                    onClick={() => {
                                                        addException(day)
                                                        setShowExceptionModal(false)
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                                                >
                                                    {format(day, 'EEEE d MMMM', { locale: dateLocale })}
                                                </button>
                                            ))}
                                        {includedDays.filter(d => !exceptions.has(d.toISOString().split('T')[0])).length > visibleDaysCount && (
                                            <div className="py-2 flex justify-center">
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {exceptions.size === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        {t('shifts.noExceptions', { defaultValue: 'Aucune exception - tous les jours utilisent la configuration par défaut' })}
                    </p>
                ) : (
                    <div className="space-y-3">
                        {Array.from(exceptions.values()).map(exception => (
                            <div
                                key={exception.dateKey}
                                className="bg-muted/30 border border-border rounded-lg p-3"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">
                                        {format(exception.date, 'EEEE d MMMM', { locale: dateLocale })}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeException(exception.dateKey)}
                                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className={`grid gap-3 ${showHourlyRate ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                    <div>
                                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                            <Clock className="w-3 h-3" />
                                            {t('shifts.startTime')}
                                        </label>
                                        <input
                                            type="time"
                                            value={exception.startTime}
                                            onChange={(e) => updateException(exception.dateKey, 'startTime', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                            <Clock className="w-3 h-3" />
                                            {t('shifts.endTime')}
                                        </label>
                                        <input
                                            type="time"
                                            value={exception.endTime}
                                            onChange={(e) => updateException(exception.dateKey, 'endTime', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                            <Coffee className="w-3 h-3" />
                                            {t('shifts.break')}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={exception.breakMinutes}
                                            onChange={(e) => updateException(exception.dateKey, 'breakMinutes', parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    {showHourlyRate && (
                                        <div>
                                            <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                                <Euro className="w-3 h-3" />
                                                {t('shifts.hourlyRate', { defaultValue: 'Taux/h' })}
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={exception.hourlyRate}
                                                onChange={(e) => updateException(exception.dateKey, 'hourlyRate', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Exception Duration */}
                                {(() => {
                                    const [startH, startM] = exception.startTime.split(':').map(Number);
                                    const [endH, endM] = exception.endTime.split(':').map(Number);
                                    let totalMins = (endH * 60 + endM) - (startH * 60 + startM);
                                    if (totalMins < 0) totalMins += 24 * 60;
                                    const workMins = Math.max(0, totalMins - exception.breakMinutes);
                                    const hours = Math.floor(workMins / 60);
                                    const mins = workMins % 60;
                                    return (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            {t('shifts.duration', { defaultValue: 'Durée' })}:
                                            <span className="font-medium text-foreground ml-1">
                                                {hours}h{mins > 0 ? mins : ''}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
