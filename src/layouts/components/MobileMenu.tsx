import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { EstablishmentSelector } from '@/components/establishments/EstablishmentSelector'

import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  Building2,
  Plus,
  User as UserIcon,
  LogOut,
  ArrowUpCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import type { User, Company } from '@shared/types'
import { type NavigationItem, navigationGroups, getUsageBadge } from '../hooks/useDashboardLayout'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  navigation: NavigationItem[]
  isAuthLoading: boolean
  user: User | null
  company: Company | null
  assignedEstablishment: { id: string; name: string } | null | undefined
  unviewedCount: number
  totalUnreadCount: number
  pendingPaymentsCount: number
  usage: Parameters<typeof getUsageBadge>[1]
  onPrefetch: (href: string) => void
  onLogout: () => void
}

export function MobileMenu({
  open,
  onClose,
  navigation,
  isAuthLoading,
  user,
  company,
  assignedEstablishment,
  unviewedCount,
  totalUnreadCount,
  pendingPaymentsCount,
  usage, 
  onPrefetch,
  onLogout,
}: MobileMenuProps) {
  const { t } = useTranslation()
  const location = useLocation()

  if (!open) return null

  return (
    <div className="lg:hidden fixed inset-0 z-40 bg-background pt-16" role="dialog" aria-modal="true">
      <div className="flex flex-col h-full">
        {/* Establishment selector */}
        <div className="px-4 py-3 border-b border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {t('sidebar.showDataFor')}
          </div>
          {isAuthLoading ? (
            <div className="w-full h-[34px] bg-muted/20 animate-pulse rounded-lg border border-transparent" />
          ) : user?.role === 'admin' ? (
            <EstablishmentSelector />
          ) : (
            assignedEstablishment && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground truncate">
                  {assignedEstablishment.name}
                </span>
              </div>
            )
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-5 overflow-y-auto space-y-8" aria-label={t('accessibility.mainNavigation')}>
          {navigationGroups.map((group) => {
            const groupItems = navigation.filter(item => item.group === group.key)
            if (groupItems.length === 0) return null

            return (
              <div key={group.key}>
                <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t(group.label)}
                </div>
                <div className="space-y-1.5">
                  {groupItems.map((item) => {
                    const Icon = item.icon
                    const pathWithoutLocale = location.pathname.replace(/^\/(en|fr|es|it|zh)/, '')
                    const isActive = item.href === '/'
                      ? pathWithoutLocale === '/' || pathWithoutLocale === ''
                      : pathWithoutLocale.startsWith(item.href)
                    const showApplicationsBadge = item.href === '/applications' && unviewedCount > 0
                    const showMessagesBadge = item.href === '/messages' && totalUnreadCount > 0
                    const showFinanceBadge = item.href === '/payroll' && pendingPaymentsCount > 0
                    const showPlanBadge = item.href === '/subscription' && company?.subscription_plan
                    const usageBadge = getUsageBadge(item.href, usage)

                    const content = (
                      <>
                        <Icon className="w-5 h-5" aria-hidden="true" />
                        {t(item.name)}
                        {item.comingSoon && (
                          <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-tight bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            Soon
                          </span>
                        )}
                        {showApplicationsBadge && (
                          <span className="ml-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold" aria-label={t('layout.ariaLabels.newApplications', { count: unviewedCount })}>
                            {unviewedCount > 99 ? '99+' : unviewedCount}
                          </span>
                        )}
                        {showMessagesBadge && (
                          <span className="ml-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                          </span>
                        )}
                        {showFinanceBadge && (
                          <span className="ml-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                            {pendingPaymentsCount > 99 ? '99+' : pendingPaymentsCount}
                          </span>
                        )}
                        {usageBadge && (
                          <span className={`ml-auto px-1.5 py-0 rounded-full text-[10px] font-bold tracking-tight ${usageBadge.color}`}>
                            {usageBadge.text}
                          </span>
                        )}
                        {showPlanBadge && (
                          <>
                            {company?.subscription_plan === 'free' && (
                              <ArrowUpCircle className="ml-auto flex-shrink-0 w-4 h-4 text-green-600 dark:text-green-500" />
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-xs font-medium text-primary capitalize ${company?.subscription_plan === 'free' ? '-ml-1' : 'ml-auto'}`}>
                              {company?.subscription_plan}
                            </span>
                          </>
                        )}
                      </>
                    )

                    return item.comingSoon ? (
                      <div
                        key={item.href}
                        className={cn(
                          'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative opacity-60 cursor-not-allowed',
                          'text-muted-foreground'
                        )}
                      >
                        {content}
                      </div>
                    ) : (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        onMouseEnter={() => onPrefetch(item.href)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative',
                          isActive
                            ? 'border border-primary/20 text-primary bg-primary/5 shadow-[0_0_10px_rgba(59,130,246,0.05)]'
                            : 'text-foreground/90 hover:bg-muted/60 hover:text-foreground'
                        )}
                      >
                        {content}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Publish shift button */}
        {usage?.shifts?.canCreate && <div className="px-4 pb-3">
          <Link
            to="/shifts/new"
            onClick={onClose}
            className="group flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            {t('sidebar.publishShift')}
          </Link>
        </div>}

        {/* User menu */}
        <div className="p-4 border-t border-border bg-gradient-to-t from-muted/20 to-transparent">
          <Link
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-3 mb-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-sm ring-2 ring-primary/10">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-foreground">
                {company?.name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-destructive dark:text-red-400 hover:text-destructive dark:hover:text-red-300 hover:bg-destructive/10 dark:hover:bg-red-950/30 font-medium transition-colors h-9"
              onClick={onLogout}
              aria-label={t('layout.ariaLabels.logout')}
            >
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('sidebar.logout')}
            </Button>
            <div className="flex-1">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
