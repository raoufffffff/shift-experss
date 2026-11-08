/**
 * Notifications réelles de l'espace client (utilisées par la cloche v2).
 *
 * Même source que l'ancienne cloche (NotificationDropdown) — il n'existe pas de
 * table `notifications` : elles sont déduites de l'état réel en base :
 *  · candidatures d'auto-entrepreneurs  → `shift_freelancer_applications` (status = applied)
 *  · candidatures de salariés           → `shift_applications` (status = applied | pending)
 *  · messages non lus                   → conversations (`useChat`)
 * Lu / non lu = `viewed_at` (candidatures) et `last_read_at` (conversations).
 * Les candidatures d'un même événement (`event_id`) par la même personne sont
 * regroupées en une seule notification.
 */
import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useChat } from '@/hooks/useChat'
import { logger } from '@/utils/logger'

export type RealNotifSource = 'freelancer' | 'employee' | 'message'

export interface RealNotif {
  /** identifiant stable (ids concaténés pour un groupe d'événement) */
  id: string
  /** ids en base à marquer comme lus (candidatures) */
  ids: string[]
  source: RealNotifSource
  title: string
  detail: string
  createdAt: Date
  isRead: boolean
  shiftId?: string
  conversationId?: string
}

type ShiftJoin = {
  id: string
  position_name: string | null
  company_id: string
  event_id: string | null
  start_time: string
  end_time: string
  establishment: { timezone: string | null } | null
}
type PersonJoin = { first_name: string; last_name: string } | null
interface AppRow {
  id: string
  applicantKey: string
  applied_at: string | null
  viewed_at: string | null
  shift: ShiftJoin | null
  person: PersonJoin
}

const DEFAULT_TZ = 'Europe/Paris'

const SHIFT_SELECT = `
  id, position_name, company_id, event_id, start_time, end_time,
  establishment:establishments(timezone)
`

/** « lun. 2 nov. · 18:00–23:00 » dans le fuseau de l'établissement. */
function whenLabel(shift: ShiftJoin | null): string {
  if (!shift) return ''
  const tz = shift.establishment?.timezone || DEFAULT_TZ
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  const day = start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz })
  const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  return `${day} · ${hm(start)}–${hm(end)}`
}

const fullName = (p: PersonJoin) => (p ? `${p.first_name} ${p.last_name}`.trim() : 'Quelqu’un')

