import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { useLocale } from '@/hooks/useLocale';
import {
  ArrowLeft,
  Briefcase,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';

import { FreelancerProfileHeader } from './components/FreelancerProfileHeader';
import { FreelancerProfileGrid } from './components/FreelancerProfileGrid';
import { FreelancerSidebar } from './components/FreelancerSidebar';
import { ApplicationHistoryTable } from './components/ApplicationHistoryTable';
import { FreelancerReviewsModal } from './components/FreelancerReviewsModal';
import { FreelancerShiftDecisionCard } from './components/FreelancerShiftDecisionCard'; // ✅ جديد
import { useFreelancerDetail } from './useFreelancerDetail';
// ✅ جديد — هوك القبول/الرفض المشترك (نفس المنطق المستعمل فصفحة الشيفت، event groups مضمّنة)
// عدّل المسار حسب مكان useFreelancerDecision.ts فالمشروع
import { useFreelancerDecision, useFreelancerApplicationForShift } from './useFreelancerDecision';

export function FreelancerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { navigate } = useLocale();
  const routerNavigate = useNavigate();
  const { t, i18n } = useTranslation();
  const company = useAuthStore((s) => s.company);

  // ✅ ?for=<shiftId> — موجودة من قبل فرابط صفحة الشيفت (FreelancerCard كان يبعث
  // "just-check" كديفولت)؛ هنا كنستعملها باش نعرف واش العميل جا يتفقد الفريلانس
  // قبل قرار على شيفت محدد
  const [searchParams] = useSearchParams();
  const forShiftId = searchParams.get('for');
  const hasShiftContext = !!forShiftId && forShiftId !== 'just-check';

  // Get locale based on current language
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

  // Data fetching & mutations from custom hook
  const {
    freelancer,
    isLoading,
    isError,
    fetchError,
    applications,
    reviews,
    averageRating,
    reviewCount,
    currentEstablishmentReview,
    isFavorite,
    canToggleFavorite,
    selectedEstablishmentId,
    toggleFavoriteMutation,
    queryClient,
  } = useFreelancerDetail(id);

  // ✅ طلب الفريلانسر الخاص بالشيفت المعني (إذا زار الصفحة عبر ?for=) — تجيب null
  // بهدوء إذا ما كانش عنده طلب على هذا الشيفت بالضبط
  const { data: shiftApplication, isLoading: isShiftApplicationLoading } =
    useFreelancerApplicationForShift(hasShiftContext ? id : undefined, hasShiftContext ? forShiftId! : undefined);
console.log(shiftApplication, hasShiftContext );

  // ✅ نفس منطق القبول/الرفض ديال صفحة الشيفت (event groups مضمّنة)؛ نعطيه مفتاح
  // الـ invalidation الخاص بهاذ الصفحة باش يتحدث الطلب بعد الفعل
  const { acceptFreelancerMutation, rejectFreelancerMutation } = useFreelancerDecision({
    invalidateQueryKeys: [['shift-freelancer-applications', forShiftId, id]],
  });

  // Reviews modal state
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Initialize review form when modal opens
  const openReviewsModal = () => {
    if (currentEstablishmentReview) {
      setReviewRating(currentEstablishmentReview.rating);
      setReviewComment(currentEstablishmentReview.comment || '');
    } else {
      setReviewRating(0);
      setReviewComment('');
    }
    setIsReviewsModalOpen(true);
  };

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEstablishmentId || !id || reviewRating === 0) {
        throw new Error('Missing data for review');
      }

      if (currentEstablishmentReview) {
        const { error } = await supabase
          .from('freelancer_reviews')
          .update({
            rating: reviewRating,
            comment: reviewComment.trim() || null,
          })
          .eq('id', currentEstablishmentReview.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('freelancer_reviews')
          .insert({
            freelancer_id: id,
            establishment_id: selectedEstablishmentId,
            rating: reviewRating,
            comment: reviewComment.trim() || null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freelancer-reviews', id] });
      toast.success(t('freelancers.reviewSaved'));
      setIsReviewsModalOpen(false);
    },
    onError: (error) => {
      logger.error('Error saving review:', error);
      toast.error(t('common.error'));
    },
  });

  // Handle fetch error
  if (isError && fetchError) {
    return (
      <div className="px-4 md:px-6">
        <div className="text-center py-12">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">{t('common.error')}</p>
          <p className="text-muted-foreground mb-4">{fetchError.message}</p>
          <Button onClick={() => routerNavigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 md:px-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="px-4 md:px-6">
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{t('freelancers.notFound')}</p>
          <Button onClick={() => routerNavigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const acceptedApplications = applications.filter((a) => a.status === 'accepted');
  const rejectedApplications = applications.filter((a) => a.status === 'rejected');
  const pendingApplications = applications.filter((a) => a.status === 'applied');

  const completedShifts = acceptedApplications.filter((app) => {
    const isFinishedStatus = ['completed', 'pending_validation', 'closed'].includes(app.shift?.status || '');
    const isPast = app.shift?.end_time && new Date(app.shift.end_time) < new Date();
    return isFinishedStatus || isPast;
  });

  const completedShiftsWithEstablishment = completedShifts.filter(
    (app) => app.shift?.establishments?.id === selectedEstablishmentId
  );

  const upcomingShifts = acceptedApplications.filter(
    (app) =>
      app.shift?.status === 'pending' ||
      app.shift?.status === 'filled' ||
      app.shift?.status === 'partially_filled'
  );

  const canViewContactInfo = upcomingShifts.length > 0;
  const freelancerName = `${freelancer.first_name} ${freelancer.last_name}`;
  return (
    <div className="space-y-6 px-4 md:px-6">
      <FreelancerProfileHeader
        freelancer={freelancer}
        averageRating={averageRating}
        reviewCount={reviewCount}
        isFavorite={isFavorite}
        canToggleFavorite={canToggleFavorite}
        isTogglingFavorite={toggleFavoriteMutation.isPending}
        onBack={() => routerNavigate(-1)}
        onToggleFavorite={() => toggleFavoriteMutation.mutate()}
        onOpenReviewsModal={openReviewsModal}
        onRequestAttestation={async () => {
          try {
            // Check if freelancer already has a verified URSSAF attestation
            const { data: doc } = await supabase
              .from('freelancer_documents')
              .select('file_url, status')
              .eq('freelancer_id', freelancer.id)
              .eq('type', 'urssaf')
              .maybeSingle()

            if (doc?.status === 'verified' && doc.file_url) {
              // Open document in new tab
              window.open(doc.file_url, '_blank')
              return
            }

            // Otherwise send request
            await supabase.functions.invoke('send-attestation-request', {
              body: {
                freelancer_id: freelancer.id,
                freelancer_name: `${freelancer.first_name} ${freelancer.last_name}`,
                freelancer_email: freelancer.email,
                employer_name: company?.name || '',
                position_name: 'Général',
                shift_date: new Date().toISOString(),
              },
            })
            if (doc) {
              toast.info('L\'attestation est en cours de vérification. Une demande a été envoyée.')
            } else {
              toast.success('Demande d\'attestation envoyée au freelancer')
            }
          } catch {
            toast.error('Erreur lors de l\'envoi')
          }
        }}
        hideContactActions={upcomingShifts.length === 0 ? true : false}
        onNavigateToMessages={() => navigate(`/messages?userId=${freelancer.user_id}&type=freelancer`)}
        t={t}
      />

      {/* ✅ تبان فقط إذا العميل جا عبر ?for=<shiftId> وعند الفريلانسر طلب على هذا الشيفت */}
      {hasShiftContext && !isShiftApplicationLoading && shiftApplication && (
        <FreelancerShiftDecisionCard
          application={shiftApplication}
          isAccepting={acceptFreelancerMutation.isPending}
          isRejecting={rejectFreelancerMutation.isPending}
          onAccept={() => acceptFreelancerMutation.mutate(shiftApplication.id)}
          onReject={() => rejectFreelancerMutation.mutate(shiftApplication.id)}
          dateFnsLocale={dateFnsLocale}
          t={t}
        />
      )}

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

      <ApplicationHistoryTable
        applications={applications}
        language={i18n.language}
        dateFnsLocale={dateFnsLocale}
        onNavigateToShift={(shiftId) => navigate(`/shifts/${shiftId}`)}
        t={t}
      />

      <FreelancerReviewsModal
        isOpen={isReviewsModalOpen}
        onOpenChange={setIsReviewsModalOpen}
        freelancerName={freelancerName}
        selectedEstablishmentId={selectedEstablishmentId}
        currentEstablishmentReview={currentEstablishmentReview}
        reviews={reviews}
        reviewCount={reviewCount}
        reviewRating={reviewRating}
        reviewComment={reviewComment}
        hoverRating={hoverRating}
        completedShiftsWithEstablishmentCount={completedShiftsWithEstablishment.length}
        isSubmitting={submitReviewMutation.isPending}
        dateFnsLocale={dateFnsLocale}
        onSetReviewRating={setReviewRating}
        onSetReviewComment={setReviewComment}
        onSetHoverRating={setHoverRating}
        onSubmitReview={() => submitReviewMutation.mutate()}
        t={t}
      />

    </div>
  );
}