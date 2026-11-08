import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { AuthShell, AuthSpinner, seInputIconCls, sePrimaryBtnCls, seLinkCls } from '@/components/auth/AuthShell'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { logger } from '@/utils/logger'
import { useLocale } from '@/hooks/useLocale'
import { LocalizedLink } from '@/components/LocalizedLink'
import { useLocation } from 'react-router-dom'

export function LoginPage() {
  const location = useLocation()
  const { setTheme } = useTheme()

  // Force light mode on this page
  useEffect(() => {
    // Force light mode via next-themes to keep localStorage in sync
    setTheme('light')
  }, [setTheme])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const login = useAuthStore((state) => state.login)
  const { navigate } = useLocale()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    logger.log('🔑 Starting login...')

    // Timeout de sécurité: forcer isLoading à false après 15 secondes max
    const timeoutId = setTimeout(() => {
      logger.error('🔑 TIMEOUT: Login took too long, forcing loading off')
      setIsLoading(false)
      toast.error('Login timeout - please try again')
    }, 15000)

    try {
      await login(email, password)
      clearTimeout(timeoutId)
      setIsLoading(false)
      toast.success(t('auth.loginSuccess'))
      // Retour à la page demandée avant la redirection (ex. /fr/v2), sinon l'accueil.
      // `navigate` (useLocale) ajoute lui-même le préfixe de langue : on l'enlève ici.
      const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
      const target = from?.pathname
        ? `${from.pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/'}${from.search ?? ''}`
        : '/'
      navigate(target.startsWith('/login') ? '/' : target)
    } catch (error) {
      clearTimeout(timeoutId)
      setIsLoading(false)
      const message = error instanceof Error ? error.message : t('auth.loginError')
      toast.error(message)
    }
  }

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginDescription')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <LocalizedLink to="/signup" className={seLinkCls}>
            {t('auth.signupLink')}
          </LocalizedLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="se-eyebrow block mb-1.5">{t('auth.email')}</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" aria-hidden="true" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              className={seInputIconCls}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="se-eyebrow">{t('auth.password')}</label>
            <LocalizedLink to="/forgot-password" className={`text-xs ${seLinkCls}`}>
              {t('auth.forgotPassword')}
            </LocalizedLink>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              className={`${seInputIconCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-se-muted hover:text-se-ink"
              aria-label={showPassword ? t('accessibility.hidePassword') : t('accessibility.showPassword')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className={sePrimaryBtnCls}>
          {isLoading ? (
            <>
              <AuthSpinner />
              {t('auth.submitting')}
            </>
          ) : (
            t('auth.submit')
          )}
        </button>
      </form>
    </AuthShell>
  )
}
