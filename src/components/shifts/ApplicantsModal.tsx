import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/cn';
import type { ShiftApplication, FreelancerApplication } from './applicants/types';
import { useApplicantsData } from './applicants/useApplicantsData';
import { ShiftInfoHeader } from './applicants/ShiftInfoHeader';
import { EmployeeApplicants } from './applicants/EmployeeApplicants';
import { FreelancerApplicants } from './applicants/FreelancerApplicants';
import { FreelancerProfilePanel } from './applicants/FreelancerProfilePanel';

interface ApplicantsModalProps {
    shiftId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ApplicantsModal({ shiftId, isOpen, onClose }: ApplicantsModalProps) {
    const { t } = useTranslation();
    const userRole = useAuthStore((state) => state.user?.role);
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
    const [confirmDialog, setConfirmDialog] = useState<{ action: 'accept' | 'reject'; app: FreelancerApplication } | null>(null);
    const [viewingFreelancerId, setViewingFreelancerId] = useState<string | null>(null);

    const {
        shift,
        isLoading,
        freelancerApplications,
        matchingScores,
        assignEmployeeMutation,
        acceptFreelancerMutation,
        rejectFreelancerMutation,
    } = useApplicantsData({ shiftId, isOpen });

    const applications = ((shift?.shift_applications || []) as ShiftApplication[]);
    const acceptedApplications = useMemo(() => applications.filter((a) => a.status === 'accepted'), [applications]);
    const availableApplications = useMemo(() => applications.filter((a) => a.status === 'applied'), [applications]);

    const acceptedFreelancers = useMemo(() => freelancerApplications.filter((a) => a.status === 'accepted'), [freelancerApplications]);
    const pendingFreelancerApplications = useMemo(() => freelancerApplications.filter((a) => a.status === 'applied'), [freelancerApplications]);

    if (!isOpen || !shiftId) return null;

    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0">
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!shift) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md">
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">{t('shifts.notFound')}</p>
                        <Button onClick={onClose} className="mt-6">
                            {t('common.close')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const durationRaw = (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60);
    const duration = isNaN(durationRaw) ? 0 : durationRaw;
    const effectiveDuration = duration - ((shift.break_duration_minutes || 0) / 60);

    return (
    <>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setViewingFreelancerId(null); onClose(); } }}>
            <DialogContent className="max-w-6xl w-full max-h-[92vh] overflow-hidden p-0 shadow-2xl border-none">
                {viewingFreelancerId ? (
                    <FreelancerProfilePanel
                        freelancerId={viewingFreelancerId}
                        onBack={() => setViewingFreelancerId(null)}
                    />
                ) : (
                    <>
                        {/* Header Section with Shift Info */}
                        <ShiftInfoHeader shift={shift} effectiveDuration={effectiveDuration} onClose={onClose} />

                        {/* Main Content Area */}
                        <div className="overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-8" style={{ maxHeight: 'calc(92vh - 200px)' }}>
                            <div className={cn("grid gap-8", shift.published_to_freelancers ? "lg:grid-cols-2" : "max-w-3xl mx-auto")}>
                                {/* Internal Employees Section */}
                                <EmployeeApplicants
                                    applications={applications}
                                    isAdminOrManager={isAdminOrManager}
                                    assignEmployeeMutation={assignEmployeeMutation}
                                />

                                {/* Freelance Section */}
                                {shift.published_to_freelancers && (
                                    <FreelancerApplicants
                                        freelancerApplications={freelancerApplications}
                                        matchingScores={matchingScores}
                                        isAdminOrManager={isAdminOrManager}
                                        acceptFreelancerMutation={acceptFreelancerMutation}
                                        rejectFreelancerMutation={rejectFreelancerMutation}
                                        onConfirmAction={(action, app) => setConfirmDialog({ action, app })}
                                        onViewProfile={(freelancerId) => setViewingFreelancerId(freelancerId)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Fixed Footer with Summary */}
                        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 md:px-8 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                    <span className="text-slate-500 font-medium">{acceptedApplications.length + acceptedFreelancers.length} {t('shifts.status.filled')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                    <span className="text-slate-500 font-medium">{availableApplications.length + pendingFreelancerApplications.length} {t('shifts.status.pending')}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {shift.id.substring(0, 8)}</p>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>

        {/* Confirmation dialog for accept/reject */}
        <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>
                        {confirmDialog?.action === 'accept'
                            ? t('shifts.confirmAcceptTitle', { defaultValue: 'Accepter la candidature' })
                            : t('shifts.confirmRejectTitle', { defaultValue: 'Refuser la candidature' })
                        }
                    </DialogTitle>
                    <DialogDescription>
                        {confirmDialog?.action === 'accept'
                            ? t('shifts.confirmAcceptDesc', {
                                defaultValue: `\u00CAtes-vous s\u00FBr de vouloir accepter la candidature de ${confirmDialog?.app.freelancer?.first_name || ''} ${confirmDialog?.app.freelancer?.last_name || ''} ? Un email de confirmation lui sera envoy\u00E9.`,
                                name: `${confirmDialog?.app.freelancer?.first_name || ''} ${confirmDialog?.app.freelancer?.last_name || ''}`.trim(),
                              })
                            : t('shifts.confirmRejectDesc', {
                                defaultValue: `\u00CAtes-vous s\u00FBr de vouloir refuser la candidature de ${confirmDialog?.app.freelancer?.first_name || ''} ${confirmDialog?.app.freelancer?.last_name || ''} ?`,
                                name: `${confirmDialog?.app.freelancer?.first_name || ''} ${confirmDialog?.app.freelancer?.last_name || ''}`.trim(),
                              })
                        }
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmDialog(null)}>
                        {t('common.cancel', { defaultValue: 'Annuler' })}
                    </Button>
                    <Button
                        variant={confirmDialog?.action === 'accept' ? 'default' : 'destructive'}
                        className={confirmDialog?.action === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        onClick={() => {
                            if (!confirmDialog) return;
                            if (confirmDialog.action === 'accept') {
                                acceptFreelancerMutation.mutate(confirmDialog.app);
                            } else {
                                rejectFreelancerMutation.mutate(confirmDialog.app.id);
                            }
                            setConfirmDialog(null);
                        }}
                        disabled={acceptFreelancerMutation.isPending || rejectFreelancerMutation.isPending}
                    >
                        {confirmDialog?.action === 'accept'
                            ? t('shifts.accept', { defaultValue: 'Accepter' })
                            : t('shifts.reject', { defaultValue: 'Refuser' })
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
    );
}
