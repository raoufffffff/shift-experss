import { useState, useEffect } from 'react'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@shared/types'
import { formatCurrency } from '@shared/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { CreditCard, Shield, Lock, Check, Loader2, AlertCircle, ArrowRight, User, MapPin, Edit2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

// Initialize Stripe with publishable key
const stripeMode = (import.meta.env.VITE_STRIPE_MODE || 'test') as 'test' | 'prod'
const stripeKey = stripeMode === 'prod'
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST

const stripePromise = loadStripe(stripeKey || '')

interface InlineCheckoutProps {
    isOpen: boolean
    onClose: () => void
    plan: SubscriptionPlan
    interval: 'monthly' | 'yearly'
    onSuccess: () => void
}

interface BillingDetails {
    firstName: string
    lastName: string
    address: string
    city: string
    postalCode: string
    country: string
}

// Card Element styling - Premium Look
const cardElementOptions = {
    style: {
        base: {
            fontSize: '16px',
            color: '#fff', // White text for credit card look
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSmoothing: 'antialiased',
            '::placeholder': {
                color: 'rgba(255, 255, 255, 0.5)',
            },
            iconColor: '#fff',
        },
        invalid: {
            color: '#ff8a8a',
            iconColor: '#ff8a8a',
        },
    },
    hidePostalCode: true, // We collect it separately
}

