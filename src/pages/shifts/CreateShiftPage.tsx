import { ArrowLeft, AlertTriangle, Users, RotateCcw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';

// Sub-components
import {
  StepIndicator,
  DateTimeStep,
  LocationStep,
  DetailsStep,
  RecipientsStep,
  FreelanceQuoteStep,
  SummaryStep,
} from '@/components/shifts/wizard';

// Hooks
import { useCreateShift } from './hooks/useCreateShift';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export function CreateShiftPage() {
  const {
    t, currentLang, navigate, formData, currentStep, maxStepReached,
    dismissedLowReadiness, setDismissedLowReadiness, siretDocument, isSiretLoading,
    shiftReadinessScore, activeEmployeesCount, minimumEmployees, updateFormData,
    handleNext, handlePrevious, handleGoToStep, handleResetWizard,
    establishments, categories, jobPositions, employees, loadingEmployees, employeesError,
    canCreate, limitMessage, isSubmitting, handleSubmit, hasFreelanceStep, hasRateStep, company, establishmentJobRate,
    // 📊 إحصائيات الموظفين (عدد المهام المقبولة / الانسحابات) مع نفس الشركة — لعرضها فـ RecipientsStep
    employeeStatsMap,
    // 🚗 Frais de déplacement
    offersTransportFee, setOffersTransportFee, transportFeeCap, setTransportFeeCap,
  } = useCreateShift();

  // ─────────────────────────────────────────────────────────────
  // Onboarding gate: publishing a shift requires BOTH the company's
  // SIRET to be verified AND an active SEPA mandate — the same
  // financial-readiness reasoning as the rest of the payment system
  // (a shift that gets accepted immediately triggers a charge attempt
  // via charge-shift-on-acceptance, which hard-requires
  // company.sepa_status === 'active' and would just fail with
  // payment_status: 'charge_failed' otherwise). Blocking earlier, at
  // shift-creation time, avoids ever reaching that failure state.
  //
  // Single shared screen for both conditions (product decision): the
  // message lists whichever requirement(s) are actually missing,
  // rather than showing a different screen per condition. This keeps
  // one blocking UI to maintain instead of two near-duplicates.
  // ─────────────────────────────────────────────────────────────
  const isSiretVerified = siretDocument?.status === 'verified';
// Une entreprise en règlement par virement (IBAN dédié) n'a pas besoin de mandat SEPA :
// son plafond d'encours est contrôlé côté base de données au moment de la publication.
const isBankTransferCompany =
  (company as any)?.payment_mode === 'settlement' &&
  (company as any)?.settlement_collection === 'bank_transfer';
const isSepaActive = company?.sepa_status === 'active' || isBankTransferCompany;
  const isOnboardingIncomplete = !isSiretLoading && company?.id && (!isSiretVerified || !isSepaActive);

  if (isOnboardingIncomplete) {
    const missingBoth = !isSiretVerified && !isSepaActive;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/shifts')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/30 dark:border-orange-800">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center mb-2">
              <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>

            <h2 className="text-xl font-bold text-orange-800 dark:text-orange-300">
              {missingBoth
                ? t('shifts.onboardingRequired.titleBoth', { defaultValue: 'Configuration requise avant de publier' })
                : !isSiretVerified
                  ? t('shifts.siretVerification.title', { defaultValue: "Vérification de l'entreprise requise" })
                  : t('shifts.sepaRequired.title', { defaultValue: 'Moyen de paiement requis' })}
            </h2>

            <p className="text-muted-foreground max-w-md mx-auto">
              {missingBoth
                ? t('shifts.onboardingRequired.messageBoth', { defaultValue: "Pour pouvoir publier des shifts et recruter des freelances, nous devons d'abord vérifier les informations légales de votre entreprise (SIRET) et vous devez configurer un moyen de paiement SEPA valide." })
                : !isSiretVerified
                  ? t('shifts.siretVerification.message', { defaultValue: "Pour pouvoir publier des shifts et recruter des freelances, nous devons d'abord vérifier les informations légales de votre entreprise (SIRET)." })
                  : t('shifts.sepaRequired.message', { defaultValue: "Pour pouvoir publier des shifts et recruter des freelances, vous devez d'abord configurer un moyen de paiement SEPA valide." })}
            </p>

            {/* SIRET status — only shown when it's actually the (or a) blocker */}
            {!isSiretVerified && (
              <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/50 text-sm max-w-sm">
                <div className={cn("w-2 h-2 rounded-full",
                  siretDocument?.status === 'pending' ? "bg-amber-500 animate-pulse" :
                    siretDocument?.status === 'rejected' ? "bg-red-500" : "bg-neutral-300"
                )} />
                <span className="font-medium">
                  {t('shifts.siretVerification.status', { defaultValue: 'Statut SIRET' })} : {
                    siretDocument?.status === 'pending' ? t('common.statusValues.pending', { defaultValue: 'En cours de vérification' }) :
                      siretDocument?.status === 'rejected' ? t('common.statusValues.rejected', { defaultValue: 'Refusé' }) : t('common.statusValues.unknown', { defaultValue: 'Non renseigné' })
                  }
                </span>
              </div>
            )}

            {siretDocument?.rejection_reason && !isSiretVerified && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-md">
                {t('shifts.siretVerification.rejectionReason', { defaultValue: 'Motif du refus' })} : {siretDocument.rejection_reason}
              </p>
            )}

            {/* SEPA status — only shown when it's actually the (or a) blocker */}
            {!isSepaActive && (
              <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/50 text-sm max-w-sm">
                <div className={cn("w-2 h-2 rounded-full",
                  company?.sepa_status === 'pending' ? "bg-amber-500 animate-pulse" : "bg-neutral-300"
                )} />
                <span className="font-medium">
                  {t('shifts.sepaRequired.status', { defaultValue: 'Statut paiement SEPA' })} : {
                    company?.sepa_status === 'pending' ? t('common.statusValues.pending', { defaultValue: 'En cours de vérification' }) : t('common.statusValues.unknown', { defaultValue: 'Non configuré' })
                  }
                </span>
              </div>
            )}

            <div className="pt-2">
              <Button onClick={() => navigate('/settings')}>
                {missingBoth || !isSiretVerified
                  ? t('shifts.siretVerification.goToSettings', { defaultValue: "Aller aux paramètres de l'entreprise" })
                  : t('shifts.sepaRequired.goToSettings', { defaultValue: 'Configurer le paiement' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => navigate('/shifts')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back')}
      </Button>

      {shiftReadinessScore < 50 && !dismissedLowReadiness && (
        <Card
          className={cn(
            shiftReadinessScore < 25
              ? 'border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-800'
              : 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/30 dark:border-orange-800'
          )}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <AlertTriangle
                className={cn(
                  'w-5 h-5 flex-shrink-0 mt-0.5',
                  shiftReadinessScore < 25
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-orange-600 dark:text-orange-400'
                )}
              />
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p
                    className={cn(
                      'font-medium text-sm mb-1',
                      shiftReadinessScore < 25
                        ? 'text-red-900 dark:text-red-300'
                        : 'text-orange-900 dark:text-orange-300'
                    )}
                  >
                    {t('shifts.lowReadinessAlert.title', { score: shiftReadinessScore })}
                  </p>
                  <p
                    className={cn(
                      'text-sm leading-relaxed',
                      shiftReadinessScore < 25
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-orange-700 dark:text-orange-400'
                    )}
                  >
                    {t('shifts.lowReadinessAlert.message', {
                      activeEmployees: activeEmployeesCount,
                      targetEmployees: minimumEmployees,
                    })}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigate('/employees')}
                    className="w-full sm:w-auto"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {t('shifts.lowReadinessAlert.inviteButton')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDismissedLowReadiness(true)}
                    className="w-full sm:w-auto"
                  >
                    {t('shifts.lowReadinessAlert.continueAnyway')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wizard Card */}
      <Card className="p-6 sm:p-8">
        {/* Title with Reset Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {t('shifts.createTitle', { defaultValue: 'Publier un shift' })}
          </h1>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetWizard}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            {t('common.reset', { defaultValue: 'Réinitialiser' })}
          </Button>
        </div>

        {/* Step Indicator */}
        {/* hasRateStep (employés OU freelances) pilote maintenant l'affichage de
            l'étape "tarif" dans l'indicateur — plus seulement les freelances. */}
        <StepIndicator currentStep={currentStep} maxStepReached={maxStepReached} hasFreelanceStep={hasRateStep} onStepClick={handleGoToStep} />

        {/* Step Content with Animation */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <DateTimeStep
              key="step1"
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirstStep
              categories={categories}
              jobPositions={jobPositions}
              currentLang={currentLang}
            />
          )}

          {currentStep === 2 && (
            <LocationStep
              key="step2"
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              establishments={establishments || []}
            />
          )}

          {currentStep === 3 && (
            <DetailsStep
              key="step3"
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          )}

          {currentStep === 4 && (
            <RecipientsStep
              key="step4"
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              employees={employees || []}
              loadingEmployees={loadingEmployees}
              employeesError={employeesError}
              onNavigateToEmployees={() => navigate('/employees')}
              shiftReadinessScore={shiftReadinessScore}
              activeEmployeesCount={activeEmployeesCount}
              minimumEmployees={minimumEmployees}
              employeeStatsMap={employeeStatsMap}
            />
          )}

          {/* Étape tarif — s'affiche dès qu'il y a des employés OU des freelances
              (hasRateStep), pas seulement pour les freelances (hasFreelanceStep
              reste passé séparément pour ajuster la validation/le texte de l'étape). */}
          {currentStep === 5 && hasRateStep && (
            <FreelanceQuoteStep
              key="step5-quote"
              formData={formData}
              updateFormData={updateFormData}
               onNext={handleNext}
              onPrevious={handlePrevious}
              positionName={formData.positionName}
              city={establishments.find(e => e.id === formData.establishmentId)?.city || formData.shiftAddress?.split(',').pop()?.trim()}
              recommendedRateMin={establishmentJobRate?.min_rate ?? jobPositions.find(p => p.id === formData.jobPositionId)?.recommended_hourly_rate_min}
              recommendedRateMax={establishmentJobRate?.max_rate ?? jobPositions.find(p => p.id === formData.jobPositionId)?.recommended_hourly_rate_max}
              platformFeeRate={company?.platform_fee_rate ?? undefined}
              isFreelanceRate={hasFreelanceStep}
              offersTransportFee={offersTransportFee}
              onOffersTransportFeeChange={setOffersTransportFee}
              transportFeeCap={transportFeeCap}
              onTransportFeeCapChange={setTransportFeeCap}
            />
          )}

          {((currentStep === 5 && !hasRateStep) || currentStep === 6) && (
            <SummaryStep
              key="summary"
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              establishments={establishments}
              employees={employees}
              jobPositions={jobPositions}
              onGoToStep={handleGoToStep}
              canCreate={canCreate}
              limitMessage={limitMessage}
              onNavigateToSubscription={() => navigate('/settings')}
              offersTransportFee={hasFreelanceStep && offersTransportFee}
              transportFeeCap={transportFeeCap}
            />
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}