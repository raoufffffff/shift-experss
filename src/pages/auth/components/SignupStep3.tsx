import { useTranslation } from 'react-i18next'
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import type { UseSignupFormReturn } from '../hooks/useSignupForm'

interface SignupStep3Props {
  form: UseSignupFormReturn
}

export function SignupStep3({ form }: SignupStep3Props) {
  const { t } = useTranslation()

  return (
    <motion.form
      key="step3"
      custom={3}
      variants={form.slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      onSubmit={form.handleSubmit}
      className="space-y-5"
    >
      {/* Step Title */}
      <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">
        {t('auth.stepYourAccount')}
      </h2>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
          {t('auth.emailProfessional')}
        </label>
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => form.setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
          {t('auth.password')}
        </label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            id="password"
            type={form.showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => form.setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            required
            minLength={8}
            className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => form.setShowPassword(!form.showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {form.showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
          {t('auth.confirmPassword')}
        </label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            id="confirmPassword"
            type={form.showConfirmPassword ? "text" : "password"}
            value={form.confirmPassword}
            onChange={(e) => form.setConfirmPassword(e.target.value)}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            required
            minLength={8}
            className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => form.setShowConfirmPassword(!form.showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {form.showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {/* Inline error message */}
        {form.confirmPassword && form.password !== form.confirmPassword && (
          <p className="mt-2 text-sm text-red-600">
            {t('auth.passwordMismatch')}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-8">
        <motion.button
          type="button"
          onClick={form.handlePreviousStep}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('auth.previousStep')}
        </motion.button>

        <motion.button
          type="submit"
          disabled={form.isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold py-4 px-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {form.isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t('auth.submitting')}
            </span>
          ) : (
            t('auth.submitSignup')
          )}
        </motion.button>
      </div>
    </motion.form>
  )
}
