import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'

interface CancellationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cancelStep: number
  cancelSubscriptionMutation: UseMutationResult<unknown, Error, void, unknown>
  subscriptionCurrentPeriodEnd: string | null | undefined
}

export function CancellationModal({
  open,
  onOpenChange,
  cancelStep,
  cancelSubscriptionMutation,
  subscriptionCurrentPeriodEnd,
}: CancellationModalProps) {
  const { t, i18n } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={(o) => !cancelSubscriptionMutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-900">
            <AlertCircle className="w-5 h-5" />
            {t('subscription.cancelModal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('subscription.cancelModal.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        {cancelStep > 0 && (
          <div className="space-y-4 py-6">
            {/* Step 1: Preparing */}
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cancelStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                {cancelStep > 1 ? (
                  <Check className="w-4 h-4" />
                ) : cancelStep === 1 ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  '1'
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${cancelStep >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {i18n.language === 'fr' ? 'Preparation de l\'annulation' : 'Preparing cancellation'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {i18n.language === 'fr' ? 'Verification de votre abonnement' : 'Verifying your subscription'}
                </p>
              </div>
            </div>

            {/* Step 2: Contacting Stripe */}
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cancelStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                {cancelStep > 2 ? (
                  <Check className="w-4 h-4" />
                ) : cancelStep === 2 ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  '2'
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${cancelStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {i18n.language === 'fr' ? 'Connexion a Stripe' : 'Contacting Stripe'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {i18n.language === 'fr' ? 'Communication securisee avec Stripe' : 'Secure communication with Stripe'}
                </p>
              </div>
            </div>

            {/* Step 3: Processing */}
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cancelStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                {cancelStep > 3 ? (
                  <Check className="w-4 h-4" />
                ) : cancelStep === 3 ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  '3'
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${cancelStep >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {i18n.language === 'fr' ? 'Traitement de l\'annulation' : 'Processing cancellation'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {i18n.language === 'fr' ? 'Annulation de votre abonnement' : 'Cancelling your subscription'}
                </p>
              </div>
            </div>

            {/* Step 4: Finalizing */}
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cancelStep >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                {cancelStep > 4 ? (
                  <Check className="w-4 h-4" />
                ) : cancelStep === 4 ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  '4'
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${cancelStep >= 4 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {i18n.language === 'fr' ? 'Finalisation' : 'Finalizing'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {i18n.language === 'fr' ? 'Mise a jour de votre compte' : 'Updating your account'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Information (only show when not in progress) */}
        {cancelStep === 0 && (
          <div className="space-y-4 py-4">
            <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">{t('subscription.cancelModal.whatHappens')}</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{t('subscription.cancelModal.retainAccess')}{' '}
                    <strong>
                      {subscriptionCurrentPeriodEnd &&
                        new Date(subscriptionCurrentPeriodEnd).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      }
                    </strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{t('subscription.cancelModal.noMoreCharges')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{t('subscription.cancelModal.canReactivate')}</span>
                </li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">{t('subscription.cancelModal.afterPeriod')}</h4>
              <ul className="space-y-2 text-sm text-orange-800">
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{t('subscription.cancelModal.downgradeFree')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{t('subscription.cancelModal.establishmentsSuspended')}</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelSubscriptionMutation.isPending}
          >
            {t('subscription.cancelModal.keepSubscription')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancelSubscriptionMutation.mutate()}
            disabled={cancelSubscriptionMutation.isPending}
          >
            {cancelSubscriptionMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('subscription.cancelModal.cancelling')}
              </span>
            ) : (
              t('subscription.cancelModal.confirmCancel')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
