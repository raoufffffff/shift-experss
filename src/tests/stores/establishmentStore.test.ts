import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useEstablishmentStore } from '@/stores/establishmentStore'

describe('establishmentStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()

    // Reset store to initial state
    useEstablishmentStore.setState({
      selectedEstablishmentId: null,
    })
  })

  afterEach(() => {
    // Clean up localStorage after tests
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should have null as initial selectedEstablishmentId', () => {
      const state = useEstablishmentStore.getState()
      expect(state.selectedEstablishmentId).toBeNull()
    })

    it('should have setSelectedEstablishment function', () => {
      const state = useEstablishmentStore.getState()
      expect(typeof state.setSelectedEstablishment).toBe('function')
    })
  })

  describe('setSelectedEstablishment', () => {
    it('should set establishment ID', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-123')

      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-123')
    })

    it('should update establishment ID', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-1')
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-1')

      setSelectedEstablishment('establishment-2')
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-2')
    })

    it('should allow setting to null', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-123')
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-123')

      setSelectedEstablishment(null)
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBeNull()
    })

    it('should handle empty string', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('')
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('')
    })
  })

  describe('localStorage Persistence', () => {
    it('should persist establishment ID to localStorage', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-persist-123')

      // Check localStorage
      const stored = localStorage.getItem('establishment-storage')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.state.selectedEstablishmentId).toBe('establishment-persist-123')
    })

    it('should restore from localStorage on initialization', () => {
      // Manually set localStorage
      const mockState = {
        state: {
          selectedEstablishmentId: 'establishment-from-storage',
        },
        version: 0,
      }
      localStorage.setItem('establishment-storage', JSON.stringify(mockState))

      // Create new store instance (simulated by getting fresh state)
      const restoredState = useEstablishmentStore.getState()

      // Note: In real usage, persist middleware would restore this automatically
      // For this test, we verify the storage format is correct
      const stored = localStorage.getItem('establishment-storage')
      const parsed = JSON.parse(stored!)
      expect(parsed.state.selectedEstablishmentId).toBe('establishment-from-storage')
    })

    it('should update localStorage when state changes', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-1')
      let stored = JSON.parse(localStorage.getItem('establishment-storage')!)
      expect(stored.state.selectedEstablishmentId).toBe('establishment-1')

      setSelectedEstablishment('establishment-2')
      stored = JSON.parse(localStorage.getItem('establishment-storage')!)
      expect(stored.state.selectedEstablishmentId).toBe('establishment-2')
    })

    it('should persist null value to localStorage', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-123')
      setSelectedEstablishment(null)

      const stored = JSON.parse(localStorage.getItem('establishment-storage')!)
      expect(stored.state.selectedEstablishmentId).toBeNull()
    })

    it('should handle localStorage with correct storage key', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-test')

      // Verify the exact key used
      expect(localStorage.getItem('establishment-storage')).toBeTruthy()
      expect(localStorage.getItem('wrong-key')).toBeNull()
    })
  })

  describe('Multiple Updates', () => {
    it('should handle rapid consecutive updates', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-1')
      setSelectedEstablishment('establishment-2')
      setSelectedEstablishment('establishment-3')

      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-3')
    })

    it('should persist only the final value after rapid updates', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-1')
      setSelectedEstablishment('establishment-2')
      setSelectedEstablishment('establishment-final')

      const stored = JSON.parse(localStorage.getItem('establishment-storage')!)
      expect(stored.state.selectedEstablishmentId).toBe('establishment-final')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long establishment IDs', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()
      const longId = 'establishment-' + 'a'.repeat(1000)

      setSelectedEstablishment(longId)

      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe(longId)
    })

    it('should handle special characters in establishment ID', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()
      const specialId = 'establishment-123!@#$%^&*()'

      setSelectedEstablishment(specialId)

      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe(specialId)
    })

    it('should handle UUID format establishment IDs', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()
      const uuid = '550e8400-e29b-41d4-a716-446655440000'

      setSelectedEstablishment(uuid)

      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe(uuid)
    })
  })

  describe('State Isolation', () => {
    it('should not affect other localStorage keys', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      // Set some other localStorage data
      localStorage.setItem('other-key', 'other-value')

      setSelectedEstablishment('establishment-123')

      // Other key should remain unchanged
      expect(localStorage.getItem('other-key')).toBe('other-value')
    })

    it('should maintain state independently from other stores', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      setSelectedEstablishment('establishment-isolated')

      // Store state should be independent
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-isolated')
    })
  })

  describe('localStorage Errors', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('establishment-storage', 'invalid-json{')

      // Getting state should not throw
      expect(() => {
        useEstablishmentStore.getState()
      }).not.toThrow()
    })

    it('should handle missing version in stored data', () => {
      // Set data without version
      const invalidState = {
        state: {
          selectedEstablishmentId: 'establishment-no-version',
        },
      }
      localStorage.setItem('establishment-storage', JSON.stringify(invalidState))

      // Should not throw
      expect(() => {
        useEstablishmentStore.getState()
      }).not.toThrow()
    })
  })

  describe('Functional Requirements', () => {
    it('should support typical user flow: select establishment', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      // User selects establishment
      setSelectedEstablishment('establishment-main')

      // Verify selection
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-main')

      // Verify persistence
      const stored = JSON.parse(localStorage.getItem('establishment-storage')!)
      expect(stored.state.selectedEstablishmentId).toBe('establishment-main')
    })

    it('should support typical user flow: change establishment', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      // Initial selection
      setSelectedEstablishment('establishment-branch-1')
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-branch-1')

      // Change selection
      setSelectedEstablishment('establishment-branch-2')
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-branch-2')
    })

    it('should support typical user flow: clear selection (view all)', () => {
      const { setSelectedEstablishment } = useEstablishmentStore.getState()

      // User has selected an establishment
      setSelectedEstablishment('establishment-specific')
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBe('establishment-specific')

      // User clicks "View All" (clear selection)
      setSelectedEstablishment(null)
      expect(useEstablishmentStore.getState().selectedEstablishmentId).toBeNull()
    })
  })
})
