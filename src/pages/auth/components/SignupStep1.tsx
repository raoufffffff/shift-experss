import { useTranslation } from 'react-i18next'
import { User, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { seInputIconCls, sePrimaryBtnCls } from '@/components/auth/AuthShell'
import type { UseSignupFormReturn } from '../hooks/useSignupForm'

interface SignupStep1Props {
  form: UseSignupFormReturn
}

export function SignupStep1({ form }: SignupStep1Props) {
  const { t } = useTranslation()

  return (
    <motion.form
      key="step1"
      custom={1}
      variants={form.slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      onSubmit={form.handleNextStep}
      className="space-y-5"
    >
      {/* Step Title */}
      <h2 className="font-display font-bold text-base text-se-ink text-center">
        {t('auth.stepYourInfo')}
      </h2>

      {/* First Name */}
      <div>
        <label htmlFor="firstName" className="se-eyebrow block mb-1.5">
          {t('auth.firstName')}
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" />
          <input
            id="firstName"
            type="text"
            value={form.firstName}
            onChange={(e) => form.setFirstName(e.target.value)}
            placeholder={t('auth.firstNamePlaceholder')}
            required
            className={seInputIconCls}
          />
        </div>
      </div>

      {/* Last Name */}
      <div>
        <label htmlFor="lastName" className="se-eyebrow block mb-1.5">
          {t('auth.lastName')}
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" />
          <input
            id="lastName"
            type="text"
            value={form.lastName}
            onChange={(e) => form.setLastName(e.target.value)}
            placeholder={t('auth.lastNamePlaceholder')}
            required
            className={seInputIconCls}
          />
        </div>
      </div>

      {/* Next Button */}
      <button
        type="submit"
        className={sePrimaryBtnCls}
      >
        {t('auth.nextStep')}
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.form>
  )
}
