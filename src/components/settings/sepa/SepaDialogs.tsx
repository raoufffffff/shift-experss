import { useTranslation } from 'react-i18next'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/Button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog'
import { Loader2 } from 'lucide-react'
import { SepaSetupForm } from './SepaSetupForm'
import type { UseMutationResult } from '@tanstack/react-query'

// Initialize Stripe - pick key based on VITE_STRIPE_MODE
const getStripeKey = () => {
    const mode = import.meta.env.VITE_STRIPE_MODE;
    const testKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST;
    const prodKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

    console.log('[Stripe Init] Mode:', mode);

    if (mode === 'test' || import.meta.env.DEV) {
        console.log('[Stripe Init] Using TEST key');
        return testKey;
    }

    console.log('[Stripe Init] Using PROD key');
    return testKey;
};

const stripePromise = loadStripe(getStripeKey() || '')

interface SepaDialogsProps {
    isDialogOpen: boolean
    setIsDialogOpen: (open: boolean) => void
    clientSecret: string | null
    handleSetupSuccess: () => void
    isRemoveDialogOpen: boolean
    setIsRemoveDialogOpen: (open: boolean) => void
    removeMutation: UseMutationResult<void, unknown, void, unknown>
}

export function SepaDialogs({
    isDialogOpen,
    setIsDialogOpen,
    clientSecret,
    handleSetupSuccess,
    isRemoveDialogOpen,
    setIsRemoveDialogOpen,
    removeMutation,
}: SepaDialogsProps) {
    const { t } = useTranslation()

    return (
        <>
            {/* SEPA Setup Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('settings.sepa.dialogTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.sepa.dialogDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    {clientSecret && (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                            <SepaSetupForm
                                clientSecret={clientSecret}
                                onSuccess={handleSetupSuccess}
                                onCancel={() => setIsDialogOpen(false)}
                            />
                        </Elements>
                    )}
                </DialogContent>
            </Dialog>

            {/* Remove Confirmation Dialog */}
            <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('settings.sepa.removeTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.sepa.removeDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => removeMutation.mutate()}
                            disabled={removeMutation.isPending}
                        >
                            {removeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t('settings.sepa.remove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
