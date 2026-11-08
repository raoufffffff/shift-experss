import { Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDateRangePicker } from './date-range-picker/useDateRangePicker'
import { CalendarGrid } from './date-range-picker/CalendarGrid'
import { CalendarHeader, CalendarFooter } from './date-range-picker/CalendarHeader'
import { CalendarModals } from './date-range-picker/CalendarModals'

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onChange: (startDate: Date | null, endDate: Date | null) => void
  label: React.ReactNode
  error?: string
  required?: boolean
  maxDays?: number
  onReset?: () => void
  // New: excluded days management
  excludedDays?: Set<string> // ISO date strings
  onExcludedDaysChange?: (excluded: Set<string>) => void
  calendarPosition?: 'top' | 'bottom'
  onClose?: () => void
  customTrigger?: React.ReactNode
  triggerClassName?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  label,
  error,
  required,
  maxDays = 90,
  onReset,
  excludedDays = new Set(),
  onExcludedDaysChange,
  calendarPosition = 'top',
  onClose,
  customTrigger,
  triggerClassName
}: DateRangePickerProps) {
  const hook = useDateRangePicker({
    startDate,
    endDate,
    onChange,
    maxDays,
    onReset,
    excludedDays,
    onExcludedDaysChange,
    onClose,
  })

  const {
    t,
    isCalendarOpen,
    setIsCalendarOpen,
    handleReset,
    formatDateRange,
    closeCalendar,
  } = hook

  return (
    <div className={cn("space-y-2", customTrigger && "space-y-0")}>
      {!customTrigger && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="flex gap-2">
          {customTrigger ? (
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className={triggerClassName}
            >
              {customTrigger}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg border text-left bg-card text-foreground',
                  'flex items-center gap-2 transition-all',
                  'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                  error ? 'border-red-300' : 'border-border',
                  triggerClassName
                )}
              >
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm">
                  {formatDateRange()}
                </span>
              </button>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={t('common.reset', { defaultValue: 'Réinitialiser' })}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {isCalendarOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={closeCalendar}
            />
            <div className={cn(
              "absolute z-20 p-4 bg-card rounded-lg shadow-xl border border-border w-80",
              calendarPosition === 'top' ? "bottom-full mb-2" : "top-full mt-2"
            )}>
              <CalendarHeader hook={hook} startDate={startDate} excludedDays={excludedDays} />
              <CalendarGrid hook={hook} startDate={startDate} endDate={endDate} excludedDays={excludedDays} />
              <CalendarFooter hook={hook} startDate={startDate} excludedDays={excludedDays} />
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <CalendarModals hook={hook} startDate={startDate} onChange={onChange} />
    </div>
  )
}
