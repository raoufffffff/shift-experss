import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useEstablishmentStore } from '@/stores/establishmentStore'
import { useTranslation } from 'react-i18next'
import { useChat } from '@/hooks/useChat'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { supabase } from '@/lib/supabase'
import { fetchShifts } from '@/api/shifts'
import { calculateUsage, getBillingPeriod } from '@shared/subscription-limits'
import { logger } from '@/utils/logger'
import { handleSupabaseError } from '@/lib/error-handler'
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Building2,
  Briefcase,
  CreditCard,
  Settings,
  HelpCircle,
  UserCog,
  Banknote,
  MessageSquare,
  Star,
  FileText,
  type LucideIcon,
} from 'lucide-react'

// ─── Navigation data ────────────────────────────────────────────────

export interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  group: string
  adminOnly?: boolean
  comingSoon?: boolean
}

export const allNavigation: NavigationItem[] = [
  // Opérationnel
  { name: 'sidebar.dashboard', href: '/', icon: LayoutDashboard, group: 'operational' },
  { name: 'sidebar.shifts', href: '/shifts', icon: CalendarClock, group: 'operational' },
  // { name: 'sidebar.applications', href: '/applications', icon: Users, group: 'operational' },
  { name: 'sidebar.reviews', href: '/reviews', icon: Star, group: 'operational' },
  { name: 'sidebar.messages', href: '/messages', icon: MessageSquare, group: 'operational' },
  { name: 'sidebar.payroll', href: '/payroll', icon: FileText, group: 'operational' },

  // Structure
  { name: 'sidebar.employees', href: '/employees', icon: Users, group: 'structure' },
  { name: 'sidebar.freelancers', href: '/freelancers', icon: Briefcase, group: 'structure' },
  { name: 'sidebar.establishments', href: '/establishments', icon: Building2, adminOnly: true, group: 'structure' },
  { name: 'sidebar.team', href: '/team', icon: UserCog, adminOnly: true, group: 'structure' },

  // Profile
  { name: 'sidebar.subscription', href: '/subscription', icon: CreditCard, adminOnly: true, group: 'profile' },
  { name: 'sidebar.settings', href: '/settings', icon: Settings, group: 'profile' },
  { name: 'sidebar.support', href: '/support', icon: HelpCircle, group: 'profile' },
]

export const navigationGroups = [
  { key: 'operational', label: 'sidebar.groups.activity' },
  { key: 'structure', label: 'sidebar.groups.organization' },
  { key: 'profile', label: 'sidebar.groups.account' },
] as const

// ─── Badge helpers ──────────────────────────────────────────────────

interface UsageResource {
  current: number
  max: number
  isUnlimited: boolean
}

interface UsageData {
  shifts?: UsageResource
  employees?: UsageResource
  establishments?: UsageResource
}

export interface UsageBadge {
  text: string
  color: string
}

