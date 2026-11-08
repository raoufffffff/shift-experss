import { useTheme } from 'next-themes'
import { Sun } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ThemeToggleButtonProps {
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function ThemeToggleButton({ className, size = "icon" }: ThemeToggleButtonProps) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={className}
      aria-label={resolvedTheme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      <Sun className="h-4 w-4" />
    </Button>
  )
}
