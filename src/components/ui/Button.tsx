import * as React from 'react'
import { cn } from '@/lib/cn'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]':
              variant === 'default',
            'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]':
              variant === 'destructive',
            'border border-border bg-card shadow-sm hover:bg-muted/50 hover:border-border/80':
              variant === 'outline',
            'hover:bg-muted/50': variant === 'ghost',
            'text-primary underline-offset-4 hover:underline':
              variant === 'link',
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-xs': size === 'sm',
            'h-10 rounded-md px-8': size === 'lg',
            'h-9 w-9': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
