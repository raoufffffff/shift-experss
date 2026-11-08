import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTranslation } from 'react-i18next'

interface DataPoint {
  date: string
  published: number
  filled: number
}

interface InteractiveLineChartProps {
  data: DataPoint[]
  title: string
  onPointClick?: (data: DataPoint) => void
  publishedLabel: string
  filledLabel: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground font-medium">
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function InteractiveLineChart({
  data,
  title,
  onPointClick,
  publishedLabel,
  filledLabel
}: InteractiveLineChartProps) {
  const { t } = useTranslation()

  return (
    <Card className="card-shadow border border-border/60">
      <CardHeader className="border-b border-border/40 bg-muted/20">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={data}
            onClick={(e) => {
              if (e?.activePayload?.[0]?.payload && onPointClick) {
                onPointClick(e.activePayload[0].payload)
              }
            }}
            className={onPointClick ? 'cursor-pointer' : ''}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="published"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, cursor: 'pointer' }}
              name={publishedLabel}
            />
            <Line
              type="monotone"
              dataKey="filled"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, cursor: 'pointer' }}
              name={filledLabel}
            />
          </LineChart>
        </ResponsiveContainer>
        {onPointClick && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            {t('dashboard.clickPointDetails')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
