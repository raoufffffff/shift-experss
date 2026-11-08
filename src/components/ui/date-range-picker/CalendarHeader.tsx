import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UseDateRangePickerReturn } from './useDateRangePicker'

interface CalendarHeaderProps {
  hook: UseDateRangePickerReturn
  startDate?: Date
  excludedDays: Set<string>
}

export function CalendarHeader({ hook, startDate, excludedDays }: CalendarHeaderProps) {
  const {
    t,
    getDateLocale,
    currentMonth,
    selectingEnd,
    isExclusionMode,
    isEditingEndDate,
    setIsEditingEndDate,
    previousMonth,
    nextMonth,
    toggleWeekday,
    isWeekdayExcluded,
    includedDaysCount,
    handleReset,
    weekdayLabels,
  } = hook

  return (
    <>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={previousMonth}
          className="p-1 hover:bg-muted rounded"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="font-semibold text-foreground">
          {currentMonth.toLocaleDateString(getDateLocale(), {
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-muted rounded"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mb-2">
        {isEditingEndDate
          ? t('shifts.selectNewEndDate', { defaultValue: '🎯 Cliquez sur une nouvelle date de fin' })
          : isExclusionMode
            ? t('shifts.exclusionModeHelp', { defaultValue: 'Cliquez sur un jour pour l\'exclure. Cliquez sur la date de fin pour modifier.' })
            : selectingEnd
              ? t('shifts.selectEndDate', { defaultValue: 'Sélectionnez la date de fin (max 3 mois)' })
              : t('shifts.selectStartDate', { defaultValue: 'Sélectionnez la date de début' })
        }
      </p>

      {/* Editing end date banner */}
      {isEditingEndDate && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium animate-pulse">
            {t('shifts.editingEndDate', { defaultValue: 'Mode modification de la date de fin' })}
          </span>
          <button
            type="button"
            onClick={() => setIsEditingEndDate(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t('common.cancel', { defaultValue: 'Annuler' })}
          </button>
        </div>
      )}
    </>
  )
}

interface CalendarFooterProps {
  hook: UseDateRangePickerReturn
  startDate?: Date
  excludedDays: Set<string>
}

export function CalendarFooter({ hook, startDate, excludedDays }: CalendarFooterProps) {
  const {
    t,
    isExclusionMode,
    toggleWeekday,
    isWeekdayExcluded,
    includedDaysCount,
    handleReset,
    weekdayLabels,
  } = hook

  return (
    <>
      {/* Weekday toggles - only in exclusion mode */}
      {isExclusionMode && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">
            {t('shifts.toggleWeekdays', { defaultValue: 'Exclure par jour de semaine' })}
          </p>
          <div className="flex gap-1">
            {weekdayLabels.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleWeekday(idx)}
                className={cn(
                  'flex-1 py-1.5 text-xs rounded transition-colors',
                  isWeekdayExcluded(idx)
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {isExclusionMode && (
        <div className="mt-3 p-2 bg-muted rounded text-center">
          <p className="text-sm font-medium">
            {includedDaysCount} {t('shifts.shiftsWillBeCreated', { defaultValue: 'shifts seront créés' })}
          </p>
          {excludedDays.size > 0 && (
            <p className="text-xs text-muted-foreground">
              ({excludedDays.size} {t('shifts.daysExcluded', { defaultValue: 'jours exclus' })})
            </p>
          )}
        </div>
      )}

      {/* Reset Button */}
      {startDate && (
        <div className="mt-3 pt-3 border-t border-border flex justify-center">
          <button
            type="button"
            onClick={() => {
              handleReset()
            }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            {t('common.reset', { defaultValue: 'Réinitialiser' })}
          </button>
        </div>
      )}
    </>
  )
}
