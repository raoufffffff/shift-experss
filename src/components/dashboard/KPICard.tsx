import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

interface KPICardProps {
    title: string
    value: string | number
    icon: LucideIcon
    trend?: {
        value: number
        label: string
    }
    subtitle?: string
    iconColor?: string
    iconBgColor?: string
}

export function KPICard({
    title,
    value,
    icon: Icon,
    trend,
    subtitle,
    iconColor = 'text-primary',
    iconBgColor = 'bg-primary/5 border-primary/10'
}: KPICardProps) {
    const isPositiveTrend = trend && trend.value > 0
    const isNegativeTrend = trend && trend.value < 0

    return (
        <Card className="card-shadow card-hover border border-border/60 transition-all hover:shadow-lg">
            <CardContent className="p-5">
                <div className="mb-3">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                </div>

                <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">{value}</p>

                    {trend && (
                        <div className={cn(
                            'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                            isPositiveTrend && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            isNegativeTrend && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                            !isPositiveTrend && !isNegativeTrend && 'bg-muted text-muted-foreground'
                        )}>
                            {isPositiveTrend && <TrendingUp className="w-3 h-3" />}
                            {isNegativeTrend && <TrendingDown className="w-3 h-3" />}
                            <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
                        </div>
                    )}
                </div>

                {(subtitle || trend) && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                        {trend ? trend.label : subtitle}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
