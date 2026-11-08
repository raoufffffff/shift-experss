import { useState, useEffect } from 'react'
import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { AuthHeader } from '@/components/auth/AuthHeader'
import { Mail, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLocale } from '@/hooks/useLocale'

export function ForgotPasswordPage() {
  const { setTheme } = useTheme()

  // Force light mode on this page
  useEffect(() => {
    // Force light mode via next-themes to keep localStorage in sync
    setTheme('light')
  }, [setTheme])
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { t } = useTranslation()
  const { navigate } = useLocale()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Call our custom Edge Function to generate and send OTP
      const { data, error } = await supabase.functions.invoke('send-password-reset-otp', {
        body: { email }
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error || t('auth.forgotPasswordPage.sendError'))

      // Redirect IMMEDIATELY to reset password page with email pre-filled
      toast.success(t('auth.forgotPasswordPage.codeSent'))
      navigate('/reset-password', { state: { email } })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.forgotPasswordPage.sendError')
      toast.error(message)
      setIsLoading(false)
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
          <Link to="/login" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('auth.forgotPasswordPage.backToLogin')}
          </Link>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 border border-gray-200/50 relative overflow-hidden"
          >
            {/* Accent décoratif */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary"></div>

            {!emailSent ? (
              <>
                {/* Header */}
                <div className="text-center mb-10">
                  <h1 className="text-4xl font-bold text-gray-900 mb-3">
                    {t('auth.forgotPasswordPage.title')}
                  </h1>
                  <p className="text-gray-600 text-base">
                    {t('auth.forgotPasswordPage.description')}
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
                        {t('auth.forgotPasswordPage.sending')}
                      </span>
                    ) : (
                      t('auth.forgotPasswordPage.sendResetLink')
                    )}
                  </motion.button>
                </form>
              </>
            ) : (
              <>
                {/* Success state */}
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {t('auth.forgotPasswordPage.emailSent')}
                  </h2>
                  <p className="text-gray-600 mb-8">
                    {t('auth.forgotPasswordPage.emailSentDescription', { email })}
                  </p>
                  <Link to="/login">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold py-4 px-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200"
                    >
                      {t('auth.forgotPasswordPage.backToLoginButton')}
                    </motion.button>
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
