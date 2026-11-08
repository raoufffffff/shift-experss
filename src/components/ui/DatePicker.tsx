import { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface DatePickerProps {
  value?: string // ISO format datetime string
  onChange: (value: string) => void
  label: React.ReactNode
  error?: string
  required?: boolean
}

export function DatePicker({ value, onChange, label, error, required }: DatePickerProps) {
  const { i18n } = useTranslation()

  // Get locale for date formatting
  const getDateLocale = () => {
    const localeMap: Record<string, string> = {
      'fr': 'fr-FR',
      'en': 'en-US',
      'es': 'es-ES',
      'it': 'it-IT',
      'zh': 'zh-CN',
    };
    return localeMap[i18n.language] || 'en-US';
  };

  // Get localized day names (short)
  const getDayNames = () => {
    const locale = getDateLocale();
    const baseDate = new Date(2024, 0, 1); // A Monday
    const days = [];

    // Start from Sunday (index 0)
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + (i + 6) % 7); // Adjust to start from Sunday
      const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
      days.push(dayName);
    }

    return days;
  };
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Initialize dates in UTC to avoid timezone issues
  const getInitialDate = () => {
    if (value) return new Date(value)
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate())
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize with current date if no value is set
  useEffect(() => {
    if (!value && !isInitialized) {
      updateDate(selectedDate)
      setIsInitialized(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      setSelectedDate(date)
      setCurrentMonth(date)
    }
  }, [value])

  const updateDate = (date: Date) => {
    const existingDate = value ? new Date(value) : new Date()
    const hours = value ? existingDate.getHours() : 9
    const minutes = value ? existingDate.getMinutes() : 0

    const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0)
    onChange(newDate.toISOString())
  }

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSelectedDate(newDate)
    updateDate(newDate)
    setIsCalendarOpen(false)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days: (number | null)[] = []

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {getDayNames().map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />
          }

          const isSelected =
            day === selectedDate.getDate() &&
            currentMonth.getMonth() === selectedDate.getMonth() &&
            currentMonth.getFullYear() === selectedDate.getFullYear()

          const today = new Date()
          const isToday =
            day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateSelect(day)}
              className={cn(
                'aspect-square rounded-md text-sm font-medium transition-colors',
                'hover:bg-gray-100',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                isToday && !isSelected && 'border-2 border-primary text-primary',
                !isSelected && !isToday && 'text-foreground'
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(getDateLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg border text-left bg-card text-foreground',
            'flex items-center gap-2 transition-all',
            'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            error ? 'border-red-300' : 'border-border'
          )}
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm">
            {formatDate(selectedDate)}
          </span>
        </button>

        {isCalendarOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsCalendarOpen(false)}
            />
            <div className="absolute z-20 mt-2 p-4 bg-card rounded-lg shadow-xl border border-border w-80">
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
              {renderCalendar()}
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
