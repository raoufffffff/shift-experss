import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTranslation } from 'react-i18next'

export function WalletBalanceBadge() {
    const { t } = useTranslation()
    const { company } = useAuthStore()

    const { data: wallet, isLoading } = useQuery({
        queryKey: ['wallet', company?.id],
        queryFn: async (): Promise<{ balance: number } | null> => {
            if (!company?.id) return null
            const { data, error } = await supabase
                .from('wallets' as never)
                .select('balance')
                .eq('company_id', company.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error
            return data as { balance: number } | null
        },
        enabled: !!company?.id,
        staleTime: 1000 * 60, // 1 minute
    })

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(amount)
    }

    // Default to 0 balance if loading or no wallet
    const balance = wallet?.balance ?? 0
    const hasPositiveBalance = balance > 0

    if (isLoading) return <div className="h-8 w-24 bg-muted/20 animate-pulse rounded-full" />

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
            hasPositiveBalance
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-muted/50 text-muted-foreground border-border"
        )}>
            <Wallet className="w-3.5 h-3.5" />
            <span>{hasPositiveBalance ? t('billing.wallet.credit') : t('billing.wallet.balance')}</span>
            <span className="font-bold">{formatCurrency(balance)}</span>
        </div>
    )
}
