import { PayrollView } from '@/components/finance/PayrollView'
import { useTranslation } from 'react-i18next'

export function WalletPage() {
    const { t } = useTranslation()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('payroll.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('payroll.description')}
                    </p>
                </div>
            </div>

            <div className="min-h-[500px]">
                <PayrollView />
            </div>
        </div>
    )
}
