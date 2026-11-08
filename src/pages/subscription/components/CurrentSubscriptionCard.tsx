import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@shared/types'
import { formatCurrency } from '@shared/utils'
import { Calendar, CreditCard, AlertCircle, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'

interface SubscriptionData {
  id: string
  name: string | null
  logo_url: string | null
  subscription_plan: string | null
  subscription_status: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  created_at: string | null
  updated_at: string | null
  cancel_at_period_end: boolean | null
  subscription_current_period_end: string | null
  subscription_interval: string | null
}

interface CurrentSubscriptionCardProps {
  subscription: SubscriptionData
  currentPlan: string
  trialDaysLeft: number | null
  nextBillingAmount: number | null
  isSubscriptionExpanded: boolean
  setIsSubscriptionExpanded: (expanded: boolean) => void
  cancelAtPeriodEnd: boolean | null | undefined
  subscriptionCurrentPeriodEnd: string | null | undefined
  reactivateMutation: UseMutationResult<unknown, Error, void, unknown>
  billingPortalMutation: UseMutationResult<unknown, Error, void, unknown>
  onCancelClick: () => void
}

export function CurrentSubscriptionCard({
  subscription,
  currentPlan,
  trialDaysLeft,
  nextBillingAmount,
  isSubscriptionExpanded,
  setIsSubscriptionExpanded,
  cancelAtPeriodEnd,
  subscriptionCurrentPeriodEnd,
  reactivateMutation,
  billingPortalMutation,
  onCancelClick,
}: CurrentSubscriptionCardProps) {
  const { t, i18n } = useTranslation()

  return (
    <>
      {/* Cancellation Pending Alert */}
      {cancelAtPeriodEnd && subscriptionCurrentPeriodEnd && subscription?.subscription_status === 'active' && (
        <div className="relative overflow-hidden rounded-xl border-2 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <div className="h-2 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">
                  {t('subscription.managementCard.cancellationScheduled.title')}
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                  {t('subscription.managementCard.cancellationScheduled.description')}{' '}
                  <strong className="dark:text-orange-200">
                    {new Date(subscriptionCurrentPeriodEnd).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                  . {t('subscription.managementCard.cancellationScheduled.canReactivate')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                  className="bg-white hover:bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:border-orange-700 dark:text-orange-200"
                >
                  {reactivateMutation.isPending ? t('subscription.managementCard.cancellationScheduled.reactivating') : t('subscription.managementCard.cancellationScheduled.reactivate')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Subscription Management */}
      <div className="relative overflow-hidden rounded-xl border-2 border-primary/20 bg-primary/5">
        {/* Gradient accent bar */}
        <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary" />

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {t('subscription.managementCard.title')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('subscription.managementCard.description')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className="capitalize text-base px-4 py-2"
                variant={subscription.subscription_status === 'active' ? 'default' : 'secondary'}
              >
                {SUBSCRIPTION_PLANS[currentPlan as SubscriptionPlan]?.name || currentPlan}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSubscriptionExpanded(!isSubscriptionExpanded)}
                className="h-8 w-8 p-0"
              >
                {isSubscriptionExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {isSubscriptionExpanded && (
            <div className="space-y-4">
              {/* Compact Subscription Overview */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-card/60 border border-border">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${subscription.stripe_subscription_id && subscription.subscription_status === 'active' ? 'bg-green-500' :
                    subscription.stripe_subscription_id && subscription.subscription_status === 'trialing' ? 'bg-primary' :
                      subscription.stripe_subscription_id ? 'bg-orange-500' :
                        'bg-gray-400'
                    }`} />
                  <div>
                    <div className="text-sm font-semibold">
                      {subscription.stripe_subscription_id ? (
                        subscription.subscription_status === 'trialing' ? t('subscription.managementCard.statusLabels.trialing') :
                          subscription.subscription_status === 'active' ? t('subscription.managementCard.statusLabels.active') :
                            subscription.subscription_status === 'past_due' ? t('subscription.managementCard.statusLabels.past_due') :
                              subscription.subscription_status === 'canceled' ? t('subscription.managementCard.statusLabels.cancelled') :
                                t('subscription.managementCard.statusLabels.unknown')
                      ) : (
                        SUBSCRIPTION_PLANS[currentPlan as SubscriptionPlan]?.name || 'Free'
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {subscription.stripe_subscription_id ? (
                        <>{subscription.subscription_interval === 'year' ? t('subscription.managementCard.billingInterval.yearly') : t('subscription.managementCard.billingInterval.monthly')}</>
                      ) : (
                        <>{t('subscription.managementCard.noBilling')}</>
                      )}
                    </div>
                  </div>
                </div>

                {/* Next Billing - Highlighted */}
                {trialDaysLeft ? (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">{t('subscription.managementCard.trialEnd')}</div>
                    <div className="text-xl font-bold text-orange-600">
                      {trialDaysLeft} {trialDaysLeft > 1 ? t('subscription.managementCard.days') : t('subscription.managementCard.day')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {subscription.trial_ends_at && new Date(subscription.trial_ends_at).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                ) : subscription.subscription_current_period_end && subscription.subscription_status === 'active' ? (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">
                      {cancelAtPeriodEnd ? t('subscription.managementCard.endsOn') : t('subscription.managementCard.nextBilling')}
                    </div>
                    <div className="text-2xl font-bold">
                      {new Date(subscription.subscription_current_period_end).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    {!cancelAtPeriodEnd && nextBillingAmount && (
                      <div className="text-sm font-semibold text-primary mt-1">
                        {formatCurrency(nextBillingAmount)}
                      </div>
                    )}
                  </div>
                ) : subscription.created_at ? (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">{t('subscription.managementCard.memberSince')}</div>
                    <div className="text-xl font-bold">
                      {new Date(subscription.created_at).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Payment Issue Alert */}
              {subscription.subscription_status === 'past_due' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-950/50 dark:border-red-900">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                        {t('subscription.managementCard.paymentIssue.title')}
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                        {t('subscription.managementCard.paymentIssue.description')}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white hover:bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-700 dark:text-red-100"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {t('subscription.managementCard.paymentIssue.updatePayment')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions - Hidden for free plan */}
              {currentPlan !== 'free' && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3">{t('subscription.managementCard.quickActions')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subscription.stripe_customer_id && subscription.subscription_status === 'active' && (
                      <>
                        <Button
                          variant="outline"
                          className="justify-start h-auto py-3"
                          onClick={() => billingPortalMutation.mutate()}
                          disabled={billingPortalMutation.isPending}
                        >
                          <div className="flex items-start gap-3">
                            <CreditCard className="w-5 h-5 text-primary mt-0.5" />
                            <div className="text-left">
                              <div className="font-semibold">{t('subscription.managementCard.managePayment')}</div>
                              <div className="text-xs text-muted-foreground">{t('subscription.managementCard.managePaymentDescription')}</div>
                            </div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start h-auto py-3"
                          onClick={() => billingPortalMutation.mutate()}
                          disabled={billingPortalMutation.isPending}
                        >
                          <div className="flex items-start gap-3">
                            <BarChart3 className="w-5 h-5 text-primary mt-0.5" />
                            <div className="text-left">
                              <div className="font-semibold">{t('subscription.managementCard.viewInvoices')}</div>
                              <div className="text-xs text-muted-foreground">{t('subscription.managementCard.viewInvoicesDescription')}</div>
                            </div>
                          </div>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Cancel Subscription - Discreet */}
              {subscription.stripe_customer_id && subscription.subscription_status === 'active' && !cancelAtPeriodEnd && currentPlan !== 'free' && (
                <div className="border-t pt-4 mt-4">
                  <button
                    onClick={onCancelClick}
                    className="text-sm text-muted-foreground hover:text-red-600 transition-colors underline"
                  >
                    {t('subscription.managementCard.cancelSubscription')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
