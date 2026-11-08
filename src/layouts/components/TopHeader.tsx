import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { EstablishmentSelector } from '@/components/establishments/EstablishmentSelector'

import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { Building2, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { User } from '@shared/types'

interface TopHeaderProps {
  sidebarCollapsed: boolean
  pageTitle: string
  isAuthLoading: boolean
  userRole?: string
  assignedEstablishment: { id: string; name: string } | null | undefined
  user: User | null
  displayLogo: string | null | undefined
}

export function TopHeader({
  sidebarCollapsed,
  pageTitle,
  isAuthLoading,
  userRole,
  assignedEstablishment,
  user,
  displayLogo,
}: TopHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className={cn(
      "hidden lg:flex fixed top-0 right-0 z-40 h-14 items-center justify-between px-8 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all duration-300",
      sidebarCollapsed ? "left-20" : "left-64"
    )}>
      {/* Left: Page title */}
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Establishment Selector */}
        <div className="mr-2">
          {isAuthLoading ? (
            <div className="w-48 h-[40px] bg-muted/20 animate-pulse rounded-lg border border-transparent" />
          ) : userRole === 'admin' ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden xl:inline-block">
                {t('sidebar.showDataFor')}
              </span>
              <div className="w-64">
                <EstablishmentSelector />
              </div>
            </div>
          ) : (
            assignedEstablishment && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/40 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-col hidden sm:flex">
                  <span className="text-xs text-muted-foreground font-medium leading-none mb-0.5">{t('navigation.establishments')}</span>
                  <span className="text-sm font-semibold text-foreground leading-none">
                    {assignedEstablishment.name}
                  </span>
                </div>
              </div>
            )
          )}
        </div>

        <NotificationDropdown />

        <Link to="/support">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <HelpCircle className="w-5 h-5" />
          </Button>
        </Link>
        <ThemeToggleButton size="icon" className="text-muted-foreground hover:text-foreground" />

        {/* Profile avatar */}
        <Link to="/settings" className="ml-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-border/60 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all">
            {displayLogo ? (
              <img
                src={displayLogo}
                alt="Profile"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-xs font-semibold text-primary">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}
