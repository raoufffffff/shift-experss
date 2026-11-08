import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Sparkles, Building2, Users, CalendarCheck } from 'lucide-react'

interface WelcomeModalProps {
  open: boolean
  onClose: () => void
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  const { t } = useTranslation()

  const handleGetStarted = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-3xl">
            {t('onboarding.welcome.title')}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {t('onboarding.welcome.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* 2 Steps */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-center mb-4">
              {t('onboarding.welcome.steps.title')}
            </h3>

            {/* Step 1: Employees */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 dark:from-green-950/50 dark:to-green-900/30 dark:border-green-900">
              <div className="w-8 h-8 rounded-full bg-green-500 dark:bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <Users className="w-5 h-5 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {t('onboarding.welcome.steps.step1')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('onboarding.welcome.steps.step1Hint')}
                </p>
              </div>
            </div>

            {/* Step 2: Shift */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 dark:from-purple-950/50 dark:to-purple-900/30 dark:border-purple-900">
              <div className="w-8 h-8 rounded-full bg-purple-500 dark:bg-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <CalendarCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {t('onboarding.welcome.steps.step2')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleGetStarted} size="lg" className="w-full">
            {t('onboarding.welcome.getStarted')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
