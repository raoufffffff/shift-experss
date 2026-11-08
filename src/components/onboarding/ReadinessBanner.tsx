import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Users, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

interface ReadinessBannerProps {
  score: number
  activeEmployees: number
  className?: string
}

export function ReadinessBanner({
  score,
  activeEmployees,
  className,
}: ReadinessBannerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const company = useAuthStore((state) => state.company)
  const queryClient = useQueryClient()

  // Dismiss banner (update last_readiness_reminder_at to prevent showing again today)
  const dismissBannerMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company')
      const { error } = await supabase
        .from('companies')
        .update({ last_readiness_reminder_at: new Date().toISOString() })
        .eq('id', company.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', company?.id] })
      toast.success(t('onboarding.readinessBanner.dismissed'))
    },
    onError: () => {
      toast.error(t('onboarding.readinessBanner.dismissError'))
    },
  })

  const handleInvite = () => {
    navigate('/employees')
  }

  const handleDismiss = () => {
    dismissBannerMutation.mutate()
  }

  // Determine styling based on score level
  const getScoreConfig = () => {
    if (score >= 50) {
      // Should not display banner if score >= 50%, but handle gracefully
      return {
        gradient: 'from-yellow-500 via-yellow-400 to-yellow-300',
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        text: 'text-yellow-900',
        iconColor: 'text-yellow-600',
      }
    }
    if (score >= 25) {
      return {
        gradient: 'from-orange-500 via-orange-400 to-orange-300',
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-900',
        iconColor: 'text-orange-600',
      }
    }
    // score < 25 (critical)
    return {
      gradient: 'from-red-500 via-red-400 to-red-300',
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-900',
      iconColor: 'text-red-600',
    }
  }

  const config = getScoreConfig()

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border-2',
        config.border,
        config.bg,
        className
      )}
    >
      {/* Gradient accent bar */}
      <div className={cn('h-2 bg-gradient-to-r', config.gradient)} />

      <div className="p-4 pr-12">
        <div className="flex items-center gap-4">
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className={cn('text-lg font-bold', config.text)}>
                {t('onboarding.readinessBanner.title', { score })}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('onboarding.readinessBanner.message', {
                activeEmployees,
                targetEmployees: 20,
              })}
            </p>
          </div>

          {/* Action button */}
          <Button
            onClick={handleInvite}
            size="sm"
            className="flex-shrink-0"
          >
            <Users className="w-4 h-4 mr-2" />
            {t('onboarding.readinessBanner.inviteButton')}
          </Button>
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        disabled={dismissBannerMutation.isPending}
        className={cn(
          'absolute top-4 right-4 w-8 h-8 rounded-full bg-white border flex items-center justify-center hover:bg-muted/50 transition-colors',
          config.border,
          dismissBannerMutation.isPending && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={t('onboarding.readinessBanner.dismiss')}
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  )
}
