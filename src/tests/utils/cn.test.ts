import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/cn'

describe('cn utility', () => {
  describe('Basic Functionality', () => {
    it('should merge single className', () => {
      expect(cn('text-red-500')).toBe('text-red-500')
    })

    it('should merge multiple classNames', () => {
      const result = cn('text-red-500', 'bg-blue-500')
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-blue-500')
    })

    it('should handle empty strings', () => {
      expect(cn('', 'text-red-500', '')).toBe('text-red-500')
    })

    it('should handle undefined values', () => {
      expect(cn(undefined, 'text-red-500', undefined)).toBe('text-red-500')
    })

    it('should handle null values', () => {
      expect(cn(null, 'text-red-500', null)).toBe('text-red-500')
    })

    it('should handle falsy values', () => {
      expect(cn(false, 'text-red-500', 0, '')).toBe('text-red-500')
    })
  })

  describe('Tailwind Merge', () => {
    it('should merge conflicting Tailwind classes', () => {
      // Later class should override earlier one
      const result = cn('text-red-500', 'text-blue-500')
      expect(result).toBe('text-blue-500')
      expect(result).not.toContain('text-red-500')
    })

    it('should handle padding conflicts', () => {
      const result = cn('p-4', 'p-6')
      expect(result).toBe('p-6')
    })

    it('should handle margin conflicts', () => {
      const result = cn('m-2', 'm-4')
      expect(result).toBe('m-4')
    })

    it('should handle width conflicts', () => {
      const result = cn('w-full', 'w-1/2')
      expect(result).toBe('w-1/2')
    })

    it('should keep non-conflicting classes', () => {
      const result = cn('text-red-500', 'bg-blue-500', 'text-green-500')
      expect(result).toContain('bg-blue-500')
      expect(result).toContain('text-green-500')
      expect(result).not.toContain('text-red-500')
    })
  })

  describe('Conditional Classes', () => {
    it('should handle conditional with true', () => {
      const result = cn('base-class', true && 'conditional-class')
      expect(result).toContain('base-class')
      expect(result).toContain('conditional-class')
    })

    it('should handle conditional with false', () => {
      const result = cn('base-class', false && 'conditional-class')
      expect(result).toBe('base-class')
      expect(result).not.toContain('conditional-class')
    })

    it('should handle ternary operator', () => {
      const isActive = true
      const result = cn('base-class', isActive ? 'active' : 'inactive')
      expect(result).toContain('active')
      expect(result).not.toContain('inactive')
    })

    it('should handle multiple conditionals', () => {
      const isActive = true
      const isDisabled = false
      const result = cn(
        'base-class',
        isActive && 'active',
        isDisabled && 'disabled'
      )
      expect(result).toContain('base-class')
      expect(result).toContain('active')
      expect(result).not.toContain('disabled')
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle array of classes', () => {
      const result = cn(['text-red-500', 'bg-blue-500'])
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-blue-500')
    })

    it('should handle mixed array and strings', () => {
      const result = cn('text-lg', ['text-red-500', 'bg-blue-500'], 'font-bold')
      expect(result).toContain('text-lg')
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-blue-500')
      expect(result).toContain('font-bold')
    })

    it('should handle object syntax', () => {
      const result = cn({
        'text-red-500': true,
        'bg-blue-500': false,
      })
      expect(result).toContain('text-red-500')
      expect(result).not.toContain('bg-blue-500')
    })

    it('should handle nested arrays', () => {
      const result = cn('base', ['level1', ['level2', 'level2-2']])
      expect(result).toContain('base')
      expect(result).toContain('level1')
      expect(result).toContain('level2')
      expect(result).toContain('level2-2')
    })
  })

  describe('Real-world Use Cases', () => {
    it('should work with button variants', () => {
      const variant: string = 'primary'
      const size: string = 'lg'

      const result = cn(
        'btn',
        variant === 'primary' && 'bg-blue-500 text-white',
        variant === 'secondary' && 'bg-gray-500 text-white',
        size === 'sm' && 'px-2 py-1',
        size === 'lg' && 'px-6 py-3'
      )

      expect(result).toContain('btn')
      expect(result).toContain('bg-blue-500')
      expect(result).toContain('text-white')
      expect(result).toContain('px-6')
      expect(result).toContain('py-3')
    })

    it('should work with input states', () => {
      const hasError = true
      const isDisabled = false

      const result = cn(
        'input',
        'border',
        'rounded',
        hasError && 'border-red-500',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )

      expect(result).toContain('input')
      expect(result).toContain('border')
      expect(result).toContain('rounded')
      expect(result).toContain('border-red-500')
      expect(result).not.toContain('opacity-50')
    })

    it('should work with responsive classes', () => {
      const result = cn(
        'w-full',
        'md:w-1/2',
        'lg:w-1/3',
        'text-sm',
        'md:text-base',
        'lg:text-lg'
      )

      expect(result).toContain('w-full')
      expect(result).toContain('md:w-1/2')
      expect(result).toContain('lg:w-1/3')
    })

    it('should handle hover and focus states', () => {
      const result = cn(
        'bg-blue-500',
        'hover:bg-blue-600',
        'focus:ring-2',
        'focus:ring-blue-300'
      )

      expect(result).toContain('bg-blue-500')
      expect(result).toContain('hover:bg-blue-600')
      expect(result).toContain('focus:ring-2')
      expect(result).toContain('focus:ring-blue-300')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long className strings', () => {
      const longClass = 'a '.repeat(1000).trim()
      const result = cn(longClass)
      expect(result).toBeTruthy()
    })

    it('should handle many arguments', () => {
      const result = cn(
        'class1',
        'class2',
        'class3',
        'class4',
        'class5',
        'class6',
        'class7',
        'class8',
        'class9',
        'class10'
      )
      expect(result).toBeTruthy()
    })

    it('should handle special characters', () => {
      const result = cn('text-[#ff0000]', 'w-[calc(100%-2rem)]')
      expect(result).toContain('text-[#ff0000]')
      expect(result).toContain('w-[calc(100%-2rem)]')
    })

    it('should handle empty call', () => {
      expect(cn()).toBe('')
    })

    it('should handle only falsy values', () => {
      expect(cn(false, null, undefined, '', 0)).toBe('')
    })
  })

  describe('Performance', () => {
    it('should handle many duplicate classes efficiently', () => {
      const result = cn(
        'text-red-500',
        'text-red-500',
        'text-red-500',
        'text-blue-500'
      )
      expect(result).toBe('text-blue-500')
    })

    it('should handle complex merges efficiently', () => {
      const result = cn(
        'p-4',
        'm-4',
        'text-lg',
        'p-6',
        'm-2',
        'text-xl'
      )
      expect(result).toContain('p-6')
      expect(result).toContain('m-2')
      expect(result).toContain('text-xl')
    })
  })
})
