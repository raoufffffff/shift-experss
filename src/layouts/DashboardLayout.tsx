import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { PendingReviewsPopup } from '@/components/Pendingreviewspopup'
import { useDashboardLayout } from './hooks/useDashboardLayout'
import { MobileHeader } from './components/MobileHeader'
import { MobileMenu } from './components/MobileMenu'
import { DesktopSidebar } from './components/DesktopSidebar'
import { TopHeader } from './components/TopHeader'

export function DashboardLayout() {
  const {
    user,
    company, 
    isAuthLoading,
    navigation,
    unviewedCount,
    pendingPaymentsCount,
    totalUnreadCount,
    usage,
    displayLogo,
    assignedEstablishment,
    mobileMenuOpen,
    setMobileMenuOpen,
    showLogoutDialog,
    setShowLogoutDialog,
    sidebarCollapsed,
    setSidebarCollapsed,
    handleLogout,
    handlePrefetch,
    getCurrentPageTitle,
    t,
  } = useDashboardLayout()

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <MobileHeader
        mobileMenuOpen={mobileMenuOpen}
        onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Mobile menu */}
      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navigation={navigation}
        isAuthLoading={isAuthLoading}
        user={user}
        company={company}
        assignedEstablishment={assignedEstablishment}
        unviewedCount={unviewedCount}
        totalUnreadCount={totalUnreadCount}
        pendingPaymentsCount={pendingPaymentsCount}
        usage={usage}
        onPrefetch={handlePrefetch}
        onLogout={() => setShowLogoutDialog(true)}
      />

      {/* Desktop sidebar */}
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        navigation={navigation}
        displayLogo={displayLogo}
        user={user}
        company={company}
        unviewedCount={unviewedCount}
        totalUnreadCount={totalUnreadCount}
        pendingPaymentsCount={pendingPaymentsCount}
        usage={usage}
        onPrefetch={handlePrefetch}
        onLogout={() => setShowLogoutDialog(true)}
      />

      {/* Desktop top header */}
      <TopHeader
        sidebarCollapsed={sidebarCollapsed}
        pageTitle={getCurrentPageTitle()}
        isAuthLoading={isAuthLoading}
        userRole={user?.role}
        assignedEstablishment={assignedEstablishment}
        user={user}
        displayLogo={displayLogo}
      />

      {/* Main content */}
      <main className={cn(
        "min-h-screen pt-16 lg:pt-14 transition-all duration-300",
        sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
      )}>
        <div className="h-full p-4 sm:p-6 lg:px-7 xl:px-10 lg:py-8">
          <div className="h-full max-w-[1300px] mx-auto">
            <PendingReviewsPopup />
            <Outlet />
          </div>
        </div>
      </main>

      {/* Logout Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sidebar.logout')}</DialogTitle>
            <DialogDescription>
              {t('common.confirmLogout', { defaultValue: 'Êtes-vous sûr de vouloir vous déconnecter ?' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowLogoutDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              {t('sidebar.logout')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
