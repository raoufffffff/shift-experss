import { useTranslation } from 'react-i18next'
import { Users, TrendingUp, AlertTriangle, CheckCircle2, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card, CardContent } from '@/components/ui/Card'
import { useLocale } from '@/hooks/useLocale'

interface ShiftReadinessScoreProps {
  activeEmployees: number
  score: number
  onInviteClick?: () => void
  onDetailsClick?: () => void
  onCollapseClick?: () => void
  className?: string
}

export function ShiftReadinessScore({
  activeEmployees,
  score,
  onInviteClick,
  onDetailsClick,
  onCollapseClick,
  className,
}: ShiftReadinessScoreProps) {
  const { t } = useTranslation()
  const { navigate } = useLocale()

  // Determine score level and styling
  const getScoreLevel = () => {
    if (score >= 100) return 'excellent'
    if (score >= 75) return 'good'
    if (score >= 50) return 'medium'
    if (score >= 25) return 'low'
    return 'critical'
  }

  const scoreLevel = getScoreLevel()

  const levelConfig = {
    critical: {
      bg: 'bg-red-50/50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-300',
      textDesc: 'text-red-700 dark:text-red-400',
      icon: AlertTriangle,
      iconColor: 'text-red-600 dark:text-red-400',
      gradient: 'from-red-500 via-red-400 to-red-300',
      message: t('onboarding.readiness.critical'),
    },
    low: {
      bg: 'bg-orange-50/50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-900 dark:text-orange-300',
      textDesc: 'text-orange-700 dark:text-orange-400',
      icon: AlertTriangle,
      iconColor: 'text-orange-600 dark:text-orange-400',
      gradient: 'from-orange-500 via-orange-400 to-orange-300',
      message: t('onboarding.readiness.low'),
    },
    medium: {
      bg: 'bg-yellow-50/50 dark:bg-yellow-950/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-300',
      textDesc: 'text-yellow-700 dark:text-yellow-400',
      icon: TrendingUp,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      gradient: 'from-yellow-500 via-yellow-400 to-yellow-300',
      message: t('onboarding.readiness.medium'),
    },
    good: {
      bg: 'bg-green-50/50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-300',
      textDesc: 'text-green-700 dark:text-green-400',
      icon: CheckCircle2,
      iconColor: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-500 via-green-400 to-green-300',
      message: t('onboarding.readiness.good'),
    },
    excellent: {
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-900 dark:text-emerald-300',
      textDesc: 'text-emerald-700 dark:text-emerald-400',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      gradient: 'from-emerald-500 via-emerald-400 to-emerald-300',
      message: t('onboarding.readiness.excellent'),
    },
  }

  const config = levelConfig[scoreLevel]
  const Icon = config.icon

  const handleInviteClick = () => {
    if (onInviteClick) {
      onInviteClick()
    } else {
      navigate('/employees')
    }
  }

  const handleDetailsClick = () => {
    if (onDetailsClick) {
      onDetailsClick()
    }
  }

  const getTargetText = () => {
    if (activeEmployees < 10) {
      return t('onboarding.readiness.target.minimum', { count: 10 })
    }
    return t('onboarding.readiness.target.recommended', { count: 20 })
  }

  return (
    <Card className={cn(config.border, config.bg, className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconColor)} />
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 mb-2">
              <p className={cn('font-medium text-sm', config.text)}>
                {t('onboarding.readiness.title')}
              </p>
              <div className="flex items-center gap-2">
                <div className={cn('px-2.5 py-0.5 rounded-full bg-card border flex-shrink-0', config.border)}>
                  <span className={cn('text-xs font-bold tabular-nums', config.text)}>
                    {score}%
                  </span>
                </div>
                {onCollapseClick && (
                  <button
                    onClick={onCollapseClick}
                    className="p-1 rounded-full hover:bg-muted/50 transition-colors group flex-shrink-0"
                  >
                    <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>
            <p className={cn('text-sm leading-relaxed mb-1', config.textDesc)}>
              {getTargetText()}
            </p>

            {/* Progress Bar */}
            <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden border border-border">
              <div
                className={cn('h-full bg-gradient-to-r transition-all duration-500 ease-out', config.gradient)}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>

            {/* Employee Count & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {activeEmployees}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('onboarding.readiness.employeesActive')}
                </span>
              </div>
              <span className="hidden sm:inline mx-2 text-muted-foreground">•</span>
              <p className={cn('text-sm font-medium', config.text)}>
                {config.message}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
