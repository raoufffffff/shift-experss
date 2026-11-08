import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  secondaryActionLabel?: string
  secondaryActionHref?: string
  onSecondaryAction?: () => void
  illustration?: ReactNode
  variant?: 'default' | 'compact'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  illustration,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const navigate = useNavigate()

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else if (actionHref) {
      navigate(actionHref)
    }
  }

  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      onSecondaryAction()
    } else if (secondaryActionHref) {
      navigate(secondaryActionHref)
    }
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'p-8 text-center border-2 border-dashed border-border/60 rounded-lg bg-muted/20',
          className
        )}
      >
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {description}
        </p>
        {(actionLabel || secondaryActionLabel) && (
          <div className="flex items-center justify-center gap-3">
            {actionLabel && (
              <Button onClick={handleAction}>{actionLabel}</Button>
            )}
            {secondaryActionLabel && (
              <Button variant="outline" onClick={handleSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('border-2 border-dashed border-border/60', className)}>
      <CardContent className="p-12">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            {illustration || (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                <Icon className="w-10 h-10 text-primary" />
              </div>
            )}
          </div>

          <h3 className="text-2xl font-semibold text-foreground mb-3">
            {title}
          </h3>

          <p className="text-base text-muted-foreground mb-8 max-w-lg mx-auto">
            {description}
          </p>

          {(actionLabel || secondaryActionLabel) && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {actionLabel && (
                <Button onClick={handleAction} size="lg">
                  <Icon className="w-4 h-4 mr-2" />
                  {actionLabel}
                </Button>
              )}
              {secondaryActionLabel && (
                <Button
                  variant="outline"
                  onClick={handleSecondaryAction}
                  size="lg"
                >
                  {secondaryActionLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
