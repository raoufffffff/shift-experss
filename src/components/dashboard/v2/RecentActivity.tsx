import { BentoCard } from './BentoCard'
import { motion } from 'framer-motion'
import { User, FileText, CheckCircle, Clock, Calendar, UserPlus, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useEstablishmentStore } from '@/stores/establishmentStore'
import { useLocale } from '@/hooks/useLocale'
import { useTranslation } from 'react-i18next'

interface ActivityItem {
    id: string
    type: 'application' | 'shift_published' | 'shift_filled' | 'shift_completed' | 'new_employee'
    title: string
    description: string
    timestamp: Date
    link?: string
}

export function RecentActivity() {
    const { t } = useTranslation()
    const company = useAuthStore((state) => state.company)
    const { selectedEstablishmentId } = useEstablishmentStore()
    const { navigate } = useLocale()

    // Fetch recent activities from multiple sources
    const { data: activities = [], isLoading } = useQuery({
        queryKey: ['recent-activity', company?.id, selectedEstablishmentId],
        queryFn: async (): Promise<ActivityItem[]> => {
            if (!company?.id) return []

            const allActivities: ActivityItem[] = []
            const now = new Date()
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

            try {
                // 1. Fetch recent shift applications (freelancers)
                const { data: freelancerApps } = await supabase
                    .from('shift_freelancer_applications')
                    .select(`
                        id,
                        applied_at,
                        status,
                        shift:shift_id(id, position_name, company_id),
                        freelancer:freelancer_id(first_name, last_name)
                    `)
                    .gte('applied_at', threeDaysAgo.toISOString())
                    .order('applied_at', { ascending: false })
                    .limit(5)

                if (freelancerApps) {
                    freelancerApps
                        .filter((app) => (app.shift as Record<string, unknown> | null)?.company_id === company.id)
                        .forEach((app) => {
                            const name = app.freelancer
                                ? `${app.freelancer.first_name} ${app.freelancer.last_name?.charAt(0)}.`
                                : t('recentActivity.freelancerFallback')
                            allActivities.push({
                                id: `app-${app.id}`,
                                type: 'application',
                                title: t('recentActivity.newApplication'),
                                description: t('recentActivity.appliedFor', { name, position: app.shift?.position_name || t('recentActivity.aShift') }),
                                timestamp: new Date(app.applied_at || Date.now()),
                                link: `/shifts/${app.shift?.id}`,
                            })
                        })
                }

                // 2. Fetch recently published shifts
                const { data: recentShifts } = await supabase
                    .from('shifts')
                    .select('id, position_name, created_at, status, start_time')
                    .eq('company_id', company.id)
                    .gte('created_at', threeDaysAgo.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(5)

                if (recentShifts) {
                    recentShifts.forEach((shift) => {
                        allActivities.push({
                            id: `shift-${shift.id}`,
                            type: 'shift_published',
                            title: t('recentActivity.shiftPublished'),
                            description: t('recentActivity.shiftPublishedDesc', { position: shift.position_name, date: new Date(shift.start_time || Date.now()).toLocaleDateString('fr-FR') }),
                            timestamp: new Date(shift.created_at || Date.now()),
                            link: `/shifts/${shift.id}`,
                        })
                    })
                }

                // 3. Fetch recently filled shifts
                const { data: filledShifts } = await supabase
                    .from('shifts')
                    .select('id, position_name, updated_at, status')
                    .eq('company_id', company.id)
                    .eq('status', 'filled')
                    .gte('updated_at', threeDaysAgo.toISOString())
                    .order('updated_at', { ascending: false })
                    .limit(3)

                if (filledShifts) {
                    filledShifts.forEach((shift) => {
                        allActivities.push({
                            id: `filled-${shift.id}`,
                            type: 'shift_filled',
                            title: t('recentActivity.shiftFilled'),
                            description: t('recentActivity.shiftFilledDesc', { position: shift.position_name }),
                            timestamp: new Date(shift.updated_at || Date.now()),
                            link: `/shifts/${shift.id}`,
                        })
                    })
                }

                // Sort all activities by timestamp (most recent first)
                allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

                // Return top 6 activities
                return allActivities.slice(0, 6)
            } catch (error) {
                console.error('Error fetching recent activity:', error)
                return []
            }
        },
        enabled: !!company?.id,
        refetchInterval: 60000, // Refresh every minute
    })

    const getIcon = (type: string) => {
        switch (type) {
            case 'application': return <FileText className="w-4 h-4 text-blue-500" />
            case 'shift_published': return <Calendar className="w-4 h-4 text-emerald-500" />
            case 'shift_filled': return <CheckCircle className="w-4 h-4 text-green-500" />
            case 'shift_completed': return <Clock className="w-4 h-4 text-purple-500" />
            case 'new_employee': return <UserPlus className="w-4 h-4 text-amber-500" />
            default: return <User className="w-4 h-4 text-muted-foreground" />
        }
    }

    const handleActivityClick = (activity: ActivityItem) => {
        if (activity.link) {
            navigate(activity.link)
        }
    }

    return (
        <BentoCard className="h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-foreground">{t('recentActivity.title')}</h3>
            </div>

            <div className="space-y-6 relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-border/60" />

                {isLoading ? (
                    // Loading skeleton
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="relative pl-12 animate-pulse">
                            <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-muted" />
                            <div className="space-y-2">
                                <div className="h-4 bg-muted rounded w-32" />
                                <div className="h-3 bg-muted/50 rounded w-48" />
                            </div>
                        </div>
                    ))
                ) : activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('recentActivity.noActivity')}</p>
                        <p className="text-xs mt-1">{t('recentActivity.newActionsHere')}</p>
                    </div>
                ) : (
                    activities.map((activity, index) => (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className="relative pl-12"
                        >
                            {/* Dot on timeline */}
                            <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-card border-2 border-border/60 flex items-center justify-center z-10 shadow-sm">
                                {getIcon(activity.type)}
                            </div>

                            <button
                                onClick={() => handleActivityClick(activity)}
                                className="group cursor-pointer text-left w-full"
                            >
                                <div className="flex justify-between items-start mb-0.5">
                                    <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                        {activity.title}
                                    </h4>
                                    <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap ml-2">
                                        {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: fr })}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {activity.description}
                                </p>
                            </button>
                        </motion.div>
                    ))
                )}
            </div>
        </BentoCard>
    )
}
