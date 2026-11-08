import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/hooks/useLocale'
import { supabase } from '@/lib/supabase'
import { logger } from '@/utils/logger'

export function EmailConfirmedPage() {
    const { t } = useTranslation()
    const { navigate } = useLocale()
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')

    useEffect(() => {
        const verify = async () => {
            try {
                // Supabase auto-processes the hash tokens from the URL
                const { data: { session } } = await supabase.auth.getSession()

                if (session?.user?.email_confirmed_at) {
                    // Try to complete signup if needed
                    const metadata = session.user.user_metadata
                    if (metadata?.company_name) {
                        const { data: profile } = await supabase
                            .from('users')
                            .select('company_id')
                            .eq('id', session.user.id)
                            .maybeSingle()

                        if (!profile || !profile.company_id) {
                            logger.log('📝 Completing signup from confirmation page...')
                            const { error: rpcError } = await supabase.rpc('complete_employer_signup_with_establishment', {
                                p_user_id: session.user.id,
                                p_company_name: metadata.company_name,
                                p_first_name: metadata.first_name || '',
                                p_last_name: metadata.last_name || '',
                                p_establishment_name: metadata.establishment_name || metadata.company_name,
                                p_establishment_category_id: metadata.establishment_category_id || null,
                                p_establishment_address: metadata.establishment_address || null,
                                p_establishment_city: metadata.establishment_city || null,
                                p_establishment_postal_code: metadata.establishment_postal_code || null,
                                p_establishment_latitude: metadata.establishment_latitude || null,
                                p_establishment_longitude: metadata.establishment_longitude || null,
                            })

                            if (rpcError) {
                                logger.error('❌ Signup RPC failed:', rpcError)
                                setStatus('error')
                                return
                            }
                        }
                    }

                    // Sign out so user starts fresh from login
                    await supabase.auth.signOut()
                    setStatus('success')
                } else {
                    // Wait for token processing then retry
                    await new Promise(r => setTimeout(r, 2000))
                    const { data: { session: retrySession } } = await supabase.auth.getSession()
                    if (retrySession?.user?.email_confirmed_at) {
                        await supabase.auth.signOut()
                        setStatus('success')
                    } else {
                        setStatus('error')
                    }
                }
            } catch (err) {
                logger.error('Email confirmation error:', err)
                setStatus('error')
            }
        }

        verify()
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    {status === 'verifying' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Vérification en cours...
                            </h1>
                            <p className="text-gray-500">
                                Nous vérifions votre adresse email
                            </p>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, type: 'spring' }}
                        >
                            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Compte vérifié !
                            </h1>
                            <p className="text-gray-500 mb-8">
                                Votre adresse email a été confirmée avec succès. Vous pouvez maintenant vous connecter à votre espace.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-primary/30 hover:shadow-xl"
                            >
                                Se connecter
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Vérification en attente
                            </h1>
                            <p className="text-gray-500 mb-8">
                                Nous n'avons pas pu confirmer votre email automatiquement. Essayez de vous connecter directement.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200"
                            >
                                Aller au login
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                    © 2025 Shift Express. Tous droits réservés.
                </p>
            </motion.div>
        </div>
    )
}
