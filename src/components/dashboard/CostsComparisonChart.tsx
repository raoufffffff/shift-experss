import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, DollarSign, Receipt } from 'lucide-react'
import { cn } from '@/lib/cn'

interface CostsComparisonData {
  date: string
  subscriptionCost: number
  shiftsCost: number
  agencyCost: number
}

interface CostsComparisonChartProps {
  data: CostsComparisonData[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-card border border-border/60 rounded-lg px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-semibold text-foreground ml-auto">{entry.value.toFixed(2)} €</span>
        </div>
      ))}
    </div>
  )
}

export function CostsComparisonChart({ data: _legacyData }: CostsComparisonChartProps) {
  const { t } = useTranslation()
  const company = useAuthStore((s) => s.company)

  // Fetch invoices directly
  const { data: invoices = [] } = useQuery({
    queryKey: ['dashboard-invoices', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await (supabase as any)
        .from('invoices')
        .select('id, type, amount_ttc, amount_ht, tva_amount, created_at, status')
        .eq('company_id', company.id)
        .eq('status', 'issued')
        .order('created_at', { ascending: true })

      if (error) return []
      return data as { id: string; type: string; amount_ttc: number; amount_ht: number; tva_amount: number; created_at: string; status: string }[]
    },
    enabled: !!company?.id,
  })

  // Group invoices by date
  const chartData = useMemo(() => {
    if (invoices.length === 0) return []

    const byDate = new Map<string, { freelancer: number; commission: number }>()

    for (const inv of invoices) {
      const date = new Date(inv.created_at)
      const key = `${date.getDate()}/${date.getMonth() + 1}`
      const dateKey = inv.created_at.split('T')[0]

      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, { freelancer: 0, commission: 0 })
      }
      const entry = byDate.get(dateKey)!
      if (inv.type === 'freelancer_to_company') {
        entry.freelancer += inv.amount_ttc
      } else {
        entry.commission += inv.amount_ttc
      }
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, values]) => {
        const d = new Date(dateKey)
        return {
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          freelancer: Math.round(values.freelancer * 100) / 100,
          commission: Math.round(values.commission * 100) / 100,
          total: Math.round((values.freelancer + values.commission) * 100) / 100,
        }
      })
  }, [invoices])

  const totalFreelancer = invoices.filter(i => i.type === 'freelancer_to_company').reduce((s, i) => s + i.amount_ttc, 0)
  const totalCommission = invoices.filter(i => i.type === 'platform_commission').reduce((s, i) => s + i.amount_ttc, 0)
  const totalAll = totalFreelancer + totalCommission

  // Trend calculation
  const trend = useMemo(() => {
    if (chartData.length < 2) return 0
    const mid = Math.floor(chartData.length / 2)
    const firstHalf = chartData.slice(0, mid).reduce((s, d) => s + d.total, 0) / mid
    const secondHalf = chartData.slice(mid).reduce((s, d) => s + d.total, 0) / (chartData.length - mid)
    if (firstHalf === 0) return 0
    return Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
  }, [chartData])

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus

  const hasData = chartData.length > 0

  return (
    <div className="card-shadow rounded-lg border border-border/60 overflow-hidden bg-card">
      {/* Header */}
      <div className="px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t('dashboard.shiftsExpenses', { defaultValue: 'Analyse des dépenses' })}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('dashboard.shiftsExpensesDescription', { defaultValue: 'Basé sur les factures émises' })}
            </p>
          </div>

          {trend !== 0 && hasData && (
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              trend > 0
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total</p>
              <p className="text-lg font-semibold text-foreground tabular-nums">
                {totalAll.toFixed(2)} €
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Prestations</p>
              <p className="text-lg font-semibold text-foreground tabular-nums">
                {totalFreelancer.toFixed(2)} €
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border/40 px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Commission</p>
              <p className="text-lg font-semibold text-foreground tabular-nums">
                {totalCommission.toFixed(2)} €
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pb-5">
        {hasData ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="freelancerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} dy={8} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} €`} dx={-4} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Area type="monotone" dataKey="freelancer" name="Prestations" stroke="#3b82f6" strokeWidth={2} fill="url(#freelancerGradient)" dot={false}
                activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2, fill: 'hsl(var(--card))' }} />
              <Area type="monotone" dataKey="commission" name="Commission" stroke="#10b981" strokeWidth={2} fill="url(#commissionGradient)" dot={false}
                activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: 'hsl(var(--card))' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
            <Receipt className="w-12 h-12 opacity-20 mb-3" />
            <p className="text-sm">Aucune facture pour cette période</p>
            <p className="text-xs mt-1">Les données apparaîtront après validation des shifts</p>
          </div>
        )}
      </div>
    </div>
  )
}
