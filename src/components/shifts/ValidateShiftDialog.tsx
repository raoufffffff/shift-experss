import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/Dialog'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Banknote, Loader2, AlertTriangle, CheckCircle2, Info, Building2, Settings } from 'lucide-react'
import { WireTransferConfirmation } from './WireTransferConfirmation'
import { DEFAULT_PLATFORM_FEE_RATE } from '@shift-express/shared'

interface ValidateShiftProps {
    id: string
    start_time: string
    end_time: string
    actual_start_time?: string | null
    actual_end_time?: string | null
    break_duration_minutes: number
    actual_break_duration_minutes?: number | null
    freelance_hourly_rate?: number | null
    platform_fee_rate?: number | null
    applications?: { status: string }[]
}

interface ValidateShiftDialogProps {
    shift: ValidateShiftProps | null
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

// Validation constants
const MIN_SHIFT_AMOUNT = 0.5
const MAX_SHIFT_AMOUNT = 10000

interface ValidationResult {
    isValid: boolean
    errors: string[]
    warnings: string[]
}

function generateReference(): string {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(3)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    return `PAY-${hex}`
}

type PaymentMethod = 'sepa' | 'wire'

export function ValidateShiftDialog({ shift, isOpen, onClose, onSuccess }: ValidateShiftDialogProps) {
    const { t } = useTranslation()
    const { company, user } = useAuthStore()
    const queryClient = useQueryClient()
    const [isProcessing, setIsProcessing] = useState(false)
    const [step, setStep] = useState<'form' | 'processing' | 'wire_confirmation'>('form')
    const [wireReference, setWireReference] = useState<string | null>(null)
    const [processingStep, setProcessingStep] = useState(0)
    // 1. Fetch company payment preference + SEPA status
    const { data: companyPayment, isLoading: isPaymentLoading } = useQuery({
        queryKey: ['company-payment-config', company?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('companies')
                .select('preferred_payment_method, sepa_payment_method_id, sepa_iban_last4, sepa_status' as never)
                .eq('id', company?.id ?? '')
                .single()
            if (error) throw error
            return data as unknown as {
                preferred_payment_method: string | null
                sepa_payment_method_id: string | null
                sepa_iban_last4: string | null
                sepa_status: string | null
            }
        },
        enabled: !!company?.id && isOpen,
    })

    const isSepaConfigured = !!companyPayment?.sepa_payment_method_id && companyPayment?.sepa_status === 'active'
    const savedPreference = companyPayment?.preferred_payment_method ?? null

    // Use saved preference, fallback to wire if SEPA not configured
    const effectivePaymentMethod: PaymentMethod =
        savedPreference === 'sepa' && isSepaConfigured ? 'sepa'
            : savedPreference === 'wire_transfer' ? 'wire'
                : isSepaConfigured ? 'sepa' : 'wire'

    // 2. Calculate Costs
    const costs = useMemo(() => {
        if (!shift) return { total: 0, durationHours: 0, hourlyRate: 0 }

        const start = new Date(shift.actual_start_time || shift.start_time)
        const end = new Date(shift.actual_end_time || shift.end_time)
        const breakMinutes = shift.actual_break_duration_minutes ?? shift.break_duration_minutes ?? 0

        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        const hourlyRate = shift.freelance_hourly_rate || 0
        const platformFeeRate = shift.platform_fee_rate ?? company?.platform_fee_rate ?? DEFAULT_PLATFORM_FEE_RATE

        const baseAmountPerFreelancer = Math.round(durationHours * hourlyRate * 100) / 100
        const amountWithCommissionPerFreelancer = Math.round(baseAmountPerFreelancer * (1 + platformFeeRate / 100) * 100) / 100

        const acceptedFreelancersCount = (shift.applications ?? []).filter((a) => a.status === 'accepted').length || 1
        const total = amountWithCommissionPerFreelancer * acceptedFreelancersCount
        const commissionTotal = total - (baseAmountPerFreelancer * acceptedFreelancersCount)

        return { total, durationHours, hourlyRate, acceptedFreelancersCount, commissionTotal, platformFeeRate }
    }, [shift, company])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    }

