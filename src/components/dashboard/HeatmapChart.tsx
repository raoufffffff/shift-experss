import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useTranslation } from 'react-i18next'

interface HeatmapData {
  day: string
  hours: {
    hour: string
    count: number
  }[]
}

interface HeatmapChartProps {
  title: string
  data: HeatmapData[]
  description?: string
}

export function HeatmapChart({ title, data, description }: HeatmapChartProps) {
  const { t } = useTranslation()

  // Trouver le max pour normaliser les couleurs
  const maxCount = Math.max(...data.flatMap(d => d.hours.map(h => h.count)))

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-muted/30'
    const intensity = count / maxCount
    if (intensity > 0.75) return 'bg-primary dark:bg-primary/80'
    if (intensity > 0.5) return 'bg-primary/70 dark:bg-primary/60'
    if (intensity > 0.25) return 'bg-primary/40 dark:bg-primary/40'
    return 'bg-primary/20 dark:bg-primary/20'
  }

  return (
    <Card className="card-shadow border border-border/60">
      <div className="border-b border-border/40 bg-muted/20 px-6 py-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <CardContent className="p-6">
        <div className="space-y-2">
          {/* Header avec les heures */}
          <div className="flex gap-1">
            <div className="w-16" />
            {data[0]?.hours.map((h) => (
              <div key={h.hour} className="flex-1 text-center">
                <span className="text-xs text-muted-foreground">{h.hour}</span>
              </div>
            ))}
          </div>

          {/* Lignes du heatmap */}
          {data.map((day) => (
            <div key={day.day} className="flex gap-1 items-center">
              <div className="w-16">
                <span className="text-xs text-muted-foreground font-medium">{day.day}</span>
              </div>
              {day.hours.map((hour) => (
                <div
                  key={hour.hour}
                  className={cn(
                    'flex-1 h-10 rounded transition-all hover:scale-105 cursor-pointer group relative',
                    getIntensity(hour.count)
                  )}
                  title={`${day.day} ${hour.hour}: ${hour.count} shifts`}
                >
                  {/* Tooltip on hover */}
                  <div className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg z-10 border border-border">
                    {hour.count} shifts
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Légende */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
          <span className="text-xs text-muted-foreground">{t('dashboard.heatmap.less')}</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-muted/30" />
            <div className="w-4 h-4 rounded bg-primary/20" />
            <div className="w-4 h-4 rounded bg-primary/40" />
            <div className="w-4 h-4 rounded bg-primary/70" />
            <div className="w-4 h-4 rounded bg-primary" />
          </div>
          <span className="text-xs text-muted-foreground">{t('dashboard.heatmap.more')}</span>
        </div>
      </CardContent>
    </Card>
  )
}
