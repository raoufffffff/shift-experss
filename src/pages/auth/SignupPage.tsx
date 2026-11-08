import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { useTranslation } from 'react-i18next'
import { AuthHeader } from '@/components/auth/AuthHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignupForm } from './hooks/useSignupForm'
import { SignupStepIndicator } from './components/SignupStepIndicator'
import { SignupStep1 } from './components/SignupStep1'
import { SignupStep2 } from './components/SignupStep2'
import { SignupStep3 } from './components/SignupStep3'
import { SignupSuccess } from './components/SignupSuccess'

export function SignupPage() {
  const { t } = useTranslation()
  const form = useSignupForm()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <AuthHeader currentPage="signup" />

      {/* Spacer pour la navbar */}
      <div className="h-20"></div>

      {/* Container principal */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {/* Card d'inscription */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 border border-gray-200/50 relative overflow-hidden"
          >
            {/* Accent decoratif */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary"></div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {t('auth.signupTitle')}
              </h1>
              <p className="text-gray-600 text-base">
                {t('auth.signupDescription')}
              </p>
            </div>

            {/* Progress indicator - hide on success */}
            {!form.isSuccess && (
              <SignupStepIndicator currentStep={form.currentStep} />
            )}

            {/* Forms with animation OR success message */}
            <div className="relative overflow-hidden">
              <AnimatePresence mode="wait">
                {form.isSuccess ? (
                  <SignupSuccess email={form.email} />
                ) : form.currentStep === 1 ? (
                  <SignupStep1 form={form} />
                ) : null}

                {form.currentStep === 2 && (
                  <SignupStep2 form={form} />
                )}

                {form.currentStep === 3 && (
                  <SignupStep3 form={form} />
                )}
              </AnimatePresence>
            </div>

            {/* Login Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                {t('auth.hasAccount')}{' '}
                <Link to="/login" className="text-primary font-bold hover:text-primary/80 hover:underline transition-colors">
                  {t('auth.loginLink')}
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
