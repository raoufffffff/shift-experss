import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface UseDateRangePickerOptions {
  startDate?: Date
  endDate?: Date
  onChange: (startDate: Date | null, endDate: Date | null) => void
  maxDays: number
  onReset?: () => void
  excludedDays: Set<string>
  onExcludedDaysChange?: (excluded: Set<string>) => void
  onClose?: () => void
}

export function useDateRangePicker({
  startDate,
  endDate,
  onChange,
  maxDays,
  onReset,
  excludedDays,
  onExcludedDaysChange,
  onClose,
}: UseDateRangePickerOptions) {
  const { t, i18n } = useTranslation()

  const getDateLocale = () => {
    const localeMap: Record<string, string> = {
      'fr': 'fr-FR',
      'en': 'en-US',
    };
    return localeMap[i18n.language] || 'en-US';
  };

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(startDate || new Date())
  const [selectingEnd, setSelectingEnd] = useState(false)
  const [isExclusionMode, setIsExclusionMode] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isEditingEndDate, setIsEditingEndDate] = useState(false)
  const [showExtendConfirm, setShowExtendConfirm] = useState(false)
  const [pendingExtendDate, setPendingExtendDate] = useState<Date | null>(null)

  useEffect(() => {
    if (startDate) {
      setCurrentMonth(startDate)
    }
  }, [startDate])

  useEffect(() => {
    if (startDate && endDate) {
      setIsExclusionMode(true)
    } else {
      setIsExclusionMode(false)
    }
  }, [startDate, endDate])

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

  const getMaxAllowedDate = () => {
    if (!startDate || !selectingEnd) return null
    const maxDate = new Date(startDate)
    maxDate.setDate(maxDate.getDate() + maxDays - 1)
    return maxDate
  }

  const dateToISOString = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const handleDateSelect = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const clickedISO = dateToISOString(clickedDate)

    // Mode modification de la date de fin
    if (isEditingEndDate && startDate) {
      if (clickedDate > startDate) {
        const diffDays = Math.ceil((clickedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        if (diffDays <= maxDays) {
          // Nettoyer les exclusions qui sont maintenant hors plage
          if (endDate && clickedDate < endDate) {
            const newExcluded = new Set<string>()
            excludedDays.forEach(d => {
              const date = new Date(d)
              if (date >= startDate && date <= clickedDate) {
                newExcluded.add(d)
              }
            })
            onExcludedDaysChange?.(newExcluded)
          }
          onChange(startDate, clickedDate)
          setIsEditingEndDate(false)
        }
      }
      return
    }

    if (isExclusionMode && startDate && endDate) {
      // Check if clicking on start date - show confirmation modal
      if (clickedDate.toDateString() === startDate.toDateString()) {
        setShowResetConfirm(true)
        return
      }

      // Check if clicking on end date - enter edit mode
      if (clickedDate.toDateString() === endDate.toDateString()) {
        setIsEditingEndDate(true)
        return
      }

      // Check if clicking AFTER end date - show extend confirmation
      if (clickedDate > endDate) {
        const diffDays = Math.ceil((clickedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        if (diffDays <= maxDays) {
          setPendingExtendDate(clickedDate)
          setShowExtendConfirm(true)
        }
        return
      }

      // Allow toggling only for dates within range (not start or end)
      if (clickedDate > startDate && clickedDate < endDate) {
        const newExcluded = new Set(excludedDays)
        if (newExcluded.has(clickedISO)) {
          newExcluded.delete(clickedISO)
        } else {
          newExcluded.add(clickedISO)
        }
        onExcludedDaysChange?.(newExcluded)
      }
      return
    }

    if (!selectingEnd || !startDate) {
      if (startDate && clickedDate.toDateString() === startDate.toDateString()) {
        handleReset()
        return
      }
      onChange(clickedDate, null)
      setSelectingEnd(true)
      onExcludedDaysChange?.(new Set())
    } else {
      if (clickedDate < startDate) {
        onChange(clickedDate, null)
        onExcludedDaysChange?.(new Set())
      } else if (clickedDate.toDateString() === startDate.toDateString()) {
        handleReset()
      } else {
        const diffDays = Math.ceil((clickedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        if (diffDays > maxDays) {
          return
        }
        onChange(startDate, clickedDate)
      }
      setSelectingEnd(false)
    }
  }

  const handleReset = () => {
    onChange(null, null)
    setSelectingEnd(false)
    setIsExclusionMode(false)
    onExcludedDaysChange?.(new Set())
    onReset?.()
  }

  const toggleWeekday = (dayOfWeek: number) => {
    if (!startDate || !endDate) return

    const newExcluded = new Set(excludedDays)
    const current = new Date(startDate)
    const toToggle: string[] = []

    while (current <= endDate) {
      if (current.getDay() === dayOfWeek) {
        toToggle.push(dateToISOString(current))
      }
      current.setDate(current.getDate() + 1)
    }

    const allExcluded = toToggle.every(d => newExcluded.has(d))

    if (allExcluded) {
      toToggle.forEach(d => newExcluded.delete(d))
    } else {
      toToggle.forEach(d => newExcluded.add(d))
    }

    onExcludedDaysChange?.(newExcluded)
  }

  const isWeekdayExcluded = (dayOfWeek: number) => {
    if (!startDate || !endDate) return false

    const current = new Date(startDate)
    let found = false

    while (current <= endDate) {
      if (current.getDay() === dayOfWeek) {
        found = true
        if (!excludedDays.has(dateToISOString(current))) {
          return false
        }
      }
      current.setDate(current.getDate() + 1)
    }

    return found
  }

  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date >= startDate && date <= endDate
  }

  const isStartDate = (day: number) => {
    if (!startDate) return false
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date.toDateString() === startDate.toDateString()
  }

  const isEndDate = (day: number) => {
    if (!endDate) return false
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date.toDateString() === endDate.toDateString()
  }

  const isDayExcluded = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return excludedDays.has(dateToISOString(date))
  }

  const isOutsideAllowedRange = (day: number) => {
    if (!startDate || !selectingEnd || isExclusionMode) return false
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const maxDate = getMaxAllowedDate()
    if (!maxDate) return false
    return date < startDate || date > maxDate
  }

  const includedDaysCount = useMemo(() => {
    if (!startDate || !endDate) return 0
    let count = 0
    const current = new Date(startDate)
    while (current <= endDate) {
      if (!excludedDays.has(dateToISOString(current))) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    return count
  }, [startDate, endDate, excludedDays])

  const totalDaysInRange = useMemo(() => {
    if (!startDate || !endDate) return 0
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [startDate, endDate])

  const formatDateRange = () => {
    if (!startDate) {
      return t('shifts.selectDateRange', { defaultValue: 'Sélectionner une plage de dates' })
    }
    const start = startDate.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' })
    const effectiveEndDate = endDate || startDate
    const end = effectiveEndDate.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' })

    if (!endDate || startDate.toDateString() === endDate.toDateString()) {
      return `${start} → ${end}`
    }
    return `${start} → ${end} (${includedDaysCount}/${totalDaysInRange} ${t('shifts.days', { defaultValue: 'jours' })})`
  }

  const closeCalendar = () => {
    setIsCalendarOpen(false)
    onClose?.()
  }

  const weekdayLabels = i18n.language === 'fr'
    ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return {
    t,
    i18n,
    getDateLocale,
    isCalendarOpen,
    setIsCalendarOpen,
    currentMonth,
    selectingEnd,
    isExclusionMode,
    showResetConfirm,
    setShowResetConfirm,
    isEditingEndDate,
    setIsEditingEndDate,
    showExtendConfirm,
    setShowExtendConfirm,
    pendingExtendDate,
    setPendingExtendDate,
    getDaysInMonth,
    getFirstDayOfMonth,
    previousMonth,
    nextMonth,
    handleDateSelect,
    handleReset,
    toggleWeekday,
    isWeekdayExcluded,
    isInRange,
    isStartDate,
    isEndDate,
    isDayExcluded,
    isOutsideAllowedRange,
    includedDaysCount,
    totalDaysInRange,
    formatDateRange,
    closeCalendar,
    weekdayLabels,
  }
}

export type UseDateRangePickerReturn = ReturnType<typeof useDateRangePicker>
