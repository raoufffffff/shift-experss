import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { BentoCard } from './BentoCard'
import { cn } from '@/lib/cn'

interface StatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    description?: string
    trend?: {
        value: number
        label?: string
    }
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet'
    delay?: number
}

export function StatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    color = 'primary',
    delay = 0
}: StatCardProps) {

    const colorStyles = {
        primary: "bg-primary/5 text-primary border-primary/20",
        success: "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
        danger: "bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/20",
        info: "bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20",
        violet: "bg-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20",
    }

    const iconColorStyle = colorStyles[color]

    return (
        <BentoCard
            className="group"
            transition={{ delay: delay * 0.1 }}
        >
            <div className="flex items-center gap-3">
                {/* Icon on the left */}
                <div className={cn("p-2 sm:p-2.5 rounded-xl transition-colors duration-300 flex-shrink-0", iconColorStyle)}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                {/* Content on the right */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                        <h3 className="text-muted-foreground font-medium text-[11px] sm:text-xs truncate">{title}</h3>
                        {trend && (
                            <div className={cn(
                                "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0",
                                trend.value > 0 ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" :
                                    trend.value < 0 ? "text-red-600 bg-red-100 dark:bg-red-900/30" :
                                        "text-muted-foreground bg-muted/50"
                            )}>
                                {trend.value > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> :
                                    trend.value < 0 ? <ArrowDownRight className="w-2.5 h-2.5" /> :
                                        <Minus className="w-2.5 h-2.5" />}
                                <span>{Math.abs(trend.value)}%</span>
                            </div>
                        )}
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-foreground mt-0.5">
                        {value}
                    </div>
                    {description && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium truncate">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </BentoCard>
    )
}
