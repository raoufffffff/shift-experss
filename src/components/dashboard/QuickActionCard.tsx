import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface QuickActionCardProps {
  title: string
  count: number
  icon: LucideIcon
  variant?: 'warning' | 'success' | 'info' | 'default'
  action: () => void
  actionLabel: string
  description?: string
}

const variantStyles = {
  warning: 'from-orange-50/50 to-orange-100/30 border-orange-500/20',
  success: 'from-green-50/50 to-green-100/30 border-green-500/20',
  info: 'from-blue-50/50 to-blue-100/30 border-blue-500/20',
  default: 'from-muted/30 to-muted/10 border-border/40'
}

const iconStyles = {
  warning: 'bg-orange-500/10 border-orange-500/20 text-orange-600',
  success: 'bg-green-500/10 border-green-500/20 text-green-600',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
  default: 'bg-primary/10 border-primary/20 text-primary'
}

export function QuickActionCard({
  title,
  count,
  icon: Icon,
  variant = 'default',
  action,
  actionLabel,
  description
}: QuickActionCardProps) {
  return (
    <Card className={cn(
      'card-shadow card-hover border overflow-hidden transition-all hover:scale-[1.02]',
      variantStyles[variant]
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center border',
                iconStyles[variant]
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                {title}
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-foreground">{count}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={action}
            className="mt-1 text-xs hover:bg-background/60"
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
