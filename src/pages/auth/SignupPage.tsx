import { useTranslation } from 'react-i18next'
import { AnimatePresence } from 'framer-motion'
import { AuthShell, seLinkCls } from '@/components/auth/AuthShell'
import { LocalizedLink as Link } from '@/components/LocalizedLink'
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
    <AuthShell
      title={t('auth.signupTitle')}
      subtitle={t('auth.signupDescription')}
      footer={
        <>
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className={seLinkCls}>
            {t('auth.loginLink')}
          </Link>
        </>
      }
    >
      {!form.isSuccess && <SignupStepIndicator currentStep={form.currentStep} />}

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          {form.isSuccess ? (
            <SignupSuccess email={form.email} />
          ) : form.currentStep === 1 ? (
            <SignupStep1 form={form} />
          ) : null}

          {form.currentStep === 2 && <SignupStep2 form={form} />}

          {form.currentStep === 3 && <SignupStep3 form={form} />}
        </AnimatePresence>
      </div>
    </AuthShell>
  )
}