/** Regroupe les candidatures d'un même événement pour une même personne. */
function toNotifs(rows: AppRow[], source: 'freelancer' | 'employee'): RealNotif[] {
  const singles: AppRow[][] = []
  const groups = new Map<string, AppRow[]>()
  for (const r of rows) {
    const eventId = r.shift?.event_id
    if (!eventId) {
      singles.push([r])
      continue
    }
    const key = `${r.applicantKey}__${eventId}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  return [...singles, ...groups.values()].map((apps) => {
    const first = apps[0]
    const poste = first.shift?.position_name || 'un shift'
    const latest = apps.reduce((d, a) => {
      const t = new Date(a.applied_at || 0)
      return t > d ? t : d
    }, new Date(0))
    return {
      id: `${source}:${apps.map((a) => a.id).join(',')}`,
      ids: apps.map((a) => a.id),
      source,
      title: `${fullName(first.person)} se propose`,
      detail:
        apps.length > 1
          ? `${poste} · ${apps.length} shifts (événement)`
          : `${poste} · ${whenLabel(first.shift)}`,
      createdAt: latest,
      isRead: apps.every((a) => !!a.viewed_at),
      shiftId: first.shift?.id,
    }
  })
}

export function useRealNotifications() {
  const company = useAuthStore((s) => s.company)
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const { conversations } = useChat()

  // Clé préfixée par ['notifications'] : l'invalidation temps réel de App.tsx
  // (shift_freelancer_applications / shift_applications) la rafraîchit aussi.
  const { data: applicationNotifs = [], isLoading } = useQuery({
    queryKey: ['notifications', company?.id, 'v2'],
    enabled: !!company?.id,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<RealNotif[]> => {
      if (!company?.id) return []
      try {
        const [freelancers, employees] = await Promise.all([
          supabase
            .from('shift_freelancer_applications')
            .select(
              `id, freelancer_id, applied_at, viewed_at,
               shift:shift_id(${SHIFT_SELECT}),
               freelancer:freelancer_id(first_name, last_name)` as '*',
            )
            .eq('status', 'applied')
            .order('applied_at', { ascending: false })
            .limit(30),
          supabase
            .from('shift_applications')
            .select(
              `id, user_id, applied_at, viewed_at,
               shift:shift_id(${SHIFT_SELECT}),
               user:user_id(first_name, last_name)` as '*',
            )
            .in('status', ['applied', 'pending'])
            .order('applied_at', { ascending: false })
            .limit(30),
        ])
        if (freelancers.error) logger.error('Notifications (freelancers):', freelancers.error)
        if (employees.error) logger.error('Notifications (employees):', employees.error)

        const fRows = ((freelancers.data || []) as unknown as Array<{
          id: string
          freelancer_id: string
          applied_at: string | null
          viewed_at: string | null
          shift: ShiftJoin | null
          freelancer: PersonJoin
        }>)
          .filter((r) => r.shift?.company_id === company.id)
          .map<AppRow>((r) => ({
            id: r.id,
            applicantKey: r.freelancer_id,
            applied_at: r.applied_at,
            viewed_at: r.viewed_at,
            shift: r.shift,
            person: r.freelancer,
          }))

        const eRows = ((employees.data || []) as unknown as Array<{
          id: string
          user_id: string
          applied_at: string | null
          viewed_at: string | null
          shift: ShiftJoin | null
          user: PersonJoin
        }>)
          .filter((r) => r.shift?.company_id === company.id)
          .map<AppRow>((r) => ({
            id: r.id,
            applicantKey: r.user_id,
            applied_at: r.applied_at,
            viewed_at: r.viewed_at,
            shift: r.shift,
            person: r.user,
          }))

        return [...toNotifs(fRows, 'freelancer'), ...toNotifs(eRows, 'employee')]
      } catch (error) {
        logger.error('Notifications query failed:', error)
        return []
      }
    },
  })

  const messageNotifs: RealNotif[] = useMemo(
    () =>
      (conversations || [])
        .filter((c) => (c.unread_count || 0) > 0)
        .map((c) => {
          const other = c.participants.find((p) => p.user_id !== user?.id)?.user
          const name = other ? `${other.first_name} ${other.last_name}`.trim() : 'Quelqu’un'
          const n = c.unread_count || 0
          return {
            id: `message:${c.id}`,
            ids: [],
            source: 'message' as const,
            title: `${name} vous a écrit`,
            detail: `${n} message${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}`,
            createdAt: c.last_message ? new Date(c.last_message.created_at) : new Date(),
            isRead: false,
            conversationId: c.id,
          }
        }),
    [conversations, user?.id],
  )

  const notifs = useMemo(
    () => [...messageNotifs, ...applicationNotifs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [messageNotifs, applicationNotifs],
  )

  /** Marque comme lues les notifications données (même logique que l'ancienne cloche). */
  const markAsRead = async (list: RealNotif[]) => {
    const now = new Date().toISOString()
    const freelancerIds = list.filter((n) => n.source === 'freelancer' && !n.isRead).flatMap((n) => n.ids)
    const employeeIds = list.filter((n) => n.source === 'employee' && !n.isRead).flatMap((n) => n.ids)
    const conversationIds = list.filter((n) => n.source === 'message').map((n) => n.conversationId!)

    try {
      if (freelancerIds.length) {
        const { error } = await supabase
          .from('shift_freelancer_applications')
          .update({ viewed_at: now } as never)
          .in('id', freelancerIds)
        if (error) throw error
      }
      if (employeeIds.length) {
        const { error } = await supabase
          .from('shift_applications')
          .update({ viewed_at: now } as never)
          .in('id', employeeIds)
        if (error) throw error
      }
      if (conversationIds.length && user?.id) {
        await Promise.all(
          conversationIds.map((id) =>
            supabase
              .from('conversation_participants')
              .update({ last_read_at: now })
              .eq('conversation_id', id)
              .eq('user_id', user.id),
          ),
        )
      }
    } catch (error) {
      logger.error('Error marking notifications as read:', error)
    } finally {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unviewed-applications-count'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  }

  return { notifs, isLoading, markAsRead }
}
