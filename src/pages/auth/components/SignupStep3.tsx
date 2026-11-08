import { useTranslation } from 'react-i18next'
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { AuthSpinner, seInputIconCls, sePrimaryBtnCls, seSecondaryBtnCls } from '@/components/auth/AuthShell'
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
      <h2 className="font-display font-bold text-base text-se-ink text-center">
        {t('auth.stepYourAccount')}
      </h2>

      {/* Email */}
      <div>
        <label htmlFor="email" className="se-eyebrow block mb-1.5">
          {t('auth.emailProfessional')}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" />
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => form.setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            required
            className={seInputIconCls}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="se-eyebrow block mb-1.5">
          {t('auth.password')}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" />
          <input
            id="password"
            type={form.showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => form.setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            required
            minLength={8}
            className={`${seInputIconCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => form.setShowPassword(!form.showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-se-muted hover:text-se-ink"
          >
            {form.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="se-eyebrow block mb-1.5">
          {t('auth.confirmPassword')}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" />
          <input
            id="confirmPassword"
            type={form.showConfirmPassword ? "text" : "password"}
            value={form.confirmPassword}
            onChange={(e) => form.setConfirmPassword(e.target.value)}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            required
            minLength={8}
            className={`${seInputIconCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => form.setShowConfirmPassword(!form.showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-se-muted hover:text-se-ink"
          >
            {form.showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {/* Inline error message */}
        {form.confirmPassword && form.password !== form.confirmPassword && (
          <p className="mt-2 text-sm text-se-danger">
            {t('auth.passwordMismatch')}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={form.handlePreviousStep}
          className={seSecondaryBtnCls}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('auth.previousStep')}
        </button>

        <button
          type="submit"
          disabled={form.isLoading}
          className={sePrimaryBtnCls}
        >
          {form.isLoading ? (
            <span className="inline-flex items-center gap-2"><AuthSpinner />{t('auth.submitting')}</span>
          ) : (
            t('auth.submitSignup')
          )}
        </button>
      </div>
    </motion.form>
  )
}
