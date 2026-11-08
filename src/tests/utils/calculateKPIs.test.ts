import { describe, it, expect } from 'vitest'
import {
  calculateFillRate,
  calculateAvgFillTime,
  calculateEstimatedValue,
  calculateAvgAcceptanceRate,
  calculateAvgFirstResponseTime,
  calculateTopEmployees,
  calculateAvgShiftDuration,
  calculateNoShowRate,
  calculateTotalShiftsCost,
  calculateTotalFreelancerShiftsCost,
  calculateAverageCostPerShift,
  calculateCostByEstablishment,
} from '@/utils/dashboard/calculateKPIs'
import type { ShiftData, ApplicationData, EmployeeData, ShiftApplicationMapping } from '@/utils/dashboard/fetchShifts'

// Helper factory for shifts
function makeShift(overrides: Partial<ShiftData> = {}): ShiftData {
  return {
    id: 'shift-1',
    status: 'pending',
    created_at: '2025-01-01T00:00:00Z',
    filled_at: null,
    start_time: '2025-01-01T08:00:00Z',
    end_time: '2025-01-01T16:00:00Z',
    break_duration_minutes: 30,
    published_at: '2025-01-01T00:00:00Z',
    establishment_id: 'estab-1',
    freelance_hourly_rate: null,
    ...overrides,
  }
}

function makeApplication(overrides: Partial<ApplicationData> = {}): ApplicationData {
  return {
    status: 'applied',
    user_id: 'user-1',
    shift_id: 'shift-1',
    applied_at: null,
    reviewed_at: null,
    response_time_seconds: null,
    no_show: null,
    ...overrides,
  }
}

describe('calculateFillRate', () => {
  it('returns 0 for empty shifts', () => {
    expect(calculateFillRate([])).toBe(0)
  })

  it('calculates rate for filled shifts', () => {
    const shifts = [
      makeShift({ id: '1', status: 'filled' }),
      makeShift({ id: '2', status: 'completed' }),
      makeShift({ id: '3', status: 'pending' }),
      makeShift({ id: '4', status: 'pending' }),
    ]
    expect(calculateFillRate(shifts)).toBe(50)
  })

  it('returns 100 when all shifts are filled', () => {
    const shifts = [
      makeShift({ id: '1', status: 'filled' }),
      makeShift({ id: '2', status: 'completed' }),
    ]
    expect(calculateFillRate(shifts)).toBe(100)
  })

  it('returns 0 when no shifts are filled', () => {
    const shifts = [
      makeShift({ id: '1', status: 'pending' }),
      makeShift({ id: '2', status: 'pending' }),
    ]
    expect(calculateFillRate(shifts)).toBe(0)
  })
})

describe('calculateAvgFillTime', () => {
  it('returns 0 for empty shifts', () => {
    expect(calculateAvgFillTime([])).toBe(0)
  })

  it('returns 0 when no filled shifts have timestamps', () => {
    const shifts = [makeShift({ status: 'pending' })]
    expect(calculateAvgFillTime(shifts)).toBe(0)
  })

  it('calculates average fill time in minutes', () => {
    const shifts = [
      makeShift({
        id: '1',
        status: 'filled',
        published_at: '2025-01-01T08:00:00Z',
        filled_at: '2025-01-01T08:30:00Z', // 30 minutes
      }),
      makeShift({
        id: '2',
        status: 'filled',
        published_at: '2025-01-01T08:00:00Z',
        filled_at: '2025-01-01T09:00:00Z', // 60 minutes
      }),
    ]
    expect(calculateAvgFillTime(shifts)).toBe(45) // (30+60)/2
  })
})

describe('calculateEstimatedValue', () => {
  it('returns 0 for empty shifts', () => {
    expect(calculateEstimatedValue([])).toBe(0)
  })

  it('only counts completed shifts', () => {
    const shifts = [
      makeShift({ id: '1', status: 'completed', start_time: '2025-01-01T08:00:00Z', end_time: '2025-01-01T16:00:00Z', break_duration_minutes: 0 }),
      makeShift({ id: '2', status: 'pending' }),
    ]
    // 8 hours * 60$/h = 480
    expect(calculateEstimatedValue(shifts)).toBe(480)
  })
})

describe('calculateAvgAcceptanceRate', () => {
  it('returns 0 for empty applications', () => {
    expect(calculateAvgAcceptanceRate([])).toBe(0)
  })

  it('calculates rate from applied and accepted', () => {
    const apps = [
      makeApplication({ status: 'applied' }),
      makeApplication({ status: 'accepted' }),
      makeApplication({ status: 'rejected' }),
      makeApplication({ status: 'pending' }),
    ]
    expect(calculateAvgAcceptanceRate(apps)).toBe(50)
  })
})