export function getUsageBadge(href: string, usage: UsageData | null | undefined): UsageBadge | null {
  if (!usage) return null

  const resource =
    href === '/shifts' ? usage.shifts
      : href === '/employees' ? usage.employees
        : href === '/establishments' ? usage.establishments
          : null

  if (!resource) return null

  const text = resource.isUnlimited
    ? `${resource.current}/∞`
    : `${resource.current}/${resource.max}`

  let percentage = 0
  if (!resource.isUnlimited) {
    percentage = (resource.current / resource.max) * 100
  }

  // Sidebar is always dark, so use dark-friendly colors
  let color: string
  if (text.includes('∞')) {
    color = 'text-emerald-400 bg-emerald-500/15'
  } else if (percentage >= 90) {
    color = 'text-red-400 bg-red-500/15'
  } else if (percentage >= 70) {
    color = 'text-orange-400 bg-orange-500/15'
  } else {
    color = 'text-sidebar-accent bg-sidebar-accent/15'
  }

  return { text, color }
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useDashboardLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { totalUnreadCount } = useChat()
  const { user, company, logout, isLoading: isAuthLoading } = useAuthStore()
  const { selectedEstablishmentId } = useEstablishmentStore()

  // ─── UI state ───────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved === 'true'
  })

  // Persist sidebar preference
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  // ─── Queries ────────────────────────────────────────────────

  const { data: currentEstablishment } = useQuery({
    queryKey: ['establishment', selectedEstablishmentId],
    queryFn: async () => {
      if (!selectedEstablishmentId) return null
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name, logo_url')
        .eq('id', selectedEstablishmentId)
        .single()
      if (error) return null
      return data as { id: string; name: string; logo_url?: string } | null
    },
    enabled: !!selectedEstablishmentId,
  })

  const { data: unviewedCount = 0 } = useQuery({
    queryKey: ['unviewed-applications-count', company?.id],
    queryFn: async () => {
      if (!company?.id || user?.role === 'employee') return 0
      const { data, error } = await supabase.rpc('get_unviewed_applications_count', {
        company_id_param: company.id,
      })
      if (error) {
        logger.error('Error fetching unviewed applications count:', error)
        return 0
      }
      return data || 0
    },
    enabled: !!company?.id && (user?.role === 'admin' || user?.role === 'manager'),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  const { data: pendingPaymentsCount = 0 } = useQuery({
    queryKey: ['pending-payments-count', company?.id],
    queryFn: async () => {
      if (!company?.id || user?.role === 'employee') return 0
      const { count, error } = await supabase
        .from('payment_tickets' as never)
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'pending')
      if (error) {
        logger.error('Error fetching pending payments count:', error)
        return 0
      }
      return count || 0
    },
    enabled: !!company?.id && (user?.role === 'admin' || user?.role === 'manager'),
    refetchInterval: 10000,
  })

  useNotificationSound(unviewedCount, false)

  const { data: usage } = useQuery({
    queryKey: ['plan-usage', company?.id, selectedEstablishmentId],
    queryFn: async () => {
      if (!company?.id) return null

      const { count: establishmentsCount } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'active')

      const billingPeriod = getBillingPeriod(company)
      let shiftsQuery = supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('targets_employees', true)
        .gte('created_at', billingPeriod.start)
        .lte('created_at', billingPeriod.end)

      if (selectedEstablishmentId) {
        shiftsQuery = shiftsQuery.eq('establishment_id', selectedEstablishmentId)
      }
      const { count: shiftsCount } = await shiftsQuery

      let employeesQuery = supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)

      if (selectedEstablishmentId && selectedEstablishmentId !== 'null') {
        employeesQuery = employeesQuery.eq('establishment_id', selectedEstablishmentId)
      }
      const { count: employeesCount } = await employeesQuery

      return calculateUsage(
        establishmentsCount || 0,
        shiftsCount || 0,
        employeesCount || 0,
        company.subscription_plan || 'free'
      )
    },
    enabled: !!company?.id,
  })

  const { data: assignedEstablishment } = useQuery({
    queryKey: ['assigned-establishment', user?.assigned_establishment_id],
    queryFn: async () => {
      if (!user?.assigned_establishment_id) return null
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('id', user.assigned_establishment_id)
        .single()
      if (error) {
        handleSupabaseError(error, {
          context: 'DashboardLayout',
          operation: 'fetchAssignedEstablishment',
          userId: user?.id,
          metadata: { establishmentId: user.assigned_establishment_id }
        })
        return null
      }
      return data
    },
    enabled: !!user?.assigned_establishment_id && user?.role === 'manager',
  })

  // ─── Derived data ──────────────────────────────────────────

  const displayLogo = currentEstablishment?.logo_url || company?.logo_url

  const navigation = allNavigation.filter(item =>
    !item.adminOnly || user?.role === 'admin'
  )

  // ─── Helpers ───────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    logout()
    setShowLogoutDialog(false)
    setMobileMenuOpen(false)
  }, [logout])

  const handlePrefetch = useCallback(async (href: string) => {
    if (!company?.id) return

    const codePromise = (() => {
      switch (href) {
        case '/': return import('../../pages/dashboard/DashboardPage')
        case '/shifts': return import('../../pages/shifts/ShiftsPage')
        case '/employees': return import('../../pages/employees/EmployeesPage')
        case '/freelancers': return import('../../pages/freelancers/FreelancersPage')
        case '/establishments': return import('../../pages/establishments/EstablishmentsPage')
        case '/team': return import('../../pages/team/TeamPage')
        case '/subscription': return import('../../pages/subscription/SubscriptionPage')
        case '/settings': return import('../../pages/settings/SettingsPage')
        case '/support': return import('../../pages/support/SupportPage')
        default: return Promise.resolve()
      }
    })()

    const dataPromise = (() => {
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      switch (href) {
        case '/shifts':
          return queryClient.prefetchQuery({
            queryKey: ['shifts', 'today', null, null, company.id, user?.role, selectedEstablishmentId],
            queryFn: () => fetchShifts({
              companyId: company.id,
              userRole: user?.role,
              assignedEstablishmentId: user?.assigned_establishment_id,
              selectedEstablishmentId,
              status: 'all',
              startDate
            }),
            staleTime: 1000 * 60 * 5
          })
        case '/employees':
          return queryClient.prefetchQuery({
            queryKey: ['employees', company.id, selectedEstablishmentId],
            queryFn: async () => {
              let query = supabase
                .from('employees')
                .select('*, establishment:establishment_id(name), user:user_id(first_name, last_name, email)')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
              if (selectedEstablishmentId) {
                query = query.eq('establishment_id', selectedEstablishmentId)
              }
              const { data } = await query
              return data || []
            },
            staleTime: 1000 * 60 * 5
          })
        case '/establishments':
          return queryClient.prefetchQuery({
            queryKey: ['establishments', company.id],
            queryFn: async () => {
              const { data } = await supabase
                .from('establishments')
                .select('*')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
              return data || []
            },
            staleTime: 1000 * 60 * 5
          })
        case '/freelancers':
          return queryClient.prefetchQuery({
            queryKey: ['favorite-freelancers', company.id, selectedEstablishmentId],
            queryFn: async () => {
              if (!selectedEstablishmentId) return []
              const { data } = await supabase
                .from('establishment_freelancers')
                .select('*, freelancer:freelancers(*)')
                .eq('establishment_id', selectedEstablishmentId)
                .eq('is_favorite', true)
              return data || []
            },
            staleTime: 1000 * 60 * 5
          })
        default:
          return Promise.resolve()
      }
    })()

    await Promise.all([codePromise, dataPromise])
  }, [company, user, selectedEstablishmentId, queryClient])

  const getCurrentPageTitle = useCallback(() => {
    const pathWithoutLocale = location.pathname.replace(/^\/(en|fr|es|it|zh)/, '')

    for (const item of allNavigation) {
      if (item.href === '/') {
        if (pathWithoutLocale === '/' || pathWithoutLocale === '') {
          return t(item.name)
        }
      } else if (pathWithoutLocale.startsWith(item.href)) {
        if (pathWithoutLocale.includes('/new')) {
          return t('shifts.createShift', { defaultValue: 'Créer un shift' })
        }
        return t(item.name)
      }
    }
    return t('sidebar.dashboard')
  }, [location.pathname, t])

  // ─── Preload adjacent pages ────────────────────────────────

  useEffect(() => {
    const pathWithoutLocale = location.pathname.replace(/^\/(en|fr|es|it|zh)/, '') || '/'

    const adjacentPages: Record<string, string[]> = {
      '/': ['/shifts'],
      '/shifts': ['/'],
      '/employees': ['/shifts'],
      '/establishments': ['/employees'],
      '/freelancers': ['/shifts'],
    }

    const currentPath = Object.keys(adjacentPages).find(path =>
      path === '/' ? (pathWithoutLocale === '/' || pathWithoutLocale === '') : pathWithoutLocale.startsWith(path)
    )

    if (currentPath && adjacentPages[currentPath]) {
      const timers: NodeJS.Timeout[] = []

      adjacentPages[currentPath].forEach((href, index) => {
        const timer = setTimeout(() => {
          const preload = () => {
            switch (href) {
              case '/': import('../../pages/dashboard/DashboardPage'); break
              case '/shifts': import('../../pages/shifts/ShiftsPage'); break
              case '/employees': import('../../pages/employees/EmployeesPage'); break
              case '/freelancers': import('../../pages/freelancers/FreelancersPage'); break
              case '/establishments': import('../../pages/establishments/EstablishmentsPage'); break
            }
          }

          if ('requestIdleCallback' in window) {
            (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(preload, { timeout: 5000 })
          } else {
            preload()
          }
        }, 3000 + (index * 1000))

        timers.push(timer)
      })

      return () => timers.forEach(timer => clearTimeout(timer))
    }
  }, [location.pathname])

  return {
    // Auth
    user,
    company,
    isAuthLoading,
    // Navigation
    navigation,
    location,
    // Badges
    unviewedCount,
    pendingPaymentsCount,
    totalUnreadCount,
    usage,
    // Establishment
    displayLogo,
    assignedEstablishment,
    // UI state
    mobileMenuOpen,
    setMobileMenuOpen,
    showLogoutDialog,
    setShowLogoutDialog,
    sidebarCollapsed,
    setSidebarCollapsed,
    // Handlers
    handleLogout,
    handlePrefetch,
    getCurrentPageTitle,
    // i18n
    t,
  }
}
