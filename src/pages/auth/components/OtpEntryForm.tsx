import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { motion } from 'framer-motion'

interface OtpEntryFormProps {
  userEmail: string
  setUserEmail: (value: string) => void
  otpCode: string
  setOtpCode: (value: string) => void
  isVerifyingOtp: boolean
  onSubmit: (e: React.FormEvent) => void
  onRequestNewCode: () => void
}

export function OtpEntryForm({
  userEmail,
  setUserEmail,
  otpCode,
  setOtpCode,
  isVerifyingOtp,
  onSubmit,
  onRequestNewCode,
}: OtpEntryFormProps) {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto px-4 py-16 flex items-center min-h-screen">
      <div className="max-w-md mx-auto">
        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 border border-gray-200/50 relative overflow-hidden"
        >
          {/* Decorative accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary"></div>

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              {t('auth.resetPasswordPage.enterCode')}
            </h1>
            <p className="text-gray-600 text-base">
              {t('auth.resetPasswordPage.codeDescription')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5">
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
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* OTP Code */}
            <div>
              <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('auth.resetPasswordPage.otpCode')}
              </label>
              <input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                required
                maxLength={6}
                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-center text-2xl tracking-widest font-mono"
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('auth.resetPasswordPage.otpHint')}
              </p>
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('auth.otpDelayNote', { defaultValue: 'La réception du code peut prendre quelques minutes. Pensez à vérifier vos spams.' })}
              </p>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isVerifyingOtp || otpCode.length !== 6 || !userEmail}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold py-4 px-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-8"
            >
              {isVerifyingOtp ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('auth.resetPasswordPage.verifying')}
                </span>
              ) : (
                t('auth.resetPasswordPage.verifyCode')
              )}
            </motion.button>

            {/* Back to forgot password */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={onRequestNewCode}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {t('auth.resetPasswordPage.requestNewCode')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
