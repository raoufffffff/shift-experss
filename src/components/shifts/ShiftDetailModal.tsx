// Refactored ShiftDetailModal - now uses sub-components for better maintainability
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

// Modular Components from Pages
import { ShiftHeader } from '../../pages/shifts/components/ShiftHeader';
import { ShiftSummaryCards } from '../../pages/shifts/components/ShiftSummaryCards';
import { ShiftInfoSection } from '../../pages/shifts/components/ShiftInfoSection';
import { ShiftApplicationsTabs } from '../../pages/shifts/components/ShiftApplicationsTabs';
import { AdjustHoursDialog } from '@/components/shifts/AdjustHoursDialog';
import { ValidateShiftDialog } from '@/components/shifts/ValidateShiftDialog';

// Hooks
import { useShiftDetail } from './shift-detail/hooks/useShiftDetail';
import type { ShiftApplication } from './shift-detail/types';

export function ShiftDetailModal({ shiftId, isOpen, onClose }: { shiftId: string | null; isOpen: boolean; onClose: () => void }) {
    const { t, i18n } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

    // Data fetching & Calculations
    const detail = useShiftDetail({
        shiftId,
        isOpen,
    });

    const {
        shift,
        isLoading,
        freelancerApplications,
        matchingScores,
        usageStats,
        displayStatus,
        duration,
        effectiveDuration,
        totalAssignedStaff,
        stats,
        mutations,
        adjustHoursDialogOpen,
        setAdjustHoursDialogOpen,
        isValidateDialogOpen,
        setIsValidateDialogOpen,
        getDateLocale
    } = detail;

    // Early returns for loading/error states
    if (!isOpen || !shiftId) return null;

    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-6xl max-h-[90vh]">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!shift) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md">
                    <div className="text-center py-6">
                        <p className="text-muted-foreground">{t('shifts.notFound')}</p>
                        <Button onClick={onClose} className="mt-4">
                            {t('common.close')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Helpers for formatting (replicated from ShiftDetailPage)
    const formatDuration = (h: number) => {
        const hours = Math.floor(h);
        const minutes = Math.round((h - hours) * 60);
        return minutes === 0 ? `${hours}h` : `${hours}h${minutes.toString().padStart(2, '0')}`;
    };

    const extractTime = (dt: string) => {
        const [_, timePart] = dt.split('T');
        if (!timePart) return '00:00';
        const [h, m] = timePart.split(':');
        return `${h}:${m}`;
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

    const statusVariants: Record<string, 'default' | 'secondary' | 'success' | 'danger' | 'warning' | 'purple'> = {
        pending: 'secondary',
        partially_filled: 'warning',
        filled: 'success',
        completed: 'default',
        cancelled: 'danger',
        closed: 'danger',
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full !max-w-[90vw] !w-[90vw] h-[95vh] overflow-hidden p-0 !mx-auto flex flex-col">
                {/* Scrollable container */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
                        {/* Header Section */}
                        <ShiftHeader
                            shift={shift}
                            displayStatus={displayStatus}
                            onBack={onClose}
                            statusLabel={t(`shifts.status.${displayStatus}`)}
                            statusVariant={statusVariants[displayStatus]}
                            isAdminOrManager={isAdminOrManager}
                            isBoostable={isAdminOrManager && shift.status === 'pending'}
                            onSendReminder={() => mutations.sendReminder.mutate()}
                            onCloseShift={() => mutations.closeShift.mutate()}
                            onBoost={() => {/* boost handled elsewhere */}}
                            t={t}
                        />

                        {/* Top KPI Cards */}
                        <ShiftSummaryCards
                            shift={shift}
                            totalAssignedStaff={totalAssignedStaff}
                            effectiveDuration={effectiveDuration}
                            formatDuration={formatDuration}
                            t={t}
                            i18n={i18n}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                            {/* Shift Details */}
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

                            {/* Applications Management */}
                            {isAdminOrManager && (
                                <ShiftApplicationsTabs
                                    applications={stats?.applications || []}
                                    freelancerApplications={freelancerApplications}
                                    matchingScores={matchingScores}
                                    usageStats={usageStats}
                                    isAdminOrManager={isAdminOrManager}
                                    canAssign={isAdminOrManager && !['closed', 'cancelled', 'completed'].includes(shift.status)}
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
                                    navigate={onClose} // Closing modal since we don't have a separate navigation context easily here or just use a dummy
                                    t={t}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Inline Dialogs */}
                <AdjustHoursDialog
                    shift={shift}
                    open={adjustHoursDialogOpen}
                    onOpenChange={setAdjustHoursDialogOpen}
                />

                <ValidateShiftDialog
                    isOpen={isValidateDialogOpen}
                    onClose={() => setIsValidateDialogOpen(false)}
                    shift={shift}
                />
            </DialogContent>
        </Dialog>
    );
}
