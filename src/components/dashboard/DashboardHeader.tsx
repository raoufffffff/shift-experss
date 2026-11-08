import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Download, Plus, Calendar } from 'lucide-react'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { useTranslation } from 'react-i18next'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import type { DateRange } from '@/utils/dashboard'

type DashboardHeaderProps = {
  dateRange: DateRange
  customStartDate: Date | null
  customEndDate: Date | null
  onDateRangeChange: (range: DateRange) => void
  onCustomDateChange: (start: Date | null, end: Date | null) => void
  onCustomDateClose: () => void
  onExport: () => void
  onCreateShift: () => void
}

/**
 * Header du Dashboard avec titre, filtres de date et actions
 */
export function DashboardHeader({
  dateRange,
  customStartDate,
  customEndDate,
  onDateRangeChange,
  onCustomDateChange,
  onCustomDateClose,
  onExport,
  onCreateShift
}: DashboardHeaderProps) {
  const { t } = useTranslation()

  const handleDateRangeClick = useCallback((range: DateRange) => {
    onDateRangeChange(range)
  }, [onDateRangeChange])

  return (
    <div className="pb-4 border-b border-border/50">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Onboarding Checklist - Plus discret, sous le titre */}
        <OnboardingChecklist />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
          {/* Sélecteur de période */}
          <div className="flex items-center gap-1 sm:gap-2 bg-muted/30 rounded-lg p-1 border border-border/60 overflow-x-auto">
            <button
              onClick={() => handleDateRangeClick('today')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${dateRange === 'today'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              {t('dashboard.today')}
            </button>
            <button
              onClick={() => handleDateRangeClick('7d')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${dateRange === '7d'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              {t('dashboard.7days')}
            </button>
            <button
              onClick={() => handleDateRangeClick('30d')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${dateRange === '30d'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              {t('dashboard.30days')}
            </button>
            <button
              onClick={() => handleDateRangeClick('90d')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${dateRange === '90d'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              {t('dashboard.90days')}
            </button>
            <DateRangePicker
              startDate={customStartDate || undefined}
              endDate={customEndDate || undefined}
              onChange={onCustomDateChange}
              onClose={onCustomDateClose}
              calendarPosition="bottom"
              label=""
              customTrigger={
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{t('common.custom', { defaultValue: 'Personnalisé' })}</span>
                </div>
              }
              triggerClassName={`flex-1 sm:flex-none px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-2 ${dateRange === 'custom'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            />
          </div>

          <div className="flex gap-2 sm:gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={onExport}
              className="shadow-sm"
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('dashboard.export')}</span>
            </Button>

            <Button
              onClick={onCreateShift}
              className="shadow-sm"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('dashboard.publishShift')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
