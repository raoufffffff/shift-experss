import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
    Building2,
    CreditCard,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Settings,
    Trash2,
} from 'lucide-react'
import type { SepaStatus } from './useSepaSetup'

interface SepaStatusBadgeProps {
    sepaStatus: SepaStatus | undefined
    showIcon?: boolean
}

export function SepaStatusBadge({ sepaStatus, showIcon = true }: SepaStatusBadgeProps) {
    const { t } = useTranslation()

    if (!sepaStatus?.configured) {
        return (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800">
                {showIcon && <AlertCircle className="w-3 h-3 mr-1" />}
                {t('settings.sepa.statusNotConfigured')}
            </Badge>
        )
    }

    if (sepaStatus.status === 'active') {
        return (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                {showIcon && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {t('settings.sepa.statusActive')}
            </Badge>
        )
    }

    return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800">
            {t('settings.sepa.statusPending')}
        </Badge>
    )
}

interface SepaCardContentProps {
    sepaStatus: SepaStatus | undefined
    hasActiveShifts: boolean
    setupMutationIsPending: boolean
    showConfigureButton: boolean
    onOpenSetup: () => void
    onOpenRemoveDialog: () => void
}

export function SepaCardContent({
    sepaStatus,
    hasActiveShifts,
    setupMutationIsPending,
    showConfigureButton,
    onOpenSetup,
    onOpenRemoveDialog,
}: SepaCardContentProps) {
    const { t } = useTranslation()

    if (sepaStatus?.configured) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 dark:bg-muted/20">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="font-medium text-sm">
                                IBAN •••• {sepaStatus.ibanLast4}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {sepaStatus.country && `${sepaStatus.country} • `}
                                {t('settings.sepa.configuredOn', {
                                    date: sepaStatus.configuredAt
                                        ? new Date(sepaStatus.configuredAt).toLocaleDateString()
                                        : '-',
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenSetup}
                            disabled={setupMutationIsPending || hasActiveShifts}
                            title={hasActiveShifts ? t('settings.sepa.cannotModifyActiveShifts') : t('settings.sepa.modify')}
                        >
                            {setupMutationIsPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Settings className="w-4 h-4 mr-1" />
                                    {t('settings.sepa.modify')}
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onOpenRemoveDialog}
                            disabled={hasActiveShifts}
                            className={cn(
                                "text-destructive hover:text-destructive",
                                hasActiveShifts && "opacity-50 cursor-not-allowed"
                            )}
                            title={hasActiveShifts ? t('settings.sepa.cannotDeleteActiveShifts') : t('settings.sepa.remove')}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {hasActiveShifts && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            {t('settings.sepa.activeShiftsWarning')}
                        </p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-dashed bg-muted/5">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                    <p className="text-sm font-medium">{t('settings.sepa.noConfigTitle')}</p>
                    <p className="text-xs text-muted-foreground">
                        {t('settings.sepa.noConfigDescription')}
                    </p>
                </div>
            </div>
            {showConfigureButton && (
                <Button
                    onClick={onOpenSetup}
                    disabled={setupMutationIsPending}
                    className="w-full"
                >
                    {setupMutationIsPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    {t('settings.sepa.configure')}
                </Button>
            )}
        </div>
    )
}
