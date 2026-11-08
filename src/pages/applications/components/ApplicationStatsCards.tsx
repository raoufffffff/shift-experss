import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/Card'
import { Users, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ApplicationStats } from '../types'

interface ApplicationStatsCardsProps {
    stats: ApplicationStats
    selectedStatus?: string
    onStatusClick?: (status: string) => void
}

export function ApplicationStatsCards({ stats, selectedStatus, onStatusClick }: ApplicationStatsCardsProps) {
    const { t } = useTranslation()

    const cards = [
        {
            key: 'pending',
            label: t('applications.stats.pending'),
            value: stats.pending,
            color: 'text-amber-600',
            iconBg: 'bg-amber-100 dark:bg-amber-900/30',
            iconColor: 'text-amber-600',
            activeBorder: 'border-amber-500',
            Icon: Clock,
        },
        {
            key: 'accepted',
            label: t('applications.stats.accepted'),
            value: stats.accepted,
            color: 'text-emerald-600',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
            iconColor: 'text-emerald-600',
            activeBorder: 'border-emerald-500',
            Icon: CheckCircle2,
        },
        {
            key: '',
            label: t('applications.stats.total'),
            value: stats.total,
            color: 'text-foreground',
            iconBg: 'bg-primary/10',
            iconColor: 'text-primary',
            activeBorder: 'border-primary',
            Icon: Users,
        },
    ]

    return (
        <div className="grid grid-cols-3 gap-4">
            {cards.map(({ key, label, value, color, iconBg, iconColor, activeBorder, Icon }) => {
                const isActive = selectedStatus === key
                return (
                    <Card
                        key={key}
                        className={cn(
                            'border-border/60 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5',
                            isActive && `${activeBorder} border-2 shadow-md`
                        )}
                        onClick={() => onStatusClick?.(key)}
                    >
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                    {label}
                                </p>
                                <p className={cn('text-2xl font-bold mt-1', color)}>
                                    {value}
                                </p>
                            </div>
                            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBg)}>
                                <Icon className={cn('w-5 h-5', iconColor)} />
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
