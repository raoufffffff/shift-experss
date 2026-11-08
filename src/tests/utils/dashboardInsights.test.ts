import { describe, it, expect } from 'vitest'
import type { TFunction } from 'i18next'
import { generateInsights } from '@/utils/dashboardInsights'

// Simple mock t function that returns the key with params
const t = ((key: string, params?: Record<string, unknown>) => {
  if (params) {
    return `${key}:${JSON.stringify(params)}`
  }
  return key
}) as unknown as TFunction

const baseDashboardData = {
  totalShifts: 10,
  fillRate: 75,
  avgFillTimeMinutes: 45,
  avgAcceptanceRate: 70,
  activeEmployees: 20,
  responseTimeDistribution: [
    { label: '< 1min', count: 5 },
    { label: '1-5min', count: 10 },
    { label: '5-15min', count: 8 },
    { label: '15-60min', count: 3 },
    { label: '> 1h', count: 2 },
  ],
}

describe('generateInsights', () => {
  it('returns empty array when no shifts', () => {
    const data = { ...baseDashboardData, totalShifts: 0 }
    expect(generateInsights(data, t)).toEqual([])
  })

  it('generates excellent fill rate insight', () => {
    const data = { ...baseDashboardData, fillRate: 95 }
    const insights = generateInsights(data, t)
    expect(insights.some(i => i.includes('excellentFillRate'))).toBe(true)
  })

  it('generates low fill rate insight', () => {
    const data = { ...baseDashboardData, fillRate: 50 }
    const insights = generateInsights(data, t)
    expect(insights.some(i => i.includes('lowFillRate'))).toBe(true)
  })

  it('generates fast fill time insight', () => {
    const data = { ...baseDashboardData, avgFillTimeMinutes: 15 }
    const insights = generateInsights(data, t)
    expect(insights.some(i => i.includes('fastFillTime'))).toBe(true)
  })

  it('generates slow fill time insight', () => {
    const data = { ...baseDashboardData, avgFillTimeMinutes: 150 }
    const insights = generateInsights(data, t)
    expect(insights.some(i => i.includes('slowFillTime'))).toBe(true)
  })

  it('generates small team insight', () => {
    const data = { ...baseDashboardData, activeEmployees: 3 }
    const insights = generateInsights(data, t)
    expect(insights.some(i => i.includes('smallTeam'))).toBe(true)
  })

  it('generates high engagement insight', () => {
    const data = { ...baseDashboardData, avgAcceptanceRate: 85 }
    const insights = generateInsights(data, t)
    expect(insights.some(i => i.includes('highEngagement'))).toBe(true)
  })

  it('generates low engagement insight', () => {
    const data = { ...baseDashboardData, avgAcceptanceRate: 30 }
    const insights = generateInsights(data, t)
    expect(insights.some(i => i.includes('lowEngagement'))).toBe(true)
  })

  it('limits to 2 insights maximum', () => {
    // Force multiple triggers
    const data = {
      ...baseDashboardData,
      fillRate: 50,            // triggers lowFillRate
      avgFillTimeMinutes: 150, // triggers slowFillTime
      activeEmployees: 3,      // triggers smallTeam
      avgAcceptanceRate: 30,   // triggers lowEngagement
    }
    const insights = generateInsights(data, t)
    expect(insights.length).toBeLessThanOrEqual(2)
  })

  it('generates high reactivity insight when fast responses are dominant', () => {
    const data = {
      ...baseDashboardData,
      responseTimeDistribution: [
        { label: '< 1min', count: 5 },
        { label: '1-5min', count: 50 },
        { label: '5-15min', count: 30 },
        { label: '15-60min', count: 2 },
        { label: '> 1h', count: 1 },
      ],
    }
    const insights = generateInsights(data, t)
    expect(insights.some(i => i.includes('highReactivity'))).toBe(true)
  })
})
