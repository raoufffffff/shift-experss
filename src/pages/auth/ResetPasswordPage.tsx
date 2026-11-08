import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { useResetPassword } from './hooks/useResetPassword'
import { AuthLanguageSelector } from './components/AuthLanguageSelector'
import { OtpEntryForm } from './components/OtpEntryForm'
import { PasswordResetForm } from './components/PasswordResetForm'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const {
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
    setOtpCode,
    isVerifyingOtp,
    userEmail,
    setUserEmail,
    handleVerifyOtp,
    handleSubmit,
    navigate,
  } = useResetPassword()

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-900 font-semibold text-lg">{t('auth.resetPasswordPage.verifyingLink')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-900 font-semibold text-lg mb-2">{errorMessage}</p>
          <p className="text-gray-600 text-sm">{t('auth.resetPasswordPage.redirecting')}</p>
        </div>
      </div>
    )
  }

  // OTP Code Entry state
  if (pageState === 'enter_code') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white relative">
        <AuthLanguageSelector />
        <OtpEntryForm
          userEmail={userEmail}
          setUserEmail={setUserEmail}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          isVerifyingOtp={isVerifyingOtp}
          onSubmit={handleVerifyOtp}
          onRequestNewCode={() => navigate('/forgot-password')}
        />
      </div>
    )
  }

  // Ready state - show password reset form
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white relative">
      <AuthLanguageSelector />
      <PasswordResetForm
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        showConfirmPassword={showConfirmPassword}
        setShowConfirmPassword={setShowConfirmPassword}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
