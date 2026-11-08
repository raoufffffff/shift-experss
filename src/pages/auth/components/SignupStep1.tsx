import { useTranslation } from 'react-i18next'
import { User, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
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
      <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">
        {t('auth.stepYourInfo')}
      </h2>

      {/* First Name */}
      <div>
        <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
          {t('auth.firstName')}
        </label>
        <div className="relative group">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            id="firstName"
            type="text"
            value={form.firstName}
            onChange={(e) => form.setFirstName(e.target.value)}
            placeholder={t('auth.firstNamePlaceholder')}
            required
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Last Name */}
      <div>
        <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
          {t('auth.lastName')}
        </label>
        <div className="relative group">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            id="lastName"
            type="text"
            value={form.lastName}
            onChange={(e) => form.setLastName(e.target.value)}
            placeholder={t('auth.lastNamePlaceholder')}
            required
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Next Button */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold py-4 px-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200 mt-8 flex items-center justify-center gap-2"
      >
        {t('auth.nextStep')}
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </motion.form>
  )
}
