import React from 'react'
import { useTranslation } from 'react-i18next'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { HeatmapChart } from '@/components/dashboard/HeatmapChart'
import { PremiumFeature } from '@/components/dashboard/PremiumFeature'
import type { DashboardData } from '@/hooks/useDashboard'

interface DashboardAdvancedAnalyticsProps {
    data: DashboardData
}

export function DashboardAdvancedAnalytics({ data }: DashboardAdvancedAnalyticsProps) {
    const { t } = useTranslation()

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold">{t('dashboard.advancedAnalytics')}</h2>

            {/* Heatmap */}
            <PremiumFeature featureName={t('dashboard.features.activityHeatmap')}>
                <div>
                    <HeatmapChart
                        title={t('dashboard.shiftHeatmap')}
                        description={t('dashboard.shiftHeatmapDesc')}
                        data={data.shiftHeatmap}
                    />
                </div>
            </PremiumFeature>

            {/* Distribution par établissement - uniquement si 3+ établissements */}
            {data.shiftsByEstablishment.length >= 3 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">{t('dashboard.byEstablishment')}</h2>
                    <div className="card-shadow border border-border/60 rounded-lg overflow-hidden bg-card">
                        <div className="border-b border-border/40 bg-muted/20 px-6 py-4">
                            <h3 className="text-base font-semibold">{t('dashboard.shiftsPerEstablishment')}</h3>
                        </div>
                        <div className="p-5">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.shiftsByEstablishment.slice(0, 5)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Bar dataKey="count" fill="#EC4899" radius={[8, 8, 0, 0]} name="Shifts" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
