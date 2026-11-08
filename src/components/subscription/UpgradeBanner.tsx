import { Crown, TrendingUp, Building2, Users, Calendar, AlertCircle } from 'lucide-react'
import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

interface UpgradeBannerProps {
  /** The type of limit reached (establishments, employees, or shifts) */
  limitType: 'establishments' | 'employees' | 'shifts'
  /** Current count */
  current: number
  /** Maximum allowed */
  max: number
}

export function UpgradeBanner({ limitType, current, max }: UpgradeBannerProps) {
  const { t } = useTranslation()

  // Icon mapping
  const iconMap = {
    establishments: Building2,
    employees: Users,
    shifts: Calendar,
  }

  // Translation key mapping
  const titleKeyMap = {
    establishments: 'upgradeBanner.establishments.title',
    employees: 'upgradeBanner.employees.title',
    shifts: 'upgradeBanner.shifts.title',
  }

  const descKeyMap = {
    establishments: 'upgradeBanner.establishments.description',
    employees: 'upgradeBanner.employees.description',
    shifts: 'upgradeBanner.shifts.description',
  }

  const Icon = iconMap[limitType]

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/30 dark:border-amber-800">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 mb-2">
              <p className="font-medium text-sm text-amber-900 dark:text-amber-300">
                {t(titleKeyMap[limitType])}
              </p>
              <div className="px-2.5 py-0.5 rounded-full bg-card border border-amber-300 dark:border-amber-700 flex-shrink-0 w-fit">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-400 tabular-nums">
                  {current}/{max}
                </span>
              </div>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-3 leading-relaxed">
              {t(descKeyMap[limitType], { current, max })}
            </p>
            <Link to="/subscription">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 text-white dark:text-white border-0 w-full sm:w-auto shadow-sm">
                <Crown className="w-4 h-4 mr-2 text-white dark:text-white" />
                <span className="text-white dark:text-white font-medium">{t('upgradeBanner.cta')}</span>
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
