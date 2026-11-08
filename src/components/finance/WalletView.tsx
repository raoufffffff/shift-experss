import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import {
    Wallet,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    History,
    RefreshCw,
    Info,
    AlertCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { apiClient } from '@/lib/api-client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { SepaSetupCard } from '@/components/settings/SepaSetupCard'

interface Transaction {
    id: string
    type: string
    status: string
    amount: number
    created_at: string
    company_id: string
}

export function WalletView() {
    const { t } = useTranslation()
    const { company } = useAuthStore()
    const queryClient = useQueryClient()
    const [isTopUpOpen, setIsTopUpOpen] = useState(false)
    const [topUpAmount, setTopUpAmount] = useState('50')

    // Fetch Wallet
    const { data: wallet, isLoading: isWalletLoading } = useQuery({
        queryKey: ['wallet', company?.id],
        queryFn: async (): Promise<{ balance: number } | null> => {
            if (!company?.id) return null
            const { data, error } = await supabase
                .from('wallets' as never)
                .select('*')
                .eq('company_id', company.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error
            return data as { balance: number } | null
        },
        enabled: !!company?.id,
    })

    // Fetch Transactions
    const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
        queryKey: ['transactions', company?.id],
        queryFn: async (): Promise<Transaction[]> => {
            if (!company?.id) return []
            const { data, error } = await supabase
                .from('transactions' as never)
                .select('*')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data as unknown as Transaction[]) || []
        },
        enabled: !!company?.id,
    })

    // Create Top-up Payment Intent
    const topUpMutation = useMutation({
        mutationFn: async (amount: number) => {
            const response = await apiClient.post('/api/stripe/wallet/top-up', { amount })
            return response.data
        },
        onSuccess: (data) => {
            if (data.url) {
                window.location.href = data.url
            } else if (data.clientSecret) {
                toast.info(t('billing.wallet.redirectingToPayment'))
            }
        },
        onError: () => {
            toast.error(t('billing.wallet.topUpError'))
        }
    })

    const MAX_TOP_UP = 10_000 // 10 000 € max per top-up

    const handleTopUp = () => {
        const amount = parseFloat(topUpAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error(t('billing.wallet.invalidAmount'))
            return
        }
        if (amount > MAX_TOP_UP) {
            toast.error(t('billing.wallet.maxAmountExceeded', { max: MAX_TOP_UP }))
            return
        }
        topUpMutation.mutate(amount)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount)
    }

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'top_up':
                return <Plus className="w-4 h-4 text-green-500" />
            case 'payment':
                return <ArrowUpRight className="w-4 h-4 text-orange-500" />
            case 'payout':
                return <ArrowDownLeft className="w-4 h-4 text-blue-500" />
            default:
                return <History className="w-4 h-4 text-muted-foreground" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'succeeded':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('billing.wallet.statuses.succeeded')}</Badge>
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('billing.wallet.statuses.pending')}</Badge>
            case 'failed':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t('billing.wallet.statuses.failed')}</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Info Banner for Avoir/Direct Payment */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-800">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900 dark:text-blue-300 space-y-1">
                            <p className="font-medium">{t('billing.wallet.infoBannerTitle')}</p>
                            <p className="text-blue-700 dark:text-blue-400">
                                {t('billing.wallet.infoBannerText')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('billing.wallet.availableCredits')}
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isWalletLoading ? '...' : formatCurrency(wallet?.balance || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('billing.wallet.autoDeductedFromInvoices')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('settings.sepa.title')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SepaSetupCard variant="compact" showConfigureButton />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{t('billing.wallet.creditsTransactionHistory')}</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t('billing.wallet.refresh')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isTransactionsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : !transactions || transactions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>{t('billing.wallet.noTransactions')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('billing.wallet.date')}</TableHead>
                                    <TableHead>{t('billing.wallet.type')}</TableHead>
                                    <TableHead>{t('billing.wallet.status')}</TableHead>
                                    <TableHead className="text-right">{t('billing.wallet.amount')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getTransactionIcon(tx.type)}
                                                <span>{t(`billing.wallet.types.${tx.type}`)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                        <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(tx.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Hidden manual Top Up dialog, can be re-enabled if needed but hidden for now as per user request to only have Credits/Avoirs */}
            {/* <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}> ... </Dialog> */}
        </div>
    )
}
