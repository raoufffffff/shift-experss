import { describe, it, expect } from 'vitest'
import {
  formatResponseTimeDistribution,
  formatShiftsByEstablishment,
  formatCostDistribution,
} from '@/utils/dashboard/formatCharts'
import type { ApplicationData, EstablishmentShiftData } from '@/utils/dashboard/fetchShifts'

const t = (key: string) => key

function makeApp(overrides: Partial<ApplicationData> = {}): ApplicationData {
  return {
    status: 'applied',
    response_time_seconds: null,
    applied_at: null,
    reviewed_at: null,
    ...overrides,
  }
}

describe('formatResponseTimeDistribution', () => {
  it('returns 5 buckets for empty data', () => {
    const result = formatResponseTimeDistribution([])
    expect(result).toHaveLength(5)
    expect(result.every(r => r.count === 0)).toBe(true)
  })

  it('buckets by response_time_seconds', () => {
    const apps = [
      makeApp({ response_time_seconds: 30 }),   // < 1min
      makeApp({ response_time_seconds: 120 }),  // 1-5min
      makeApp({ response_time_seconds: 600 }),  // 5-15min
      makeApp({ response_time_seconds: 2000 }), // 15-60min
      makeApp({ response_time_seconds: 7200 }), // > 1h
    ]
    const result = formatResponseTimeDistribution(apps)
    expect(result[0].count).toBe(1) // < 1min
    expect(result[1].count).toBe(1) // 1-5min
    expect(result[2].count).toBe(1) // 5-15min
    expect(result[3].count).toBe(1) // 15-60min
    expect(result[4].count).toBe(1) // > 1h
  })

  it('calculates from applied_at and reviewed_at when no response_time_seconds', () => {
    const apps = [
      makeApp({
        response_time_seconds: null,
        applied_at: '2025-01-01T08:00:00Z',
        reviewed_at: '2025-01-01T08:02:00Z', // 120 seconds = 1-5min bucket
      }),
    ]
    const result = formatResponseTimeDistribution(apps)
    expect(result[1].count).toBe(1) // 1-5min
  })

  it('ignores applications without time data', () => {
    const apps = [makeApp({ response_time_seconds: null })]
    const result = formatResponseTimeDistribution(apps)
    expect(result.every(r => r.count === 0)).toBe(true)
  })
})

describe('formatShiftsByEstablishment', () => {
  it('returns empty array for no shifts', () => {
    expect(formatShiftsByEstablishment([], t)).toEqual([])
  })

  it('groups shifts by establishment name', () => {
    const shifts: EstablishmentShiftData[] = [
      { establishment_id: 'e1', establishment: { name: 'Store A' } },
      { establishment_id: 'e1', establishment: { name: 'Store A' } },
      { establishment_id: 'e2', establishment: { name: 'Store B' } },
    ]
    const result = formatShiftsByEstablishment(shifts, t)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Store A')
    expect(result[0].count).toBe(2)
    expect(result[1].name).toBe('Store B')
    expect(result[1].count).toBe(1)
  })

  it('sorts by count descending', () => {
    const shifts: EstablishmentShiftData[] = [
      { establishment_id: 'e1', establishment: { name: 'Small' } },
      { establishment_id: 'e2', establishment: { name: 'Big' } },
      { establishment_id: 'e2', establishment: { name: 'Big' } },
      { establishment_id: 'e2', establishment: { name: 'Big' } },
    ]
    const result = formatShiftsByEstablishment(shifts, t)
    expect(result[0].name).toBe('Big')
    expect(result[0].count).toBe(3)
  })

  it('handles null establishment name using t()', () => {
    const shifts: EstablishmentShiftData[] = [
      { establishment_id: 'e1', establishment: null },
    ]
    const result = formatShiftsByEstablishment(shifts, t)
    expect(result[0].name).toBe('dashboard.undefined')
  })
})

describe('formatCostDistribution', () => {
  it('returns both cost types', () => {
    const result = formatCostDistribution(1000, 500, t)
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe(1000)
    expect(result[1].value).toBe(500)
  })

  it('filters out zero values', () => {
    const result = formatCostDistribution(1000, 0, t)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(1000)
  })

  it('returns empty array when both zero', () => {
    expect(formatCostDistribution(0, 0, t)).toEqual([])
  })

  it('includes correct colors', () => {
    const result = formatCostDistribution(100, 200, t)
    expect(result[0].color).toBe('#10b981')
    expect(result[1].color).toBe('#3b82f6')
  })
})
