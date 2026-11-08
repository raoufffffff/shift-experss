import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const chipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
        success: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
        danger: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
        secondary: 'bg-muted/50 text-muted-foreground border border-border',
        purple: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {
  icon?: React.ReactNode;
}

// Memoized Chip component pour éviter les re-renders inutiles dans les listes
const Chip = React.memo(({ className, variant, icon, children, ...props }: ChipProps) => {
  return (
    <div className={cn(chipVariants({ variant }), className)} {...props}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </div>
  );
})

Chip.displayName = 'Chip'

export { Chip, chipVariants };
