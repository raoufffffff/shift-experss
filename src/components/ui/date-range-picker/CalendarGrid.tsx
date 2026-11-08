import { X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UseDateRangePickerReturn } from './useDateRangePicker'

interface CalendarGridProps {
  hook: UseDateRangePickerReturn
  startDate?: Date
  endDate?: Date
  excludedDays: Set<string>
}

export function CalendarGrid({ hook, startDate, endDate, excludedDays }: CalendarGridProps) {
  const {
    i18n,
    currentMonth,
    isExclusionMode,
    isEditingEndDate,
    getDaysInMonth,
    getFirstDayOfMonth,
    handleDateSelect,
    isInRange,
    isStartDate,
    isEndDate,
    isDayExcluded,
    isOutsideAllowedRange,
  } = hook

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const days: (number | null)[] = []

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const dayNames = i18n.language === 'fr'
    ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="grid grid-cols-7 gap-1">
      {dayNames.map((day) => (
        <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
          {day}
        </div>
      ))}
      {days.map((day, idx) => {
        if (day === null) {
          return <div key={`empty-${idx}`} />
        }

        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
        const isStart = isStartDate(day)
        const isEnd = isEndDate(day)
        const inRange = isInRange(day)
        const outsideRange = isOutsideAllowedRange(day)
        const isExcluded = isDayExcluded(day)
        const isDisabled = isPast || (outsideRange && !isExclusionMode && !isEditingEndDate)
        const canToggle = isExclusionMode && inRange && !isStart && !isEnd
        const canSelectAsNewEnd = isEditingEndDate && startDate !== undefined && date > startDate! && !isPast
        const isAfterEnd = isExclusionMode && endDate && date > endDate

        return (
          <button
            key={day}
            type="button"
            disabled={isDisabled && !isStart && !canToggle && !isEnd && !canSelectAsNewEnd && !isAfterEnd}
            onClick={() => handleDateSelect(day)}
            className={cn(
              'aspect-square rounded-md text-sm font-medium transition-all relative group',
              isDisabled && !isStart && !canToggle && !isEnd && !canSelectAsNewEnd && !isAfterEnd && 'text-gray-300 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50',
              !isDisabled && !isStart && !isEnd && !inRange && !canSelectAsNewEnd && 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
              isStart && !isExcluded && 'bg-primary text-primary-foreground',
              isEnd && !isExcluded && !isEditingEndDate && 'bg-primary text-primary-foreground',
              isEnd && isEditingEndDate && 'bg-orange-500 text-white animate-pulse ring-2 ring-orange-300',
              inRange && !isStart && !isEnd && !isExcluded && 'bg-primary/20 text-primary',
              isExcluded && inRange && 'bg-red-100 dark:bg-red-900/30 text-red-500 line-through',
              canToggle && !isExcluded && 'hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer',
              canToggle && isExcluded && 'hover:bg-primary/20 cursor-pointer',
              canSelectAsNewEnd && 'hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:ring-2 hover:ring-orange-300 cursor-pointer',
              isAfterEnd && !isPast && 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 cursor-pointer text-gray-600 dark:text-gray-400'
            )}
          >
            {day}
            {/* Show X for excluded days */}
            {isExcluded && inRange && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
                <X className="w-2 h-2 text-white" />
              </span>
            )}
            {/* Show Pencil on end date to indicate edit mode */}
            {isEnd && !isExcluded && isExclusionMode && !isEditingEndDate && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                <Pencil className="w-2 h-2 text-white" />
              </span>
            )}
            {/* Show X on non-excluded range days (except start/end) to show they can be excluded */}
            {inRange && !isStart && !isEnd && !isExcluded && isExclusionMode && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-2 h-2 text-white" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
