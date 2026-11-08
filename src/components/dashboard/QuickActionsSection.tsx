import { useCallback } from 'react'
import { Users, FileText, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/hooks/useLocale'

type QuickActionsSectionProps = {
  pendingShifts: number
  ongoingShiftsToday: number
  activeEmployees: number
}

export function QuickActionsSection({
  pendingShifts,
  ongoingShiftsToday,
  activeEmployees
}: QuickActionsSectionProps) {
  const { t } = useTranslation()
  const { navigate } = useLocale()

  const actions = [
    {
      icon: Plus,
      label: t('dashboard.publishShift'),
      description: pendingShifts > 0
        ? t('dashboard.pendingCount', { count: pendingShifts, defaultValue: `${pendingShifts} en attente` })
        : t('dashboard.publishShiftDesc', { defaultValue: 'Créer un nouveau shift' }),
      onClick: () => navigate('/shifts/new'),
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: FileText,
      label: t('dashboard.viewApplications', { defaultValue: 'Candidatures' }),
      description: t('dashboard.viewApplicationsDesc', { defaultValue: 'Consulter les candidatures reçues' }),
      onClick: () => navigate('/applications'),
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      icon: Users,
      label: t('dashboard.inviteEmployees'),
      description: t('dashboard.employeeCount', { count: activeEmployees, defaultValue: `${activeEmployees} employé(s) actif(s)` }),
      onClick: () => navigate('/employees'),
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card p-4 text-left transition-all hover:shadow-md hover:border-border card-shadow"
        >
          <div className={`p-2.5 rounded-lg shrink-0 ${action.color}`}>
            <action.icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{action.label}</p>
            <p className="text-xs text-muted-foreground truncate">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
