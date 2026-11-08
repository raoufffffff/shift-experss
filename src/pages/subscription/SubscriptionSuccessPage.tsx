import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { useLocale } from '@/hooks/useLocale'

export function SubscriptionSuccessPage() {
  const { t } = useTranslation()
  const { navigate } = useLocale()
  const [searchParams] = useSearchParams()
  const { company, refreshCompany } = useAuthStore()

  // Check session immediately before any rendering
  const sessionId = searchParams.get('session_id')
  const processedKey = sessionId ? `processed_session_${sessionId}` : null
  const isAlreadyProcessed = processedKey ? sessionStorage.getItem(processedKey) : null

  const [isVerifying, setIsVerifying] = useState(!isAlreadyProcessed)
  const [verificationComplete, setVerificationComplete] = useState(false)

  // Immediate redirect if already processed
  useEffect(() => {
    if (isAlreadyProcessed) {
      logger.log('Session already processed, redirecting immediately...')
      navigate('/subscription', { replace: true })
    }
  }, [isAlreadyProcessed, navigate])

  useEffect(() => {
    // Skip if already processed
    if (isAlreadyProcessed) return

    let isMounted = true

    const verifySubscription = async () => {
      if (!sessionId) {
        if (isMounted) {
          toast.error(t('subscription.success.missingSession'))
          navigate('/subscription')
        }
        return
      }

      if (!processedKey) return

      // Marquer comme étant en cours de traitement
      sessionStorage.setItem(processedKey, 'processing')

      // Attendre quelques secondes pour que le webhook Stripe ait le temps de mettre à jour la base de données
      await new Promise(resolve => setTimeout(resolve, 3000))

      if (!isMounted) return

      try {
        // Rafraîchir les données de l'entreprise
        await refreshCompany()

        // Récupérer les nouvelles données de l'entreprise
        if (company?.id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('subscription_plan, subscription_status')
            .eq('id', company.id)
            .single()

          if (companyData && isMounted) {
            setVerificationComplete(true)

            // Afficher un message de succès avec le nouveau plan
            toast.success(
              t('subscription.success.upgraded', {
                plan: companyData.subscription_plan?.toUpperCase() || 'FREE'
              }),
              {
                duration: 5000,
              }
            )

            // Marquer comme complètement traité
            sessionStorage.setItem(processedKey, 'completed')

            // Rediriger vers /subscription après 2 secondes
            setTimeout(() => {
              if (isMounted) {
                navigate('/subscription', { replace: true })
              }
            }, 2000)
          }
        }
      } catch (error) {
        logger.error('Error verifying subscription:', error)
        if (isMounted) {
          toast.error(t('subscription.success.verificationError'))
          // En cas d'erreur, retirer la marque pour permettre de réessayer
          sessionStorage.removeItem(processedKey)
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false)
        }
      }
    }

    verifySubscription()

    return () => {
      isMounted = false
    }
  }, [isAlreadyProcessed, sessionId, processedKey, company?.id, refreshCompany, t, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          {isVerifying ? (
            <>
              <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl">{t('subscription.success.verifying')}</CardTitle>
              <CardDescription>
                {t('subscription.success.verifyingDescription')}
              </CardDescription>
            </>
          ) : verificationComplete ? (
            <>
              <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl">{t('subscription.success.title')}</CardTitle>
              <CardDescription>
                {t('subscription.success.description')}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-orange-600" />
              </div>
              <CardTitle className="text-2xl">{t('subscription.success.delayed')}</CardTitle>
              <CardDescription>
                {t('subscription.success.delayedDescription')}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!isVerifying && (
            <>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">{t('subscription.success.nextSteps')}</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>{t('subscription.success.step1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>{t('subscription.success.step2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>{t('subscription.success.step3')}</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => navigate('/subscription')}
                  variant="outline"
                >
                  {t('subscription.success.viewSubscription')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate('/dashboard')}
                >
                  {t('subscription.success.goToDashboard')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
