import { useTranslation } from 'react-i18next';
import { useShiftDetail } from './hooks/useShiftDetail';
import { ShiftHeader } from './components/ShiftHeader';
import { ShiftSummaryCards } from './components/ShiftSummaryCards';
import { ShiftInfoSection } from './components/ShiftInfoSection';
import { ShiftApplicationsTabs } from './components/ShiftApplicationsTabs';
import { ShiftDetailSkeleton } from '@/components/skeletons/ShiftDetailSkeleton';
import { AdjustHoursDialog } from '@/components/shifts/AdjustHoursDialog';
import { ValidateShiftDialog } from '@/components/shifts/ValidateShiftDialog';
import { BoostShiftDialog } from '@/components/shifts/BoostShiftDialog';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ShiftStatus, ShiftApplication } from '../../components/shifts/shift-detail/types';
import { TERMINAL_SHIFT_STATUSES } from '@shared/types';
import { useEffect, useState } from 'react';
import { ExtendShiftDialog } from './components/ExtendShiftDialog';
import { formatShiftTime } from '../../lib/Shifttime';
import { RescheduleShiftDialog } from '@/components/shifts/RescheduleShiftDialog';
import { ConvertToEmployeesDialog } from './components/ConvertToEmployeesDialog';
import { AutoCallDialog } from './components/AutoCallDialog';
import { AutoCallStatusCard } from './components/AutoCallStatusCard';
import { TransportFeesSection } from '@/components/finance/TransportFeesSection';
 const statusVariants: Record<
  ShiftStatus,
  'default' | 'secondary' | 'success' | 'danger' | 'warning' | 'purple'
> = {
  pending: 'secondary',
  partially_filled: 'warning',
  filled: 'success',
  pending_validation: 'purple',
  completed: 'default',
  cancelled: 'danger',
  closed: 'danger',
};

