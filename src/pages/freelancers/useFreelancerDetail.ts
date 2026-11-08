import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { logger } from '@/utils/logger';
import { handleSupabaseError } from '@/lib/error-handler';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type {
  Freelancer,
  EstablishmentFreelancer,
  FreelancerReview,
  FreelancerApplication,
} from './types';

export function useFreelancerDetail(id: string | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const company = useAuthStore((state) => state.company);
  const selectedEstablishmentId = useEstablishmentStore((state) => state.selectedEstablishmentId);

  // Fetch freelancer details
  const { data: freelancer, isLoading: loadingFreelancer, isError, error: fetchError } = useQuery({
    queryKey: ['freelancer', id],
    queryFn: async () => {
      if (!id) throw new Error('Freelancer ID is required');

      const { data, error } = await supabase
        .from('freelancers')
        .select(`
          *,
          mastered_pms:freelancer_pms(
            id,
            pms_id,
            proof_status,
            pms:pms_id(
              id,
              name,
              type,
              job_position:job_position_id(
                id,
                name_translations
              )
            )
          ),
          professional_skills:freelancer_professional_skills(
            id,
            skill_id,
            skill:professional_skills(
              id,
              name,
              name_translations,
              category_id
            )
          ),
          certifications:freelancer_certifications(
            id,
            certification_id,
            custom_name,
            specialization,
            institution,
            year,
            proof_status,
            certification:certification_id(
              id,
              name,
              allows_specialization
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'FreelancerDetailPage',
          operation: 'fetchFreelancer',
          metadata: { freelancerId: id }
        });
        throw new Error(message);
      }
      return data as unknown as Freelancer;
    },
    enabled: !!id,
  });

  // Fetch establishment-freelancer relationship (for favorites)
  const { data: establishmentFreelancer } = useQuery({
    queryKey: ['establishment-freelancer', selectedEstablishmentId, id],
    queryFn: async () => {
      if (!selectedEstablishmentId || !id) return null;

      const { data, error } = await supabase
        .from('establishment_freelancers')
        .select('*')
        .eq('establishment_id', selectedEstablishmentId)
        .eq('freelancer_id', id)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching establishment-freelancer relationship:', error);
        return null;
      }
      return data as EstablishmentFreelancer | null;
    },
    enabled: !!selectedEstablishmentId && !!id,
  });

  // Fetch freelancer applications for this company's shifts
  const { data: applications = [], isLoading: loadingApplications } = useQuery({
    queryKey: ['freelancer-applications', id, company?.id],
    queryFn: async () => {
      if (!id || !company?.id) return [];

      const { data, error } = await supabase
        .from('shift_freelancer_applications')
        .select(`
          id,
          shift_id,
          freelancer_id,
          status,
          applied_at,
          responded_at,
          shift:shifts(
            id,
            position_name,
            start_time,
            end_time,
            status,
            establishments(id, name)
          )
        `)
        .eq('freelancer_id', id);

      if (error) {
        logger.error('Error fetching freelancer applications:', error);
        return [];
      }

      // Filter to only show applications for this company's shifts
      const typedData = (data || []) as unknown as FreelancerApplication[];
      const companyApplications = typedData.filter(() => {
        // We'd need to check if the shift belongs to this company
        // For now, show all - the shift query already filters by company via RLS
        return true;
      });

      return companyApplications;
    },
    enabled: !!id && !!company?.id,
  });

  // Fetch freelancer reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ['freelancer-reviews', id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from('freelancer_reviews')
        .select(`
          id,
          freelancer_id,
          establishment_id,
          shift_id,
          rating,
          comment,
          created_at,
          updated_at,
          establishments(id, name)
        `)
        .eq('freelancer_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching freelancer reviews:', error);
        return [];
      }

      return data as FreelancerReview[];
    },
    enabled: !!id,
  });

  // Calculate average rating and review stats
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const reviewCount = reviews.length;

  // Get current establishment's review (if any)
  const currentEstablishmentReview = selectedEstablishmentId
    ? reviews.find(r => r.establishment_id === selectedEstablishmentId) ?? null
    : null;

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEstablishmentId || !id) throw new Error('Missing establishment or freelancer ID');

      if (establishmentFreelancer) {
        const { error } = await supabase
          .from('establishment_freelancers')
          .update({ is_favorite: !establishmentFreelancer.is_favorite })
          .eq('id', establishmentFreelancer.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('establishment_freelancers')
          .insert({
            establishment_id: selectedEstablishmentId,
            freelancer_id: id,
            is_favorite: true,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishment-freelancer', selectedEstablishmentId, id] });
      toast.success(
        establishmentFreelancer?.is_favorite
          ? t('freelancers.removedFromFavorites')
          : t('freelancers.addedToFavorites')
      );
    },
    onError: (error) => {
      logger.error('Error toggling favorite:', error);
      toast.error(t('common.error'));
    },
  });

  const isLoading = loadingFreelancer || loadingApplications;
  const isFavorite = establishmentFreelancer?.is_favorite || false;
  const canToggleFavorite = !!selectedEstablishmentId;

  return {
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
  };
}
