import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan, type SubscriptionPlanConfig } from '@shared/types'
import { formatCurrency } from '@shared/utils'
import { Check, Calendar, ArrowRight } from 'lucide-react'

interface PricingCardsGridProps {
  plans: SubscriptionPlanConfig[]
  currentPlan: string
  billingCycle: 'monthly' | 'yearly'
  isUpgrading: boolean
  cancelAtPeriodEnd: boolean | null | undefined
  subscriptionCurrentPeriodEnd: string | null | undefined
  onUpgrade: (plan: SubscriptionPlanConfig) => void
  getPlanIcon: (planId: string) => ReactNode
  getPlanBadge: (planId: string) => { label: string; variant: 'default' } | null
}

export function PricingCardsGrid({
  plans,
  currentPlan,
  billingCycle,
  isUpgrading,
  cancelAtPeriodEnd,
  subscriptionCurrentPeriodEnd,
  onUpgrade,
  getPlanIcon,
  getPlanBadge,
}: PricingCardsGridProps) {
  const { t, i18n } = useTranslation()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.id
        const badge = getPlanBadge(plan.id)
        const icon = getPlanIcon(plan.id)
        const isDowngrade = plans.findIndex(p => p.id === currentPlan) > plans.findIndex(p => p.id === plan.id)
        const isUpgrade = plans.findIndex(p => p.id === currentPlan) < plans.findIndex(p => p.id === plan.id)
        const cancellationPending = cancelAtPeriodEnd === true

        const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly
        const displayPrice = billingCycle === 'yearly' ? price / 12 : price

        return (
          <div
            key={plan.id}
            className={`
              relative flex flex-col overflow-hidden rounded-2xl transition-all
              ${isCurrent
                ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary shadow-lg'
                : 'bg-gradient-to-br from-card to-muted/20 border border-border hover:shadow-xl hover:scale-[1.02]'
              }
              ${plan.id === 'starter' || plan.id === 'pro' ? 'md:scale-105 shadow-lg' : ''}
            `}
          >
            {/* Top accent gradient */}
            {(badge || isCurrent) && (
              <div className={`h-1.5 bg-gradient-to-r ${isCurrent ? 'from-primary via-primary/80 to-primary' : 'from-primary/60 via-primary/40 to-primary/60'}`} />
            )}

            <div className="p-6 space-y-4">
              {/* Header with icon and badge */}
              <div className="flex items-start justify-between">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center
                  ${isCurrent ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}
                `}>
                  {icon}
                </div>
                {badge && !isCurrent && (
                  <Badge variant="default">
                    {badge.label}
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="bg-primary text-primary-foreground">
                    {t('subscription.plans.current')}
                  </Badge>
                )}
              </div>

              {/* Plan name */}
              <div>
                <h3 className="text-2xl font-bold mb-1">{t(`subscription.planDetails.${plan.id}.name`)}</h3>
                <p className="text-sm text-muted-foreground min-h-[40px]">
                  {t(`subscription.planDetails.${plan.id}.description`)}
                </p>
              </div>

              {/* Price */}
              <div className="py-2">
                <div className="flex items-baseline gap-1.5">
                  {plan.id === 'enterprise' ? (
                    <span className="text-3xl font-bold">{t('subscription.plans.customPricing')}</span>
                  ) : price === 0 ? (
                    <span className="text-3xl font-bold">{t('subscription.plans.free')}</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold tracking-tight">
                        {formatCurrency(displayPrice)}
                      </span>
                      <span className="text-sm text-muted-foreground">{t('subscription.plans.perMonth')}</span>
                    </>
                  )}
                </div>
                {billingCycle === 'yearly' && price > 0 && plan.id !== 'enterprise' && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('subscription.plans.billedYearly', { amount: formatCurrency(price) })}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2.5 pt-2">
                {(t(`subscription.planDetails.${plan.id}.features`, { returnObjects: true }) as unknown as string[]).map((feature: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                      ${isCurrent ? 'bg-primary/20' : 'bg-primary/10'}
                    `}>
                      <Check className="w-3 h-3 text-primary font-bold" />
                    </div>
                    <span className="flex-1 leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button - Always at bottom */}
              <div className="space-y-2 pt-4">
                <Button
                  className={`w-full h-11 ${isCurrent ? '' : isUpgrade ? 'shadow-md hover:shadow-lg' : ''}`}
                  variant={isCurrent ? 'outline' : isUpgrade ? 'default' : 'outline'}
                  disabled={isCurrent || isUpgrading || (isDowngrade && cancellationPending)}
                  onClick={() => onUpgrade(plan)}
                >
                  {isCurrent ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t('subscription.plans.currentPlan')}
                    </>
                  ) : plan.id === 'enterprise' ? (
                    <>
                      {t('subscription.plans.contactUs')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : isUpgrade ? (
                    <>
                      {t('subscription.plans.upgradeTo', { plan: plan.name })}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : isDowngrade && cancellationPending ? (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('subscription.planCard.scheduledCancellation')}
                    </>
                  ) : isDowngrade ? (
                    t('subscription.plans.downgrade')
                  ) : (
                    <>
                      {t('subscription.plans.choosePlan')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {isDowngrade && !isCurrent && cancellationPending && subscriptionCurrentPeriodEnd && (
                  <p className="text-xs text-center text-orange-600 font-medium">
                    {t('subscription.planCard.planChangeOn')} {new Date(subscriptionCurrentPeriodEnd).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                  </p>
                )}
                {isDowngrade && !isCurrent && !cancellationPending && (
                  <p className="text-xs text-center text-muted-foreground">
                    {t('subscription.plans.downgradeNote')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
