import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
    Building2,
    CreditCard,
    CheckCircle2,
    Loader2,
    Settings,
} from 'lucide-react'
import { useLocale } from '@/hooks/useLocale'
import { useSepaSetup } from './sepa/useSepaSetup'
import { SepaStatusBadge, SepaCardContent } from './sepa/SepaStatusDisplay'
import { SepaDialogs } from './sepa/SepaDialogs'

interface SepaSetupCardProps {
    variant?: 'card' | 'compact' | 'trigger' | 'banner'
    showConfigureButton?: boolean
    className?: string
}

export function SepaSetupCard({
    variant = 'card',
    showConfigureButton = true,
    className
}: SepaSetupCardProps) {
    const { t } = useTranslation()
    const { navigate } = useLocale()
    const {
        sepaStatus,
        isLoading,
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

    const dialogs = (
        <SepaDialogs
            isDialogOpen={isDialogOpen}
            setIsDialogOpen={setIsDialogOpen}
            clientSecret={clientSecret}
            handleSetupSuccess={handleSetupSuccess}
            isRemoveDialogOpen={isRemoveDialogOpen}
            setIsRemoveDialogOpen={setIsRemoveDialogOpen}
            removeMutation={removeMutation}
        />
    )

    if (isLoading) return null
    // RENDER: TRIGGER ONLY (For Header)
    if (variant === 'trigger') {
        return (
            <>
                <div className={className}>
                    {sepaStatus?.configured ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-background border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30"
                            onClick={() => setIsRemoveDialogOpen(true)}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                            <span className="hidden sm:inline">SEPA {sepaStatus.ibanLast4}</span>
                            <span className="sm:hidden">SEPA</span>
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-primary/5 border-primary/20 hover:bg-primary/10"
                            onClick={handleOpenSetup}
                            disabled={setupMutation.isPending}
                        >
                            {setupMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CreditCard className="w-4 h-4 mr-2" />
                            )}
                            {t('settings.sepa.configure')}
                        </Button>
                    )}
                </div>
                {dialogs}
            </>
        )
    }
    // RENDER: BANNER (For Onboarding)
    if (variant === 'banner') {
        if (sepaStatus?.configured) return null
        return (
            <>
                <div className={`relative overflow-hidden rounded-xl border-2 border-primary/20 bg-primary/5 p-6 mb-6 ${className}`}>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-lg font-bold text-primary mb-1">
                                {t('settings.sepa.noConfigTitle')}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-2xl">
                                {t('settings.sepa.noConfigDescription')}
                            </p>
                        </div>
                        <Button
                            onClick={handleOpenSetup}
                            disabled={setupMutation.isPending}
                            className="w-full md:w-auto px-8"
                            size="lg"
                        >
                            {setupMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <CreditCard className="w-4 h-4 mr-2" />
                            )}
                            {t('settings.sepa.configure')}
                        </Button>
                    </div>
                </div>
                {dialogs}
            </>
        )
    }
    // RENDER: COMPACT
    if (variant === 'compact') {
        return (
            <>
                <div className={`flex items-center justify-between ${className}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="font-medium text-sm">
                                {sepaStatus?.configured
                                    ? `SEPA •••• ${sepaStatus.ibanLast4}`
                                    : t('settings.sepa.notConfigured')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {t('settings.sepa.description')}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <SepaStatusBadge sepaStatus={sepaStatus} />
                        {showConfigureButton && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/settings')}
                            >
                                <Settings className="w-4 h-4 mr-1" />
                                {t('settings.sepa.manage')}
                            </Button>
                        )}
                    </div>
                </div>
                {dialogs}
            </>
        )
    }
    // DEFAULT RENDER: CARD
    return (
        <>
            <Card className={className}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-primary" />
                            <CardTitle className="text-base">{t('settings.sepa.title')}</CardTitle>
                        </div>
                        <SepaStatusBadge sepaStatus={sepaStatus} />
                    </div>
                    <CardDescription className="text-sm">
                        {t('settings.sepa.cardDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SepaCardContent
                        sepaStatus={sepaStatus}
                        hasActiveShifts={hasActiveShifts}
                        setupMutationIsPending={setupMutation.isPending}
                        showConfigureButton={showConfigureButton}
                        onOpenSetup={handleOpenSetup}
                        onOpenRemoveDialog={() => setIsRemoveDialogOpen(true)}
                    />
                </CardContent>
            </Card>
            {dialogs}
        </>
    )
}
