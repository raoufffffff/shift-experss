import { Loader2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';

import { useFreelancerDetail } from '@/pages/freelancers/useFreelancerDetail';
import { FreelancerProfileHeader } from '@/pages/freelancers/components/FreelancerProfileHeader';
import { FreelancerProfileGrid } from '@/pages/freelancers/components/FreelancerProfileGrid';
import { FreelancerSidebar } from '@/pages/freelancers/components/FreelancerSidebar';
import { ApplicationHistoryTable } from '@/pages/freelancers/components/ApplicationHistoryTable';

interface FreelancerProfilePanelProps {
    freelancerId: string;
    onBack: () => void;
}

export function FreelancerProfilePanel({ freelancerId, onBack }: FreelancerProfilePanelProps) {
    const { t, i18n } = useTranslation();

    const getDateFnsLocale = () => {
        switch (i18n.language) {
            case 'fr': return fr;
            case 'es': return es;
            case 'it': return it;
            case 'zh': return zhCN;
            default: return enUS;
        }
    };
    const dateFnsLocale = getDateFnsLocale();

    const {
        freelancer,
        isLoading,
        applications,
        reviews,
        averageRating,
        reviewCount,
        isFavorite,
        canToggleFavorite,
        toggleFavoriteMutation,
    } = useFreelancerDetail(freelancerId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!freelancer) {
        return (
            <div className="p-6">
                <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    {t('shifts.backToApplicants', { defaultValue: 'Retour aux candidats' })}
                </button>
                <p className="text-muted-foreground text-center py-10">{t('freelancers.notFound', { defaultValue: 'Freelance introuvable' })}</p>
            </div>
        );
    }

    const acceptedApplications = applications.filter((a) => a.status === 'accepted');
    const rejectedApplications = applications.filter((a) => a.status === 'rejected');
    const pendingApplications = applications.filter((a) => a.status === 'applied');

    const completedShifts = acceptedApplications.filter((app) => {
        const isFinishedStatus = ['completed', 'pending_validation', 'closed'].includes(app.shift?.status || '');
        const isPast = app.shift?.end_time && new Date(app.shift.end_time) < new Date();
        return isFinishedStatus || isPast;
    });

    const upcomingShifts = acceptedApplications.filter(
        (app) =>
            app.shift?.status === 'pending' ||
            app.shift?.status === 'filled' ||
            app.shift?.status === 'partially_filled'
    );

    const canViewContactInfo = upcomingShifts.length > 0;

    return (
        <div className="flex flex-col h-full max-h-[92vh]">
            <div className="overflow-y-auto p-6 md:p-8 space-y-6">
                <FreelancerProfileHeader
                    freelancer={freelancer}
                    averageRating={averageRating}
                    reviewCount={reviewCount}
                    isFavorite={isFavorite}
                    canToggleFavorite={canToggleFavorite}
                    isTogglingFavorite={toggleFavoriteMutation.isPending}
                    hideContactActions
                    onBack={onBack}
                    onToggleFavorite={() => toggleFavoriteMutation.mutate()}
                    onOpenReviewsModal={() => {}}
                    onRequestAttestation={() => {}}
                    onNavigateToMessages={() => {}}
                    t={t}
                />

                <div className="grid gap-6 lg:grid-cols-3">
                    <FreelancerProfileGrid
                        freelancer={freelancer}
                        language={i18n.language}
                        t={t}
                        completedShifts={completedShifts}
                    />

                    <FreelancerSidebar
                        freelancer={freelancer}
                        canViewContactInfo={canViewContactInfo}
                        hideContactInfo
                        totalApplications={applications.length}
                        acceptedCount={acceptedApplications.length}
                        rejectedCount={rejectedApplications.length}
                        pendingCount={pendingApplications.length}
                        completedShiftsCount={completedShifts.length}
                        upcomingShiftsCount={upcomingShifts.length}
                        dateFnsLocale={dateFnsLocale}
                        t={t}
                    />
                </div>

                {applications.length > 0 && (
                    <ApplicationHistoryTable
                        applications={applications}
                        language={i18n.language}
                        dateFnsLocale={dateFnsLocale}
                        onNavigateToShift={() => {}}
                        t={t}
                    />
                )}
            </div>
        </div>
    );
}
