import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import {
    ArrowLeft,
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    Calendar,
    Briefcase,
    MapPin,
    Search,
    Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatTimeUTC } from '@/utils/formatTime'
import { fr, enUS, es, it, zhCN } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useEstablishmentStore } from '@/stores/establishmentStore'
import { useLocale } from '@/hooks/useLocale'
import { logger } from '@/utils/logger'
import { FreelancerProfilePanel } from '@/components/shifts/applicants/FreelancerProfilePanel'
import type { Application } from './types'

export function ApplicationsHistoryPage() {
    const { t, i18n } = useTranslation()
    const { navigate } = useLocale()
    const company = useAuthStore((state) => state.company)
    const selectedEstablishmentId = useEstablishmentStore((state) => state.selectedEstablishmentId)

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStatus, setSelectedStatus] = useState<string>('')
    const [viewingFreelancerId, setViewingFreelancerId] = useState<string | null>(null)

    const getDateFnsLocale = () => {
        switch (i18n.language) {
            case 'fr': return fr
            case 'es': return es
            case 'it': return it
            case 'zh': return zhCN
            default: return enUS
        }
    }

    // Fetch ALL applications (no filtering by shift status)
    const { data: employeeApps, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['employee-applications-history', company?.id, selectedEstablishmentId],
        queryFn: async () => {
            if (!company?.id) return []

            const { data: establishments } = await supabase
                .from('establishments')
                .select('id')
                .eq('company_id', company.id)

            if (!establishments?.length) return []

            const estIds = selectedEstablishmentId
                ? [selectedEstablishmentId]
                : establishments.map((e: { id: string }) => e.id)

            const { data: shiftsData } = await supabase
                .from('shifts')
                .select('id')
                .in('establishment_id', estIds)

            if (!shiftsData?.length) return []

            const shiftIds = shiftsData.map((s: { id: string }) => s.id)

            const { data, error } = await supabase
                .from('shift_applications')
                .select(`
                    id,
                    shift_id,
                    user_id,
                    status,
                    applied_at,
                    reviewed_at,
                    shift:shifts(
                        id,
                        position_name,
                        start_time,
                        end_time,
                        status,
                        establishment_id,
                        establishments(id, name)
                    ),
                    user:users!shift_applications_user_id_fkey(
                        id,
                        first_name,
                        last_name,
                        email
                    )
                `)
                .in('shift_id', shiftIds)
                .order('applied_at', { ascending: false })

            if (error) {
                logger.error('Failed to fetch employee applications history', error)
                return []
            }

            return ((data || []) as unknown as Application[]).map((app) => ({
                ...app,
                type: 'employee' as const,
            }))
        },
        enabled: !!company?.id,
    })

    const { data: freelancerApps, isLoading: isLoadingFreelancers } = useQuery({
        queryKey: ['freelancer-applications-history', company?.id, selectedEstablishmentId],
        queryFn: async () => {
            if (!company?.id) return []

            const { data: establishments } = await supabase
                .from('establishments')
                .select('id')
                .eq('company_id', company.id)

            if (!establishments?.length) return []

            const estIds = selectedEstablishmentId
                ? [selectedEstablishmentId]
                : establishments.map((e: { id: string }) => e.id)

            const { data: shiftsData } = await supabase
                .from('shifts')
                .select('id')
                .in('establishment_id', estIds)

            if (!shiftsData?.length) return []

            const shiftIds = shiftsData.map((s: { id: string }) => s.id)

            const { data, error } = await supabase
                .from('shift_freelancer_applications')
                .select(`
                    id,
                    shift_id,
                    freelancer_id,
                    status,
                    applied_at,
                    shift:shifts(
                        id,
                        position_name,
                        start_time,
                        end_time,
                        status,
                        establishment_id,
                        establishments(id, name)
                    ),
                    freelancer:freelancers!freelancer_id(
                        id, first_name, last_name, full_name, profile_photo_url, email
                    )
                `)
                .in('shift_id', shiftIds)
                .order('applied_at', { ascending: false })

            if (error) {
                logger.error('Failed to fetch freelancer applications history', error)
                return []
            }

            return ((data || []) as unknown as Application[]).map((app) => ({
                ...app,
                type: 'freelancer' as const,
            }))
        },
        enabled: !!company?.id,
    })

    const isLoading = isLoadingEmployees || isLoadingFreelancers

    const allApplications = useMemo(() => {
        const combined = [
            ...(employeeApps || []),
            ...(freelancerApps || []),
        ] as Application[]

        let filtered = combined

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter((app) => {
                const name = app.type === 'employee'
                    ? `${app.user?.first_name || ''} ${app.user?.last_name || ''}`
                    : app.freelancer?.full_name || `${app.freelancer?.first_name || ''} ${app.freelancer?.last_name || ''}`
                const position = app.shift?.position_name || ''
                const establishment = app.shift?.establishments?.name || ''
                return name.toLowerCase().includes(query)
                    || position.toLowerCase().includes(query)
                    || establishment.toLowerCase().includes(query)
            })
        }

        // Status filter
        if (selectedStatus) {
            filtered = filtered.filter((app) => {
                if (selectedStatus === 'pending') return app.status === 'pending' || app.status === 'applied'
                if (selectedStatus === 'accepted') return app.status === 'accepted' || app.status === 'confirmed'
                if (selectedStatus === 'rejected') return app.status === 'rejected' || app.status === 'declined'
                return true
            })
        }

        // Sort by date desc
        filtered.sort((a, b) =>
            new Date(b.applied_at || b.created_at || 0).getTime() -
            new Date(a.applied_at || a.created_at || 0).getTime()
        )

        return filtered
    }, [employeeApps, freelancerApps, searchQuery, selectedStatus])

    const stats = useMemo(() => {
        const all = [...(employeeApps || []), ...(freelancerApps || [])] as Application[]
        return {
            total: all.length,
            pending: all.filter((a) => a.status === 'pending' || a.status === 'applied').length,
            accepted: all.filter((a) => a.status === 'accepted' || a.status === 'confirmed').length,
            rejected: all.filter((a) => a.status === 'rejected' || a.status === 'declined').length,
        }
    }, [employeeApps, freelancerApps])

    function getStatusBadge(status: string) {
        switch (status) {
            case 'pending':
            case 'applied':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Clock className="w-3 h-3" />
                        {t('applications.status.pending')}
                    </span>
                )
            case 'accepted':
            case 'confirmed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('applications.status.accepted')}
                    </span>
                )
            case 'rejected':
            case 'declined':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="w-3 h-3" />
                        {t('applications.status.rejected')}
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {status}
                    </span>
                )
        }
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/applications')}
                        className="shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        {t('common.back')}
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {t('applications.historyTitle')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {t('applications.historySubtitle')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t('applications.stats.total')}</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t('applications.stats.pending')}</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t('applications.stats.accepted')}</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.accepted}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t('applications.stats.rejected')}</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('applications.searchPlaceholder')}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="">{t('applications.filters.allStatuses')}</option>
                    <option value="pending">{t('applications.status.pending')}</option>
                    <option value="accepted">{t('applications.status.accepted')}</option>
                    <option value="rejected">{t('applications.status.rejected')}</option>
                </select>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : allApplications.length === 0 ? (
                <Card className="border-border/60">
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                            <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {t('applications.empty.title')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {t('applications.historyEmpty')}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-border/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/30">
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">{t('applications.historyColumns.candidate')}</th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">{t('applications.historyColumns.type')}</th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">{t('applications.historyColumns.shift')}</th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">{t('applications.historyColumns.date')}</th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">{t('applications.historyColumns.status')}</th>
                                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">{t('applications.historyColumns.appliedAt')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {allApplications.map((app) => {
                                    const name = app.type === 'employee'
                                        ? `${app.user?.first_name || ''} ${app.user?.last_name || ''}`
                                        : app.freelancer?.full_name || `${app.freelancer?.first_name || ''} ${app.freelancer?.last_name || ''}`
                                    const photoUrl = app.type === 'freelancer' ? app.freelancer?.profile_photo_url : null

                                    return (
                                        <tr
                                            key={`${app.type}-${app.id}`}
                                            className="hover:bg-muted/20 transition-colors"
                                        >
                                            {/* Candidate */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shrink-0",
                                                        app.type === 'employee' ? "bg-blue-500" : "bg-purple-500"
                                                    )}>
                                                        {photoUrl ? (
                                                            <img src={photoUrl} alt={name} loading="lazy" className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            name.substring(0, 2).toUpperCase()
                                                        )}
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            "text-sm font-medium text-foreground",
                                                            app.type === 'freelancer' && "hover:text-primary hover:underline cursor-pointer"
                                                        )}
                                                        onClick={() => {
                                                            if (app.type === 'freelancer' && app.freelancer_id) {
                                                                setViewingFreelancerId(app.freelancer_id)
                                                            }
                                                        }}
                                                    >
                                                        {name}
                                                    </span>
                                                </div>
                                            </td>
                                            {/* Type */}
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                                                    app.type === 'employee'
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                                )}>
                                                    {app.type === 'employee' ? t('common.employee') : t('common.freelancer')}
                                                </span>
                                            </td>
                                            {/* Shift */}
                                            <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                                                        <Briefcase className="w-3.5 h-3.5 text-primary/60" />
                                                        {app.shift?.position_name || '-'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                        <MapPin className="w-3 h-3" />
                                                        {app.shift?.establishments?.name || '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Shift date */}
                                            <td className="px-4 py-3">
                                                {app.shift?.start_time ? (
                                                    <div className="text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {format(new Date(app.shift.start_time), 'dd MMM yyyy', { locale: getDateFnsLocale() })}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs mt-0.5">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTimeUTC(app.shift.start_time)}
                                                            {app.shift.end_time && ` - ${formatTimeUTC(app.shift.end_time)}`}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                {getStatusBadge(app.status)}
                                            </td>
                                            {/* Applied at */}
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-muted-foreground">
                                                    {app.applied_at
                                                        ? format(new Date(app.applied_at), 'dd MMM yyyy HH:mm', { locale: getDateFnsLocale() })
                                                        : '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
                        {allApplications.length} {t('applications.stats.total').toLowerCase()}
                    </div>
                </Card>
            )}

            {/* Freelancer Profile Dialog */}
            <Dialog open={!!viewingFreelancerId} onOpenChange={() => setViewingFreelancerId(null)}>
                <DialogContent className="max-w-6xl p-0">
                    {viewingFreelancerId && (
                        <FreelancerProfilePanel
                            freelancerId={viewingFreelancerId}
                            onBack={() => setViewingFreelancerId(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
