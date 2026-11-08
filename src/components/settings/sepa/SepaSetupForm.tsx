import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    useStripe,
    useElements,
    IbanElement,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { DialogFooter } from '@/components/ui/Dialog'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface SepaSetupFormProps {
    clientSecret: string
    onSuccess: () => void
    onCancel: () => void
}

export function SepaSetupForm({
    clientSecret,
    onSuccess,
    onCancel,
}: SepaSetupFormProps) {
    const { t } = useTranslation()
    const { company } = useAuthStore()
    const stripe = useStripe()
    const elements = useElements()
    const [isLoading, setIsLoading] = useState(false)
    const [accountHolderName, setAccountHolderName] = useState('')
    const [email, setEmail] = useState('')
    const [mandateAccepted, setMandateAccepted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) {
            return
        }

        if (!company?.id) {
            toast.error(t('errors.generic'))
            return
        }

        const ibanElement = elements.getElement(IbanElement)
        if (!ibanElement) {
            toast.error(t('settings.sepa.errors.ibanRequired'))
            return
        }

        if (!accountHolderName.trim()) {
            toast.error(t('settings.sepa.errors.nameRequired'))
            return
        }

        if (!email.trim()) {
            toast.error(t('settings.sepa.errors.emailRequired'))
            return
        }

        setIsLoading(true)

        try {
            // Confirm the SetupIntent with the IBAN
            const { setupIntent, error } = await stripe.confirmSepaDebitSetup(clientSecret, {
                payment_method: {
                    sepa_debit: ibanElement,
                    billing_details: {
                        name: accountHolderName,
                        email: email,
                    },
                },
            })

            if (error) {
                console.error('[Stripe Error] Full Object:', error);
                toast.error(error.message || t('settings.sepa.errors.setupFailed'))
                setIsLoading(false)
                return
            }

            if (setupIntent?.payment_method) {
                // Save the payment method details to our database
                const { data, error: confirmError } = await supabase.functions.invoke(
                    'confirm-sepa-payment',
                    {
                        body: {
                            company_id: company.id,
                            payment_method_id: setupIntent.payment_method,
                            setup_intent_id: setupIntent.id,
                        },
                    },
                )

                if (confirmError) throw new Error(confirmError.message)
                if (data?.error) throw new Error(data.error)

                toast.success(t('settings.sepa.success'))
                onSuccess()
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t('settings.sepa.errors.setupFailed'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="accountHolderName">{t('settings.sepa.accountHolderName')}</Label>
                <Input
                    id="accountHolderName"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder={t('settings.sepa.accountHolderNamePlaceholder')}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">{t('settings.sepa.email')}</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('settings.sepa.emailPlaceholder')}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label>{t('settings.sepa.iban')}</Label>
                <div className="p-3 border rounded-md bg-background">
                    <IbanElement
                        options={{
                            supportedCountries: ['SEPA'],
                            placeholderCountry: 'FR',
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: 'hsl(var(--foreground))',
                                    '::placeholder': {
                                        color: 'hsl(var(--muted-foreground))',
                                    },
                                },
                                invalid: {
                                    color: 'hsl(var(--destructive))',
                                },
                            },
                        }}
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    {t('settings.sepa.ibanHint')}
                </p>
            </div>

            <Separator />

            <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-xs text-muted-foreground">
                    {t('settings.sepa.mandate')}
                </p>
            </div>

            <div className="flex items-start gap-2">
                <input
                    type="checkbox"
                    id="mandate-accept"
                    checked={mandateAccepted}
                    onChange={(e) => setMandateAccepted(e.target.checked)}
                    className="mt-1"
                />
                <label htmlFor="mandate-accept" className="text-xs text-muted-foreground">
                    {t('settings.sepa.mandateAccept')}
                </label>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isLoading || !stripe || !mandateAccepted}>
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t('settings.sepa.configure')}
                </Button>
            </DialogFooter>
        </form>
    )
}