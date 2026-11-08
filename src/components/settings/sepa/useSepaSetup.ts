import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export interface SepaStatus {
    configured: boolean
    status: string
    ibanLast4?: string
    bankCode?: string
    country?: string
    configuredAt?: string
}
 
export function useSepaSetup() {
    const { t } = useTranslation()
    const { refreshCompany, company } = useAuthStore()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
            console.log('company.id at call time:', company?.id) // ضيفها مؤقتاً

    // Fetch SEPA status
    // Reads straight from `companies` — no need for a dedicated Edge
    // Function here since RLS already scopes this to the caller's own company.
    const { data: sepaStatus, isLoading } = useQuery<SepaStatus>({
        queryKey: ['sepa-status', company?.id],

        queryFn: async () => {
            if (!company?.id) {
 
                return { configured: false, status: 'not_configured' }
            }

            const { data, error } = await supabase
                .from('companies')
                .select('sepa_status, sepa_iban_last4, sepa_bank_code, sepa_country, sepa_configured_at')
                .eq('id', company.id)
                .single()

            if (error || !data) {
                return { configured: false, status: 'not_configured' }
            }

            return {
                configured: data.sepa_status === 'active',
                status: data.sepa_status ?? 'not_configured',
                ibanLast4: data.sepa_iban_last4 ?? undefined,
                bankCode: data.sepa_bank_code ?? undefined,
                country: data.sepa_country ?? undefined,
                configuredAt: data.sepa_configured_at ?? undefined,
            }
        },
        enabled: !!company?.id,
    })

    // Fetch active shifts count
    const { data: activeShiftsCount = 0 } = useQuery({
        queryKey: ['active-shifts-count', company?.id],
        queryFn: async () => {
            if (!company?.id) return 0
            const { count, error } = await supabase
                .from('shifts')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .in('status', ['pending', 'partially_filled', 'filled', 'pending_validation'])

            if (error) return 0
            return count || 0
        },
        enabled: !!company?.id,
    })

    const hasActiveShifts = activeShiftsCount > 0

    // Create setup intent mutation
    const setupMutation = useMutation({
        mutationFn: async () => {
            if (!company?.id) throw new Error('No company')

            const { data, error } = await supabase.functions.invoke('setup-sepa-payment', {
                body: { company_id: company.id },
            })

            if (error) throw new Error(error.message)
            if (data?.error) throw new Error(data.error)
            return data as { client_secret: string }
        },
        onSuccess: (data) => {
            setClientSecret(data.client_secret)
            setIsDialogOpen(true)
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : t('settings.sepa.errors.setupFailed'))
        },
    })

    // Remove SEPA mutation
    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!company?.id) throw new Error('No company')

            const { data, error } = await supabase.functions.invoke('remove-sepa-payment', {
                body: { company_id: company.id },
            })

            if (error) throw new Error(error.message)
            if (data?.error) throw new Error(data.error)
            return data
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['sepa-status'] })
            await refreshCompany()
            toast.success(t('settings.sepa.removeSuccess'))
            setIsRemoveDialogOpen(false)
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : t('settings.sepa.errors.removeFailed'))
        },
    })

    const handleSetupSuccess = async () => {
        setIsDialogOpen(false)
        setClientSecret(null)
        queryClient.invalidateQueries({ queryKey: ['sepa-status'] })
        await refreshCompany()
    }

    const handleOpenSetup = () => {
        setupMutation.mutate()
    }

    return {
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
    }
}