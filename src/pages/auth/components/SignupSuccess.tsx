import { useTranslation } from 'react-i18next'
import { Mail, Check } from 'lucide-react'
import { motion } from 'framer-motion'

interface SignupSuccessProps {
  email: string
}

export function SignupSuccess({ email }: SignupSuccessProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center py-8"
    >
      {/* Success icon */}
      <div className="mb-6 flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-10 h-10 text-green-600" />
        </div>
      </div>

      {/* Success message */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        {t('auth.accountCreated')}
      </h2>
      <p className="text-gray-600 mb-2">
        {t('auth.confirmationEmailSent')}
      </p>
      <p className="text-sm text-gray-500 mb-6">
        {t('auth.checkEmailInbox')}
      </p>

      {/* Email display */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 mb-8">
        <Mail className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">{email}</span>
      </div>

      {/* Redirect message */}
      <p className="text-sm text-gray-500">
        {t('auth.redirectingToLogin')}
      </p>
    </motion.div>
  )
}
