import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { LanguageSwitcher } from '@/components/auth/LanguageSwitcher'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  Plus,
  LogOut,
  PanelLeftClose,
  ArrowUpCircle,
  Settings,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { User, Company } from '@shared/types'
import { type NavigationItem, navigationGroups, getUsageBadge } from '../hooks/useDashboardLayout'
 
interface DesktopSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  navigation: NavigationItem[]
  displayLogo: string | null | undefined
  user: User | null
  company: Company | null
  unviewedCount: number
  totalUnreadCount: number
  pendingPaymentsCount: number
  usage: Parameters<typeof getUsageBadge>[1]
  onPrefetch: (href: string) => void
  onLogout: () => void
}

export function DesktopSidebar({
  collapsed,
  onToggleCollapse,
  navigation,
  displayLogo,
  user,
  company,
  unviewedCount,
  totalUnreadCount,
  pendingPaymentsCount,
  usage,
  onPrefetch,
  onLogout,
}: DesktopSidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
    
  
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 left-0 z-50",
        "bg-sidebar",
        "transition-all duration-300 ease-out",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Collapsed Toggle overlay */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-6 -right-3 z-50 p-1.5 rounded-full bg-card border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          title={t('sidebar.expand', { defaultValue: 'Déplier la sidebar' })}
        >
          <PanelLeftClose className="w-3 h-3 rotate-180" />
        </button>
      )}

      <div className="relative flex flex-col h-full">
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-4 pt-2 relative mb-6">
          <Link to="/" className={cn(
            "flex items-center gap-2.5 group transition-all",
            collapsed ? "justify-center w-full" : ""
          )}>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img src="/logo-header.svg" alt="Shift Express" className="w-6 h-6 relative z-10 transition-transform duration-300 group-hover:rotate-12" loading="lazy" width={24} height={24} />
            </div>

            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg text-sidebar-foreground font-sans lowercase leading-tight whitespace-nowrap tracking-tight">
                  <span className="font-semibold">shift</span>
                  <span className="font-light opacity-60">express</span>
                </span>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-sidebar-muted transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
              title={t('sidebar.collapse', { defaultValue: 'Replier la sidebar' })}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>


        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto overflow-x-hidden space-y-3.5 scrollbar-none" aria-label={t('accessibility.mainNavigation')}>
          {navigationGroups.map((group) => {
            const groupItems = navigation.filter(item => item.group === group.key)
            if (groupItems.length === 0) return null

            return (
              <div key={group.key}>
                {!collapsed && (
                  <div className="px-3 mb-1 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-[0.2em]">
                    {t(group.label)}
                  </div>
                )}
                <div className="space-y-0">
                  {groupItems.map((item) => {
                    const Icon = item.icon
                    const pathWithoutLocale = location.pathname.replace(/^\/(en|fr|es|it|zh)/, '')
                    const isActive = item.href === '/'
                      ? pathWithoutLocale === '/' || pathWithoutLocale === ''
                      : pathWithoutLocale.startsWith(item.href)

                    const showApplicationsBadge = item.href === '/applications' && unviewedCount > 0
                    const showMessagesBadge = item.href === '/messages' && totalUnreadCount > 0
                    const showFinanceBadge = item.href === '/payroll' && pendingPaymentsCount > 0
                    const usageBadge = getUsageBadge(item.href, usage)

                    const linkContent = (
                      <>
                        <Icon className={cn(
                          "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                          !isActive && "group-hover:scale-110"
                        )} aria-hidden="true" />

                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="font-medium truncate text-sm"
                          >
                            {t(item.name)}
                          </motion.span>
                        )}

                        {!collapsed && (
                          <>
                            {item.comingSoon && (
                              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-tight bg-amber-500/15 text-amber-300">
                                Soon
                              </span>
                            )}
                            {showApplicationsBadge && (
                              <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse" aria-label={t('layout.ariaLabels.newApplications', { count: unviewedCount })}>
                                {unviewedCount > 99 ? '99+' : unviewedCount}
                              </span>
                            )}
                            {showMessagesBadge && (
                              <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-sidebar-accent text-white text-xs font-bold">
                                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                              </span>
                            )}
                            {showFinanceBadge && (
                              <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                                {pendingPaymentsCount > 99 ? '99+' : pendingPaymentsCount}
                              </span>
                            )}
                            {usageBadge && (
                              <span className={`ml-auto px-1.5 py-0 rounded-full text-[10px] font-bold tracking-tight ${usageBadge.color}`}>
                                {usageBadge.text}
                              </span>
                            )}
                          </>
                        )}

                        {/* Badge for collapsed state */}
                        {collapsed && showApplicationsBadge && (
                          <span className="absolute top-2 right-2 flex items-center justify-center w-2 h-2 rounded-full bg-red-500 shadow-sm ring-2 ring-sidebar" />
                        )}
                        {collapsed && showMessagesBadge && (
                          <span className="absolute top-2 right-2 flex items-center justify-center w-2 h-2 rounded-full bg-sidebar-accent shadow-sm ring-2 ring-sidebar" />
                        )}
                        {collapsed && showFinanceBadge && (
                          <span className="absolute top-2 right-2 flex items-center justify-center w-2 h-2 rounded-full bg-red-500 shadow-sm ring-2 ring-sidebar animate-pulse" />
                        )}
                      </>
                    )

                    return (
                      <div key={item.href} className="relative group px-1">
                        {item.comingSoon ? (
                          <div className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all relative opacity-50 cursor-not-allowed',
                            collapsed ? 'justify-center' : ''
                          )}>
                            {linkContent}
                          </div>
                        ) : (
                          <Link
                            to={item.href}
                            onMouseEnter={() => onPrefetch(item.href)}
                            className={cn(
                              'group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative',
                              collapsed ? 'justify-center' : '',
                              isActive
                                ? 'text-white bg-sidebar-accent/20 border-l-[3px] border-sidebar-accent'
                                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5 border-l-[3px] border-transparent'
                            )}
                          >
                            <div className="flex items-center gap-3 w-full overflow-hidden">
                              {linkContent}
                            </div>
                          </Link>
                        )}
                        {/* Tooltip for collapsed state */}
                        {collapsed && (
                          <div className="invisible group-hover:visible fixed left-[90px] px-3 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-[100] backdrop-blur-md bg-opacity-90 border border-white/10 flex items-center gap-2 transform -translate-y-[calc(50%-20px)]">
                            {t(item.name)}
                            {item.comingSoon && <span className="text-[9px] bg-amber-500 text-black px-1 rounded">Soon</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Publish shift button */}
    {/* Publish shift button OR Upgrade button */}
{usage?.shifts?.canCreate ? (
  <div className="px-4 pb-3 pt-1">
    <Link
      to="/shifts/new"
      className={cn(
        "group relative flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all",
        "bg-sidebar-accent text-white hover:bg-sidebar-accent/90 hover:scale-[1.02] active:scale-[0.98]",
        collapsed && "justify-center px-0 aspect-square"
      )}
      title={collapsed ? t('sidebar.publishShift') : undefined}
    >
      <Plus className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:rotate-90", collapsed ? "" : "mr-0")} />
      {!collapsed && t('sidebar.publishShift')}
    </Link>
  </div>
) : (
  <div className="px-4 pb-3 pt-1">
    <Link
      to="/subscription"
      onMouseEnter={() => onPrefetch('/settings/subscription')}
      className={cn(
        "group relative flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all",
        "bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98]",
        collapsed && "justify-center px-0 aspect-square"
      )}
      title={collapsed ? t('sidebar.upgradePlan', { defaultValue: 'Passer à un forfait supérieur' }) : undefined}
    >
      <ArrowUpCircle className={cn("w-5 h-5 flex-shrink-0", collapsed ? "" : "mr-0")} />
      {!collapsed && t('sidebar.upgradePlan', { defaultValue: 'Passer à un forfait supérieur' })}
    </Link>
  </div>
)}

        {/* User menu - Bottom */}
        <div className="p-3 mt-auto border-t border-white/10 space-y-1.5">
          <Link
            to="/settings"
            onMouseEnter={() => onPrefetch('/settings')}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5 transition-colors",
              collapsed ? "justify-center" : "text-xs"
            )}
            title={collapsed ? t('sidebar.modifyProfile', { defaultValue: 'Modifier le profil' }) : undefined}
          >
            <Settings className="w-4 h-4" />
            {!collapsed && t('sidebar.modifyProfile', { defaultValue: 'Modifier le profil' })}
          </Link>

          <div className={cn(
            "flex items-center gap-2",
            collapsed ? "flex-col" : "justify-between"
          )}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors",
                collapsed ? "h-10 w-10 p-0" : "flex-1 justify-start text-xs h-8"
              )}
              onClick={onLogout}
              title={collapsed ? t('sidebar.logout') : undefined}
            >
              <LogOut className={cn("w-4 h-4", !collapsed && "mr-2")} />
              {!collapsed && t('sidebar.logout')}
            </Button>

            {!collapsed && (
              <div className="flex items-center gap-1">
                <LanguageSwitcher />
              </div>
            )}

            {collapsed && (
              <LanguageSwitcher collapsed={true} />
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  )
}
