import { describe, it, expect } from 'vitest'
import { formatTimeUTC } from '@/utils/formatTime'

describe('formatTimeUTC', () => {
  describe('24-hour format (default)', () => {
    it('formats morning time', () => {
      expect(formatTimeUTC('2025-01-10T08:30:00.000Z')).toBe('08:30')
    })

    it('formats afternoon time', () => {
      expect(formatTimeUTC('2025-01-10T14:45:00.000Z')).toBe('14:45')
    })

    it('formats midnight', () => {
      expect(formatTimeUTC('2025-01-10T00:00:00.000Z')).toBe('00:00')
    })

    it('formats noon', () => {
      expect(formatTimeUTC('2025-01-10T12:00:00.000Z')).toBe('12:00')
    })

    it('pads single-digit hours', () => {
      expect(formatTimeUTC('2025-01-10T05:03:00.000Z')).toBe('05:03')
    })

    it('formats end of day', () => {
      expect(formatTimeUTC('2025-01-10T23:59:00.000Z')).toBe('23:59')
    })
  })

  describe('12-hour format', () => {
    it('formats morning time with AM', () => {
      expect(formatTimeUTC('2025-01-10T08:30:00.000Z', true)).toBe('8:30 AM')
    })

    it('formats afternoon time with PM', () => {
      expect(formatTimeUTC('2025-01-10T14:45:00.000Z', true)).toBe('2:45 PM')
    })

    it('formats midnight as 12:00 AM', () => {
      expect(formatTimeUTC('2025-01-10T00:00:00.000Z', true)).toBe('12:00 AM')
    })

    it('formats noon as 12:00 PM', () => {
      expect(formatTimeUTC('2025-01-10T12:00:00.000Z', true)).toBe('12:00 PM')
    })

    it('formats 1 PM correctly', () => {
      expect(formatTimeUTC('2025-01-10T13:00:00.000Z', true)).toBe('1:00 PM')
    })

    it('formats 11 PM correctly', () => {
      expect(formatTimeUTC('2025-01-10T23:00:00.000Z', true)).toBe('11:00 PM')
    })
  })
})