describe('calculateAvgFirstResponseTime', () => {
  it('returns 0 when no data', () => {
    expect(calculateAvgFirstResponseTime([], [])).toBe(0)
  })

  it('calculates average first response time', () => {
    const shifts = [
      makeShift({ id: 's1', published_at: '2025-01-01T08:00:00Z' }),
      makeShift({ id: 's2', published_at: '2025-01-01T08:00:00Z' }),
    ]
    const apps = [
      makeApplication({ shift_id: 's1', applied_at: '2025-01-01T08:10:00Z' }), // 10 min
      makeApplication({ shift_id: 's1', applied_at: '2025-01-01T08:20:00Z' }), // later, ignored (first per shift)
      makeApplication({ shift_id: 's2', applied_at: '2025-01-01T08:30:00Z' }), // 30 min
    ]
    // First responses: 10min (s1) + 30min (s2) = 40 / 2 = 20
    expect(calculateAvgFirstResponseTime(shifts, apps)).toBe(20)
  })
})

describe('calculateTopEmployees', () => {
  it('returns empty array for no applications', () => {
    expect(calculateTopEmployees([], [])).toEqual([])
  })

  it('returns top 5 employees by acceptance rate', () => {
    const employees = [
      { id: 'emp-1', user_id: 'user-1' },
      { id: 'emp-2', user_id: 'user-2' },
    ]
    const apps = [
      makeApplication({ user_id: 'user-1', status: 'applied', user: { first_name: 'Alice', last_name: 'A' } }),
      makeApplication({ user_id: 'user-1', status: 'applied', user: { first_name: 'Alice', last_name: 'A' } }),
      makeApplication({ user_id: 'user-1', status: 'rejected', user: { first_name: 'Alice', last_name: 'A' } }),
      makeApplication({ user_id: 'user-2', status: 'applied', user: { first_name: 'Bob', last_name: 'B' } }),
    ]
    const result = calculateTopEmployees(apps, employees)
    expect(result).toHaveLength(2)
    // Bob: 1/1 = 100%, Alice: 2/3 = 67%
    expect(result[0].name).toBe('Bob B')
    expect(result[0].acceptanceRate).toBe(100)
    expect(result[1].name).toBe('Alice A')
    expect(result[1].acceptanceRate).toBe(67)
  })

  it('limits to 5 employees', () => {
    const employees = Array.from({ length: 10 }, (_, i) => ({
      id: `emp-${i}`,
      user_id: `user-${i}`,
    }))
    const apps = employees.map((emp) =>
      makeApplication({ user_id: emp.user_id, status: 'applied', user: { first_name: `E${emp.id}`, last_name: '' } })
    )
    const result = calculateTopEmployees(apps, employees)
    expect(result.length).toBeLessThanOrEqual(5)
  })
})

describe('calculateAvgShiftDuration', () => {
  it('returns 0 for empty shifts', () => {
    expect(calculateAvgShiftDuration([])).toBe(0)
  })

  it('calculates average net duration', () => {
    const shifts = [
      makeShift({ start_time: '2025-01-01T08:00:00Z', end_time: '2025-01-01T16:00:00Z', break_duration_minutes: 30 }),
      makeShift({ start_time: '2025-01-01T09:00:00Z', end_time: '2025-01-01T17:00:00Z', break_duration_minutes: 30 }),
    ]
    // Both: 8h - 0.5h = 7.5h, avg = 7.5
    expect(calculateAvgShiftDuration(shifts)).toBe(7.5)
  })
})

describe('calculateNoShowRate', () => {
  it('returns 0 for empty applications', () => {
    expect(calculateNoShowRate([])).toBe(0)
  })

  it('returns 0 when no accepted applications', () => {
    const apps = [makeApplication({ status: 'applied', no_show: true })]
    expect(calculateNoShowRate(apps)).toBe(0)
  })

  it('calculates rate from accepted applications', () => {
    const apps = [
      makeApplication({ status: 'accepted', no_show: true }),
      makeApplication({ status: 'accepted', no_show: false }),
      makeApplication({ status: 'accepted', no_show: null }),
      makeApplication({ status: 'accepted', no_show: true }),
    ]
    // 2 no-shows / 4 accepted = 50%
    expect(calculateNoShowRate(apps)).toBe(50)
  })
})

