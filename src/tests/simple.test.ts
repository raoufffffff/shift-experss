import { describe, it, expect } from 'vitest'

describe('Simple Test Suite', () => {
  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should work with strings', () => {
    expect('hello').toBe('hello')
  })

  it('should work with objects', () => {
    const obj = { name: 'test', value: 42 }
    expect(obj).toEqual({ name: 'test', value: 42 })
  })

  it('should work with arrays', () => {
    const arr = [1, 2, 3]
    expect(arr).toHaveLength(3)
    expect(arr).toContain(2)
  })

  it('should work with booleans', () => {
    expect(true).toBe(true)
    expect(false).toBe(false)
  })
})
