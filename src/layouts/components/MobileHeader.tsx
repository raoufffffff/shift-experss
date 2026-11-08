import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton'
import { Button } from '@/components/ui/Button'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface MobileHeaderProps {
  mobileMenuOpen: boolean
  onToggle: () => void
}

export function MobileHeader({ mobileMenuOpen, onToggle }: MobileHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b border-border shadow-sm flex items-center justify-between px-4">
      <Link to="/" className="flex items-center gap-2.5">
        <img src="/logo-header.svg" alt="Shift Express" className="w-8 h-8" loading="lazy" width={32} height={32} />
        <div className="flex flex-col">
          <span className="text-lg text-foreground font-sans lowercase leading-tight">
            <span className="font-semibold">shift</span>
            <span className="font-light">express</span>
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggleButton />
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          aria-label={mobileMenuOpen ? t('accessibility.closeMenu') : t('accessibility.openMenu')}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Menu className="w-5 h-5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )
}
