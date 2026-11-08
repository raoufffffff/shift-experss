import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Shift Express bank info
const SHIFT_EXPRESS_IBAN = 'FR76 XXXX XXXX XXXX XXXX XXXX XXX'
const SHIFT_EXPRESS_BIC = 'XXXXXXXX'
const SHIFT_EXPRESS_BENEFICIARY = 'SHIFT EXPRESS SAS'

interface WireTransferConfirmationProps {
    reference: string
    amount: number
    onClose: () => void
}

export function WireTransferConfirmation({ reference, amount, onClose }: WireTransferConfirmationProps) {
    const { t } = useTranslation()
    const [copied, setCopied] = useState<string | null>(null)

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text)
        setCopied(field)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h3 className="text-base font-semibold text-foreground">
                    {t('shifts.wireTransfer.confirmationTitle', { defaultValue: 'Ticket de paiement créé' })}
                </h3>
            </div>

            <p className="text-sm text-muted-foreground">
                {t('shifts.wireTransfer.confirmationDescription', { defaultValue: 'Effectuez un virement bancaire avec les informations ci-dessous. Votre shift sera validé dès réception du paiement.' })}
            </p>

            <div className="space-y-2">
                <InfoRow
                    label={t('shifts.wireTransfer.beneficiary', { defaultValue: 'Bénéficiaire' })}
                    value={SHIFT_EXPRESS_BENEFICIARY}
                    onCopy={() => handleCopy(SHIFT_EXPRESS_BENEFICIARY, 'beneficiary')}
                    copied={copied === 'beneficiary'}
                />
                <InfoRow
                    label="IBAN"
                    value={SHIFT_EXPRESS_IBAN}
                    onCopy={() => handleCopy(SHIFT_EXPRESS_IBAN.replace(/\s/g, ''), 'iban')}
                    copied={copied === 'iban'}
                />
                <InfoRow
                    label="BIC / SWIFT"
                    value={SHIFT_EXPRESS_BIC}
                    onCopy={() => handleCopy(SHIFT_EXPRESS_BIC, 'bic')}
                    copied={copied === 'bic'}
                />
                <InfoRow
                    label={t('shifts.wireTransfer.reference', { defaultValue: 'Référence du virement' })}
                    value={reference}
                    onCopy={() => handleCopy(reference, 'ref')}
                    copied={copied === 'ref'}
                    highlight
                />
                <InfoRow
                    label={t('shifts.wireTransfer.amount', { defaultValue: 'Montant exact' })}
                    value={formatCurrency(amount)}
                    onCopy={() => handleCopy(amount.toFixed(2), 'amount')}
                    copied={copied === 'amount'}
                />
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>{t('shifts.wireTransfer.important', { defaultValue: 'Important :' })}</strong>{' '}
                    {t('shifts.wireTransfer.importantText', { defaultValue: 'Indiquez impérativement la référence ci-dessus dans le motif de votre virement. Sans cette référence, nous ne pourrons pas identifier votre paiement.' })}
                </p>
            </div>

            <div className="flex justify-end pt-2">
                <Button onClick={onClose}>
                    {t('common.close', { defaultValue: 'Fermer' })}
                </Button>
            </div>
        </div>
    )
}

function InfoRow({
    label,
    value,
    onCopy,
    copied,
    highlight,
}: {
    label: string
    value: string
    onCopy: () => void
    copied: boolean
    highlight?: boolean
}) {
    return (
        <div className={`flex items-center justify-between p-2.5 rounded-lg ${highlight ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'}`}>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-sm font-mono font-medium truncate ${highlight ? 'text-primary' : 'text-foreground'}`}>
                    {value}
                </p>
            </div>
            <button
                onClick={onCopy}
                className="p-1.5 rounded-md hover:bg-muted transition-colors ml-2 flex-shrink-0"
            >
                {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                )}
            </button>
        </div>
    )
}