describe('calculateTotalShiftsCost', () => {
  it('returns 0 for empty data', () => {
    expect(calculateTotalShiftsCost([], [], [])).toBe(0)
  })

  it('calculates cost for completed shifts', () => {
    const shifts = [
      makeShift({ id: 's1', status: 'completed', start_time: '2025-01-01T08:00:00Z', end_time: '2025-01-01T16:00:00Z', break_duration_minutes: 0 }),
    ]
    const employees: EmployeeData[] = [{ id: 'emp-1', user_id: 'user-1', verified_hourly_rate: 20 }]
    const mappings: ShiftApplicationMapping[] = [{ shift_id: 's1', user_id: 'user-1', status: 'accepted' }]

    // 8h * 20$/h = 160
    expect(calculateTotalShiftsCost(shifts, employees, mappings)).toBe(160)
  })

  it('ignores pending shifts', () => {
    const shifts = [makeShift({ id: 's1', status: 'pending' })]
    const employees: EmployeeData[] = [{ id: 'emp-1', user_id: 'user-1', verified_hourly_rate: 20 }]
    const mappings: ShiftApplicationMapping[] = [{ shift_id: 's1', user_id: 'user-1', status: 'accepted' }]

    expect(calculateTotalShiftsCost(shifts, employees, mappings)).toBe(0)
  })
})

describe('calculateTotalFreelancerShiftsCost', () => {
  it('returns 0 for empty data', () => {
    expect(calculateTotalFreelancerShiftsCost([], [])).toBe(0)
  })

  it('calculates cost for freelancer shifts', () => {
    const shifts = [
      makeShift({
        id: 's1',
        status: 'completed',
        start_time: '2025-01-01T08:00:00Z',
        end_time: '2025-01-01T16:00:00Z',
        break_duration_minutes: 0,
        freelance_hourly_rate: 25,
      }),
    ]
    const freelancerApps = [
      makeApplication({ shift_id: 's1', status: 'accepted' }),
    ]
    // 8h * 25$/h = 200
    expect(calculateTotalFreelancerShiftsCost(shifts, freelancerApps)).toBe(200)
  })
})

describe('calculateAverageCostPerShift', () => {
  it('returns 0 for empty data', () => {
    expect(calculateAverageCostPerShift([], [], [])).toBe(0)
  })

  it('calculates average cost', () => {
    const shifts = [
      makeShift({ id: 's1', status: 'completed', start_time: '2025-01-01T08:00:00Z', end_time: '2025-01-01T16:00:00Z', break_duration_minutes: 0 }),
      makeShift({ id: 's2', status: 'completed', start_time: '2025-01-01T08:00:00Z', end_time: '2025-01-01T12:00:00Z', break_duration_minutes: 0 }),
    ]
    const employees: EmployeeData[] = [{ id: 'emp-1', user_id: 'user-1', verified_hourly_rate: 20 }]
    const mappings: ShiftApplicationMapping[] = [
      { shift_id: 's1', user_id: 'user-1', status: 'accepted' },
      { shift_id: 's2', user_id: 'user-1', status: 'accepted' },
    ]
    // s1: 8h*20=160, s2: 4h*20=80, total=240, avg=120
    expect(calculateAverageCostPerShift(shifts, employees, mappings)).toBe(120)
  })
})

describe('calculateCostByEstablishment', () => {
  it('returns empty array for empty data', () => {
    expect(calculateCostByEstablishment([], [], [], [], [])).toEqual([])
  })

  it('groups costs by establishment', () => {
    const shifts = [
      makeShift({ id: 's1', status: 'completed', establishment_id: 'e1', start_time: '2025-01-01T08:00:00Z', end_time: '2025-01-01T16:00:00Z', break_duration_minutes: 0 }),
      makeShift({ id: 's2', status: 'completed', establishment_id: 'e2', start_time: '2025-01-01T08:00:00Z', end_time: '2025-01-01T12:00:00Z', break_duration_minutes: 0 }),
    ]
    const employees: EmployeeData[] = [{ id: 'emp-1', user_id: 'user-1', verified_hourly_rate: 20 }]
    const mappings: ShiftApplicationMapping[] = [
      { shift_id: 's1', user_id: 'user-1', status: 'accepted' },
      { shift_id: 's2', user_id: 'user-1', status: 'accepted' },
    ]
    const establishments = [
      { establishment_id: 'e1', establishment: { name: 'Store A' } },
      { establishment_id: 'e2', establishment: { name: 'Store B' } },
    ]

    const result = calculateCostByEstablishment(shifts, employees, mappings, establishments, [])
    expect(result).toHaveLength(2)
    // Sorted by cost desc: Store A (160) > Store B (80)
    expect(result[0].establishment_name).toBe('Store A')
    expect(result[0].totalCost).toBe(160)
    expect(result[1].establishment_name).toBe('Store B')
    expect(result[1].totalCost).toBe(80)
  })
})
