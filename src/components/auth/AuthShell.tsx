/**
 * Coquille des pages d'authentification (connexion / inscription) — design `se-*`.
 * Page pleine hors de l'application : marque, sélecteur de langue, carte centrale.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { logger } from '@/utils/logger'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'zh', name: '中文' },
]

export const seInputCls =
  'w-full h-11 rounded-se-sm border border-se-line bg-se-surface px-3 text-sm text-se-ink placeholder:text-se-muted/70 focus:outline-none focus:border-se-blue disabled:opacity-50 disabled:cursor-not-allowed'
export const seInputIconCls = `${seInputCls} pl-10`
export const sePrimaryBtnCls =
  'w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-se-sm text-sm font-semibold bg-se-blue text-white hover:bg-se-blue-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
export const seSecondaryBtnCls =
  'w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-se-sm text-sm font-semibold border border-se-line bg-se-surface text-se-ink hover:bg-se-surface-2 transition-colors'
export const seLinkCls = 'font-semibold text-se-blue-ink hover:text-se-blue'

export function AuthSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export function AuthShell({ title, subtitle, children, footer }: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const { i18n } = useTranslation()
  const location = useLocation()

  const changeLanguage = (code: string) => {
    logger.log('Changing language to:', code)
    i18n.changeLanguage(code)
    const segments = location.pathname.split('/').filter(Boolean)
    segments[0] = code
    window.location.href = '/' + segments.join('/') // rechargement complet pour tout resynchroniser
  }

  return (
    <div className="se-root min-h-screen bg-se-bg flex flex-col">
      <div className="flex justify-end p-4">
        <label className="inline-flex items-center gap-1.5 text-se-muted text-sm">
          <Globe className="w-4 h-4" aria-hidden="true" />
          <select
            value={i18n.language?.slice(0, 2)}
            onChange={(e) => changeLanguage(e.target.value)}
            aria-label="Language"
            className="bg-transparent text-sm font-semibold text-se-ink focus:outline-none cursor-pointer"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex-1 grid place-items-center p-4 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <a href="https://shift.express" className="font-display font-extrabold text-2xl tracking-tight text-se-ink">
              Shift Express
            </a>
            <h1 className="font-display font-bold text-xl text-se-ink mt-4">{title}</h1>
            {subtitle && <p className="text-se-muted mt-1 text-sm">{subtitle}</p>}
          </div>

          <div className="bg-se-surface border border-se-line rounded-se shadow-se p-6">{children}</div>

          {footer && <p className="text-center text-sm text-se-muted mt-5">{footer}</p>}
        </div>
      </div>
    </div>
  )
}
