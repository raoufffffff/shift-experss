import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

interface CardSkeletonProps {
  variant?: 'stat' | 'info' | 'default'
}

export function CardSkeleton({ variant = 'default' }: CardSkeletonProps) {
  if (variant === 'stat') {
    return (
      <Card className="card-shadow card-hover border border-border/60">
        <CardContent className="p-5">
          <div className="mb-3">
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-20 mb-2" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    )
  }

  if (variant === 'info') {
    return (
      <Card className="card-shadow border border-border/60">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-shadow border border-border/60">
      <CardContent className="p-5">
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  )
}
