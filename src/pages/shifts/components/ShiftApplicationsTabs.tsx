import {
    Users,
    Briefcase,
    CheckCircle,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    XCircle,
    Undo2,
    Clock,
    TrendingUp,
    MessageSquareQuote,
    PhoneCall,
    type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { LocalizedLink as Link } from '@/components/LocalizedLink';
import { format } from 'date-fns';
import type {
    ShiftApplication,
    FreelancerApplication,
    MatchingResult
} from '../../../components/shifts/shift-detail/types';

// ✅ جديد — إحصائيات موظف واحد مع الشركة (completed/withdrawn)
interface EmployeeUsageStats {
    completed: number;
    withdrawn: number;
}

interface ShiftApplicationsTabsProps {
    applications: ShiftApplication[];
    freelancerApplications: FreelancerApplication[];
    matchingScores: Record<string, MatchingResult>;
    usageStats: Record<string, { total_shifts: number, total_hours: number }>;
    // ✅ جديد — user_id -> {completed, withdrawn}، مع نفس الشركة
    employeeUsageStats?: Record<string, EmployeeUsageStats>;
    isAdminOrManager: boolean;
    canAssign: boolean;
    shiftid: string;
    shiftHourlyRate?: number | null;
    onAssignEmployee: (id: string) => void;
    onReportNoShow: (id: string) => void;
    onCancelNoShow: (id: string) => void;
    onAcceptFreelancer: (id: string, stats?: { total_shifts: number, total_hours: number }) => void;
    onRejectFreelancer: (id: string) => void;
    getEstimatedCost: (app: ShiftApplication) => string;
    getResponseTime: (app: ShiftApplication) => string | null;
    getMatchingScoreColor: (score: number) => string;
    navigate: (path: string) => void;
    t: (key: string, options?: Record<string, unknown>) => string;
}

function formatRate(amount: number, locale = 'fr-FR') {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount);
}

