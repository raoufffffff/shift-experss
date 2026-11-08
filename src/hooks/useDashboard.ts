import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useEstablishmentStore } from '@/stores/establishmentStore'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/hooks/useLocale'
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress'
import { exportDashboardData } from '@/utils/exportDashboardData'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { logger } from '@/utils/logger'
import {
    calculateDateRange,
    getTodayBounds, 
    fetchDashboardData as fetchData,
    calculateAllKPIs,
    formatAllCharts,
    type DateRange,
    type DashboardKPIs,
    type DashboardCharts
} from '@/utils/dashboard'
import { generateInsights } from '@/utils/dashboardInsights'
import type { CriticalShift } from '@/utils/dashboard/fetchShifts'

export interface DashboardData extends DashboardKPIs, DashboardCharts {
    criticalShifts: CriticalShift[]
}

export function useDashboard() {
    const { t } = useTranslation()
    const { navigate } = useLocale()
    const company = useAuthStore((state) => state.company)
    const { selectedEstablishmentId } = useEstablishmentStore()

    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState<DateRange>('today')
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null)

    const { shouldShowWelcome, markWelcomeSeen } = useOnboardingProgress()
    const [showWelcomeModal, setShowWelcomeModal] = useState(false)

    const now = useMemo(() => new Date(), [])

    useEffect(() => {
        if (shouldShowWelcome) {
            setShowWelcomeModal(true)
        }
    }, [shouldShowWelcome])

    const handleCloseWelcome = useCallback(() => {
        setShowWelcomeModal(false)
        markWelcomeSeen()
    }, [markWelcomeSeen])

    const fetchDashboardData = useCallback(async () => {
        if (!company?.id) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            const dateRangeResult = calculateDateRange(dateRange, customStartDate, customEndDate)
            const { todayStart, todayEnd } = getTodayBounds()

            const rawData = await fetchData(
                company.id,
                dateRangeResult,
                selectedEstablishmentId,
                todayStart,
                todayEnd
            )

            const kpis = calculateAllKPIs(
                rawData.shifts,
                rawData.allApplications,
                rawData.topEmployeesApplications,
                rawData.activeEmployeesCount,
                rawData.pendingApplicationsCount,
                rawData.ongoingShiftsCount,
                rawData.establishmentsCount,
                company.subscription_plan || 'free',
                rawData.employees,
                rawData.responseTimeData,
                rawData.shiftApplicationsMappings,
                rawData.freelancerApplications,
                rawData.shiftsByEstablishment,
                rawData.noShowApplications
            )

            const charts = formatAllCharts(
                rawData.shifts,
                dateRangeResult,
                rawData.responseTimeData,
                rawData.shiftsByEstablishment,
                rawData.employees,
                rawData.shiftApplicationsMappings,
                rawData.freelancerApplications,
                rawData.subscription,
                t
            )

            setData({
                ...kpis,
                ...charts,
                criticalShifts: rawData.criticalShifts
            })
        } catch (err: unknown) {
            logger.error('Error fetching dashboard data:', { error: err instanceof Error ? err.message : String(err) })
            setError('dashboard.errorMessage')
        } finally {
            setLoading(false)
        }
    }, [company?.id, dateRange, selectedEstablishmentId, customStartDate, customEndDate])

    useEffect(() => {
        if (company?.id) {
            fetchDashboardData()
        }
    }, [company?.id, dateRange, selectedEstablishmentId, customStartDate, customEndDate])

    useEffect(() => {
        if (!company?.id) return

        // Single consolidated channel with multiple listeners instead of 3 separate channels
        const channel = supabase
            .channel(`dashboard_${company.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `company_id=eq.${company.id}` }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_applications' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees', filter: `company_id=eq.${company.id}` }, () => fetchDashboardData())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [company?.id, fetchDashboardData])

    const handleExport = useCallback(async () => {
        try {
            if (!company?.id) return
            toast.loading(t('dashboard.exportInProgress'))
            const dateRangeResult = calculateDateRange(dateRange, customStartDate, customEndDate)
            const result = await exportDashboardData({
                companyId: company.id,
                startDate: dateRangeResult.startDate,
                endDate: now,
                selectedEstablishmentId,
            })
            toast.dismiss()
            toast.success(t('dashboard.exportSuccess', { shifts: result.shiftsCount, employees: result.employeesCount, applications: result.applicationsCount }))
        } catch (error) {
            toast.dismiss()
            toast.error(t('dashboard.exportError'))
        }
    }, [company?.id, dateRange, customStartDate, customEndDate, now, selectedEstablishmentId, t])

    const handleCreateShift = useCallback(() => navigate('/shifts/new'), [navigate])
    const handleDateRangeChange = useCallback((range: DateRange) => setDateRange(range), [])
    const handleCustomDateChange = useCallback((start: Date | null | undefined, end: Date | null | undefined) => {
        setCustomStartDate(start || null)
        setCustomEndDate(end || null)
        setDateRange('custom')
    }, [])
    const handleCustomDateClose = useCallback(() => {
        if (!customStartDate || !customEndDate) setDateRange('30d')
    }, [customStartDate, customEndDate])

    const insights = useMemo(() => (data ? generateInsights(data, t) : []), [data, t])

    const responseMetricsStats = useMemo(() => {
        if (!data) return null
        const totalResponses = data.responseTimeDistribution.reduce((acc, item) => acc + item.count, 0)
        const fastResponses = data.responseTimeDistribution.slice(0, 2).reduce((acc, item) => acc + item.count, 0)
        const fastResponsesPercent = totalResponses > 0 ? Math.round((fastResponses / totalResponses) * 100) : 0

        let maxCount = 0
        let peakHour = '18h'
        data.shiftHeatmap.forEach((day) => {
            day.hours.forEach((hour) => {
                if (hour.count > maxCount) {
                    maxCount = hour.count
                    peakHour = hour.hour
                }
            })
        })

        return { fastResponsesPercent, peakHour }
    }, [data])

    return {
        data,
        loading,
        error,
        dateRange,
        customStartDate,
        customEndDate,
        showWelcomeModal,
        handleCloseWelcome,
        handleDateRangeChange,
        handleCustomDateChange,
        handleCustomDateClose,
        handleExport,
        handleCreateShift,
        fetchDashboardData,
        insights,
        responseMetricsStats,
        companyId: company?.id || '',
        t,
        navigate
    }
}