export function ShiftDetailPage() {
  const { t } = useTranslation();
  const detail = useShiftDetail();
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false)
    const {
     shift,
     isLoading,
     displayStatus,
     canReschedule,
     isRescheduleDialogOpen,
     setIsRescheduleDialogOpen,
     rescheduleTargetShifts,
     totalAssignedStaff,
     effectiveDuration,
     isAdminOrManager,
     navigate,
     mutations,
     stats,
     matchingScores,
     usageStats,
     employeeUsageStats,
     eventGroupSummary,
     adjustHoursDialogOpen,
     setAdjustHoursDialogOpen,
     isValidateDialogOpen,
     setIsValidateDialogOpen,
     isBoostDialogOpen,
     setIsBoostDialogOpen,
     isBoostable,
     getDateLocale,
     hasAcceptedApplicant,
     canConvertToEmployees,
     isConvertDialogOpen,
     setIsConvertDialogOpen,
     relatedShiftIds,
     autoCallStatus,
     isAutoCallDialogOpen,
     setIsAutoCallDialogOpen,
     i18n
   } = detail;
  useEffect(() => {
    const scrrollToTop = () => {
      window.scrollTo({
        behavior: "smooth",
        top: 0
      })
    }
    scrrollToTop()
  }, [])
  if (isLoading) return <ShiftDetailSkeleton />;

  if (!shift) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-muted/10 rounded-3xl border border-dashed border-border/60 mx-4">
        <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
          <Briefcase className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t('shifts.notFound')}</h2>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          {t('shifts.notFoundDescription', { defaultValue: 'Ce shift n\'existe pas ou a été supprimé.' })}
        </p>
        <Button onClick={() => navigate('/shifts')} size="lg" className="rounded-xl px-8 shadow-lg shadow-primary/10 transition-all hover:shadow-xl">
          {t('shifts.backToShifts')}
        </Button>
      </div>
    );
  }

  // Helpers for formatting
  const formatDuration = (h: number) => {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    return minutes === 0 ? `${hours}h` : `${hours}h${minutes.toString().padStart(2, '0')}`;
  };

  // ✅ بدل new Date(dt).getHours()/.getMinutes() (جهاز المتصفح) — الآن بتوقيت
  // establishment.timezone الفعلي، بنفس fallback الافتراضي المستعمل في
  // useShiftDetail.ts (Europe/Paris) عشان يبقى العرض والحساب متسقين دايماً.
  const extractTime = (dt: string) => {
    const timezone = (shift as unknown as { establishment?: { timezone?: string | null } }).establishment?.timezone || 'Europe/Paris';
    return formatShiftTime(dt, timezone, { style: 'time-only' });
  };

  const extractDate = (dt: string) => {
    const [datePart] = dt.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const getResponseTime = (application: ShiftApplication) => {
    if (!application.reviewed_at) return null;
    const sentAt = new Date(application.applied_at);
    const respondedAt = new Date(application.reviewed_at);
    const diffMs = respondedAt.getTime() - sentAt.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return t('shifts.responseTime.instant');
    if (diffMin < 60) return t('shifts.responseTime.minutes', { count: diffMin });
    const hours = Math.floor(diffMin / 60);
    if (hours < 24) return t('shifts.responseTime.hours', { hours });
    return t('shifts.responseTime.days', { days: Math.floor(hours / 24) });
  };

  const getEstimatedCost = (app: ShiftApplication) => {
    const rate = app.employee?.verified_hourly_rate;
    if (!rate) return '-';
    return new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(effectiveDuration * rate);
  };

  const getMatchingScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 space-y-8 animate-in fade-in duration-500">
             <ShiftHeader
         onExtend={() => setIsExtendDialogOpen(true)}
         shift={shift}
         canReschedule={canReschedule}
         onReschedule={() => setIsRescheduleDialogOpen(true)}
         displayStatus={displayStatus}
         onBack={() => navigate('/shifts')}
         statusLabel={t(`shifts.status.${displayStatus}`)}
         statusVariant={statusVariants[displayStatus]}
         isAdminOrManager={isAdminOrManager}
         isBoostable={isBoostable}
        hasAcceptedApplicant={hasAcceptedApplicant}
         canConvertToEmployees={canConvertToEmployees}
         onConvertToEmployees={() => setIsConvertDialogOpen(true)}
         autoCallVisible={!!autoCallStatus && (autoCallStatus.enabled || autoCallStatus.visible)}
         autoCallEnabled={!!autoCallStatus?.enabled}
         onAutoCall={() => setIsAutoCallDialogOpen(true)}
         onSendReminder={() => mutations.sendReminder.mutate()}
         onCloseShift={() => mutations.closeShift.mutate()}
         onBoost={() => setIsBoostDialogOpen(true)}
         t={t}
       />

      <ShiftSummaryCards
        shift={shift}
        totalAssignedStaff={stats?.totalAssignedStaff || 0}
        effectiveDuration={effectiveDuration}
        formatDuration={formatDuration}
        t={t}
        i18n={i18n}
        eventGroupSummary={eventGroupSummary}
      />

      {/* ✅ جديد — Relance par appel : suivi (chiffres agrégés uniquement) */}
      {isAdminOrManager && autoCallStatus?.feature_available && (autoCallStatus.enabled || autoCallStatus.calls_made > 0) && (
        <AutoCallStatusCard
          status={autoCallStatus}
          onManage={() => setIsAutoCallDialogOpen(true)}
          t={t}
        />
      )}

      {/* ✅ جديد — طلبات تعويض التنقل المرتبطة بهذا الشيفت (أو بكل أيام السلسلة): عرض الإيصال + موافقة/رفض */}
      {isAdminOrManager && (
        <div className="space-y-4">
          <TransportFeesSection shiftIds={relatedShiftIds} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <ShiftInfoSection
          shift={shift}
          formatDuration={formatDuration}
          extractTime={extractTime}
          extractDate={extractDate}
          getDateLocale={getDateLocale}
          effectiveDuration={effectiveDuration}
          isAdminOrManager={isAdminOrManager}
          onAdjustHours={() => setAdjustHoursDialogOpen(true)}
          onValidate={() => setIsValidateDialogOpen(true)}
          t={t}
          i18n={i18n}
        />

        {isAdminOrManager && (
          <ShiftApplicationsTabs
            applications={stats?.applications || []}
            freelancerApplications={detail.freelancerApplications}
            matchingScores={matchingScores}
            usageStats={usageStats}
            // ✅ جديد — إحصائيات الموظفين (completed/withdrawn) مع الشركة، لعرضها فـ EmployeeCard
            employeeUsageStats={employeeUsageStats}
            shiftid={shift.id}
            isAdminOrManager={isAdminOrManager}
            canAssign={isAdminOrManager && !(TERMINAL_SHIFT_STATUSES as readonly string[]).includes(shift.status)}
            shiftHourlyRate={shift.freelance_hourly_rate}
            onAssignEmployee={(id) => mutations.assignEmployee.mutate(id)}
            onReportNoShow={(id) => mutations.reportNoShow.mutate(id)}
            onCancelNoShow={(id) => mutations.cancelNoShow.mutate(id)}
            onAcceptFreelancer={(id, stats) => {
              if (stats && (stats.total_shifts >= 60 || stats.total_hours >= 400)) {
                if (confirm(t('shifts.legalRiskConfirm', { shifts: stats.total_shifts, hours: stats.total_hours }))) {
                  mutations.acceptFreelancer.mutate(id);
                }
              } else {
                mutations.acceptFreelancer.mutate(id);
              }
            }}
            onRejectFreelancer={(id) => mutations.rejectFreelancer.mutate(id)}
            getEstimatedCost={getEstimatedCost}
            getResponseTime={getResponseTime}
            getMatchingScoreColor={getMatchingScoreColor}
            navigate={navigate}
            t={t}
          />
        )}
      </div>
      {shift.status === 'completed' && (
        <ExtendShiftDialog 
          shift={shift}
          open={isExtendDialogOpen}
          onOpenChange={setIsExtendDialogOpen}
        />
      )}
      {/* Dialogs */}
             {isAdminOrManager && (
         <>
           <AdjustHoursDialog
             open={adjustHoursDialogOpen}
             onOpenChange={setAdjustHoursDialogOpen}
             shift={shift}
           />
           <ValidateShiftDialog
             isOpen={isValidateDialogOpen}
             onClose={() => setIsValidateDialogOpen(false)}
             shift={shift}
           />
           <BoostShiftDialog
             shift={shift as unknown as Parameters<typeof BoostShiftDialog>[0]['shift']}
             isOpen={isBoostDialogOpen}
             onClose={() => setIsBoostDialogOpen(false)}
             onSuccess={() => {
               // The hook's query will invalidate automatically if needed, or we can force it here
             }}
           />
          <AutoCallDialog
            open={isAutoCallDialogOpen}
            onOpenChange={setIsAutoCallDialogOpen}
            status={autoCallStatus}
            isPending={mutations.setAutoCalls.isPending}
            onToggle={(enabled) => mutations.setAutoCalls.mutate(enabled)}
            t={t}
          />
          <ConvertToEmployeesDialog
            open={isConvertDialogOpen}
            onOpenChange={setIsConvertDialogOpen}
            shift={{ id: shift.id, company_id: shift.company_id, establishment_id: shift.establishment_id }}
            alreadyInvitedUserIds={(shift.shift_applications || [])
              .filter((a) => ['pending', 'applied', 'accepted'].includes(a.status as string))
              .map((a) => a.user_id)}
            daysCount={eventGroupSummary?.daysCount ?? 1}
            pendingFreelancerCount={detail.freelancerApplications.filter((a) => a.status === 'applied').length}
            isPending={mutations.convertToEmployees.isPending}
            onConfirm={(userIds) => mutations.convertToEmployees.mutate(userIds)}
          />
          <RescheduleShiftDialog
            open={isRescheduleDialogOpen}
            onOpenChange={setIsRescheduleDialogOpen}
            shifts={rescheduleTargetShifts}
            isPending={mutations.rescheduleShift.isPending}
            onConfirm={(entries) => mutations.rescheduleShift.mutate(entries)}
            t={t}
          />
         </>
       )}
    </div>
  );
}