export function ShiftApplicationsTabs({
    applications,
    freelancerApplications,
    matchingScores,
    usageStats,
    employeeUsageStats = {},
    isAdminOrManager,
    canAssign,
    shiftHourlyRate,
    onAssignEmployee,
    onReportNoShow,
    onCancelNoShow,
    onAcceptFreelancer,
    onRejectFreelancer,
    getEstimatedCost,
    getResponseTime,
    getMatchingScoreColor,
    navigate,
    shiftid,
    t
}: ShiftApplicationsTabsProps) {
    const acceptedApps = applications.filter(a => a.status === 'accepted');
    const availableApps = applications.filter(a => a.status === 'applied');
    const employeeOtherApps = applications.filter(a => !['accepted', 'applied'].includes(a.status));

    const acceptedFreelancers = freelancerApplications.filter(a => a.status === 'accepted');
    const pendingFreelancers = freelancerApplications.filter(a => a.status === 'applied');
    const freelancerOtherApps = freelancerApplications.filter(a => a.status === 'rejected' || a.status === 'withdrawn');

    const referenceRate = shiftHourlyRate ?? null;

    const isHigherOffer = (app: FreelancerApplication) =>
        referenceRate != null && app.freelance_hourly_rate != null && app.freelance_hourly_rate > referenceRate;

     const sortedPendingFreelancers = [...pendingFreelancers].sort(
        (a, b) => (isHigherOffer(b) ? 1 : 0) - (isHigherOffer(a) ? 1 : 0)
    );

    const totalCount = applications.length + freelancerApplications.length;

    return (
        <div className="mt-8 space-y-6">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                {t('shifts.allApplicants', { defaultValue: 'Tous les candidats' })} ({totalCount})
            </h3>

            {/* --- En attente : employés disponibles + freelances en attente --- */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border/40">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        {t('shifts.pendingApplicants', { defaultValue: 'En attente' })} ({availableApps.length + sortedPendingFreelancers.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {availableApps.length === 0 && sortedPendingFreelancers.length === 0 ? (
                        <EmptyState icon={Sparkles} message={t('shifts.noPendingApplicants', { defaultValue: 'Aucune candidature en attente' })} />
                    ) : (
                        <div className="grid gap-4 p-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
                            {availableApps.map((app) => (
                                <EmployeeCard
                                    key={app.id}
                                    app={app}
                                    canAssign={canAssign}
                                    usageStats={employeeUsageStats[app.user_id]}
                                    onAssignEmployee={onAssignEmployee}
                                    onReportNoShow={onReportNoShow}
                                    onCancelNoShow={onCancelNoShow}
                                    getResponseTime={getResponseTime}
                                    navigate={navigate}
                                    t={t}
                                />
                            ))}
                            {sortedPendingFreelancers.map((app) => (
                                <FreelancerCard
                                    key={app.id}
                                    app={app}
                                    shiftid={shiftid}
                                    matchingScore={matchingScores[app.freelancer_id]}
                                    stats={usageStats[app.freelancer_id]}
                                    canAssign={canAssign}
                                    referenceRate={referenceRate}
                                    onAccept={() => onAcceptFreelancer(app.id, usageStats[app.freelancer_id])}
                                    onReject={() => onRejectFreelancer(app.id)}
                                    getMatchingScoreColor={getMatchingScoreColor}
                                    navigate={navigate}
                                    t={t}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* --- Acceptés --- */}
            {(acceptedApps.length > 0 || acceptedFreelancers.length > 0) && (
                <Card className="border-emerald-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-emerald-50/40 border-b border-emerald-100">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
                            <CheckCircle className="w-4 h-4" />
                            {t('shifts.acceptedApplicants', { defaultValue: 'Acceptés' })} ({acceptedApps.length + acceptedFreelancers.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
                            {acceptedApps.map((app) => (
                                <EmployeeCard
                                    key={app.id}
                                    app={app}
                                    canAssign={canAssign}
                                    usageStats={employeeUsageStats[app.user_id]}
                                    onAssignEmployee={onAssignEmployee}
                                    onReportNoShow={onReportNoShow}
                                    onCancelNoShow={onCancelNoShow}
                                    getResponseTime={getResponseTime}
                                    navigate={navigate}
                                    t={t}
                                />
                            ))}
                            {acceptedFreelancers.map((app) => (
                                <FreelancerCard
                                    key={app.id}
                                    app={app}
                                    matchingScore={matchingScores[app.freelancer_id]}
                                    stats={usageStats[app.freelancer_id]}
                                    canAssign={canAssign}
                                    referenceRate={referenceRate}
                                    onAccept={() => onAcceptFreelancer(app.id, usageStats[app.freelancer_id])}
                                    onReject={() => onRejectFreelancer(app.id)}
                                    getMatchingScoreColor={getMatchingScoreColor}
                                    navigate={navigate}
                                    t={t}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* --- Refusés / Retirés --- */}
            {(employeeOtherApps.length > 0 || freelancerOtherApps.length > 0) && (
                <Card className="border-border/60 shadow-sm overflow-hidden opacity-90">
                    <CardHeader className="bg-muted/10 border-b border-border/40">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                            <XCircle className="w-4 h-4" />
                            {t('shifts.closedApplicants', { defaultValue: 'Refusés / Retirés' })} ({employeeOtherApps.length + freelancerOtherApps.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
                            {employeeOtherApps.map((app) => (
                                <EmployeeCard
                                    key={app.id}
                                    app={app}
                                    canAssign={false}
                                    usageStats={employeeUsageStats[app.user_id]}
                                    onAssignEmployee={onAssignEmployee}
                                    onReportNoShow={onReportNoShow}
                                    onCancelNoShow={onCancelNoShow}
                                    getResponseTime={getResponseTime}
                                    navigate={navigate}
                                    t={t}
                                />
                            ))}
                            {freelancerOtherApps.map((app) => (
                                <FreelancerCard
                                    key={app.id}
                                    app={app}
                                    matchingScore={matchingScores[app.freelancer_id]}
                                    stats={usageStats[app.freelancer_id]}
                                    canAssign={false}
                                    referenceRate={referenceRate}
                                    onAccept={() => onAcceptFreelancer(app.id, usageStats[app.freelancer_id])}
                                    onReject={() => onRejectFreelancer(app.id)}
                                    getMatchingScoreColor={getMatchingScoreColor}
                                    navigate={navigate}
                                    t={t}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon, message: string }) {
    return (
        <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">{message}</p>
        </div>
    );
}

// ✅ بطاقة الموظف — معدّلة: صورة حقيقية (avatar_url) بدل الحرف الأول فقط،
// بادجات إحصائيات (عدد المهام المكتملة + عدد الانسحابات) مع نفس الشركة،
// وإذا كانت الحالة withdrawn، يظهر سبب الانسحاب (withdrawal_reason) كاملاً.
function EmployeeCard({
    app,
    canAssign,
    usageStats,
    onAssignEmployee,
    onReportNoShow,
    onCancelNoShow,
    getResponseTime,
    navigate,
    t,
}: {
    app: ShiftApplication;
    canAssign: boolean;
    usageStats?: { completed: number; withdrawn: number };
    onAssignEmployee: (id: string) => void;
    onReportNoShow: (id: string) => void;
    onCancelNoShow: (id: string) => void;
    getResponseTime: (app: ShiftApplication) => string | null;
    navigate: (path: string) => void;
    t: (k: string, o?: Record<string, unknown>) => string;
}) {
    const isAccepted = app.status === 'accepted';
    const isPending = app.status === 'applied';
    const isRejected = app.status === 'rejected';
    const isWithdrawn = app.status === 'withdrawn';
    const responseTime = getResponseTime(app);
    const name = `${app.user?.first_name || ''} ${app.user?.last_name || ''}`.trim() || app.user?.email || '';
    const avatarUrl = (app.user as unknown as { avatar_url?: string | null } | undefined)?.avatar_url || null;
    // ✅ withdrawal_reason est un champ direct de shift_applications (voir add_withdrawal_reason.sql)
    const withdrawalReason = (app as unknown as { withdrawal_reason?: string | null }).withdrawal_reason || null;
    // ✅ جديد — رابط بروفايل الموظف (نفس منطق /freelancers/{id} عند الفريلانسر)
    // app.employee يُبنى فـ useShiftDetail.ts (jointure users -> employees عبر user_id)
    const employeeId = (app as unknown as { employee?: { id?: string } | null }).employee?.id || null;
    const profilePath = employeeId ? `/employees/${employeeId}` : null;

    const cardBg = isAccepted
        ? 'bg-emerald-50/50 border-emerald-200'
        : isRejected
        ? 'bg-red-50/30 border-red-100'
        : isWithdrawn
        ? 'bg-muted/30 border-border/60'
        : 'bg-card border-border hover:shadow-md';

    return (
        <div className={`p-4 rounded-2xl border transition-all ${cardBg}`}>
            <div
                className={`flex items-center gap-3 ${profilePath ? 'cursor-pointer' : ''}`}
                onClick={profilePath ? () => navigate(profilePath) : undefined}
            >
                <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                        <span className="text-lg font-bold text-blue-700">{name.charAt(0).toUpperCase() || '?'}</span>
                    )}
                </div>
                <div className="min-w-0">
                    <h4 className={`font-bold text-foreground truncate ${profilePath ? 'hover:underline' : ''}`}>{name}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                        {responseTime ? `🕒 ${responseTime}` : ''}
                    </p>
                    {profilePath && (
                        <Link to={profilePath} onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-600 hover:underline">
                            {t('shifts.viewProfile', { defaultValue: 'Voir le profil' })}
                        </Link>
                    )}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
                <Chip
                    variant="default"
                    className="h-6 text-[10px] bg-blue-50 text-blue-700 border border-blue-200"
                >
                    {t('shifts.typeEmployee', { defaultValue: 'Employé' })}
                </Chip>
                <Chip variant={isAccepted ? 'success' : isRejected ? 'danger' : isWithdrawn ? 'default' : 'warning'} className="h-6 text-[10px]">
                    {isAccepted && t('shifts.accepted')}
                    {isPending && t('shifts.candidate')}
                    {isRejected && (
                        <span className="flex items-center gap-1"><XCircle className="w-3 h-3" />{t('shifts.applicationStatus.rejected', { defaultValue: 'Refusée' })}</span>
                    )}
                    {isWithdrawn && (
                        <span className="flex items-center gap-1"><Undo2 className="w-3 h-3" />{t('shifts.applicationStatus.withdrawn', { defaultValue: 'Retirée' })}</span>
                    )}
                </Chip>
                {app.no_show && (
                    <Chip variant="danger" className="h-6 text-[10px] animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        No-show
                    </Chip>
                )}
            </div>

            {/* ✅ Badges d'historique avec la company — visibles seulement s'il y a un historique */}
            {usageStats && (usageStats.completed > 0 || usageStats.withdrawn > 0) && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {usageStats.completed > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('shifts.employeeStats.completedCount', {
                                count: usageStats.completed,
                                defaultValue: `${usageStats.completed} mission${usageStats.completed > 1 ? 's' : ''} effectuée${usageStats.completed > 1 ? 's' : ''}`,
                            })}
                        </span>
                    )}
                    {usageStats.withdrawn > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5 font-medium">
                            <XCircle className="w-3 h-3" />
                            {t('shifts.employeeStats.withdrawnCount', {
                                count: usageStats.withdrawn,
                                defaultValue: `${usageStats.withdrawn} désistement${usageStats.withdrawn > 1 ? 's' : ''}`,
                            })}
                        </span>
                    )}
                </div>
            )}

            {/* ✅ Motif du désistement — affiché uniquement quand cette candidature précise a été retirée après acceptation */}
            {isWithdrawn && withdrawalReason && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                    <MessageSquareQuote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                            {t('shifts.employeeStats.withdrawalReasonLabel', { defaultValue: 'Motif du désistement' })}
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-200 break-words">{withdrawalReason}</p>
                    </div>
                </div>
            )}

            {canAssign && isPending && (
                <div className="mt-4">
                    <Button size="sm" onClick={() => onAssignEmployee(app.id)} className="w-full bg-blue-600 hover:bg-blue-700 h-9 rounded-xl">
                        {t('shifts.assign')}
                    </Button>
                </div>
            )}
            {canAssign && isAccepted && !app.no_show && (
                <div className="mt-4">
                    <Button size="sm" variant="ghost" onClick={() => onReportNoShow(app.id)} className="text-red-500 hover:text-red-600 h-8">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {t('shifts.report')}
                    </Button>
                </div>
            )}
            {app.no_show && canAssign && (
                <div className="mt-4">
                    <Button size="sm" variant="outline" onClick={() => onCancelNoShow(app.id)} className="h-8">
                        {t('shifts.cancelNoShow')}
                    </Button>
                </div>
            )}
        </div>
    );
}

 function FreelancerCard({
    app,
    matchingScore,
    shiftid = "just-check",
    stats,
    canAssign,
    referenceRate,
    onAccept,
    onReject,
    getMatchingScoreColor,
    navigate,
    t
}: {
    app: FreelancerApplication,
    matchingScore?: MatchingResult,
    stats?: { total_shifts: number, total_hours: number },
    canAssign: boolean,
    referenceRate: number | null,
    onAccept: () => void,
    onReject: () => void,
    getMatchingScoreColor: (s: number) => string,
    navigate: (p: string) => void,
    t: (k: string, o?: Record<string, unknown>) => string
}) {
    const isAccepted = app.status === 'accepted';
    const isPending = app.status === 'applied';
    const isRejected = app.status === 'rejected';
    const isWithdrawn = app.status === 'withdrawn';

    const hasLegalRisk = stats && (stats.total_shifts >= 60 || stats.total_hours >= 400);

    const proposedRate = app.freelance_hourly_rate;
    const hasProposedRate = proposedRate != null;
    const isHigher = hasProposedRate && referenceRate != null && proposedRate! > referenceRate;
    const diff = hasProposedRate && referenceRate != null ? proposedRate! - referenceRate : null;

    const cardBg = isAccepted
        ? 'bg-emerald-50/50 border-emerald-200'
        : isRejected
        ? 'bg-red-50/30 border-red-100'
        : isWithdrawn
        ? 'bg-muted/30 border-border/60'
        : isHigher
        ? 'bg-amber-50/40 border-amber-200'
        : 'bg-card border-border hover:shadow-md';

    return (
        <div className={`p-4 rounded-2xl border transition-all ${cardBg}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 overflow-hidden" onClick={() => navigate(`/freelancers/${app.freelancer_id}?for=${shiftid}`)}>
                    <div className="w-12 h-12 rounded-full bg-emerald-100 overflow-hidden flex-shrink-0 border border-emerald-200">
                        {app.freelancer?.profile_photo_url ? (
                            <img src={app.freelancer.profile_photo_url} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <span className="text-lg font-bold text-emerald-700 flex items-center justify-center h-full">
                                {app.freelancer?.first_name?.charAt(0)}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-foreground truncate hover:underline cursor-pointer">
                            {app.freelancer?.first_name} {app.freelancer?.last_name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">{app.freelancer?.city || t('shifts.unknownCity')}</p>
                    </div>
                </div>
                {matchingScore && matchingScore.score >= 60 && (
                    <div className={`flex flex-col items-center p-2 rounded-xl border ${getMatchingScoreColor(matchingScore.score)}`}>
                        <span className="text-lg font-black leading-none">{matchingScore.score}%</span>
                        <span className="text-[8px] uppercase font-bold tracking-tighter mt-1 opacity-70">Compatibilité</span>
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
                <Chip
                    variant="default"
                    className="h-6 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                    {t('shifts.typeFreelancer', { defaultValue: 'Freelance' })}
                </Chip>
                <Chip variant={isAccepted ? 'success' : isRejected ? 'danger' : isWithdrawn ? 'default' : 'secondary'} className="h-6 text-[10px]">
                    {isAccepted && t('shifts.accepted')}
                    {isPending && t('shifts.candidate')}
                    {isRejected && (
                        <span className="flex items-center gap-1"><XCircle className="w-3 h-3" />{t('shifts.applicationStatus.rejected', { defaultValue: 'Refusée' })}</span>
                    )}
                    {isWithdrawn && (
                        <span className="flex items-center gap-1"><Undo2 className="w-3 h-3" />{t('shifts.applicationStatus.withdrawn', { defaultValue: 'Retirée' })}</span>
                    )}
                </Chip>
                {/* ✅ جديد — تقدّم عبر مكالمة آلية (Relance par appel) */}
                {(app as unknown as { applied_via_call?: boolean }).applied_via_call && (
                    <Chip
                        variant="default"
                        className="h-6 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                        <PhoneCall className="w-3 h-3 mr-1" />
                        {t('shifts.autoCalls.viaCallBadge', { defaultValue: 'Via appel' })}
                    </Chip>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center">
                    {app.applied_at ? format(new Date(app.applied_at), 'dd/MM/yy HH:mm') : ''}
                </span>
            </div>

            {hasProposedRate && (
                <div className={`mt-3 p-2.5 rounded-lg border flex items-center justify-between ${
                    isHigher ? 'bg-amber-100/60 border-amber-300' : 'bg-muted/30 border-border/50'
                }`}>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {t('shifts.proposedRate', { defaultValue: 'Tarif proposé' })}
                        </span>
                        <span className={`text-sm font-bold ${isHigher ? 'text-amber-700' : 'text-foreground'}`}>
                            {formatRate(proposedRate!)}/h
                        </span>
                    </div>
                    {referenceRate != null && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground">
                                {t('shifts.baseRate', { defaultValue: 'Tarif initial' })} : {formatRate(referenceRate)}/h
                            </span>
                            {diff != null && diff !== 0 && (
                                <span className={`text-xs font-bold flex items-center gap-0.5 ${isHigher ? 'text-amber-700' : 'text-emerald-600'}`}>
                                    {isHigher ? <TrendingUp className="w-3 h-3" /> : null}
                                    {isHigher ? '+' : ''}{formatRate(Math.abs(diff))}/h
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {hasLegalRisk && (
                <div className="mt-3 p-2 rounded-lg bg-orange-50 border border-orange-100 flex items-center gap-2 text-[10px] text-orange-700">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span className="font-bold">{t('shifts.requalificationAlert')}</span> {t('shifts.missionsOver12Months', { count: stats.total_shifts })}
                </div>
            )}

            {isPending && canAssign && (
                <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={onAccept} className={`flex-1 h-9 rounded-xl ${isHigher ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        {t('shifts.accept')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onReject} className="text-muted-foreground hover:text-red-500 h-9">
                        {t('shifts.reject')}
                    </Button>
                </div>
            )}
        </div>
    );
}