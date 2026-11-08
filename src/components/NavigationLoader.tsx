import { useNavigationStore } from '@/hooks/useNavigationProgress'
import { Loader2 } from 'lucide-react'

/**
 * Simple loader with spinning gear during page navigation
 * Positioned to avoid covering the sidebar on desktop
 */
export function NavigationLoader() {
  const { isNavigating } = useNavigationStore()

  if (!isNavigating) return null

  return (
    <>
      {/* Mobile: full screen */}
      <div className="lg:hidden fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-muted-foreground/60 animate-spin" />
      </div>

      {/* Desktop: only content area, sidebar stays visible */}
      <div className="hidden lg:flex fixed top-0 right-0 bottom-0 left-64 z-[9999] items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-muted-foreground/60 animate-spin" />
      </div>
    </>
  )
}
