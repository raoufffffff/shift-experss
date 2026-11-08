import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, ArrowRight, Smartphone, MailCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { logger } from '@/utils/logger'
import { supabase } from '@/lib/supabase'

export function FreelancerConfirmPage() {
    const { t } = useTranslation()
    const [searchParams] = useSearchParams()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const handleConfirmation = async () => {
            // 1. Check if we have an error in query params (Supabase handles errors this way)
            const error = searchParams.get('error')
            const errorDescription = searchParams.get('error_description')

            if (error) {
                setStatus('error')
                setErrorMessage(errorDescription || t('auth.freelancerConfirm.confirmationError'))
                return
            }

            try {
                // 2. Wait a bit for Supabase to process the token if it's currently hashing
                // On some browsers, the event USER_UPDATED triggers before this page is fully loaded
                setStatus('success')

                // 3. Attempt deep link after a short delay
                setTimeout(() => {
                    window.location.href = 'shiftexpress://confirm'
                }, 2000)

            } catch (err: unknown) {
                logger.error('Confirmation error:', err instanceof Error ? err : String(err))
                setStatus('error')
                setErrorMessage(err instanceof Error ? err.message : t('auth.freelancerConfirm.unableToConfirm'))
            }
        }

        handleConfirmation()
    }, [searchParams])

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 text-center relative overflow-hidden"
            >
                {/* Decorative background element */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>

                {status === 'loading' && (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                            <MailCheck className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {t('auth.freelancerConfirm.verifyingAccount')}
                        </h1>
                        <p className="text-gray-500 text-lg leading-relaxed">
                            {t('auth.freelancerConfirm.finalizingProfile')}
                        </p>
                        <div className="flex justify-center">
                            <div className="w-12 h-1 border-2 border-primary/20 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '100%' }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="w-full h-full bg-primary"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-8 py-4">
                        <div className="relative mx-auto w-24 h-24">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-full h-full bg-green-100 rounded-full flex items-center justify-center"
                            >
                                <CheckCircle2 className="w-14 h-14 text-green-500" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 rounded-full bg-green-500/20"
                            />
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                {t('auth.freelancerConfirm.accountValidated')}
                            </h1>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                {t('auth.freelancerConfirm.emailConfirmed')}
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <motion.a
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                href="shiftexpress://confirm"
                                className="w-full bg-primary text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:bg-primary-dark"
                            >
                                <Smartphone className="w-6 h-6" />
                                {t('auth.freelancerConfirm.openApp')}
                                <ArrowRight className="w-5 h-5" />
                            </motion.a>

                            <p className="text-xs text-gray-400 max-w-[200px] mx-auto italic">
                                {t('auth.freelancerConfirm.appNotOpenHint')}
                            </p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-8 py-4">
                        <div className="mx-auto w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center">
                            <XCircle className="w-12 h-12 text-red-500" />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                {t('auth.freelancerConfirm.somethingWentWrong')}
                            </h1>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                {errorMessage}
                            </p>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => window.location.reload()}
                            className="w-full bg-white border-2 border-gray-200 text-gray-700 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all"
                        >
                            {t('auth.freelancerConfirm.retry')}
                        </motion.button>
                    </div>
                )}
            </motion.div>

            <div className="mt-8 text-center text-gray-400 text-sm font-sans font-light tracking-widest lowercase">
                <span className="font-semibold">shift</span>express
            </div>
        </div>
    )
}
