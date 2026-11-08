import { useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { logger } from '@/utils/logger'
import { useLocale } from '@/hooks/useLocale'

export type PageState = 'loading' | 'enter_code' | 'ready' | 'error'

export function useResetPassword() {
  const { setTheme } = useTheme()

  // Force light mode on this page
  useEffect(() => {
    setTheme('light')
  }, [setTheme])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [otpId, setOtpId] = useState<string | null>(null) // Stocke l'ID de l'OTP v\u00e9rifi\u00e9
  const { navigate } = useLocale()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()

  // Track if we've already initialized to prevent re-running on state changes
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Don't re-run if already initialized (prevents resetting pageState after OTP verification)
    if (initialized) return

    let mounted = true
    let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null

    const checkRecoverySession = async () => {
      try {
        // Get email from location state (passed from ForgotPasswordPage)
        const stateEmail = (location.state as Record<string, unknown>)?.email as string | undefined
        if (stateEmail) {
          setUserEmail(stateEmail)
          logger.log('\ud83d\udce7 Email from state:', stateEmail)

          // If we have email from state, start directly in OTP mode
          logger.log('\u2705 Starting directly in OTP code entry mode')
          setPageState('enter_code')
          return
        }

        // Check for PKCE flow with token_hash in query params
        const tokenHash = searchParams.get('token_hash')
        const typeQuery = searchParams.get('type')
        const errorQuery = searchParams.get('error')
        const errorCodeQuery = searchParams.get('error_code')
        const errorDescQuery = searchParams.get('error_description')

        // Check for hash fragment flow with access_token
        const hashParams = new URLSearchParams(location.hash.substring(1))
        const error = hashParams.get('error') || errorQuery
        const errorCode = hashParams.get('error_code') || errorCodeQuery
        const errorDescription = hashParams.get('error_description') || errorDescQuery
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type') || typeQuery

        logger.log('\ud83d\udd10 ResetPassword: Query params:', { tokenHash: !!tokenHash, typeQuery, errorQuery, errorCodeQuery })
        logger.log('\ud83d\udd10 ResetPassword: Hash params:', { error, errorCode, accessToken: !!accessToken, type })

        if (error) {
          logger.log('\u274c ResetPassword: Error in URL:', errorCode)

          // If link expired, switch to OTP mode instead of showing error
          if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
            logger.log('\ud83d\udd04 Link expired or denied, switching to OTP code mode')
            if (!mounted) return
            setPageState('enter_code')
            return
          }

          if (!mounted) return
          setErrorMessage(errorDescription || t('auth.resetPasswordPage.invalidLink'))
          toast.error(errorDescription || t('auth.resetPasswordPage.invalidLink'))
          setPageState('error')
          setTimeout(() => navigate('/forgot-password'), 3000)
          return
        }

        // Check if we have a valid token (either in query params or hash)
        const hasValidToken = tokenHash || accessToken || location.hash.includes('access_token')

        if (!hasValidToken) {
          logger.log('\u2139\ufe0f No token in URL, switching to OTP code entry mode')
          if (!mounted) return
          setPageState('enter_code')
          return
        }

        logger.log('\u2705 ResetPassword: Valid token found:', { hasTokenHash: !!tokenHash, hasAccessToken: !!accessToken })

        // Listen for PASSWORD_RECOVERY event
        authListener = supabase.auth.onAuthStateChange(async (event, session) => {
          logger.log('\ud83d\udd10 ResetPassword: Auth event:', event, 'Session:', !!session)

          if (event === 'PASSWORD_RECOVERY' && session) {
            logger.log('\u2705 ResetPassword: PASSWORD_RECOVERY event received, session established')
            if (mounted) {
              setPageState('ready')
            }
          }
        })

        // Wait for Supabase to process the hash and establish session
        logger.log('\u23f3 ResetPassword: Waiting for Supabase to process hash...')
        await new Promise(resolve => setTimeout(resolve, 1500))

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        logger.log('\ud83d\udd10 ResetPassword: Session check after 1.5s:', session ? 'exists' : 'none', sessionError)

        if (!mounted) return

        if (session) {
          logger.log('\u2705 ResetPassword: Session found, ready to reset password')
          setPageState('ready')
        } else if (!sessionError) {
          // Wait a bit more for the PASSWORD_RECOVERY event
          logger.log('\u23f3 ResetPassword: Waiting longer for PASSWORD_RECOVERY event...')
          await new Promise(resolve => setTimeout(resolve, 2000))

          const { data: { session: retrySession } } = await supabase.auth.getSession()
          logger.log('\ud83d\udd10 ResetPassword: Final session check:', retrySession ? 'exists' : 'none')

          if (retrySession && mounted) {
            logger.log('\u2705 ResetPassword: Session established after retry')
            setPageState('ready')
          } else if (mounted) {
            logger.log('\u274c ResetPassword: No session after 3.5s total wait, switching to OTP mode')
            setPageState('enter_code')
          }
        } else {
          logger.log('\u274c ResetPassword: Session error, switching to OTP mode')
          setPageState('enter_code')
        }
      } catch (err) {
        logger.error('\u274c ResetPassword: Exception:', err)
        if (!mounted) return

        logger.log('\ud83d\udd04 Exception caught, switching to OTP mode')
        setPageState('enter_code')
      }
    }

    checkRecoverySession().then(() => {
      if (mounted) setInitialized(true)
    })

    return () => {
      mounted = false
      if (authListener) {
        authListener.data.subscription.unsubscribe()
      }
    }
  }, [initialized, location.hash, location.search, location.state, searchParams, navigate, t])

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userEmail) {
      toast.error(t('auth.resetPasswordPage.emailRequired'))
      return
    }

    if (otpCode.length !== 6) {
      toast.error(t('auth.resetPasswordPage.otpInvalid'))
      return
    }

    setIsVerifyingOtp(true)
    logger.log('\ud83d\udd10 ResetPassword: Verifying OTP code via Edge Function...')

    try {
      // Call our custom Edge Function to verify OTP
      const { data, error } = await supabase.functions.invoke('verify-password-reset-otp', {
        body: { email: userEmail, code: otpCode }
      })

      logger.log('\ud83d\udd10 ResetPassword: Edge Function response:', { success: data?.success, hasOtpId: !!data?.otp_id })

      if (error) throw error
      if (!data.success) throw new Error(data.error || t('auth.resetPasswordPage.invalidCode'))

      if (!data.otp_id) {
        throw new Error('No OTP ID returned')
      }

      // Stocker l'ID de l'OTP v\u00e9rifi\u00e9
      setOtpId(data.otp_id)

      logger.log('\u2705 OTP verified successfully, switching to password entry')
      toast.success(t('auth.resetPasswordPage.otpVerified'))
      setPageState('ready')
    } catch (error) {
      logger.error('\u274c OTP verification failed:', error)
      const message = error instanceof Error ? error.message : t('auth.resetPasswordPage.otpError')
      toast.error(message)
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error(t('settings.passwordTooShort'))
      return
    }

    if (password !== confirmPassword) {
      toast.error(t('auth.resetPasswordPage.passwordMismatch'))
      return
    }

    if (!otpId || !userEmail) {
      toast.error(t('auth.resetPasswordPage.invalidSession'))
      return
    }

    setIsSubmitting(true)
    logger.log('\ud83d\udd10 ResetPassword: Starting password reset with OTP...')

    // Timeout de s\u00e9curit\u00e9 : forcer isSubmitting \u00e0 false apr\u00e8s 15 secondes max
    const timeoutId = setTimeout(() => {
      logger.error('\ud83d\udd10 ResetPassword: TIMEOUT - Update took too long, forcing loading off')
      setIsSubmitting(false)
      toast.error(t('auth.resetPasswordPage.timeout'))
    }, 15000)

    try {
      // Call Edge Function to reset password with verified OTP
      const { data, error } = await supabase.functions.invoke('reset-password-with-otp', {
        body: {
          otp_id: otpId,
          email: userEmail,
          new_password: password
        }
      })

      clearTimeout(timeoutId)
      logger.log('\ud83d\udd10 ResetPassword: Edge Function response:', { success: data?.success })

      if (error) throw error
      if (!data.success) throw new Error(data.error || t('auth.resetPasswordPage.resetError'))

      logger.log('\u2705 ResetPassword: Password updated successfully')
      toast.success(t('auth.resetPasswordPage.success'))

      // Redirect to login (no need to sign out, user isn't signed in)
      logger.log('\ud83d\udd10 ResetPassword: Redirecting to login...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (error) {
      clearTimeout(timeoutId)
      logger.error('\u274c ResetPassword: Password reset failed:', error)
      const message = error instanceof Error ? error.message : t('settings.passwordError')
      toast.error(message)
      setIsSubmitting(false)
    }
  }

  const setOtpCodeSafe = (value: string) => {
    setOtpCode(value.replace(/\D/g, '').slice(0, 6))
  }

  return {
    // State
    pageState,
    errorMessage,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isSubmitting,
    otpCode,
    setOtpCode: setOtpCodeSafe,
    isVerifyingOtp,
    userEmail,
    setUserEmail,
    // Handlers
    handleVerifyOtp,
    handleSubmit,
    navigate,
  }
}
