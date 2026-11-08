import { useState } from 'react'
import { Bell, User, ExternalLink, Check, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/Popover'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { useChat } from '@/hooks/useChat'
import { useTranslation } from 'react-i18next'
import { logger } from '@/utils/logger'

interface Notification {
    id: string
    ids?: string[] // multiple IDs for event-grouped notifications
    type: 'freelancer_application' | 'employee_application' | 'new_message'
    title: string
    description: string
    createdAt: Date
    isRead: boolean
    link?: string
    shiftId?: string
}

export function NotificationDropdown() {
    const { t } = useTranslation()
    const { navigate } = useLocale()
    const { company, user } = useAuthStore()
    const queryClient = useQueryClient()
    const [open, setOpen] = useState(false)
    const [isMarkingRead, setIsMarkingRead] = useState(false)
    const { conversations } = useChat()

    // ✅ معدّل — نجيب الآن تطبيقات الفريلانس (shift_freelancer_applications) وتطبيقات
    // الموظفين (shift_applications) معًا، بنفس منطق التجميع (event grouping)،
    // وكل الروابط توجه لـ /shifts/{id} (لا /applications) — العميل يشوف كل
    // شئ فـ صفحة الشيفت.
    const { data: appNotifications = [], isLoading } = useQuery({
        queryKey: ['notifications', company?.id],
        queryFn: async (): Promise<Notification[]> => {
            if (!company?.id) return []

            try {
                // Get recent freelancer applications for company's shifts
                const { data: rawApplications, error } = await supabase
                    .from('shift_freelancer_applications')
                    .select(`
            id,
            freelancer_id,
            status,
            applied_at,
            viewed_at,
            shift:shift_id(
              id,
              position_name,
              company_id,
              event_id
            ),
            freelancer:freelancer_id(
              first_name,
              last_name
            )
          ` as '*')
                    .eq('status', 'applied')
                    .order('applied_at', { ascending: false })
                    .limit(30)

                if (error) {
                    console.error('Error fetching notifications:', error)
                }

                // ✅ جديد — تطبيقات الموظفين (employee applications)، نفس منطق الفريلانس
                const { data: rawEmployeeApplications, error: employeeError } = await supabase
                    .from('shift_applications')
                    .select(`
            id,
            user_id,
            status,
            applied_at,
            viewed_at,
            shift:shift_id(
              id,
              position_name,
              company_id,
              event_id
            ),
            user:user_id(
              first_name,
              last_name
            )
          ` as '*')
                    .in('status', ['applied', 'pending'])
                    .order('applied_at', { ascending: false })
                    .limit(30)

                if (employeeError) {
                    console.error('Error fetching employee notifications:', employeeError)
                }

                type AppRow = {
                    id: string
                    freelancer_id: string
                    status: string
                    applied_at: string | null
                    viewed_at: string | null
                    shift: { id: string; position_name: string; company_id: string; event_id: string | null } | null
                    freelancer: { first_name: string; last_name: string } | null
                }
                type EmployeeAppRow = {
                    id: string
                    user_id: string
                    status: string
                    applied_at: string | null
                    viewed_at: string | null
                    shift: { id: string; position_name: string; company_id: string; event_id: string | null } | null
                    user: { first_name: string; last_name: string } | null
                }
                const applications = (rawApplications || []) as unknown as AppRow[]
                const employeeApplications = (rawEmployeeApplications || []) as unknown as EmployeeAppRow[]

                // Filter by company
                const companyApps = applications.filter((app) => app.shift?.company_id === company.id)
                const companyEmployeeApps = employeeApplications.filter((app) => app.shift?.company_id === company.id)

                // Group by (freelancer_id + event_id) for event-grouped notifications
                const singles: AppRow[] = []
                const eventGroups = new Map<string, AppRow[]>()

                for (const app of companyApps) {
                    const eventId = app.shift?.event_id
                    if (!eventId) {
                        singles.push(app)
                        continue
                    }
                    const key = `${app.freelancer_id}__${eventId}`
                    if (!eventGroups.has(key)) eventGroups.set(key, [])
                    eventGroups.get(key)!.push(app)
                }

                // ✅ جديد — نفس تجميع event_id لكن للموظفين (user_id بدل freelancer_id)
                const employeeSingles: EmployeeAppRow[] = []
                const employeeEventGroups = new Map<string, EmployeeAppRow[]>()

                for (const app of companyEmployeeApps) {
                    const eventId = app.shift?.event_id
                    if (!eventId) {
                        employeeSingles.push(app)
                        continue
                    }
                    const key = `${app.user_id}__${eventId}`
                    if (!employeeEventGroups.has(key)) employeeEventGroups.set(key, [])
                    employeeEventGroups.get(key)!.push(app)
                }

                const notifications: Notification[] = []

                // Single notifications (freelancers)
                for (const app of singles) {
                    const applicantName = app.freelancer
                        ? `${app.freelancer.first_name} ${app.freelancer.last_name}`
                        : t('notifications.applicantFallback')

                    notifications.push({
                        id: app.id,
                        type: 'freelancer_application',
                        title: t('notifications.newApplication'),
                        description: t('notifications.appliedFor', { name: applicantName, position: app.shift?.position_name || t('notifications.aShift') }),
                        createdAt: new Date(app.applied_at || Date.now()),
                        isRead: !!app.viewed_at,
                        link: `/shifts/${app.shift?.id}`,
                        shiftId: app.shift?.id,
                    })
                }

                // Event-grouped notifications (freelancers)
                for (const [, apps] of eventGroups) {
                    const first = apps[0]
                    const applicantName = first.freelancer
                        ? `${first.freelancer.first_name} ${first.freelancer.last_name}`
                        : t('notifications.applicantFallback')
                    const allRead = apps.every(a => !!a.viewed_at)
                    const latestDate = apps.reduce((latest, a) => {
                        const d = new Date(a.applied_at || 0)
                        return d > latest ? d : latest
                    }, new Date(0))

                    notifications.push({
                        id: apps.map(a => a.id).join(','),
                        ids: apps.map(a => a.id),
                        type: 'freelancer_application',
                        title: t('notifications.newApplication'),
                        description: `${applicantName} ${t('notifications.appliedForEvent', { position: first.shift?.position_name || t('notifications.aShift'), count: apps.length, defaultValue: `a postulé pour ${first.shift?.position_name} (${apps.length} shifts)` })}`,
                        createdAt: latestDate,
                        isRead: allRead,
                        // ✅ معدّل — كان /applications، دابا /shifts/{id} باش العميل يشوف كل شئ فـ صفحة الشيفت
                        link: `/shifts/${first.shift?.id}`,
                        shiftId: first.shift?.id,
                    })
                }

                // ✅ جديد — Single notifications (employees)
                for (const app of employeeSingles) {
                    const applicantName = app.user
                        ? `${app.user.first_name} ${app.user.last_name}`
                        : t('notifications.applicantFallback')

                    notifications.push({
                        id: app.id,
                        type: 'employee_application',
                        title: t('notifications.newApplication'),
                        description: t('notifications.appliedFor', { name: applicantName, position: app.shift?.position_name || t('notifications.aShift') }),
                        createdAt: new Date(app.applied_at || Date.now()),
                        isRead: !!app.viewed_at,
                        link: `/shifts/${app.shift?.id}`,
                        shiftId: app.shift?.id,
                    })
                }

                // ✅ جديد — Event-grouped notifications (employees)
                for (const [, apps] of employeeEventGroups) {
                    const first = apps[0]
                    const applicantName = first.user
                        ? `${first.user.first_name} ${first.user.last_name}`
                        : t('notifications.applicantFallback')
                    const allRead = apps.every(a => !!a.viewed_at)
                    const latestDate = apps.reduce((latest, a) => {
                        const d = new Date(a.applied_at || 0)
                        return d > latest ? d : latest
                    }, new Date(0))

                    notifications.push({
                        id: apps.map(a => a.id).join(','),
                        ids: apps.map(a => a.id),
                        type: 'employee_application',
                        title: t('notifications.newApplication'),
                        description: `${applicantName} ${t('notifications.appliedForEvent', { position: first.shift?.position_name || t('notifications.aShift'), count: apps.length, defaultValue: `a postulé pour ${first.shift?.position_name} (${apps.length} shifts)` })}`,
                        createdAt: latestDate,
                        isRead: allRead,
                        link: `/shifts/${first.shift?.id}`,
                        shiftId: first.shift?.id,
                    })
                }

                return notifications
            } catch (error) {
                console.error('Error in notifications query:', error)
                return []
            }
        },
        enabled: !!company?.id,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
    })

    const chatNotifications: Notification[] = (conversations || [])
        .filter(conv => (conv.unread_count || 0) > 0)
        .map(conv => {
            const other = conv.participants.find(p => p.user_id !== user?.id)?.user
            const name = other ? `${other.first_name} ${other.last_name}` : t('notifications.someone')
            return {
                id: `msg-${conv.id}`,
                type: 'new_message',
                title: t('notifications.newMessage'),
                description: t('notifications.unreadMessages', { count: conv.unread_count, name }),
                createdAt: conv.last_message ? new Date(conv.last_message.created_at) : new Date(),
                isRead: false,
                link: `/messages?id=${conv.id}`,
            }
        })

    const notifications = [...chatNotifications, ...appNotifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const unreadCount = notifications.filter(n => !n.isRead).length

    const markApplicationsAsRead = async () => {
        // ✅ معدّل — نفرّق الآن بين IDs الفريلانس (shift_freelancer_applications)
        // وIDs الموظفين (shift_applications)، لأن كل واحد فـ جدول مختلف
        const freelancerIds: string[] = []
        const employeeIds: string[] = []
        for (const n of appNotifications) {
            if (n.isRead) continue
            const ids = n.ids || [n.id]
            if (n.type === 'employee_application') employeeIds.push(...ids)
            else freelancerIds.push(...ids)
        }
        if (freelancerIds.length === 0 && employeeIds.length === 0) return

        try {
            if (freelancerIds.length > 0) {
                const { error } = await supabase
                    .from('shift_freelancer_applications')
                    .update({ viewed_at: new Date().toISOString() } as never)
                    .in('id', freelancerIds)
                if (error) throw error
            }
            if (employeeIds.length > 0) {
                const { error } = await supabase
                    .from('shift_applications')
                    .update({ viewed_at: new Date().toISOString() } as never)
                    .in('id', employeeIds)
                if (error) throw error
            }
        } catch (error) {
            logger.error('Error marking applications as read:', error)
        }
    }

    const markChatAsRead = async () => {
        if (!user?.id) return
        const unreadConvs = (conversations || []).filter(conv => (conv.unread_count || 0) > 0)
        if (unreadConvs.length === 0) return

        try {
            for (const conv of unreadConvs) {
                await supabase
                    .from('conversation_participants')
                    .update({ last_read_at: new Date().toISOString() })
                    .eq('conversation_id', conv.id)
                    .eq('user_id', user.id)
            }
        } catch (error) {
            logger.error('Error marking conversations as read:', error)
        }
    }

    const handleOpen = async (isOpen: boolean) => {
        setOpen(isOpen)
    }

    const handleNotificationClick = (notification: Notification) => {
        if (notification.link) {
            navigate(notification.link)
            setOpen(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={handleOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-0"
                align="end"
                sideOffset={8}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h3 className="font-semibold text-sm">{t('notifications.title')}</h3>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation()
                                    setIsMarkingRead(true)
                                    try {
                                        await Promise.all([
                                            markApplicationsAsRead(),
                                            markChatAsRead(),
                                        ])
                                        queryClient.invalidateQueries({ queryKey: ['notifications'] })
                                        queryClient.invalidateQueries({ queryKey: ['unviewed-applications-count'] })
                                        queryClient.invalidateQueries({ queryKey: ['conversations'] })
                                    } finally {
                                        setIsMarkingRead(false)
                                    }
                                }}
                                disabled={isMarkingRead}
                                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                            >
                                <Check className="w-3 h-3" />
                                <span>{t('notifications.markAllRead')}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                            <p className="text-xs">{t('notifications.loading')}</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">{t('notifications.noNotifications')}</p>
                            <p className="text-xs mt-1">{t('notifications.newApplicationsHere')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                                        !notification.isRead && "bg-primary/5"
                                    )}
                                >
                                    <div className="flex gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                            notification.type === 'new_message'
                                                ? "bg-primary/10 text-primary"
                                                : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                        )}>
                                            {notification.type === 'new_message' ? <MessageSquare className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm truncate",
                                                    !notification.isRead ? "font-semibold" : "font-medium"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {notification.description}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                                                {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: fr })}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="border-t border-border p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs justify-center"
                            onClick={() => {
                                navigate('/shifts')
                                setOpen(false)
                            }}
                        >
                            {t('notifications.viewAllShifts')}
                            <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}