// Checkout Form Component (inside Elements provider)
function CheckoutForm({ plan, interval, onSuccess, onClose }: Omit<InlineCheckoutProps, 'isOpen'>) {
    const { t } = useTranslation()
    const stripe = useStripe()
    const elements = useElements()
    const { user } = useAuthStore()

    const [step, setStep] = useState<'billing' | 'payment' | 'processing' | 'success'>('billing')
    const [isProcessing, setIsProcessing] = useState(false)
    const [cardError, setCardError] = useState<string | null>(null)

    // Billing State
    const [billingDetails, setBillingDetails] = useState<BillingDetails>({
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        postalCode: '',
        country: 'FR', // Default to France
    })

    // Pre-fill from user profile
    useEffect(() => {
        if (user) {
            setBillingDetails(prev => ({
                ...prev,
                firstName: user.first_name || '',
                lastName: user.last_name || '',
            }))
        }
    }, [user])

    const planDetails = SUBSCRIPTION_PLANS[plan]
    const price = interval === 'yearly' ? planDetails.price_yearly : planDetails.price_monthly

    // Step 1: Create subscription intent (get clientSecret)
    const createIntentMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('create-subscription-intent', {
                body: { plan, interval },
            })
            if (error) throw error
            return data
        },
    })

    // Step 2: Confirm subscription with payment method
    const confirmSubscriptionMutation = useMutation({
        mutationFn: async (paymentMethodId: string) => {
            const intentData = createIntentMutation.data
            const { data, error } = await supabase.functions.invoke('confirm-subscription', {
                body: {
                    paymentMethodId,
                    plan,
                    interval,
                    priceId: intentData.priceId,
                },
            })
            if (error) throw error
            return data
        },
    })

    const handleBillingSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Simple validation
        if (!billingDetails.firstName || !billingDetails.lastName || !billingDetails.address || !billingDetails.city || !billingDetails.postalCode) {
            toast.error(t('common.fillAllFields'))
            return
        }
        setStep('payment')
    }

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) {
            return
        }

        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
            return
        }

        setIsProcessing(true)
        setCardError(null)

        try {
            // Step 1: Get the SetupIntent client secret
            logger.log('Step 1: Creating subscription intent...')
            const intentData = await createIntentMutation.mutateAsync()

            if (!intentData?.clientSecret) {
                throw new Error('Failed to create subscription intent')
            }

            // Step 2: Confirm the SetupIntent with card details AND billing info
            logger.log('Step 2: Confirming SetupIntent...')
            const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(
                intentData.clientSecret,
                {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            name: `${billingDetails.firstName} ${billingDetails.lastName}`,
                            email: user?.email,
                            address: {
                                line1: billingDetails.address,
                                city: billingDetails.city,
                                postal_code: billingDetails.postalCode,
                                country: billingDetails.country,
                            },
                        },
                    },
                }
            )

            if (confirmError) {
                throw new Error(confirmError.message)
            }

            if (!setupIntent?.payment_method) {
                throw new Error('Payment method not created')
            }

            // After confirmCardSetup, we can switch to processing screen as elements are no longer needed
            setStep('processing')

            // Step 3: Create the subscription with the payment method
            logger.log('Step 3: Creating subscription...')
            const subscriptionResult = await confirmSubscriptionMutation.mutateAsync(
                setupIntent.payment_method as string
            )

            // Handle 3D Secure if required
            if (subscriptionResult.requiresAction && subscriptionResult.clientSecret) {
                logger.log('Step 4: Handling 3D Secure...')
                const { error: actionError } = await stripe.confirmCardPayment(
                    subscriptionResult.clientSecret
                )
                if (actionError) {
                    throw new Error(actionError.message)
                }
            }

            // Success!
            setStep('success')
            logger.log('Subscription created successfully!')

            setTimeout(() => {
                toast.success(t('subscription.subscribed'))
                onSuccess()
            }, 1500)

        } catch (error: unknown) {
            logger.error('Checkout error:', error instanceof Error ? error : String(error))

            let errorMessage = error instanceof Error ? error.message : t('subscription.errors.paymentFailed')

            // Try to extract a more detailed error message from the response body if available
            // @supabase/supabase-js FunctionsHttpError context is a Response object
            const errWithContext = error as { context?: { json?: () => Promise<{ message?: string; error?: string }> } }
            if (errWithContext.context && typeof errWithContext.context.json === 'function') {
                try {
                    const errorDetails = await errWithContext.context.json()
                    if (errorDetails.message) {
                        errorMessage = errorDetails.message
                    } else if (errorDetails.error) {
                        errorMessage = errorDetails.error
                    }
                } catch (_e) {
                    // Ignore parsing errors
                }
            }

            setCardError(errorMessage)
            setStep('payment') // Go back to payment step on error
        } finally {
            setIsProcessing(false)
        }
    }

    // --- RENDER STEPS ---

    if (step === 'success') {
        return (
            <div className="text-center py-12 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                    <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                    {t('subscription.inlineCheckout.success.title')}
                </h3>
                <p className="text-muted-foreground text-lg mb-8 max-w-xs mx-auto">
                    {t('subscription.inlineCheckout.success.description')}
                </p>
            </div>
        )
    }

    if (step === 'processing') {
        return (
            <div className="text-center py-16 animate-in fade-in zoom-in duration-300">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                    {t('subscription.inlineCheckout.processing.title')}
                </h3>
                <p className="text-muted-foreground">
                    {t('subscription.inlineCheckout.processing.description')}
                </p>
            </div>
        )
    }

    if (step === 'billing') {
        return (
            <form onSubmit={handleBillingSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                {/* Price Summary */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <span className="font-semibold text-foreground">{planDetails.name}</span>
                            <span className="text-muted-foreground ml-2">
                                ({interval === 'yearly' ? t('subscription.billingCycle.yearly') : t('subscription.billingCycle.monthly')})
                            </span>
                        </div>
                        <span className="text-xl font-bold text-primary">{formatCurrency(price)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        {t('subscription.inlineCheckout.cancellableAnytime')}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label={t('subscription.inlineCheckout.billing.firstName')}
                        value={billingDetails.firstName}
                        onChange={(e) => setBillingDetails({ ...billingDetails, firstName: e.target.value })}
                        placeholder={t('subscription.inlineCheckout.billing.firstNamePlaceholder')}
                        required
                        className="bg-muted/50"
                    />
                    <Input
                        label={t('subscription.inlineCheckout.billing.lastName')}
                        value={billingDetails.lastName}
                        onChange={(e) => setBillingDetails({ ...billingDetails, lastName: e.target.value })}
                        placeholder={t('subscription.inlineCheckout.billing.lastNamePlaceholder')}
                        required
                        className="bg-muted/50"
                    />
                </div>

                <Input
                    label={t('subscription.inlineCheckout.billing.address')}
                    value={billingDetails.address}
                    onChange={(e) => setBillingDetails({ ...billingDetails, address: e.target.value })}
                    placeholder={t('subscription.inlineCheckout.billing.addressPlaceholder')}
                    required
                    className="bg-muted/50"
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label={t('subscription.inlineCheckout.billing.city')}
                        value={billingDetails.city}
                        onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
                        placeholder={t('subscription.inlineCheckout.billing.cityPlaceholder')}
                        required
                        className="bg-muted/50"
                    />
                    <Input
                        label={t('subscription.inlineCheckout.billing.postalCode')}
                        value={billingDetails.postalCode}
                        onChange={(e) => setBillingDetails({ ...billingDetails, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                        placeholder={t('subscription.inlineCheckout.billing.postalCodePlaceholder')}
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={5}
                        className="bg-muted/50"
                    />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg flex items-start gap-3 text-sm text-blue-700 dark:text-blue-300">
                    <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{t('subscription.inlineCheckout.payment.secureNote')}</p>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="w-1/3">
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" className="w-2/3 group">
                        {t('subscription.inlineCheckout.billing.next')}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </form>
        )
    }

    // Payment Step with "Card" design
    return (
        <form onSubmit={handlePaymentSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">

            {/* Recap Section */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-medium text-foreground flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {billingDetails.firstName} {billingDetails.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground ml-6">
                            {billingDetails.address}, {billingDetails.city}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs hover:bg-muted"
                        onClick={() => setStep('billing')}
                    >
                        <Edit2 className="w-3 h-3 mr-1" />
                        {t('subscription.inlineCheckout.payment.changeInfo')}
                    </Button>
                </div>

                <div className="h-px bg-border/50" />

                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t('subscription.inlineCheckout.payment.totalDue')} ({planDetails.name})</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(price)}</span>
                </div>
            </div>

            {/* Credit Card Box - Visual Design */}
            <div className="relative group">
                {/* Blue Shadow/Glow */}
                <div
                    className="absolute inset-0 rounded-xl shadow-lg -rotate-1 opacity-60 blur-sm group-hover:rotate-0 transition-transform duration-500"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                ></div>

                {/* Blue Card Body */}
                <div
                    className="relative border border-white/10 rounded-xl p-6 shadow-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}
                >

                    {/* Card Decorations - Subtle sheen */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>

                    <div className="flex justify-between items-center mb-8">
                        <div className="text-white/80 font-mono text-xs tracking-widest uppercase font-semibold">
                            Credit Card
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center justify-center">
                                <div className="w-5 h-5 bg-red-500/80 rounded-full -mr-2 mix-blend-screen"></div>
                                <div className="w-5 h-5 bg-yellow-500/80 rounded-full mix-blend-screen"></div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-white/60 text-xs font-bold mb-2 uppercase tracking-wider pl-1">
                            {t('subscription.inlineCheckout.cardDetails')}
                        </label>
                        <div className="p-3 bg-black/20 rounded-lg border border-white/5 backdrop-blur-sm transition-all focus-within:bg-black/30 focus-within:ring-1 focus-within:ring-white/20">
                            <CardElement options={cardElementOptions} />
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1 font-semibold">Card Holder</div>
                            <div className="text-white font-bold text-sm tracking-wide truncate max-w-[150px]">
                                {billingDetails.firstName} {billingDetails.lastName}
                            </div>
                        </div>
                        <div className="text-white/80 font-mono text-sm font-medium">
                            *** ***
                        </div>
                    </div>

                </div>
            </div>

            {cardError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-200 dark:border-red-900/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {cardError}
                </div>
            )}

            {/* Security Footer */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pb-2">
                <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{t('subscription.inlineCheckout.security.encrypted')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t('subscription.inlineCheckout.security.secure')}</span>
                </div>
            </div>

            {/* Pay Button */}
            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep('billing')}
                    disabled={isProcessing}
                >
                    {t('common.back')}
                </Button>
                <Button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="flex-1 h-12 text-lg shadow-lg shadow-primary/20"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {t('subscription.inlineCheckout.processing.button')}
                        </>
                    ) : (
                        <>
                            {t('subscription.inlineCheckout.payButton', { amount: formatCurrency(price) })}
                        </>
                    )}
                </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
                {t('subscription.inlineCheckout.terms')}
            </p>

        </form>
    )
}

// Main Component with Elements Provider
export function InlineCheckout({ isOpen, onClose, plan, interval, onSuccess }: InlineCheckoutProps) {
    const { t } = useTranslation()

    // Use variables for Elements styling to match theme
    const elementsOptions: StripeElementsOptions = {
        locale: 'auto',
        appearance: {
            theme: 'stripe', // We customize the card element manually, but this sets defaults
            variables: {
                colorPrimary: '#6366f1',
            },
        },
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg p-6 overflow-hidden">
                <DialogHeader className="mb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {t('subscription.inlineCheckout.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('subscription.inlineCheckout.description')}
                    </DialogDescription>
                </DialogHeader>

                <Elements stripe={stripePromise} options={elementsOptions}>
                    <CheckoutForm
                        plan={plan}
                        interval={interval}
                        onSuccess={onSuccess}
                        onClose={onClose}
                    />
                </Elements>
            </DialogContent>
        </Dialog>
    )
}
