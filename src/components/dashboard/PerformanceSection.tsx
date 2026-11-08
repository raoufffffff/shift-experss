import { useCallback } from 'react'
import { TopEmployeesCard } from '@/components/dashboard/TopEmployeesCard'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { useLocale } from '@/hooks/useLocale'

type TopEmployee = {
  id: string
  name: string
  acceptanceRate: number
  totalShifts: number
}

type PerformanceSectionProps = {
  topEmployees: TopEmployee[]
  activeEmployees: number
  avgAcceptanceRate: number
}

export function PerformanceSection({
  topEmployees,
  activeEmployees,
  avgAcceptanceRate
}: PerformanceSectionProps) {
  const { t } = useTranslation()
  const { navigate } = useLocale()

  const handleEmployeeClick = useCallback((employeeId: string) => {
    navigate(`/employees/${employeeId}`)
  }, [navigate])

  if (topEmployees.length === 0) return null

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t('dashboard.topEmployees')}</h2>
      <TopEmployeesCard
        employees={topEmployees}
        title={t('dashboard.topEmployees')}
        t={t as TFunction}
        onEmployeeClick={handleEmployeeClick}
      />
    </div>
  )
}
