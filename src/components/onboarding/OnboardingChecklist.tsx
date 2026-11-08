import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress'
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp, Eye, EyeOff, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { WelcomeModal } from './WelcomeModal'

export function OnboardingChecklist() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    steps,
    completedSteps,
    totalSteps,
    checklistPercentage,
    isOnboardingComplete,
    dismissChecklist,
    isChecklistDismissed,
    resetWelcome,
    totalEmployeesCount,
    employeeTarget,
  } = useOnboardingProgress()

  const [isCollapsed, setIsCollapsed] = useState(true) // Replié par défaut
  const [showDismissDialog, setShowDismissDialog] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)

  // Hide if permanently dismissed OR if onboarding is complete
  if (isChecklistDismissed || isOnboardingComplete) {
    return null
  }

  const handleDismiss = () => {
    setShowDismissDialog(true)
  }

  const confirmDismiss = () => {
    dismissChecklist()
    setShowDismissDialog(false)
  }

  const handleReviewOnboarding = () => {
    // Show welcome modal directly without page reload
    setShowWelcomeModal(true)
  }

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false)
  }

  const handleStepClick = (href?: string) => {
    if (href) {
      navigate(href)
    }
  }

  return (
    <>
      <WelcomeModal open={showWelcomeModal} onClose={handleCloseWelcomeModal} />

      <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-800 mb-6">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1 rounded-full bg-card border border-indigo-300 dark:border-indigo-700">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {completedSteps}/{totalSteps}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-indigo-900 dark:text-indigo-300">
                      {t('onboarding.checklist.title')}
                    </h3>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400">
                      {t('onboarding.checklist.subtitle', {
                        completed: completedSteps,
                        total: totalSteps,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="h-8 w-8 p-0"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="h-2 bg-muted/60 rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 ease-out"
                    style={{ width: `${checklistPercentage}%` }}
                  />
                </div>
              </div>

              {!isCollapsed && (
                <>
                  <div className="space-y-2">
                    {steps.map((step) => {
                  // For employee step, show progress (X/10)
                  const isEmployeeStep = step.id === 'employee'
                  const displayTitle = isEmployeeStep
                    ? `${t(step.title)} (${totalEmployeesCount}/${employeeTarget})`
                    : t(step.title)

                      return (
                        <button
                          key={step.id}
                          onClick={() => handleStepClick(step.href)}
                          disabled={step.completed}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
                            step.completed
                              ? 'bg-green-50/50 border border-green-200/40 dark:bg-green-950/30 dark:border-green-900/50'
                              : 'bg-card/60 border border-border/40 hover:bg-card/90 hover:border-primary/30'
                          )}
                        >
                          <div className="flex-shrink-0">
                            {step.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                'text-sm font-medium',
                                step.completed
                                  ? 'text-green-900 dark:text-green-400 line-through'
                                  : 'text-foreground'
                              )}
                            >
                              {displayTitle}
                            </p>
                          </div>
                          {!step.completed && step.href && (
                            <span className="text-xs text-primary font-medium">
                              {t('onboarding.checklist.start')} →
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {isOnboardingComplete && (
                    <div className="mt-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/30 rounded-lg border border-green-200/40 dark:border-green-900/50">
                      <p className="text-sm font-medium text-green-900 dark:text-green-400 text-center">
                        {t('onboarding.checklist.complete')}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-4 flex gap-2 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReviewOnboarding}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t('onboarding.checklist.reviewButton')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                      className="flex-1 text-muted-foreground hover:text-red-600"
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      {t('onboarding.checklist.dismissButton')}
                    </Button>
                  </div>
                </>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog for permanent dismissal */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('onboarding.checklist.dismissDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('onboarding.checklist.dismissDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDismissDialog(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDismiss}
            >
              {t('onboarding.checklist.dismissDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
