import { describe, it, expect, vi, afterEach } from 'vitest'
import { calculateDateRange, getTodayBounds } from '@/utils/dashboard/dateRange'

describe('calculateDateRange', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 1 day for today', () => {
    const result = calculateDateRange('today')
    expect(result.daysCount).toBe(1)
    expect(result.startDate.getDate()).toBe(new Date().getDate())
  })

  it('returns 7 days for 7d', () => {
    const result = calculateDateRange('7d')
    expect(result.daysCount).toBe(7)
  })

  it('returns 30 days for 30d', () => {
    const result = calculateDateRange('30d')
    expect(result.daysCount).toBe(30)
  })

  it('returns 90 days for 90d', () => {
    const result = calculateDateRange('90d')
    expect(result.daysCount).toBe(90)
  })

  it('handles custom date range', () => {
    const start = new Date('2025-01-01')
    const end = new Date('2025-01-31')
    const result = calculateDateRange('custom', start, end)
    expect(result.startDate).toBe(start)
    expect(result.endDate).toBe(end)
    expect(result.daysCount).toBe(31)
  })

  it('falls back to default when custom range has no dates', () => {
    const result = calculateDateRange('custom', null, null)
    // Falls into the else branch, defaults to 90d
    expect(result.daysCount).toBe(90)
  })

  it('endDate is always now or provided end', () => {
    const result = calculateDateRange('30d')
    const now = Date.now()
    // endDate should be close to now (within 1 second)
    expect(Math.abs(result.endDate.getTime() - now)).toBeLessThan(1000)
  })

  it('startDate is N-1 days before endDate for range N', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))

    const result = calculateDateRange('7d')
    const diffDays = Math.round(
      (result.endDate.getTime() - result.startDate.getTime()) / (24 * 60 * 60 * 1000)
    )
    // 7 days range: startDate is J-6, so diff is 6 days
    expect(diffDays).toBe(6)
  })
})

describe('getTodayBounds', () => {
  it('returns ISO strings', () => {
    const { todayStart, todayEnd } = getTodayBounds()
    expect(todayStart).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(todayEnd).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('start is before end', () => {
    const { todayStart, todayEnd } = getTodayBounds()
    expect(new Date(todayStart).getTime()).toBeLessThan(new Date(todayEnd).getTime())
  })

  it('end is at 23:59:59', () => {
    const { todayEnd } = getTodayBounds()
    const endDate = new Date(todayEnd)
    expect(endDate.getHours()).toBe(23)
    expect(endDate.getMinutes()).toBe(59)
    expect(endDate.getSeconds()).toBe(59)
  })
})
