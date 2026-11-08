import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import {
    CheckCircle, XCircle, Briefcase, Sparkles, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/cn';
import type { UseMutationResult } from '@tanstack/react-query';
import type { FreelancerApplication, MatchingResult } from './types';

interface FreelancerApplicantsProps {
    freelancerApplications: FreelancerApplication[];
    matchingScores: Record<string, MatchingResult>;
    isAdminOrManager: boolean;
    acceptFreelancerMutation: UseMutationResult<void, Error, FreelancerApplication>;
    rejectFreelancerMutation: UseMutationResult<void, Error, string>;
    onConfirmAction: (action: 'accept' | 'reject', app: FreelancerApplication) => void;
    onViewProfile: (freelancerId: string) => void;
}

function FreelancerAvatar({ freelancer }: { freelancer: FreelancerApplication['freelancer'] }) {
    const name = freelancer?.first_name && freelancer?.last_name
        ? `${freelancer.first_name} ${freelancer.last_name}`
        : freelancer?.email || '?';
    const initials = name.substring(0, 2).toUpperCase();

    if (freelancer?.profile_photo_url) {
        return (
            <img
                src={freelancer.profile_photo_url}
                alt={name}
                className="w-12 h-12 rounded-full object-cover border border-emerald-200 dark:border-emerald-800"
                loading="lazy"
                width={48}
                height={48}
            />
        );
    }

    return (
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">{initials}</span>
        </div>
    );
}

const getMatchingScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30';
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30';
    return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30';
};

export function FreelancerApplicants({
    freelancerApplications,
    matchingScores,
    isAdminOrManager,
    onConfirmAction,
    onViewProfile,
}: FreelancerApplicantsProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">
                        {t('shifts.freelancers.marketplaceTitle')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {freelancerApplications.length}
                    </span>
                </div>
            </div>

            {freelancerApplications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-white/5">
                    <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="text-slate-500 dark:text-slate-500 text-sm italic">{t('shifts.noFreelancerApplications')}</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {freelancerApplications.map((app) => {
                        const isAccepted = app.status === 'accepted';
                        const isPending = app.status === 'applied';
                        const matchingScore = matchingScores[app.freelancer_id];

                        return (
                            <div
                                key={app.id}
                                className={cn(
                                    "group p-4 rounded-xl border transition-all duration-200 shadow-sm overflow-hidden relative",
                                    isAccepted
                                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md cursor-pointer"
                                )}
                                onClick={() => !isAccepted && onViewProfile(app.freelancer_id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <FreelancerAvatar freelancer={app.freelancer} />
                                        {isAccepted && (
                                            <div className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-slate-900 rounded-full">
                                                <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                                                {app.freelancer?.first_name && app.freelancer?.last_name
                                                    ? `${app.freelancer.first_name} ${app.freelancer.last_name.charAt(0)}.`
                                                    : t('shifts.unknownFreelancer')}
                                            </h4>
                                            <div className="flex items-center gap-1.5">
                                                {matchingScore && matchingScore.score >= 60 && (
                                                    <div className={cn(
                                                        "flex items-center gap-1 font-bold px-1.5 py-0.5 rounded text-[10px]",
                                                        getMatchingScoreColor(matchingScore.score)
                                                    )}>
                                                        {matchingScore.score}%
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(app.applied_at), 'dd/MM HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {isPending && isAdminOrManager && (
                                    <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            onClick={() => onConfirmAction('accept', app)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            {t('shifts.accept')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onConfirmAction('reject', app)}
                                            className="flex-1 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            {t('shifts.reject')}
                                        </Button>
                                    </div>
                                )}

                                {isAccepted && (
                                    <div className="mt-3 flex items-center justify-center py-1 px-3 bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                        Mission Confirmée
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
