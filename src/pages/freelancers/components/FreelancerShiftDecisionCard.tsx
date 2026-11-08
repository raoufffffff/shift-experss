import { CheckCircle2, XCircle, Loader2, Briefcase, Clock, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import type { FreelancerApplication } from '../types';

interface FreelancerShiftDecisionCardProps {
    application: FreelancerApplication;
    isAccepting: boolean;
    isRejecting: boolean;
    onAccept: () => void;
    onReject: () => void;
    dateFnsLocale: Locale;
    t: (key: string, options?: Record<string, unknown>) => string;
}

// ✅ تبان فوق صفحة الفريلانس فقط عندما يزورها العميل عبر ?for=<shiftId> من صفحة الشيفت،
// باش يتفقد الفريلانس ويقرر بلا ما يرجع للشيفت. نفس منطق القبول/الرفض ديال useFreelancerDecision
// (بما فيه event groups) — هنا غير العرض والأزرار.
export function FreelancerShiftDecisionCard({
    application,
    isAccepting,
    isRejecting,
    onAccept,
    onReject,
    dateFnsLocale,
    t,
}: FreelancerShiftDecisionCardProps) {
    // ✅ 'applied' هي الحالة الوحيدة المعلّقة حسب CHECK constraint ديال
    // shift_freelancer_applications ('applied' | 'accepted' | 'rejected' | 'withdrawn' | 'removed')
    const isPending = application.status === 'applied';
    const isBusy = isAccepting || isRejecting;

    // ✅ بعد الفعل: الأزرار تتبدل لمؤشر نتيجة بدون redirect
    if (!isPending) {
        return (
            <div
                className={`rounded-2xl border p-4 flex items-center gap-3 ${application.status === 'accepted'
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                        : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                    }`}
            >
                {application.status === 'accepted' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                )}
                <p className="text-sm font-medium text-foreground">
                    {application.status === 'accepted'
                        ? t('freelancers.shiftDecision.accepted', { defaultValue: 'Vous avez accepté ce freelance pour ce shift.' })
                        : t('freelancers.shiftDecision.rejected', { defaultValue: 'Vous avez refusé ce freelance pour ce shift.' })}
                </p>
            </div>
        );
    }

    const shift = application.shift;

    return (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {t('freelancers.shiftDecision.title', { defaultValue: 'Décision pour ce shift' })}
                    </p>
                    {shift && (
                        <div className="space-y-0.5">
                            <p className="font-semibold text-foreground flex items-center gap-1.5">
                                <Briefcase className="w-4 h-4 text-muted-foreground" />
                                {shift.position_name}
                            </p>
                            {shift.establishments?.name && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4" />
                                    {shift.establishments.name}
                                </p>
                            )}
                            {shift.start_time && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(shift.start_time), 'PPPp', { locale: dateFnsLocale })}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    onClick={onAccept}
                    disabled={isBusy}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
                >
                    {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t('freelancers.shiftDecision.accept', { defaultValue: 'Accepter' })}
                </Button>
                <Button
                    onClick={onReject}
                    disabled={isBusy}
                    variant="outline"
                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-1 sm:flex-none"
                >
                    {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    {t('freelancers.shiftDecision.reject', { defaultValue: 'Refuser' })}
                </Button>
            </div>
        </div>
    );
}