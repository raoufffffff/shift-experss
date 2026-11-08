import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useEstablishmentStore } from '@/stores/establishmentStore'
import type { User } from '@shared/types'
import { toast } from 'sonner'
import { fr, enUS, es, it, zhCN } from 'date-fns/locale'
import { logger } from '@/utils/logger'
import type { Application, ApplicationStats, ApplicationDisplayItem, ConfirmDialogState } from '../types'

// Haversine formula for distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface RawFreelancerApp {
    id: string
    shift_id: string
    freelancer_id: string
    status: string
    applied_at: string
    shift: {
        id: string
        position_name: string
        start_time: string
        end_time: string
        break_duration_minutes: number
        freelance_hourly_rate: number | null
        status: string
        establishment_id: string
        job_position_id: string | null
        event_id: string | null
        establishments: {
            id: string
            name: string
            city: string | null
            latitude: number | null
            longitude: number | null
            category_id: string | null
        } | null
        shift_required_pms: { id: string; pms_id: string }[]
    }
    freelancer: {
        id: string
        first_name: string
        last_name: string
        full_name: string
        profile_photo_url: string | null
        email: string
        city: string | null
        latitude: number | null
        longitude: number | null
        freelancer_pms: { id: string; pms_id: string; pms: { id: string; name: string; type: 'pms' | 'pos' } }[]
        freelancer_professional_skills: { skill_id: string }[]
    }
}

function computeCompatibilityScore(
    app: RawFreelancerApp,
    pastCounts: Record<string, Record<string, number>>,
    freelancerCategoryIds: Record<string, Set<string>>,
    pastEstCounts: Record<string, Record<string, number>>,
): number {
    let score = 0
    const freelancer = app.freelancer
    const shift = app.shift
    if (!freelancer || !shift) return 0

    // 1. PMS match (20 pts)
    const requiredPmsIds = (shift.shift_required_pms || []).map((p) => p.pms_id)
    const masteredPmsIds = new Set((freelancer.freelancer_pms || []).map((p) => p.pms_id))
    if (requiredPmsIds.length === 0) {
        score += 20
    } else {
        const matched = requiredPmsIds.filter((id) => masteredPmsIds.has(id)).length
        score += Math.round((matched / requiredPmsIds.length) * 20)
    }

    // 2. Position experience (25 pts)
    const jobPosId = shift.job_position_id
    const pastCount = jobPosId ? (pastCounts[app.freelancer_id]?.[jobPosId] || 0) : 0
    if (pastCount >= 4) score += 25
    else if (pastCount >= 2) score += 18
    else if (pastCount >= 1) score += 10
    else if (!jobPosId) {
        const estId = shift.establishments?.id
        const estCount = estId ? (pastEstCounts[app.freelancer_id]?.[estId] || 0) : 0
        if (estCount >= 3) score += 20
        else if (estCount >= 1) score += 12
    }

    // 3. Domain skills (15 pts)
    const estCategoryId = shift.establishments?.category_id
    if (estCategoryId && freelancerCategoryIds[app.freelancer_id]?.has(estCategoryId)) {
        score += 15
    }

    // 4. Distance (20 pts)
    const fLat = freelancer.latitude
    const fLng = freelancer.longitude
    const eLat = shift.establishments?.latitude
    const eLng = shift.establishments?.longitude
    if (fLat && fLng && eLat && eLng) {
        const dist = haversineKm(fLat, fLng, eLat, eLng)
        if (dist < 10) score += 20
        else if (dist < 25) score += 16
        else if (dist < 50) score += 10
        else if (dist < 100) score += 4
    } else {
        score += 10
    }

    // 5. Establishment trust (20 pts)
    const estId = shift.establishments?.id
    const estCount = estId ? (pastEstCounts[app.freelancer_id]?.[estId] || 0) : 0
    if (estCount >= 5) score += 20
    else if (estCount >= 3) score += 15
    else if (estCount >= 1) score += 10

    return Math.min(score, 100)
}

