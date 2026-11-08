import { useState, useEffect, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan, type StripeMode } from '@shared/types'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { handleSupabaseError } from '@/lib/error-handler'
import { Crown, Zap, Sparkles, Star } from 'lucide-react'
import { createElement } from 'react'

export function useSubscriptionData() {
  const { t, i18n } = useTranslation()
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()

  // Get Stripe mode from environment
  const stripeMode = (import.meta.env.VITE_STRIPE_MODE || 'test') as StripeMode

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(0)
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false)
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlan | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isSubscriptionExpanded, setIsSubscriptionExpanded] = useState(true)
  const [cancelStep, setCancelStep] = useState(0)
  const [inlineCheckoutOpen, setInlineCheckoutOpen] = useState(false)
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SubscriptionPlan | null>(null)

  // Fetch current subscription details
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription', company?.id],
    queryFn: async () => {
      if (!company?.id) return null

      // SELECT optimise : seulement les colonnes necessaires pour la gestion de l'abonnement
      const { data } = await supabase
        .from('companies')
        .select('id, name, logo_url, subscription_plan, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, created_at, updated_at, cancel_at_period_end, subscription_current_period_end, subscription_interval')
        .eq('id', company.id)
        .single()

      return data
    },
    enabled: !!company?.id,
  })

  // Setup realtime subscription for company changes (subscription plan, cancel_at_period_end)
  useEffect(() => {
    if (!company?.id) return

    const channel = supabase
      .channel(`subscription_${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${company.id}`,
        },
        (payload) => {
          logger.log('Company subscription updated (realtime):', payload)
          // Invalider le cache pour forcer un refetch
          queryClient.invalidateQueries({ queryKey: ['subscription', company.id] })

          // Mettre a jour le store authStore aussi pour que cancel_at_period_end soit a jour partout
          const newCompany = payload.new as typeof company
          useAuthStore.setState({ company: newCompany })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [company?.id, queryClient])

  const plans = Object.values(SUBSCRIPTION_PLANS)
  const currentPlan = company?.subscription_plan || 'free'
  const subscription = subscriptionData

  // Debug: Log subscription data
  useEffect(() => {
    if (subscription) {
      logger.log('Subscription data:', {
        subscription_status: subscription.subscription_status,
        subscription_current_period_end: subscription.subscription_current_period_end,
        subscription_interval: subscription.subscription_interval,
        stripe_subscription_id: subscription.stripe_subscription_id,
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
    }
  }, [subscription])

  // Create Stripe checkout session
  const createCheckoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: string }) => {
      // Step 1: Connecting to payment system
      setCheckoutStep(1)

      // Step 2: Creating checkout session
      setCheckoutStep(2)
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan, interval },
      })

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'SubscriptionPage',
          operation: 'query'
        });
        throw new Error(message);
      }

      // Step 3: Preparing secure checkout
      setCheckoutStep(3)

      return data
    },
    onSuccess: (data) => {
      // Step 4: Redirecting to payment
      setCheckoutStep(4)
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error) => {
      logger.error('Checkout error:', error)
      toast.error(t('subscription.errors.checkoutError'))
      setIsUpgrading(false)
      setCheckoutStep(0)
    },
  })

  // Mutation pour changer de plan directement (TEMPORAIRE - pour test)
  const changePlanMutation = useMutation({
    mutationFn: async (planId: SubscriptionPlan) => {
      if (!company?.id) throw new Error('No company found')

      // Changer le plan
      const { error } = await supabase
        .from('companies')
        .update({ subscription_plan: planId })
        .eq('id', company.id)

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'SubscriptionPage',
          operation: 'query'
        });
        throw new Error(message);
      }
      // Si c'est un upgrade, reactiver les etablissements en standby selon les nouvelles limites
      const plans = Object.values(SUBSCRIPTION_PLANS)
      const currentPlanIndex = plans.findIndex(p => p.id === currentPlan)
      const targetPlanIndex = plans.findIndex(p => p.id === planId)
      const isUpgrade = targetPlanIndex > currentPlanIndex

      if (isUpgrade) {
        const newPlan = plans[targetPlanIndex]
        const maxEstablishments = newPlan.max_establishments

        // Recuperer les etablissements en standby
        const { data: standbyEstabs } = await supabase
          .from('establishments')
          .select('id')
          .eq('company_id', company.id)
          .eq('status', 'standby')
          .order('created_at', { ascending: true })

        if (standbyEstabs && standbyEstabs.length > 0) {
          // Compter les etablissements actifs
          const { count: activeCount } = await supabase
            .from('establishments')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('status', 'active')

          const remainingSlots = maxEstablishments - (activeCount || 0)

          if (remainingSlots > 0) {
            // Reactiver autant d'etablissements que possible
            const toReactivate = standbyEstabs.slice(0, remainingSlots).map(e => e.id)

            await supabase
              .from('establishments')
              .update({ status: 'active' })
              .in('id', toReactivate)
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(t('subscription.success.planChanged'))
      window.location.reload()
    },
    onError: (error) => {
      toast.error(t('subscription.errors.planChangeError'))
      logger.error(error)
    },
  })

  // Mutation pour reactiver l'abonnement (annuler l'annulation)
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('reactivate-subscription')
      if (error) {
        const message = handleSupabaseError(error, {
          context: 'SubscriptionPage',
          operation: 'query'
        });
        throw new Error(message);
      }
      return data
    },
    onSuccess: () => {
      toast.success(t('subscription.success.reactivated'))
      setTimeout(() => window.location.reload(), 1500)
    },
    onError: (error: Error) => {
      toast.error(error.message || t('subscription.errors.reactivationError'))
    },
  })

  // Mutation pour annuler l'abonnement (cancel at period end)
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Preparing
      setCancelStep(1)
      await new Promise(resolve => setTimeout(resolve, 800))

      // Step 2: Contacting Stripe
      setCancelStep(2)
      await new Promise(resolve => setTimeout(resolve, 400))

      // Step 3: Cancelling
      setCancelStep(3)
      const { data, error } = await supabase.functions.invoke('cancel-subscription')
      if (error) {
        setCancelStep(0)
        const message = handleSupabaseError(error, {
          context: 'SubscriptionPage',
          operation: 'query'
        });
        throw new Error(message);
      }

      // Step 4: Finalizing
      setCancelStep(4)
      await new Promise(resolve => setTimeout(resolve, 600))

      return data
    },
    onSuccess: (data) => {
      setCancelStep(5) // Completed
      const cancelDate = data?.cancel_at || data?.current_period_end
      const dateStr = cancelDate ? new Date(cancelDate).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US') : t('subscription.fallbacks.endOfPeriod')
      toast.success(
        t('subscription.success.cancelled', { date: dateStr }),
        { duration: 8000 }
      )
      setTimeout(() => {
        setShowCancelModal(false)
        setCancelStep(0)
      }, 1500)
      // Reload pour mettre a jour l'affichage
      setTimeout(() => window.location.reload(), 3000)
    },
    onError: (error: Error) => {
      setCancelStep(0)
      toast.error(error.message || t('subscription.errors.cancellationError'))
    },
  })

  // Mutation pour ouvrir le portail de facturation Stripe
  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-billing-portal', {
        body: { return_url: window.location.href },
      })
      if (error) {
        const message = handleSupabaseError(error, {
          context: 'SubscriptionPage',
          operation: 'query'
        });
        throw new Error(message);
      }
      return data
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t('subscription.errors.billingPortalError'))
    },
  })

  const handleUpgrade = async (plan: typeof SUBSCRIPTION_PLANS[SubscriptionPlan]) => {
    if (plan.id === 'enterprise') {
      window.location.href = '/support'
      return
    }

    if (plan.id === currentPlan) return

    // Verifier si c'est un downgrade
    const plans = Object.values(SUBSCRIPTION_PLANS)
    const currentPlanIndex = plans.findIndex(p => p.id === currentPlan)
    const targetPlanIndex = plans.findIndex(p => p.id === plan.id)
    const isDowngrade = currentPlanIndex > targetPlanIndex

    if (isDowngrade) {
      // Ouvrir la modal de downgrade
      setTargetPlan(plan.id)
      setDowngradeModalOpen(true)
      return
    }

    // VERSION IN-APP (checkout inline sans redirection)
    setSelectedPlanForCheckout(plan.id)
    setInlineCheckoutOpen(true)
  }

  // Helper functions
  const getPlanIcon = (planId: string): ReactNode => {
    switch (planId) {
      case 'free':
        return createElement(Star, { className: 'w-5 h-5' })
      case 'starter':
        return createElement(Zap, { className: 'w-5 h-5' })
      case 'pro':
        return createElement(Crown, { className: 'w-5 h-5' })
      case 'enterprise':
        return createElement(Sparkles, { className: 'w-5 h-5' })
      default:
        return null
    }
  }

  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case 'starter':
        return { label: t('subscription.badges.recommended'), variant: 'default' as const }
      case 'pro':
        return { label: t('subscription.badges.popular'), variant: 'default' as const }
      default:
        return null
    }
  }

  const getTrialDaysLeft = () => {
    if (!subscription?.trial_ends_at) return null
    const daysLeft = Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft > 0 ? daysLeft : null
  }

  const trialDaysLeft = getTrialDaysLeft()

  // Calculate next billing amount
  const getNextBillingAmount = () => {
    if (!subscription?.stripe_subscription_id) return null
    const plan = SUBSCRIPTION_PLANS[currentPlan as SubscriptionPlan]
    if (!plan) return null

    const isYearly = subscription.subscription_interval === 'year'
    return isYearly ? plan.price_yearly : plan.price_monthly
  }

  const nextBillingAmount = getNextBillingAmount()

  return {
    // Data
    company,
    user,
    subscription,
    plans,
    currentPlan,
    trialDaysLeft,
    nextBillingAmount,
    stripeMode,
    i18n,
    t,

    // State
    billingCycle,
    setBillingCycle,
    isUpgrading,
    setIsUpgrading,
    checkoutStep,
    setCheckoutStep,
    downgradeModalOpen,
    setDowngradeModalOpen,
    targetPlan,
    setTargetPlan,
    showCancelModal,
    setShowCancelModal,
    isSubscriptionExpanded,
    setIsSubscriptionExpanded,
    cancelStep,
    setCancelStep,
    inlineCheckoutOpen,
    setInlineCheckoutOpen,
    selectedPlanForCheckout,
    setSelectedPlanForCheckout,

    // Mutations
    createCheckoutMutation,
    changePlanMutation,
    reactivateMutation,
    cancelSubscriptionMutation,
    billingPortalMutation,

    // Handlers
    handleUpgrade,

    // Helpers
    getPlanIcon,
    getPlanBadge,

    // Query client (for inline checkout success callback)
    queryClient,
  }
}
