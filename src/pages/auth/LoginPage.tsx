import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { AuthHeader } from '@/components/auth/AuthHeader'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <AuthHeader currentPage="login" />

      {/* Spacer pour la navbar */}
      <div className="h-20"></div>

      {/* Container principal */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {/* Card de connexion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 border border-gray-200/50 relative overflow-hidden"
          >
            {/* Accent décoratif */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary"></div>

            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {t('auth.loginTitle')}
              </h1>
              <p className="text-gray-600 text-base">
                {t('auth.loginDescription')}
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.email')}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    {t('auth.password')}
                  </label>
                  <LocalizedLink to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    {t('auth.forgotPassword')}
                  </LocalizedLink>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? t('accessibility.hidePassword') : t('accessibility.showPassword')}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold py-4 px-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-8"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('auth.submitting')}
                  </span>
                ) : (
                  t('auth.submit')
                )}
              </motion.button>
            </form>

            {/* Signup Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                {t('auth.noAccount')}{' '}
                <LocalizedLink to="/signup" className="text-primary font-bold hover:text-primary/80 hover:underline transition-colors">
                  {t('auth.signupLink')}
                </LocalizedLink>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