export function useApplicationsData() {
    const { t, i18n } = useTranslation()
    const queryClient = useQueryClient()
    const company = useAuthStore((state) => state.company)
    const user = useAuthStore((state) => state.user)
    const storeEstablishmentId = useEstablishmentStore((state) => state.selectedEstablishmentId)

     const selectedEstablishmentId = user?.role === "manager" 
    ? user?.assigned_establishment_id 
    : storeEstablishmentId
    
    // ✅ FIX: invalidateQueries with exact: false to match all queryKey variants
    const invalidateApplications = () => {
        queryClient.invalidateQueries({ queryKey: ['employee-applications'], exact: false })
        queryClient.invalidateQueries({ queryKey: ['freelancer-applications'], exact: false })
    }

    // Realtime subscription with retry on failure
   useEffect(() => {
    if (!company?.id) return

    let retryTimeout: ReturnType<typeof setTimeout>

    const subscribe = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            retryTimeout = setTimeout(subscribe, 2_000)
            return
        }

        const channel = supabase
            .channel(`applications-realtime-${company.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_applications' },
                (payload) => {
                    // Debug: log payload to verify Realtime events arrive for this table
                    // Remove or change to logger.debug once verified
                    // eslint-disable-next-line no-console
                    console.log('📡 Realtime event - shift_applications (any):', payload)
                    queryClient.invalidateQueries({ queryKey: ['employee-applications'], exact: false })
                    queryClient.invalidateQueries({ queryKey: ['freelancer-applications'], exact: false })
                })
            // Also add an explicit INSERT-only listener for clearer debugging
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shift_applications' },
                (payload) => {
                    // eslint-disable-next-line no-console
                    console.log('📡 Realtime event - shift_applications (INSERT):', payload)
                })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_freelancer_applications' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['employee-applications'], exact: false })
                    queryClient.invalidateQueries({ queryKey: ['freelancer-applications'], exact: false })
                })
            .subscribe((status, err) => {
                console.log('📡 Realtime status:', status, err)
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    supabase.removeChannel(channel)
                    retryTimeout = setTimeout(subscribe, 5_000)
                }
            })

        return channel
    }

    let channelRef: any
    subscribe().then(ch => { channelRef = ch })

    return () => {
        clearTimeout(retryTimeout)
        if (channelRef) supabase.removeChannel(channelRef)
    }
 }, [company?.id, queryClient])

    const [searchParams] = useSearchParams()
    const shiftIdFromUrl = searchParams.get('shiftId') || ''

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedShiftId, setSelectedShiftId] = useState<string>('')
    const [selectedStatus, setSelectedStatus] = useState<string>('pending')
    const [selectedType, setSelectedType] = useState<string>('')
    const [sortBy, setSortBy] = useState<string>('date')

    useEffect(() => {
        if (selectedType === 'employee' && (sortBy === 'compatibility' || sortBy === 'rating')) {
            setSortBy('date')
        }
    }, [selectedType, sortBy])

    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)

    const getDateFnsLocale = () => {
        switch (i18n.language) {
            case 'fr': return fr
            case 'es': return es
            case 'it': return it
            case 'zh': return zhCN
            default: return enUS
        }
    }

    const { data: shifts } = useQuery({
        queryKey: ['shifts-for-filter', company?.id, selectedEstablishmentId],
        queryFn: async () => {
            if (!company?.id) return []

            let query = supabase
                .from('shifts')
                .select('id, public_id, position_name, start_time, end_time, establishments(name)')
                .eq('company_id', company.id)
                .gte('end_time', new Date().toISOString())
                .order('start_time', { ascending: false })
                .limit(50)

            if (selectedEstablishmentId) {
                query = query.eq('establishment_id', selectedEstablishmentId)
            }

            const { data, error } = await query
            if (error) throw error
            return data || []
        },
        enabled: !!company?.id,
    })

    useEffect(() => {
        if (!shiftIdFromUrl || !shifts?.length) return
        const directMatch = shifts.find((s: { id: string }) => s.id === shiftIdFromUrl)
        if (directMatch) {
            setSelectedShiftId(directMatch.id)
            return
        }
        const publicMatch = shifts.find((s: { public_id: string | null }) => s.public_id === shiftIdFromUrl)
        if (publicMatch) {
            setSelectedShiftId(publicMatch.id)
        }
    }, [shiftIdFromUrl, shifts])

    const { data: employeeApplications, isLoading: isLoadingEmployees, refetch: refetchEmployees } = useQuery({
        queryKey: ['employee-applications', company?.id, selectedEstablishmentId],
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
                    shift:shifts(
                        id,
                        public_id,
                        position_name,
                        start_time,
                        end_time,
                        break_duration_minutes,
                        freelance_hourly_rate,
                        status,
                        establishment_id,
                        event_id,
                        establishments(id, name)
                    ),
                    user:users!shift_applications_user_id_fkey(
                        id,
                        first_name,
                        last_name,
                        email,
                        employee:employees(verified_hourly_rate)
                    )
                `)
                .in('shift_id', shiftIds)
                .order('applied_at', { ascending: false })

            if (error) {
                logger.error('Failed to fetch employee applications', error)
                return []
            }

            return ((data || []) as unknown as Application[]).map((app) => ({
                ...app,
                type: 'employee' as const,
            }))
        },
        enabled: !!company?.id,
        staleTime: 0,
        refetchInterval: 30_000,           // ✅ polling fallback every 30s
        refetchIntervalInBackground: false, // ✅ only when tab is active
        refetchOnWindowFocus: true,         // ✅ refresh when user returns to tab
    })

    const { data: freelancerApplications, isLoading: isLoadingFreelancers, refetch: refetchFreelancers } = useQuery({
        queryKey: ['freelancer-applications', company?.id, selectedEstablishmentId],
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
                        public_id,
                        position_name,
                        start_time,
                        end_time,
                        break_duration_minutes,
                        freelance_hourly_rate,
                        status,
                        establishment_id,
                        job_position_id,
                        event_id,
                        establishments(id, name, city, latitude, longitude)
                    ),
                    freelancer:freelancers!freelancer_id(
                        id, first_name, last_name, full_name, profile_photo_url, email, phone,
                        city, latitude, longitude,
                        freelancer_pms(id, pms_id, pms:pms(id, name, type))
                    )
                `)
                .in('shift_id', shiftIds)
                .order('applied_at', { ascending: false })

            if (error) {
                logger.error('Failed to fetch freelancer applications', error)
                return []
            }

            const apps = (data || []) as unknown as RawFreelancerApp[]

            const freelancerIds = [...new Set(apps.map((a) => a.freelancer_id).filter(Boolean))]
            let ratingsMap: Record<string, { average: number; count: number }> = {}
            let pastCounts: Record<string, Record<string, number>> = {}
            let freelancerCategoryIds: Record<string, Set<string>> = {}
            let pastEstCounts: Record<string, Record<string, number>> = {}

            if (freelancerIds.length > 0) {
                try {
                    const { data: reviews } = await supabase
                        .from('freelancer_reviews')
                        .select('freelancer_id, rating')
                        .in('freelancer_id', freelancerIds)

                    if (reviews) {
                        const grouped: Record<string, number[]> = {}
                        for (const r of reviews) {
                            if (!grouped[r.freelancer_id]) grouped[r.freelancer_id] = []
                            grouped[r.freelancer_id].push(r.rating)
                        }
                        for (const [fid, ratings] of Object.entries(grouped)) {
                            const sum = ratings.reduce((a, b) => a + b, 0)
                            ratingsMap[fid] = { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length }
                        }
                    }
                } catch { /* table may not exist yet */ }

                try {
                    const { data: pastApps } = await supabase
                        .from('shift_freelancer_applications')
                        .select('freelancer_id, shift:shifts!inner(job_position_id, establishment_id)' as never)
                        .in('freelancer_id', freelancerIds)
                        .eq('status', 'accepted')

                    if (pastApps) {
                        for (const row of pastApps as unknown as { freelancer_id: string; shift: { job_position_id: string | null; establishment_id: string | null } }[]) {
                            const fid = row.freelancer_id
                            const jpid = row.shift?.job_position_id
                            if (jpid) {
                                if (!pastCounts[fid]) pastCounts[fid] = {}
                                pastCounts[fid][jpid] = (pastCounts[fid][jpid] || 0) + 1
                            }
                            const estId = row.shift?.establishment_id
                            if (estId) {
                                if (!pastEstCounts[fid]) pastEstCounts[fid] = {}
                                pastEstCounts[fid][estId] = (pastEstCounts[fid][estId] || 0) + 1
                            }
                        }
                    }
                } catch { /* ignore */ }

                try {
                    const { data: skillRows } = await supabase
                        .from('freelancer_professional_skills' as never)
                        .select('freelancer_id, skill:professional_skills!inner(category_id)' as never)
                        .in('freelancer_id' as never, freelancerIds as never)

                    if (skillRows) {
                        for (const row of skillRows as unknown as { freelancer_id: string; skill: { category_id: string | null } }[]) {
                            const fid = row.freelancer_id
                            const catId = row.skill?.category_id
                            if (!catId) continue
                            if (!freelancerCategoryIds[fid]) freelancerCategoryIds[fid] = new Set()
                            freelancerCategoryIds[fid].add(catId)
                        }
                    }
                } catch { /* table may not exist yet */ }

                try {
                    const shiftIdsInApps = [...new Set(apps.map((a) => a.shift_id))]
                    const { data: reqPms } = await supabase
                        .from('shift_required_pms' as never)
                        .select('shift_id, pms_id' as never)
                        .in('shift_id' as never, shiftIdsInApps as never)

                    if (reqPms) {
                        const pmsMap: Record<string, { id: string; pms_id: string }[]> = {}
                        for (const row of reqPms as unknown as { shift_id: string; pms_id: string }[]) {
                            if (!pmsMap[row.shift_id]) pmsMap[row.shift_id] = []
                            pmsMap[row.shift_id].push({ id: row.pms_id, pms_id: row.pms_id })
                        }
                        for (const app of apps) {
                            if (app.shift && pmsMap[app.shift_id]) {
                                app.shift.shift_required_pms = pmsMap[app.shift_id]
                            }
                        }
                    }
                } catch { /* table may not exist yet */ }
            }

            return apps.map((app) => ({
                ...app,
                type: 'freelancer' as const,
                freelancer_rating: app.freelancer_id ? ratingsMap[app.freelancer_id] || null : null,
                compatibility_score: computeCompatibilityScore(app, pastCounts, freelancerCategoryIds, pastEstCounts),
            }))
        },
        enabled: !!company?.id,
        refetchInterval: 30_000,           // ✅ polling fallback every 30s
        refetchIntervalInBackground: false, // ✅ only when tab is active
        refetchOnWindowFocus: true,         // ✅ refresh when user returns to tab
    })

    const allApplications = useMemo(() => {
        const combined = [
            ...(employeeApplications || []),
            ...(freelancerApplications || []),
        ] as Application[]

        let filtered = combined.filter((app) => {
            if (app.status === 'rejected' || app.status === 'declined') return false

            const isShiftDone = app.shift?.status === 'completed' ||
                app.shift?.status === 'pending_validation' ||
                app.shift?.status === 'closed' ||
                app.shift?.status === 'canceled' ||
                (app.shift?.end_time && new Date(app.shift.end_time) < new Date())

            if (isShiftDone && app.status !== 'accepted') return false
            return true
        })

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter((app) => {
                const name = app.type === 'employee'
                    ? `${app.user?.first_name || ''} ${app.user?.last_name || ''}`
                    : app.freelancer?.full_name || `${app.freelancer?.first_name || ''} ${app.freelancer?.last_name || ''}`
                return name.toLowerCase().includes(query)
            })
        }

        if (selectedShiftId) {
            filtered = filtered.filter((app) => app.shift_id === selectedShiftId)
        }

        if (selectedStatus) {
            if (selectedStatus === 'pending') {
                filtered = filtered.filter((app) => app.status === 'pending' || app.status === 'applied')
            } else {
                filtered = filtered.filter((app) => app.status === selectedStatus)
            }
        }

        if (selectedType) {
            filtered = filtered.filter((app) => app.type === selectedType)
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'compatibility':
                    return (b.compatibility_score || 0) - (a.compatibility_score || 0)
                case 'rating':
                    return (b.freelancer_rating?.average || 0) - (a.freelancer_rating?.average || 0)
                case 'date':
                    return new Date(b.applied_at || b.created_at || 0).getTime() -
                        new Date(a.applied_at || a.created_at || 0).getTime()
                case 'name': {
                    const nameA = a.type === 'employee'
                        ? `${a.user?.first_name || ''} ${a.user?.last_name || ''}`
                        : a.freelancer?.full_name || ''
                    const nameB = b.type === 'employee'
                        ? `${b.user?.first_name || ''} ${b.user?.last_name || ''}`
                        : b.freelancer?.full_name || ''
                    return nameA.localeCompare(nameB)
                }
                default:
                    return 0
            }
        })

        return filtered
    }, [employeeApplications, freelancerApplications, searchQuery, selectedShiftId, selectedStatus, selectedType, sortBy])

    const displayItems: ApplicationDisplayItem[] = useMemo(() => {
        const items: ApplicationDisplayItem[] = []
        const eventGroups = new Map<string, Application[]>()

        for (const app of allApplications) {
            const eventId = app.shift?.event_id
            if (!eventId) {
                items.push({ type: 'single', app })
                continue
            }
            const candidateId = app.type === 'employee' ? app.user_id : app.freelancer_id
            const key = `${candidateId}__${eventId}`
            if (!eventGroups.has(key)) eventGroups.set(key, [])
            eventGroups.get(key)!.push(app)
        }

        for (const [key, apps] of eventGroups) {
            if (apps.length === 1) {
                items.push({ type: 'single', app: apps[0] })
            } else {
                apps.sort((a, b) => new Date(a.shift?.start_time || 0).getTime() - new Date(b.shift?.start_time || 0).getTime())
                const [candidateId, eventId] = key.split('__')
                items.push({ type: 'event', eventId, candidateId, apps })
            }
        }

        items.sort((a, b) => {
            const getTime = (item: ApplicationDisplayItem) => {
                if (item.type === 'single') return new Date(item.app.shift?.start_time || 0).getTime()
                return new Date(item.apps[0]?.shift?.start_time || 0).getTime()
            }
            return getTime(b) - getTime(a)
        })

        return items
    }, [allApplications])

    const stats: ApplicationStats = useMemo(() => {
        const combined = [
            ...(employeeApplications || []),
            ...(freelancerApplications || []),
        ] as Application[]

        const base = combined.filter((app) => {
            if (app.status === 'rejected' || app.status === 'declined') return false
            const isShiftDone = app.shift?.status === 'completed' ||
                app.shift?.status === 'pending_validation' ||
                app.shift?.status === 'closed' ||
                app.shift?.status === 'canceled'
            if (isShiftDone && app.status !== 'accepted') return false
            return true
        })

        let total = 0, pending = 0, accepted = 0, rejected = 0
        for (const app of base) {
            total++
            const s = app.status
            if (s === 'pending' || s === 'applied') pending++
            else if (s === 'accepted' || s === 'confirmed') accepted++
            else if (s === 'rejected' || s === 'declined') rejected++
        }
        return { total, pending, accepted, rejected }
    }, [employeeApplications, freelancerApplications])

    const updateStatusMutation = useMutation({
        mutationFn: async ({ apps, newStatus }: { apps: Application[], newStatus: string }) => {
            for (const app of apps) {
                const table = app.type === 'employee' ? 'shift_applications' : 'shift_freelancer_applications'
                const { error } = await supabase
                    .from(table)
                    .update({ status: newStatus })
                    .eq('id', app.id)
                if (error) throw error
            }
        },
        onSuccess: () => {
            // ✅ FIX: exact: false to invalidate all queryKey variants
            invalidateApplications()
            toast.success(t('common.success'))
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : t('common.error'))
        },
    })

    const handleRefresh = () => {
        refetchEmployees()
        refetchFreelancers()
        toast.success(t('common.refresh'))
    }

    const handleAccept = (app: Application) => {
        setConfirmDialog({ action: 'accept', apps: [app] })
    }

    const handleReject = (app: Application) => {
        setConfirmDialog({ action: 'reject', apps: [app] })
    }

    const handleAcceptAll = (apps: Application[]) => {
        if (apps.length === 0) return
        setConfirmDialog({ action: 'accept', apps })
    }

    const handleRejectAll = (apps: Application[]) => {
        if (apps.length === 0) return
        setConfirmDialog({ action: 'reject', apps })
    }

    const handleConfirm = () => {
        if (!confirmDialog) return
        const { action, apps } = confirmDialog

        updateStatusMutation.mutate(
            {
                apps,
                newStatus: action === 'accept' ? 'accepted' : 'rejected',
            },
            {
                onSuccess: () => {
                    if (action !== 'accept') return
                    for (const app of apps) {
                        const workerName = app.type === 'freelancer'
                            ? `${app.freelancer?.first_name || ''} ${app.freelancer?.last_name || ''}`.trim() || 'Freelance'
                            : `${app.user?.first_name || ''} ${app.user?.last_name || ''}`.trim() || app.user?.email || 'Employé'
                        const workerProfilePath = app.type === 'freelancer'
                            ? `/freelancers/${app.freelancer_id}`
                            : `/employees/${app.user_id}`

                        if (app.type === 'freelancer' && app.freelancer_id) {
                            void supabase.functions.invoke('send-freelancer-shift-accepted', {
                                body: {
                                    freelancer_id: app.freelancer_id,
                                    freelancer_name: workerName,
                                    freelancer_email: app.freelancer?.email || '',
                                    freelancer_user_id: app.freelancer_id,
                                    shift_id: app.shift_id,
                                    position_name: app.shift?.position_name || '',
                                    start_time: app.shift?.start_time || '',
                                    end_time: app.shift?.end_time || '',
                                    establishment_name: app.shift?.establishments?.name || '',
                                    establishment_city: app.shift?.establishments?.city || '',
                                },
                            }).catch((err) => {
                                logger.error('Failed to notify freelancer (shift accepted):', err instanceof Error ? err : String(err))
                            })
                        }

                        if (user?.email) {
                            void supabase.functions.invoke('send-employer-acceptance-confirmation', {
                                body: {
                                    employer_email: user.email,
                                    employer_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                                    worker_name: workerName,
                                    worker_type: app.type,
                                    worker_photo_url: app.type === 'freelancer' ? app.freelancer?.profile_photo_url || null : null,
                                    worker_profile_path: workerProfilePath,
                                    position_name: app.shift?.position_name || '',
                                    start_time: app.shift?.start_time || '',
                                    end_time: app.shift?.end_time || '',
                                    establishment_name: app.shift?.establishments?.name || '',
                                    establishment_city: app.shift?.establishments?.city || '',
                                },
                            }).catch((err) => {
                                logger.error('Failed to send employer confirmation:', err instanceof Error ? err : String(err))
                            })
                        }
                    }
                },
            }
        )

        setConfirmDialog(null)
    }

    const handleRequestAttestation = async (app: Application) => {
        if (app.type !== 'freelancer' || !app.freelancer_id) return

        try {
            const { data: doc } = await supabase
                .from('freelancer_documents')
                .select('file_url, status')
                .eq('freelancer_id', app.freelancer_id)
                .eq('type', 'urssaf')
                .maybeSingle()

            if (doc?.status === 'verified' && doc.file_url) {
                window.open(doc.file_url, '_blank')
                return
            }

            await supabase.functions.invoke('send-attestation-request', {
                body: {
                    freelancer_id: app.freelancer_id,
                    freelancer_name: `${app.freelancer?.first_name || ''} ${app.freelancer?.last_name || ''}`.trim(),
                    freelancer_email: app.freelancer?.email || '',
                    employer_name: company?.name || '',
                    position_name: app.shift?.position_name || '',
                    shift_date: app.shift?.start_time || '',
                },
            })
            if (doc) {
                toast.info(t('applications.attestation.pendingVerification', { defaultValue: 'Attestation en cours de vérification. Demande envoyée.' }))
            } else {
                toast.success(t('applications.attestation.requestSent', { defaultValue: 'Demande d\'attestation envoyée au freelancer' }))
            }
        } catch (err) {
            logger.error('Failed to request attestation:', err instanceof Error ? err : String(err))
            toast.error(t('applications.attestation.requestError', { defaultValue: 'Erreur lors de l\'envoi de la demande' }))
        }
    }

    const isLoading = isLoadingEmployees || isLoadingFreelancers

    return {
        shifts,
        allApplications,
        displayItems,
        stats,
        isLoading,
        searchQuery,
        setSearchQuery,
        selectedShiftId,
        setSelectedShiftId,
        selectedStatus,
        setSelectedStatus,
        selectedType,
        setSelectedType,
        sortBy,
        setSortBy,
        selectedApplication,
        setSelectedApplication,
        confirmDialog,
        setConfirmDialog,
        updateStatusMutation,
        handleRefresh,
        handleAccept,
        handleReject,
        handleAcceptAll,
        handleRejectAll,
        handleConfirm,
        handleRequestAttestation,
        getDateFnsLocale,
        i18n,
    }
}