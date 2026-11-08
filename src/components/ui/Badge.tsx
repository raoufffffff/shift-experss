import * as React from 'react'
import { cn } from '@/lib/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

// Memoized Badge component pour éviter les re-renders inutiles dans les listes
const Badge = React.memo(({ className, variant = 'default', ...props }: BadgeProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-transparent bg-primary/10 text-primary':
            variant === 'default',
          'border-transparent bg-secondary text-secondary-foreground':
            variant === 'secondary',
          'border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400':
            variant === 'destructive',
          'border-border text-foreground': variant === 'outline',
          'border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400':
            variant === 'success',
          'border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400':
            variant === 'warning',
        },
        className
      )}
      {...props}
    />
  )
})

Badge.displayName = 'Badge'

export { Badge }
