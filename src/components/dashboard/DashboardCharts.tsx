import React from 'react'
import { useTranslation } from 'react-i18next'
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import { InteractiveLineChart } from '@/components/dashboard/InteractiveLineChart'
import { CostsComparisonChart } from '@/components/dashboard/CostsComparisonChart'
import { RecentActivity } from '@/components/dashboard/v2/RecentActivity'
import { PremiumFeature } from '@/components/dashboard/PremiumFeature'
import type { DashboardData } from '@/hooks/useDashboard'

interface DashboardChartsProps {
    data: DashboardData
    navigate: (path: string) => void
}

export function DashboardCharts({ data, navigate }: DashboardChartsProps) {
    const { t } = useTranslation()

    return (
        <div className="space-y-6">
            {/* 📈 SECTION 4: GRAPHIQUE + ACTIVITÉ RÉCENTE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <InteractiveLineChart
                        data={data.shiftsTimeline}
                        title={t('dashboard.shiftsEvolution')}
                        publishedLabel={t('dashboard.published')}
                        filledLabel={t('dashboard.filled')}
                        onPointClick={(point) => {
                            navigate(`/shifts?date=${point.date}`)
                        }}
                    />
                </div>
                <div className="lg:col-span-1">
                    <RecentActivity />
                </div>
            </div>

            {/* 💰 SECTION 6: ANALYSE FINANCIÈRE (Graphiques) */}
            <PremiumFeature featureName={t('dashboard.features.costAnalysis')}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-3">
                        <CostsComparisonChart data={data.costsComparisonTimeline} />
                    </div>
                </div>
            </PremiumFeature>
        </div>
    )
}
