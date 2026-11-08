import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/cn'

const languages = [
  { code: 'fr', name: 'FR', fullName: 'Français' },
  { code: 'en', name: 'EN', fullName: 'English' },
  { code: 'es', name: 'ES', fullName: 'Español' },
  { code: 'it', name: 'IT', fullName: 'Italiano' },
  { code: 'zh', name: '中', fullName: '中文' },
]

interface LanguageSwitcherProps {
  collapsed?: boolean
}

export function LanguageSwitcher({ collapsed = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode).then(() => {
      localStorage.setItem('i18nextLng', langCode)
      const pathWithoutLocale = location.pathname.replace(/^\/(en|fr|es|it|zh)/, '')
      const newPath = `/${langCode}${pathWithoutLocale}${location.search}${location.hash}`
      navigate(newPath, { replace: true })
    })
    setIsOpen(false)
  }

  if (collapsed) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg transition-all",
            isOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title={currentLanguage.fullName}
        >
          <span className="text-xs font-bold">{currentLanguage.name}</span>
        </button>

        {isOpen && (
          <div className="absolute left-full bottom-0 ml-3 min-w-[150px] rounded-xl bg-popover shadow-xl ring-1 ring-border z-[100] p-1 animate-in fade-in slide-in-from-left-2 duration-200">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-sm rounded-lg transition-all',
                  lang.code === i18n.language
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="truncate">{lang.fullName}</span>
                {lang.code === i18n.language && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border border-transparent",
          isOpen
            ? "bg-muted text-foreground border-border/50"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{currentLanguage.name}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-[160px] rounded-xl bg-popover shadow-xl ring-1 ring-border z-[100] p-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-xs rounded-lg transition-all',
                  lang.code === i18n.language
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{lang.fullName}</span>
                {lang.code === i18n.language && (
                  <Check className="h-3 w-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
