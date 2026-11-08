import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimePickerProps {
  value?: string // ISO format datetime string
  onChange: (value: string) => void
  label: React.ReactNode
  error?: string
  required?: boolean
  baseDate?: string // ISO format datetime string - date to use as base
}

export function TimePicker({ value, onChange, label, error, required, baseDate }: TimePickerProps) {
  const [hours, setHours] = useState<string>(value ? new Date(value).getHours().toString().padStart(2, '0') : '09')
  const [minutes, setMinutes] = useState<string>(value ? new Date(value).getMinutes().toString().padStart(2, '0') : '00')

  const minutesRef = useRef<HTMLInputElement>(null)

  // Initialize with default value if not set
  useEffect(() => {
    if (!value && baseDate) {
      updateTime(hours, minutes)
    }
  }, [baseDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      setHours(date.getHours().toString().padStart(2, '0'))
      setMinutes(date.getMinutes().toString().padStart(2, '0'))
    }
  }, [value])

  const updateTime = (hrs: string, mins: string) => {
    const hrsNum = Math.min(23, Math.max(0, parseInt(hrs, 10) || 0))
    const minsNum = Math.min(59, Math.max(0, parseInt(mins, 10) || 0))

    let date: Date
    if (baseDate) {
      date = new Date(baseDate)
    } else {
      date = new Date()
    }

    // Set local hours — .toISOString() converts to real UTC automatically
    date.setHours(hrsNum, minsNum, 0, 0)
    onChange(date.toISOString())
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, max 2 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 2)
    setHours(value)

    // Auto-focus minutes when 2 digits are entered (using setTimeout to avoid blur race condition)
    if (value.length === 2) {
      setTimeout(() => {
        minutesRef.current?.focus()
        minutesRef.current?.select()
      }, 10)
    }
  }

  const handleHoursBlur = () => {
    // Pad with zero and clamp on blur
    let value = hours
    if (value === '') value = '0'
    let numValue = parseInt(value, 10) || 0
    if (numValue > 23) numValue = 23
    const paddedValue = numValue.toString().padStart(2, '0')
    setHours(paddedValue)
    updateTime(paddedValue, minutes)
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, max 2 characters
    let value = e.target.value.replace(/\D/g, '').slice(0, 2)

    // If user typed 2 digits, clamp to 59
    if (value.length === 2) {
      const numValue = parseInt(value, 10)
      if (numValue > 59) {
        value = '59'
      }
    }
    setMinutes(value)
  }

  const handleMinutesBlur = () => {
    // Pad with zero and clamp on blur
    let value = minutes
    if (value === '') value = '00'
    const numValue = Math.min(59, Math.max(0, parseInt(value, 10) || 0))
    const paddedValue = numValue.toString().padStart(2, '0')
    setMinutes(paddedValue)
    updateTime(hours, paddedValue)
  }

  return (
    <div className={label ? "space-y-2" : ""}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div
        className={cn(
          'flex items-center gap-1 px-3 py-2 rounded-lg border bg-card',
          'transition-all',
          error ? 'border-red-300 dark:border-red-700' : 'border-border',
          'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary'
        )}
      >
        <Clock className="w-4 h-4 text-primary mr-1" />

        {/* Hours input */}
        <input
          type="text"
          inputMode="numeric"
          value={hours}
          onChange={handleHoursChange}
          onBlur={handleHoursBlur}
          onFocus={(e) => e.target.select()}
          placeholder="09"
          className="font-mono text-base font-medium w-7 text-center text-foreground bg-transparent outline-none"
          maxLength={2}
        />

        <span className="text-foreground font-medium">:</span>

        {/* Minutes input */}
        <input
          ref={minutesRef}
          type="text"
          inputMode="numeric"
          value={minutes}
          onChange={handleMinutesChange}
          onBlur={handleMinutesBlur}
          onFocus={(e) => e.target.select()}
          placeholder="00"
          className="font-mono text-base font-medium w-7 text-center text-foreground bg-transparent outline-none"
          maxLength={2}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
