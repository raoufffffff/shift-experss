import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { create } from 'zustand'

interface NavigationStore {
  isNavigating: boolean
  setNavigating: (isNavigating: boolean) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  isNavigating: false,
  setNavigating: (isNavigating) => set({ isNavigating }),
}))

/**
 * Hook to track navigation state - shows/hides loader on route change
 */
export function useNavigationProgress() {
  const location = useLocation()
  const prevLocation = useRef(location.pathname)
  const { setNavigating } = useNavigationStore()
  const timeoutRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    // On route change
    if (location.pathname !== prevLocation.current) {
      // Show loader immediately
      setNavigating(true)

      prevLocation.current = location.pathname

      // Hide after 500ms
      timeoutRef.current = setTimeout(() => {
        setNavigating(false)
      }, 500)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [location.pathname, setNavigating])
}
