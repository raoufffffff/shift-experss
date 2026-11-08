import { useMemo, useCallback, ChangeEvent, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, Coffee, ArrowRight, Briefcase, FileText, Package, Layers, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { TimePicker } from '@/components/ui/TimePicker';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Select } from '@/components/ui/Select';

import { DayListEditor } from './DayListEditor';
import { DefaultConfigPanel } from './DefaultConfigPanel';
import { StepProps } from './types';
import { toast } from 'sonner';
import { JobPosition, EstablishmentCategory, getTranslatedName } from '@shared/types';

interface DateTimeStepProps extends StepProps {
    categories: EstablishmentCategory[];
    jobPositions: JobPosition[];
    currentLang: string;
}

export function DateTimeStep({ formData, updateFormData, onNext, categories, jobPositions, currentLang }: DateTimeStepProps) {
    const { t } = useTranslation();

    // Calculate if multi-day mode based on date selection
    const isMultiDay = useMemo(() => {
        if (!formData.dateRangeStart || !formData.dateRangeEnd) return false;
        return formData.dateRangeStart.toDateString() !== formData.dateRangeEnd.toDateString();
    }, [formData.dateRangeStart, formData.dateRangeEnd]);

    // Validate time: end must be after start
    const timeErrors = useMemo(() => {
    if (isMultiDay || !formData.startTime || !formData.endTime) return [];
    const errors: string[] = [];

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    const now = new Date();

     const startMins = start.getHours() * 60 + start.getMinutes();
    const endMins = end.getHours() * 60 + end.getMinutes();

     let diffMinutes = endMins - startMins;
    if (diffMinutes <= 0) diffMinutes += 24 * 60;  

     if (startMins === endMins) {
        errors.push(t('shifts.endTimeAfterStart', { defaultValue: 'L\'heure de fin doit être après l\'heure de début' }));
    }

     if (start.getTime() <= now.getTime()) {
        errors.push(t('shifts.startTimeInPast', { defaultValue: 'L\'heure de début est dans le passé.' }));
    }

     if (errors.length === 0 && diffMinutes < 30) {
        errors.push(t('shifts.shiftTooShort', { defaultValue: 'Le shift doit durer au moins 30 minutes' }));
    }

     if (errors.length === 0) {
        const breakDuration = formData.breakDurationMinutes || 0;
        if (breakDuration >= diffMinutes) {
            errors.push(t('shifts.breakTooLong', { defaultValue: 'La pause ne peut pas être supérieure ou égale à la durée du shift' }));
        }
    }

    return errors;
}, [formData.startTime, formData.endTime, formData.breakDurationMinutes, isMultiDay, t]);
    const timeError = timeErrors.length > 0 ? timeErrors[0] : null;

    // Reset job position if category changes (logic from PositionStep)
    useEffect(() => {
        if (formData.categoryId && formData.jobPositionId) {
            const currentPosition = jobPositions.find(p => p.id === formData.jobPositionId);
            if (currentPosition && currentPosition.category_id !== formData.categoryId) {
                updateFormData({ jobPositionId: '', positionName: '' });
            }
        }
    }, [formData.categoryId, formData.jobPositionId, jobPositions, updateFormData]);

    // Handle category change
    const handleCategoryChange = (categoryId: string) => {
        updateFormData({
            categoryId,
            jobPositionId: '',
            positionName: ''
        });
    };

    // Handle job position select change
    const handlePositionChange = (positionId: string) => {
        if (positionId === 'no_positions') return;
        updateFormData({ jobPositionId: positionId });
        const selectedPosition = jobPositions.find((p) => p.id === positionId);
        if (selectedPosition) {
            updateFormData({
                positionName: getTranslatedName(selectedPosition.name_translations, currentLang),
            });
        } else {
            updateFormData({ positionName: '' });
        }
    };



    // Check if form is valid to proceed
    const canProceed = useMemo(() => {
        if (!formData.categoryId) return false;
        if (!formData.positionName) return false;
        if (!formData.dateRangeStart) return false;
        if (!isMultiDay) {
            if (!formData.startTime || !formData.endTime) return false;
            if (timeError) return false;
        }
        return true;
    }, [formData.categoryId, formData.positionName, formData.dateRangeStart, formData.startTime, formData.endTime, isMultiDay, timeError]);

    // Duration calculation for single day mode
  const duration = useMemo(() => {
    if (isMultiDay || !formData.startTime || !formData.endTime) return null;

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);

     const startMins = start.getHours() * 60 + start.getMinutes();
    const endMins = end.getHours() * 60 + end.getMinutes();

     let diffMinutes = endMins - startMins;
    if (diffMinutes <= 0) diffMinutes += 24 * 60;

     const breakDuration = formData.breakDurationMinutes || 0;
    const workMinutes = diffMinutes - breakDuration;

    if (workMinutes <= 0) return null;

    const hours = Math.floor(workMinutes / 60);
    const minutes = workMinutes % 60;

    return { hours, minutes, totalMinutes: workMinutes };
}, [formData.startTime, formData.endTime, formData.breakDurationMinutes, isMultiDay]);

    // Handle date range change
    const handleDateRangeChange = useCallback((start: Date | null, end: Date | null) => {
        updateFormData({
            dateRangeStart: start,
            dateRangeEnd: end,
            isMultiDay: start && end ? start.toDateString() !== end.toDateString() : false,
        });

        // If single day, update start_time/end_time with selected date
        if (start && (!end || start.toDateString() === end?.toDateString())) {
            const currentStart = formData.startTime ? new Date(formData.startTime) : null;
            const startH = currentStart ? currentStart.getHours() : 9;
            const startM = currentStart ? currentStart.getMinutes() : 0;
            const newStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), startH, startM, 0, 0);

            const currentEnd = formData.endTime ? new Date(formData.endTime) : null;
            const endH = currentEnd ? currentEnd.getHours() : 18;
            const endM = currentEnd ? currentEnd.getMinutes() : 0;
            const newEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate(), endH, endM, 0, 0);

            updateFormData({
                startTime: newStart.toISOString(),
                endTime: newEnd.toISOString(),
            });
        }
    }, [formData.startTime, formData.endTime, updateFormData]);

    // Handle time changes for single day mode
    const handleStartTimeChange = useCallback((value: string) => {
        updateFormData({ startTime: value });

        // Sync end_time date with start_time date (keep same calendar date)
        if (value && formData.endTime) {
            const startDate = new Date(value);
            const endDate = new Date(formData.endTime);
            if (startDate.getFullYear() !== endDate.getFullYear() ||
                startDate.getMonth() !== endDate.getMonth() ||
                startDate.getDate() !== endDate.getDate()) {
                const newEnd = new Date(
                    startDate.getFullYear(), startDate.getMonth(), startDate.getDate(),
                    endDate.getHours(), endDate.getMinutes(), 0, 0
                );
                updateFormData({ endTime: newEnd.toISOString() });
            }
        }
    }, [formData.endTime, updateFormData]);

    // Validate step before proceeding
    const handleNext = () => {
        if (!formData.categoryId) {
            toast.error(t('shifts.categoryRequired', { defaultValue: 'Veuillez sélectionner une catégorie' }));
            return;
        }
        if (!formData.positionName) {
            toast.error(t('shifts.positionRequired'));
            return;
        }
        if (!formData.dateRangeStart) {
            toast.error(t('shifts.wizard.dateRequired', { defaultValue: 'Veuillez sélectionner une date' }));
            return;
        }

        if (!isMultiDay) {
            if (!formData.startTime || !formData.endTime) {
                toast.error(t('shifts.wizard.timeRequired', { defaultValue: 'Veuillez sélectionner les horaires' }));
                return;
            }
        }

        onNext();
    };

    // Filter job positions by selected category
    const filteredPositions = formData.categoryId
        ? jobPositions.filter(p => p.category_id === formData.categoryId)
        : [];



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
                    <FileText className="w-5 h-5 text-primary" />
                    {t('shifts.wizard.step1Title', { defaultValue: 'Détails & Horaires' })}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('shifts.wizard.step1Desc', { defaultValue: 'Définissez le poste, la mission et les horaires' })}
                </p>
            </div>

            {/* JOB POSITION SECTION */}
            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    {t('shifts.positionDetails', { defaultValue: 'Poste et Mission' })}
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* Category Selection */}
                    <Select
                        label={t('shifts.category', { defaultValue: 'Catégorie' })}
                        options={[
                            { value: '', label: t('shifts.selectCategory', { defaultValue: 'Sélectionner une catégorie...' }) },
                            ...categories.map((category) => ({
                                value: category.id,
                                label: getTranslatedName(category.name_translations, currentLang),
                            })),
                        ]}
                        value={formData.categoryId}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        required
                        className="bg-card"
                    />

                    {/* Job Position Selection */}
                    <Select
                        label={t('shifts.position')}
                        options={[
                            { value: '', label: t('shifts.selectPosition', { defaultValue: 'Sélectionner un poste...' }) },
                            ...filteredPositions.map((position) => ({
                                value: position.id,
                                label: getTranslatedName(position.name_translations, currentLang),
                            })),
                            ...(formData.categoryId && filteredPositions.length === 0
                                ? [{ value: 'no_positions', label: t('shifts.noPositionsFound', { defaultValue: 'Aucun poste trouvé' }) }]
                                : []),
                        ]}
                        value={formData.jobPositionId}
                        onChange={(e) => handlePositionChange(e.target.value)}
                        required
                        disabled={!formData.categoryId}
                        className="bg-card"
                    />
                </div>

            </div>

            {/* DATE & TIME SECTION */}
            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    {t('shifts.timeDetails', { defaultValue: 'Date et Horaires' })}
                </h3>

                <DateRangePicker
                    label={
                        <span className="inline-flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-primary" />
                            {t('shifts.dateRange', { defaultValue: 'Plage de dates' })}
                        </span>
                    }
                    startDate={formData.dateRangeStart || undefined}
                    endDate={formData.dateRangeEnd || undefined}
                    onChange={handleDateRangeChange}
                    maxDays={90}
                    excludedDays={formData.excludedDays}
                    onExcludedDaysChange={(days) => updateFormData({ excludedDays: days })}
                    onReset={() => updateFormData({ shiftExceptions: new Map() })}
                    calendarPosition="bottom"
                    required
                />

                {/* Default Configuration + KPIs - Only for multi-day mode */}
                {isMultiDay && formData.dateRangeStart && (
                    <DefaultConfigPanel
                        startDate={formData.dateRangeStart}
                        endDate={formData.dateRangeEnd}
                        excludedDays={formData.excludedDays}
                        exceptionsCount={formData.shiftExceptions.size}
                        defaultStartTime={formData.defaultStartTime}
                        defaultEndTime={formData.defaultEndTime}
                        defaultBreakMinutes={formData.defaultBreakMinutes}
                        onDefaultStartTimeChange={(v) => updateFormData({ defaultStartTime: v })}
                        onDefaultEndTimeChange={(v) => updateFormData({ defaultEndTime: v })}
                        onDefaultBreakMinutesChange={(v) => updateFormData({ defaultBreakMinutes: v })}
                    />
                )}

                {/* Day List Editor - Shows selected days with edit/delete options */}
                {formData.dateRangeStart && (
                    <DayListEditor
                        startDate={formData.dateRangeStart}
                        endDate={formData.dateRangeEnd}
                        excludedDays={formData.excludedDays}
                        onExcludedDaysChange={(days) => updateFormData({ excludedDays: days })}
                        startTime={formData.startTime}
                        endTime={formData.endTime}
                        breakMinutes={formData.breakDurationMinutes}
                        onStartTimeChange={(v) => updateFormData({ startTime: v })}
                        onEndTimeChange={(v) => updateFormData({ endTime: v })}
                        onBreakMinutesChange={(v) => updateFormData({ breakDurationMinutes: v })}
                        exceptions={formData.shiftExceptions}
                        onExceptionsChange={(exceptions) => updateFormData({ shiftExceptions: exceptions })}
                        defaultStartTime={formData.defaultStartTime}
                        defaultEndTime={formData.defaultEndTime}
                        defaultBreakMinutes={formData.defaultBreakMinutes}
                    />
                )}

                {/* Publish Mode Selection - multi-day only */}
                {isMultiDay && formData.dateRangeStart && formData.dateRangeEnd && (
                    <div className="grid grid-cols-2 gap-3">
                        {/* Event mode */}
                        <button
                            type="button"
                            onClick={() => updateFormData({ publishMode: 'event' })}
                            className={cn(
                                'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                                formData.publishMode === 'event'
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                            )}
                        >
                            <div className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center',
                                formData.publishMode === 'event'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                            )}>
                                <Package className="w-5 h-5" />
                            </div>
                            <span className={cn(
                                'text-sm font-medium',
                                formData.publishMode === 'event' ? 'text-primary' : 'text-foreground'
                            )}>
                                {t('shifts.publishMode.event', { defaultValue: 'Événement complet' })}
                            </span>
                            <span className="text-xs text-muted-foreground leading-tight">
                                {t('shifts.publishMode.eventDesc', { defaultValue: 'Shifts regroupés en un seul événement' })}
                            </span>
                            <span className="text-[11px] text-muted-foreground/70 leading-tight italic">
                                {t('shifts.publishMode.eventHint', { defaultValue: 'Une seule personne couvrira tous les jours' })}
                            </span>
                            {formData.publishMode === 'event' && (
                                <div className="absolute top-2 right-2">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                </div>
                            )}
                        </button>

                        {/* Separate mode */}
                        <button
                            type="button"
                            onClick={() => updateFormData({ publishMode: 'separate' })}
                            className={cn(
                                'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                                formData.publishMode === 'separate'
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                            )}
                        >
                            <div className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center',
                                formData.publishMode === 'separate'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                            )}>
                                <Layers className="w-5 h-5" />
                            </div>
                            <span className={cn(
                                'text-sm font-medium',
                                formData.publishMode === 'separate' ? 'text-primary' : 'text-foreground'
                            )}>
                                {t('shifts.publishMode.separate', { defaultValue: 'Shifts séparés' })}
                            </span>
                            <span className="text-xs text-muted-foreground leading-tight">
                                {t('shifts.publishMode.separateDesc', { defaultValue: 'Chaque jour crée un shift indépendant' })}
                            </span>
                            <span className="text-[11px] text-muted-foreground/70 leading-tight italic">
                                {t('shifts.publishMode.separateHint', { defaultValue: 'Des personnes différentes peuvent couvrir chaque jour' })}
                            </span>
                            {formData.publishMode === 'separate' && (
                                <div className="absolute top-2 right-2">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                </div>
                            )}
                        </button>
                    </div>
                )}

                {/* Single-Day Mode Time Pickers */}
                {!isMultiDay && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-foreground">
                                    {t('shifts.startTime')}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <TimePicker
                                    label=""
                                    value={formData.startTime}
                                    onChange={handleStartTimeChange}
                                    baseDate={formData.startTime}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-foreground">
                                    {t('shifts.endTime')}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <TimePicker
                                    label=""
                                    value={formData.endTime}
                                    onChange={(v) => updateFormData({ endTime: v })}
                                    baseDate={formData.startTime}
                                />
                            </div>
                        </div>

                        {/* Duration Display */}
                        {duration && (
                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                            {t('shifts.totalWorkDuration')}
                                        </p>
                                        <p className="text-[10px] text-blue-700 dark:text-blue-300">
                                            {t('shifts.totalWorkDuration')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                                            {duration.hours}h{duration.minutes > 0 && ` ${duration.minutes}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>



            {/* Time Error Messages */}
            {timeErrors.length > 0 && !isMultiDay && (
                <div className="space-y-1.5">
                    {timeErrors.map((error, i) => (
                        <div key={i} className="text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
                            {error}
                        </div>
                    ))}
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-end pt-4">
                <Button
                    type="button"
                    onClick={handleNext}
                    className="min-w-32"
                    disabled={!canProceed}
                >
                    {t('shifts.wizard.next', { defaultValue: 'Suivant' })}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </motion.div>
    );
}