    // 3. Validation
    const validation = useMemo((): ValidationResult => {
        const errors: string[] = []
        const warnings: string[] = []

        if (costs.total < MIN_SHIFT_AMOUNT) {
            errors.push(t('shifts.validation.amountTooLow', {
                min: formatCurrency(MIN_SHIFT_AMOUNT),
                defaultValue: `Le montant minimum est de ${formatCurrency(MIN_SHIFT_AMOUNT)}`
            }))
        }

        if (costs.total > MAX_SHIFT_AMOUNT) {
            errors.push(t('shifts.validation.amountTooHigh', {
                max: formatCurrency(MAX_SHIFT_AMOUNT),
                defaultValue: `Le montant maximum est de ${formatCurrency(MAX_SHIFT_AMOUNT)}`
            }))
        }

        if (!costs.hourlyRate || costs.hourlyRate <= 0) {
            errors.push(t('shifts.validation.noHourlyRate', {
                defaultValue: 'Aucun taux horaire défini pour ce freelance'
            }))
        }

        if (costs.durationHours <= 0) {
            errors.push(t('shifts.validation.invalidDuration', {
                defaultValue: 'La durée du shift est invalide'
            }))
        }

        if (costs.durationHours > 12) {
            warnings.push(t('shifts.validation.longShiftWarning', {
                hours: costs.durationHours.toFixed(1),
                defaultValue: `Ce shift dure ${costs.durationHours.toFixed(1)}h - vérifiez que c'est correct`
            }))
        }

        return { isValid: errors.length === 0, errors, warnings }
    }, [costs, t])

    // Processing steps animation
    const processingSteps = [
        { label: 'Vérification du shift...', icon: '🔍' },
        { label: 'Connexion au système de paiement...', icon: '🔗' },
        { label: 'Traitement du prélèvement SEPA...', icon: '💳' },
        { label: 'Finalisation...', icon: '✅' },
    ]

    const runProcessingAnimation = async () => {
        setStep('processing')
        setProcessingStep(0)
        await new Promise(r => setTimeout(r, 800))
        setProcessingStep(1)
        await new Promise(r => setTimeout(r, 600))
        setProcessingStep(2)
    }

    // 4. SEPA Payment mutation
    const sepaMutation = useMutation({
        mutationFn: async () => {
            if (!validation.isValid) throw new Error(validation.errors[0])
            setIsProcessing(true)
            try {
                if (!shift) throw new Error('No shift selected')
                const response = await apiClient.post(`/api/stripe/shifts/${shift.id}/validate`)
                return response.data
            } finally {
                setIsProcessing(false)
            }
        },
        onSuccess: (data) => {
            setProcessingStep(3)
            setTimeout(() => {
                if (data.status === 'succeeded') {
                    toast.success(t('shifts.validation.success'), {
                        description: t('shifts.validation.sepaSuccess', {
                            amount: formatCurrency(costs.total),
                            defaultValue: `Prélèvement SEPA de ${formatCurrency(costs.total)} initié`
                        }),
                    })
                    queryClient.invalidateQueries({ queryKey: ['shift', shift?.id] })
                    queryClient.invalidateQueries({ queryKey: ['shifts'] })
                    onSuccess?.()
                    onClose()
                } else if (data.status === 'pending_approval') {
                    toast.info(t('shifts.validation.pendingApprovalTitle', { defaultValue: 'Approbation en attente' }), {
                        description: t('shifts.validation.pendingApprovalDescription', {
                            defaultValue: "Le freelance a été notifié de vos ajustements. Le paiement sera effectué dès qu'il les aura acceptés, ou automatiquement après 48h."
                        }),
                    })
                    queryClient.invalidateQueries({ queryKey: ['shift', shift?.id] })
                    queryClient.invalidateQueries({ queryKey: ['shifts'] })
                    onSuccess?.()
                    onClose()
                }
                setStep('form')
            }, 1000)
        },
        onError: (error: unknown) => {
            setStep('form')
            const err = error as { response?: { data?: { error?: string } }; message?: string }
            const errorMessage = err.response?.data?.error || err.message || t('shifts.validation.error')
            toast.error(t('shifts.validation.errorTitle', { defaultValue: 'Erreur de validation' }), {
                description: errorMessage,
            })
        }
    })

    // 5. Wire transfer mutation
    const wireTransferMutation = useMutation({
        mutationFn: async () => {
            if (!validation.isValid) throw new Error(validation.errors[0])
            if (!shift || !company?.id || !user?.id) throw new Error('Missing data')

            const reference = generateReference()

            const { error: ticketError } = await supabase
                .from('payment_tickets' as never)
                .insert({
                    reference,
                    shift_id: shift.id,
                    company_id: company.id,
                    requested_by: user.id,
                    amount: costs.total,
                } as never)

            if (ticketError) throw ticketError

            const { error: shiftError } = await supabase
                .from('shifts')
                .update({ status: 'pending_payment' as never, updated_at: new Date().toISOString() })
                .eq('id', shift.id)

            if (shiftError) throw shiftError

            return { reference }
        },
        onSuccess: (data) => {
            setWireReference(data.reference)
            setStep('wire_confirmation')
            queryClient.invalidateQueries({ queryKey: ['shift', shift?.id] })
            toast.success(t('shifts.wireTransfer.ticketCreated', { defaultValue: 'Ticket de paiement créé' }))
        },
        onError: (error: unknown) => {
            const err = error as { message?: string }
            toast.error(t('shifts.wireTransfer.error', { defaultValue: 'Erreur lors de la création du ticket' }), {
                description: err.message,
            })
        },
    })

