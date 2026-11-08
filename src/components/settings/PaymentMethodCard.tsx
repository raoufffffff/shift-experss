import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { CreditCard } from 'lucide-react'
import { useSepaSetup } from './sepa/useSepaSetup'
import { SepaCardContent } from './sepa/SepaStatusDisplay'
import { SepaDialogs } from './sepa/SepaDialogs'

export function PaymentMethodCard() {
    const { t } = useTranslation()
    const { company } = useAuthStore()

    const {
        sepaStatus,
        isLoading: isSepaLoading,
        hasActiveShifts,
        setupMutation,
        removeMutation,
        isDialogOpen,
        setIsDialogOpen,
        clientSecret,
        isRemoveDialogOpen,
        setIsRemoveDialogOpen,
        handleSetupSuccess,
        handleOpenSetup,
    } = useSepaSetup()

    // فتح إعداد الـ SEPA تلقائياً إذا لم يكن مهيأ بعد
    useEffect(() => {
        if (company?.id && !isSepaLoading && sepaStatus && !sepaStatus.configured && !setupMutation.isPending) {
            // اختياري: شّغلها فقط إذا تحب تفتح النافذة تلقائياً عند أول زيارة
            // handleOpenSetup()
        }
    }, [company?.id, isSepaLoading, sepaStatus])

    if (isSepaLoading) {
        return (
            <Card>
                <CardContent className="py-8 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 animate-pulse text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        <CardTitle className="text-base">
                            {t('settings.paymentMethod.title', { defaultValue: 'Mode de paiement' })}
                        </CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                        {t('settings.paymentMethod.sepaDescription', {
                            defaultValue: 'Le montant est prélevé automatiquement sur votre compte bancaire à chaque validation de mission.'
                        })}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SepaCardContent
                        sepaStatus={sepaStatus}
                        hasActiveShifts={hasActiveShifts}
                        setupMutationIsPending={setupMutation.isPending}
                        showConfigureButton={true}
                        onOpenSetup={handleOpenSetup}
                        onOpenRemoveDialog={() => setIsRemoveDialogOpen(true)}
                    />
                </CardContent>
            </Card>

            <SepaDialogs
                isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
                clientSecret={clientSecret}
                handleSetupSuccess={handleSetupSuccess}
                isRemoveDialogOpen={isRemoveDialogOpen}
                setIsRemoveDialogOpen={setIsRemoveDialogOpen}
                removeMutation={removeMutation}
            />
        </>
    )
}