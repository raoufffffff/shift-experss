import { Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

interface InsightBannerProps {
  message: string
  variant?: 'info' | 'success' | 'warning'
  dismissible?: boolean
}

const variantStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800/30 dark:text-blue-300',
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800/30 dark:text-green-300',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/30 dark:text-amber-300'
}

export function InsightBanner({ message, variant = 'info', dismissible = true }: InsightBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border',
      variantStyles[variant]
    )}>
      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <p className="text-sm flex-1">{message}</p>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 hover:bg-black/10 rounded transition-colors"
          aria-label="Dismiss insight"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