    const handleClose = () => {
        onClose()
        setTimeout(() => {
            setStep('form')
            setWireReference(null)
        }, 200)
    }

    const handleConfirm = async () => {
        if (effectivePaymentMethod === 'sepa') {
            await runProcessingAnimation()
            sepaMutation.mutate()
        } else {
            wireTransferMutation.mutate()
        }
    }

    const isPending = isProcessing || wireTransferMutation.isPending || sepaMutation.isPending

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px]">
                {step === 'processing' ? (
                    <div className="py-12 px-4">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">Paiement en cours</h3>
                            <p className="text-sm text-muted-foreground mt-1">{formatCurrency(costs.total)}</p>
                        </div>
                        <div className="space-y-3 max-w-xs mx-auto">
                            {processingSteps.map((s, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-3 transition-all duration-500 ${
                                        i <= processingStep ? 'opacity-100' : 'opacity-20'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all duration-500 ${
                                        i < processingStep
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : i === processingStep
                                                ? 'bg-primary/10 text-primary ring-2 ring-primary/30 ring-offset-1'
                                                : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {i < processingStep ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : i === processingStep ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <span className="text-xs">{s.icon}</span>
                                        )}
                                    </div>
                                    <span className={`text-sm font-medium transition-colors duration-300 ${
                                        i < processingStep
                                            ? 'text-emerald-600'
                                            : i === processingStep
                                                ? 'text-foreground'
                                                : 'text-muted-foreground'
                                    }`}>
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : step === 'wire_confirmation' && wireReference ? (
                    <WireTransferConfirmation
                        reference={wireReference}
                        amount={costs.total}
                        onClose={() => {
                            handleClose()
                            onSuccess?.()
                        }}
                    />
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                {t('shifts.validation.title')}
                            </DialogTitle>
                            <DialogDescription>
                                {t('shifts.validation.description')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Validation errors */}
                            {validation.errors.length > 0 && (
                                <div className="flex gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        {validation.errors.map((error, i) => (
                                            <p key={i}>{error}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Validation warnings */}
                            {validation.warnings.length > 0 && validation.isValid && (
                                <div className="flex gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
                                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        {validation.warnings.map((warning, i) => (
                                            <p key={i}>{warning}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cost breakdown */}
                            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t('shifts.validation.totalCost')}</span>
                                    <span className="font-bold text-lg">{formatCurrency(costs.total)}</span>
                                </div>
                                <div className="space-y-1 border-t border-border/50 pt-2 mt-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{t('shifts.freelancers.yourRate', { defaultValue: 'Prestation freelance' })}</span>
                                        <span>{costs.durationHours.toFixed(2)}h × {formatCurrency(costs.hourlyRate)}/h = {formatCurrency(costs.total - (costs.commissionTotal || 0))}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                                        <span>{t('shifts.freelancers.commissionInfo', { rate: costs.platformFeeRate || 0, defaultValue: `Commission (${costs.platformFeeRate || 0}%)` })}</span>
                                        <span>+{formatCurrency(costs.commissionTotal || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment method info */}
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                {effectivePaymentMethod === 'sepa' ? (
                                    <>
                                        <Building2 className="w-5 h-5 text-primary shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">
                                                {t('shifts.validation.sepaDebit', { defaultValue: 'Prélèvement automatique (SEPA)' })}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                IBAN ****{companyPayment?.sepa_iban_last4 || '****'}
                                            </p>
                                        </div>
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                    </>
                                ) : (
                                    <>
                                        <Banknote className="w-5 h-5 text-primary shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">
                                                {t('shifts.validation.wireTransfer', { defaultValue: 'Virement manuel' })}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {t('shifts.validation.wireTransferDesc', { defaultValue: 'Effectuez un virement bancaire — validation par notre équipe' })}
                                            </p>
                                        </div>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1"
                                    title={t('shifts.validation.changePaymentMethod', { defaultValue: 'Modifier dans les paramètres' })}
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button variant="outline" onClick={handleClose} disabled={isPending}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={isPending || isPaymentLoading || !validation.isValid}
                                className="min-w-[160px]"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        {t('common.processing', { defaultValue: 'Traitement...' })}
                                    </>
                                ) : effectivePaymentMethod === 'sepa' ? (
                                    t('shifts.validation.confirmSepa', { defaultValue: 'Confirmer le prélèvement' })
                                ) : (
                                    t('shifts.validation.confirmWire', { defaultValue: 'Payer par virement' })
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
