import React, { useState, useEffect } from 'react'
import { AlertTriangle, DollarSign, Users, CheckCircle, TrendingUp } from 'lucide-react'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { QuickActionsSection } from '@/components/dashboard/QuickActionsSection'
import { CriticalShiftsAlert, type CriticalShift } from '@/components/dashboard/CriticalShiftsAlert'
import { BoostShiftDialog } from '@/components/shifts/BoostShiftDialog'
import { PremiumFeature } from '@/components/dashboard/PremiumFeature'
import { PerformanceSection } from '@/components/dashboard/PerformanceSection'

// Sub-components extracted
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { DashboardAdvancedAnalytics } from '@/components/dashboard/DashboardAdvancedAnalytics'

// Specialized hook
import { useDashboard } from '@/hooks/useDashboard'

export function DashboardPage() {
  const {
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
    responseMetricsStats,
    companyId,
    t,
    navigate
  } = useDashboard()

  const [boostShift, setBoostShift] = useState<CriticalShift | null>(null)

  // Safety timeout to avoid infinite skeletons
  const [safetyTimeoutReached, setSafetyTimeoutReached] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setSafetyTimeoutReached(true)
      }
    }, 10000) // 10 seconds

    return () => clearTimeout(timer)
  }, [loading])

  if (loading && !safetyTimeoutReached) return <DashboardSkeleton />

  if (error || !data || (loading && safetyTimeoutReached)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-lg font-medium">{t('dashboard.errorLoading')}</p>
          <p className="text-sm text-muted-foreground">
            {loading && safetyTimeoutReached ? 'Loading timeout reached. Please check your connection or database status.' : (error || t('dashboard.errorMessage'))}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            {t('dashboard.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <WelcomeModal open={showWelcomeModal} onClose={handleCloseWelcome} />

      <DashboardHeader
        dateRange={dateRange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onDateRangeChange={handleDateRangeChange}
        onCustomDateChange={handleCustomDateChange}
        onCustomDateClose={handleCustomDateClose}
        onExport={handleExport}
        onCreateShift={handleCreateShift}
      />

      {data.criticalShifts.length > 0 && (
        <CriticalShiftsAlert
          shifts={data.criticalShifts}
          companyId={companyId}
          onBoostShift={(shift) => setBoostShift(shift)}
        />
      )}

      <BoostShiftDialog
        shift={boostShift as any}
        isOpen={!!boostShift}
        onClose={() => setBoostShift(null)}
        onSuccess={() => {
          setBoostShift(null)
          fetchDashboardData()
        }}
      />

      <QuickActionsSection
        pendingShifts={data.pendingShifts}
        ongoingShiftsToday={data.ongoingShiftsToday}
        activeEmployees={data.activeEmployees}
      />

      {/* KPIs row */}
      <DashboardKPIs data={data} />

      {/* Charts: evolution + recent activity */}
      <DashboardCharts data={data} navigate={navigate} />

      {/* Insights grid: finance + team + response metrics side by side */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('dashboard.trendsAndPerformance')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Finance column */}
          <div>
            <div className="rounded-lg border border-border/60 bg-card card-shadow p-5 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{t('dashboard.financialAnalysis')}</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('dashboard.totalCost')}</p>
                  <p className="text-2xl font-semibold text-foreground">{data.totalShiftsCost.toLocaleString('fr-FR')} €</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t('dashboard.basedOnVerifiedRates')}</p>
                </div>
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs text-muted-foreground mb-1">{t('dashboard.avgCostPerShift')}</p>
                  <p className="text-2xl font-semibold text-foreground">{data.averageCostPerShift.toLocaleString('fr-FR')} €</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t('dashboard.perCompletedShift')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team column */}
          <div>
            <div className="rounded-lg border border-border/60 bg-card card-shadow p-5 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{t('dashboard.teamAnalysis')}</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('dashboard.activeEmployees')}</p>
                  <p className="text-2xl font-semibold text-foreground">{data.activeEmployees}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t('dashboard.inYourTeam')}</p>
                </div>
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs text-muted-foreground mb-1">{t('dashboard.avgAcceptanceRate')}</p>
                  <p className="text-2xl font-semibold text-foreground">{data.avgAcceptanceRate}%</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t('dashboard.avgAvailability')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Response metrics column */}
          <div>
            <div className="rounded-lg border border-border/60 bg-card card-shadow p-5 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{t('dashboard.responseMetrics')}</h3>
              </div>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('dashboard.avgResponseTime')}</p>
                    <p className="text-xl font-semibold text-foreground">{Math.round(data.avgFillTimeMinutes)} min</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('dashboard.fastResponses')}</p>
                    <p className="text-xl font-semibold text-foreground">{responseMetricsStats?.fastResponsesPercent || 0}%</p>
                  </div>
                </div>
                <div className="border-t border-border/40 pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('dashboard.avgFirstResponse')}</p>
                    <p className="text-xl font-semibold text-foreground">{Math.round(data.avgFillTimeMinutes)} min</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('dashboard.peakHour')}</p>
                    <p className="text-xl font-semibold text-foreground">{responseMetricsStats?.peakHour || '18h'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top employees */}
      {data.topEmployees.length > 0 && (
        <PremiumFeature featureName={t('dashboard.features.performanceInsights')}>
          <PerformanceSection
            topEmployees={data.topEmployees}
            activeEmployees={data.activeEmployees}
            avgAcceptanceRate={data.avgAcceptanceRate}
          />
        </PremiumFeature>
      )}

      <DashboardAdvancedAnalytics data={data} />
    </div>
  )
}
