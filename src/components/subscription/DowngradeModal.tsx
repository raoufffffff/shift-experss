import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { ACTIVE_SHIFT_STATUSES } from '@shared/subscription-limits'
import { SubscriptionPlan, SubscriptionPlanEnum } from '@shared/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Building2, Calendar, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { useTranslation } from 'react-i18next'

interface DowngradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetPlan: SubscriptionPlan
  currentPlan: SubscriptionPlan
}

interface EstablishmentWithShifts {
  id: string
  name: string
  hasActiveShifts: boolean
  activeShiftsCount: number
}

export function DowngradeModal({
  open,
  onOpenChange,
  targetPlan,
}: DowngradeModalProps) {
  const { company } = useAuthStore()
  const { t, i18n } = useTranslation()
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string | null>(null)

  // Fetch establishments avec comptage des shifts actifs
  const { data: establishments = [], isLoading } = useQuery({
    queryKey: ['establishments-with-shifts', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      // Récupérer les établissements
      const { data: estabs, error: estabsError } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('company_id', company.id)
        .eq('status', 'active')

      if (estabsError) throw estabsError

      // Pour chaque établissement, compter les shifts actifs
      const estabsWithShifts: EstablishmentWithShifts[] = await Promise.all(
        (estabs || []).map(async (estab) => {
          const { count } = await supabase
            .from('shifts')
            .select('*', { count: 'exact', head: true })
            .eq('establishment_id', estab.id)
            .in('status', [...ACTIVE_SHIFT_STATUSES])

          return {
            id: estab.id,
            name: estab.name,
            hasActiveShifts: (count || 0) > 0,
            activeShiftsCount: count || 0,
          }
        })
      )

      return estabsWithShifts
    },
    enabled: !!company?.id && open,
  })

  // Auto-sélectionner si un seul établissement
  useEffect(() => {
    if (establishments.length === 1 && !selectedEstablishmentId) {
      setSelectedEstablishmentId(establishments[0].id)
    }
  }, [establishments, selectedEstablishmentId])

  // Mutation pour effectuer le downgrade
  const downgradeMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) {
        throw new Error('Company not found')
      }

      // Si le client a un abonnement Stripe actif, changer le plan ou annuler
      if (company.stripe_subscription_id && company.subscription_status === 'active') {
        const isDowngradeToFree = targetPlan === 'free'
        const functionName = isDowngradeToFree ? 'cancel-subscription' : 'change-subscription'

        logger.log(`Calling ${functionName} function...`)
        logger.log('Company before:', company)

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: isDowngradeToFree ? {} : { targetPlan },
        })

        logger.log(`${functionName} response:`, { data, error })

        if (error) {
          logger.error(`${functionName} error:`, error)
          // Try to extract detailed error from response body
          let errorMessage = error.message || t('errors.generic')
          if (error.context && typeof error.context.json === 'function') {
            try {
              const errorDetails = await error.context.json()
              if (errorDetails.message) errorMessage = errorDetails.message
              else if (errorDetails.error) errorMessage = errorDetails.error
            } catch (e) { /* ignore */ }
          }
          throw new Error(errorMessage)
        }

        if (!data) {
          throw new Error(t('errors.generic'))
        }

        return { mode: 'scheduled', ...data }
      }

      // Sinon, effectuer un downgrade immédiat (pour les utilisateurs sur plan free)
      if (!selectedEstablishmentId && establishments.length > 1) {
        throw new Error(t('downgradeModal.noEstablishmentSelected'))
      }

      // Vérifier que les autres établissements n'ont pas de shifts actifs
      const establishmentsToStandby = establishments.filter(
        (e) => e.id !== selectedEstablishmentId
      )

      const hasActiveShifts = establishmentsToStandby.some((e) => e.hasActiveShifts)
      if (hasActiveShifts) {
        throw new Error(
          t('errors.generic')
        )
      }

      // Mettre les autres établissements en stand-by (seulement si nécessaire)
      if (establishmentsToStandby.length > 0) {
        const { error: standbyError } = await supabase
          .from('establishments')
          .update({ status: 'standby' })
          .in(
            'id',
            establishmentsToStandby.map((e) => e.id)
          )

        if (standbyError) throw standbyError
      }

      // Changer le plan immédiatement et réinitialiser cancel_at_period_end
      const { error: planError } = await supabase
        .from('companies')
        .update({
          subscription_plan: targetPlan,
          cancel_at_period_end: false,
          subscription_current_period_end: null
        })
        .eq('id', company.id)

      if (planError) throw planError

      return { mode: 'immediate' }
    },
    onSuccess: (data) => {
      logger.log('Downgrade success, data:', data)

      if (data?.mode === 'scheduled') {
        const cancelDate = data.cancel_at || data.current_period_end
        const dateStr = cancelDate ? new Date(cancelDate).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US') : t('downgradeModal.cancelSuccessEndPeriod')
        toast.success(
          t('downgradeModal.cancelSuccess', { date: dateStr }),
          { duration: 8000 }
        )
      } else {
        toast.success(t('subscription.success.planChanged'))
      }

      // Reload pour mettre à jour les infos
      setTimeout(() => window.location.reload(), 1500)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleDowngrade = () => {
    // Si on a un abonnement Stripe actif, on n'a pas besoin de sélectionner d'établissement maintenant
    // car la rétrogradation sera différée à la fin de la période
    const hasActiveStripeSubscription = company?.stripe_subscription_id && company?.subscription_status === 'active'

    if (!hasActiveStripeSubscription && !selectedEstablishmentId && establishments.length > 1) {
      toast.error(t('errors.generic'))
      return
    }

    downgradeMutation.mutate()
  }

  const maxEstablishments = targetPlan === SubscriptionPlanEnum.FREE ? 1 : 3
  const needsSelection = establishments.length > maxEstablishments
  const hasActiveStripeSubscription = company?.stripe_subscription_id && company?.subscription_status === 'active'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('downgradeModal.title')}</DialogTitle>
          <DialogDescription>
            {t('downgradeModal.description', { plan: targetPlan.toUpperCase() })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info pour abonnement Stripe actif - changement à la fin de la période */}
          {hasActiveStripeSubscription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">
                    {t('downgradeModal.scheduledChange', 'Changement programmé')}
                  </h4>
                  <p className="text-sm text-blue-800">
                    {t('downgradeModal.scheduledDescription', 'Votre abonnement passera en {{plan}} à la fin de votre période actuelle le', { plan: targetPlan.toUpperCase() })}{' '}
                    <strong>
                      {company.subscription_current_period_end
                        ? new Date(company.subscription_current_period_end).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                        : t('downgradeModal.scheduledEndPeriod', 'la fin de la période')}
                    </strong>.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning si besoin de sélection (seulement pour downgrade immédiat) */}
          {!hasActiveStripeSubscription && needsSelection && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-1">
                    {t('downgradeModal.establishmentLimit')}
                  </h4>
                  <p className="text-sm text-amber-800">
                    {t('downgradeModal.limitMessage', {
                      plan: targetPlan.toUpperCase(),
                      limit: maxEstablishments,
                      count: establishments.length
                    })}
                  </p>
                  <p className="text-sm text-amber-800 mt-2">
                    {maxEstablishments === 1
                      ? t('downgradeModal.selectPromptSingle')
                      : t('downgradeModal.selectPrompt')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Liste des établissements - seulement si plus d'un établissement ET pas d'abonnement Stripe actif */}
          {!hasActiveStripeSubscription && isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
          ) : !hasActiveStripeSubscription && establishments.length > 1 ? (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">
                {needsSelection ? t('downgradeModal.selectHeader') : t('downgradeModal.yourEstablishments')}
              </h4>
              <div className="space-y-2">
                {establishments.map((estab) => (
                  <label
                    key={estab.id}
                    className={`
                      flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all
                      ${selectedEstablishmentId === estab.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="establishment"
                      value={estab.id}
                      checked={selectedEstablishmentId === estab.id}
                      onChange={(e) => setSelectedEstablishmentId(e.target.value)}
                      className="w-4 h-4 text-primary"
                    />
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{estab.name}</div>
                      {estab.hasActiveShifts && (
                        <div className="flex items-center gap-2 text-sm text-orange-600 mt-1">
                          <Calendar className="w-4 h-4" />
                          {t('downgradeModal.activeShiftsWarning', { count: estab.activeShiftsCount })}
                        </div>
                      )}
                    </div>
                    {selectedEstablishmentId === estab.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ) : !hasActiveStripeSubscription && establishments.length === 1 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900">
                    {t('downgradeModal.establishmentSelected')} <strong>{establishments[0].name}</strong>
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Avertissement shifts actifs */}
          {!hasActiveStripeSubscription && establishments.some((e) => e.hasActiveShifts && e.id !== selectedEstablishmentId) && needsSelection && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold mb-1">⚠️ {t('downgradeModal.activeShiftsDetected')}</p>
                  <p>
                    {t('downgradeModal.activeShiftsMessage')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info stand-by */}
          {!hasActiveStripeSubscription && needsSelection && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">📋 {t('downgradeModal.standbyInfo')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('downgradeModal.standbyPoint1')}</li>
                  <li>{t('downgradeModal.standbyPoint2')}</li>
                  <li>{t('downgradeModal.standbyPoint3')}</li>
                  <li>{t('downgradeModal.standbyPoint4')}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={downgradeMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDowngrade}
            disabled={
              downgradeMutation.isPending ||
              // Si abonnement Stripe actif, pas besoin de sélection
              (!hasActiveStripeSubscription && (
                (needsSelection && !selectedEstablishmentId) ||
                // Bloquer si des établissements NON sélectionnés ont des shifts actifs
                establishments.some((e) => e.id !== selectedEstablishmentId && e.hasActiveShifts)
              ))
            }
          >
            {downgradeMutation.isPending
              ? t('downgradeModal.changing')
              : t('downgradeModal.confirmChange')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
