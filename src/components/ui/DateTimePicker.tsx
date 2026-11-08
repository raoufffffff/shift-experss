import { useState, useEffect } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value?: string // ISO format datetime string
  onChange: (value: string) => void
  label: string
  error?: string
  required?: boolean
}

export function DateTimePicker({ value, onChange, label, error, required }: DateTimePickerProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isTimeOpen, setIsTimeOpen] = useState(false)

  const [selectedDate, setSelectedDate] = useState<Date>(value ? new Date(value) : new Date())
  const [hours, setHours] = useState<number>(value ? new Date(value).getHours() : 9)
  const [minutes, setMinutes] = useState<number>(value ? new Date(value).getMinutes() : 0)

  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate)

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      setSelectedDate(date)
      setHours(date.getHours())
      setMinutes(date.getMinutes())
      setCurrentMonth(date)
    }
  }, [value])

  const updateDateTime = (date: Date, hrs: number, mins: number) => {
    const newDate = new Date(date)
    newDate.setHours(hrs, mins, 0, 0)
    onChange(newDate.toISOString())
  }

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSelectedDate(newDate)
    updateDateTime(newDate, hours, minutes)
    setIsCalendarOpen(false)
  }

  const handleHoursChange = (delta: number) => {
    const newHours = Math.max(0, Math.min(23, hours + delta))
    setHours(newHours)
    updateDateTime(selectedDate, newHours, minutes)
  }

  const handleMinutesChange = (delta: number) => {
    let newMinutes = minutes + delta
    let newHours = hours

    if (newMinutes >= 60) {
      newMinutes = 0
      newHours = Math.min(23, hours + 1)
    } else if (newMinutes < 0) {
      newMinutes = 45
      newHours = Math.max(0, hours - 1)
    }

    setMinutes(newMinutes)
    setHours(newHours)
    updateDateTime(selectedDate, newHours, newMinutes)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
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
        {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
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

          const isToday =
            day === new Date().getDate() &&
            currentMonth.getMonth() === new Date().getMonth() &&
            currentMonth.getFullYear() === new Date().getFullYear()

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateSelect(day)}
              className={cn(
                'aspect-square rounded-md text-sm font-medium transition-colors',
                'hover:bg-gray-100',
                isSelected && 'bg-brand text-white hover:bg-brand-dark',
                isToday && !isSelected && 'border border-brand',
                !isSelected && !isToday && 'text-gray-700'
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
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = (hrs: number, mins: number) => {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border text-left',
              'flex items-center gap-2 transition-all',
              'hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
              error ? 'border-red-300' : 'border-gray-300'
            )}
          >
            <Calendar className="w-4 h-4 text-brand" />
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
              <div className="absolute z-20 mt-2 p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-80">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={previousMonth}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-semibold">
                    {currentMonth.toLocaleDateString('fr-FR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight className="w-5 h-5" />
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
