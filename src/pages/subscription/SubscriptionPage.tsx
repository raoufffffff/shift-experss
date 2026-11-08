import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { type SubscriptionPlan } from '@shared/types'
import { Check, Calendar, CreditCard } from 'lucide-react'
import { DowngradeModal } from '@/components/subscription/DowngradeModal'
import { InlineCheckout } from '@/components/subscription/InlineCheckout'
import { RestrictedAccess } from '@/components/access/RestrictedAccess'
import { useSubscriptionData } from './hooks/useSubscriptionData'
import { CurrentSubscriptionCard } from './components/CurrentSubscriptionCard'
import { CancellationModal } from './components/CancellationModal'
import { PricingCardsGrid } from './components/PricingCardsGrid'
import { ComparisonTable } from './components/ComparisonTable'

export function SubscriptionPage() {
  const { t } = useTranslation()

  const {
    // Data
    company,
    user,
    subscription,
    plans,
    currentPlan,
    trialDaysLeft,
    nextBillingAmount,

    // State
    billingCycle,
    setBillingCycle,
    isUpgrading,
    checkoutStep,
    downgradeModalOpen,
    setDowngradeModalOpen,
    targetPlan,
    showCancelModal,
    setShowCancelModal,
    isSubscriptionExpanded,
    setIsSubscriptionExpanded,
    cancelStep,
    inlineCheckoutOpen,
    setInlineCheckoutOpen,
    selectedPlanForCheckout,
    setSelectedPlanForCheckout,

    // Mutations
    reactivateMutation,
    cancelSubscriptionMutation,
    billingPortalMutation,

    // Handlers
    handleUpgrade,

    // Helpers
    getPlanIcon,
    getPlanBadge,

    // Query client
    queryClient,
  } = useSubscriptionData()

  // Check if user is admin (only admins can manage subscription)
  if (user?.role !== 'admin') {
    return <RestrictedAccess />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('subscription.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('subscription.subtitle')}
        </p>
      </div>

      {/* Current Subscription Card (includes cancellation pending alert) */}
      {subscription && (
        <CurrentSubscriptionCard
          subscription={subscription}
          currentPlan={currentPlan}
          trialDaysLeft={trialDaysLeft}
          nextBillingAmount={nextBillingAmount}
          isSubscriptionExpanded={isSubscriptionExpanded}
          setIsSubscriptionExpanded={setIsSubscriptionExpanded}
          cancelAtPeriodEnd={company?.cancel_at_period_end}
          subscriptionCurrentPeriodEnd={company?.subscription_current_period_end}
          reactivateMutation={reactivateMutation}
          billingPortalMutation={billingPortalMutation}
          onCancelClick={() => setShowCancelModal(true)}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <CancellationModal
          open={showCancelModal}
          onOpenChange={setShowCancelModal}
          cancelStep={cancelStep}
          cancelSubscriptionMutation={cancelSubscriptionMutation}
          subscriptionCurrentPeriodEnd={subscription?.subscription_current_period_end}
        />
      )}

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={billingCycle === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>
          {t('subscription.billingCycle.monthly')}
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
          className={`
            relative w-14 h-7 rounded-full transition-colors
            ${billingCycle === 'yearly' ? 'bg-primary' : 'bg-muted'}
          `}
        >
          <div
            className={`
              absolute top-1 left-1 w-5 h-5 bg-background rounded-full shadow-md transition-transform
              ${billingCycle === 'yearly' ? 'translate-x-7' : ''}
            `}
          />
        </button>
        <div className="flex items-center gap-2">
          <span className={billingCycle === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}>
            {t('subscription.billingCycle.yearly')}
          </span>
          <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-950">
            <Calendar className="w-3 h-3 mr-1" />
            {t('subscription.billingCycle.discount')}
          </Badge>
        </div>
      </div>

      {/* Pricing Cards */}
      <PricingCardsGrid
        plans={plans}
        currentPlan={currentPlan}
        billingCycle={billingCycle}
        isUpgrading={isUpgrading}
        cancelAtPeriodEnd={company?.cancel_at_period_end}
        subscriptionCurrentPeriodEnd={company?.subscription_current_period_end}
        onUpgrade={handleUpgrade}
        getPlanIcon={getPlanIcon}
        getPlanBadge={getPlanBadge}
      />

      {/* Comparison Table + FAQ + Trust indicators */}
      <ComparisonTable />

      {/* Downgrade Modal */}
      {targetPlan && (
        <DowngradeModal
          open={downgradeModalOpen}
          onOpenChange={setDowngradeModalOpen}
          targetPlan={targetPlan}
          currentPlan={currentPlan as SubscriptionPlan}
        />
      )}

      {/* Checkout Loading Modal */}
      <Dialog open={isUpgrading} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md" hideClose>
          <DialogHeader>
            <DialogTitle className="text-center">
              {t('subscription.checkoutLoading.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${checkoutStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                  {checkoutStep > step ? (
                    <Check className="w-4 h-4" />
                  ) : checkoutStep === step ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    String(step)
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${checkoutStep >= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {t(`subscription.checkoutLoading.step${step}`)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(`subscription.checkoutLoading.step${step}Description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center px-4 text-center">
            <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{t('subscription.checkoutLoading.securityNote')}</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Checkout Modal */}
      {selectedPlanForCheckout && (
        <InlineCheckout
          isOpen={inlineCheckoutOpen}
          onClose={() => {
            setInlineCheckoutOpen(false)
            setSelectedPlanForCheckout(null)
          }}
          plan={selectedPlanForCheckout}
          interval={billingCycle}
          onSuccess={() => {
            setInlineCheckoutOpen(false)
            setSelectedPlanForCheckout(null)
            // Refresh subscription data
            queryClient.invalidateQueries({ queryKey: ['subscription', company?.id] })
            // Reload to update everything
            setTimeout(() => window.location.reload(), 2000)
          }}
        />
      )}
    </div>
  )
}
