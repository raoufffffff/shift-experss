import React from 'react'
import { useTranslation } from 'react-i18next'
import {
    CalendarCheck,
    UserCheck,
    Timer,
    PiggyBank,
    Hourglass,
    UserX,
} from 'lucide-react'
import { StatCard } from '@/components/dashboard/v2/StatCard'
import type { DashboardData } from '@/hooks/useDashboard'

interface DashboardKPIsProps {
    data: DashboardData
}

export function DashboardKPIs({ data }: DashboardKPIsProps) {
    const { t } = useTranslation()

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard
                title={t('dashboard.shiftsPublished')}
                value={data.totalShifts}
                icon={CalendarCheck}
                color="primary"
                delay={0.1}
            />
            <StatCard
                title={t('dashboard.fillRate')}
                value={`${data.fillRate}%`}
                icon={UserCheck}
                color="success"
                delay={0.2}
            />
            <StatCard
                title={t('dashboard.fillTime')}
                value={`${data.avgFillTimeMinutes.toFixed(0)} min`}
                icon={Timer}
                color="violet"
                delay={0.3}
            />
            <StatCard
                title={t('dashboard.avgShiftDuration')}
                value={`${data.avgShiftDurationHours}h`}
                icon={Hourglass}
                color="info"
                delay={0.5}
            />
            <StatCard
                title={t('dashboard.noShowRate')}
                value={`${data.noShowRate}%`}
                icon={UserX}
                color={data.noShowRate > 10 ? 'danger' : 'success'}
                delay={0.6}
            />
        </div>
    )
}
