import { Card, CardContent } from '@/components/ui/Card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface StatItem {
  label: string
  value: string | number
  change?: number
  suffix?: string
}

interface StatsGridProps {
  title: string
  stats: StatItem[]
}

export function StatsGrid({ title, stats }: StatsGridProps) {
  return (
    <Card className="card-shadow border border-border/60">
      <div className="border-b border-border/40 bg-muted/20 px-6 py-4">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}{stat.suffix}
                </p>
                {stat.change !== undefined && (
                  <div className={cn(
                    'flex items-center gap-0.5 text-xs font-medium',
                    stat.change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {stat.change > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(stat.change)}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
