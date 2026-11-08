import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useEstablishmentStore } from '@/stores/establishmentStore'
import { toast } from 'sonner'
import { fr, enUS, es, it, zhCN } from 'date-fns/locale'
import { logger } from '@/utils/logger'
import type { FreelancerApplication, FreelancerReview } from '../types'
// ✅ جديد — منطق الجلب والإرسال أصبح مشتركاً مع usePendingReviewsPopup (DashboardLayout)
import { fetchPendingFreelancerReviews } from './fetchPendingFreelancerReviews'
import { submitFreelancerReview } from './submitFreelancerReview'

export function useReviewsData() {
    const { t, i18n } = useTranslation()
    const queryClient = useQueryClient()
    const [searchParams, setSearchParams] = useSearchParams()
    const company = useAuthStore((state) => state.company)
    const selectedEstablishmentId = useEstablishmentStore((state) => state.selectedEstablishmentId)

    // Get locale for date formatting
    const getDateFnsLocale = () => {
        switch (i18n.language) {
            case 'fr': return fr
            case 'es': return es
            case 'it': return it
            case 'zh': return zhCN
            default: return enUS
        }
    }
    const dateFnsLocale = getDateFnsLocale()

    // Tab state from URL
    const currentTab = searchParams.get('tab') || 'pending'
    const [activeTab, setActiveTab] = useState<'pending' | 'given'>(
        (currentTab === 'pending' || currentTab === 'given') ? currentTab : 'pending'
    )

    // Sync state with URL
    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab === 'pending' || tab === 'given') {
            setActiveTab(tab)
        }
    }, [searchParams])

    const handleTabChange = (tab: 'pending' | 'given') => {
        setActiveTab(tab)
        setSearchParams({ tab })
    }

    // Review modal state
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
    const [selectedApplication, setSelectedApplication] = useState<FreelancerApplication | null>(null)
    const [selectedReview, setSelectedReview] = useState<FreelancerReview | null>(null)
    const [reviewRating, setReviewRating] = useState(0)
    const [reviewComment, setReviewComment] = useState('')
    const [hoverRating, setHoverRating] = useState<number | null>(null)

    // ✅ معاد بناؤها — تستدعي fetchPendingFreelancerReviews المشتركة بدل تكرار الاستعلام
    // ملاحظة: صفحة Reviews تعرض كل ما لم يُقيَّم بعد، بغضّ النظر عن review_popup_seen_at
    // (هذا الحقل يخص فقط النافذة المنبثقة في usePendingReviewsPopup)
    const { data: pendingReviews = [], isLoading: loadingPending } = useQuery({
        queryKey: ['pending-reviews', company?.id, selectedEstablishmentId],
        queryFn: () => fetchPendingFreelancerReviews({
            companyId: company!.id,
            establishmentId: selectedEstablishmentId,
        }),
        enabled: !!company?.id,
    })

    // Fetch given reviews
    const { data: givenReviews = [], isLoading: loadingGiven } = useQuery({
        queryKey: ['given-reviews', company?.id, selectedEstablishmentId],
        queryFn: async () => {
            if (!company?.id) return []


            let query = supabase
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
          freelancer:freelancers(
            id,
            first_name,
            last_name,
            full_name,
            profile_photo_url
          ),
          shift:shifts(
            id,
            position_name,
            start_time,
            end_time
          ),
          establishments(id, name)
        `)
                .order('created_at', { ascending: false })

            if (selectedEstablishmentId) {
                query = query.eq('establishment_id', selectedEstablishmentId)
            }

            const { data, error } = await query

            if (error) {
                logger.error('Error fetching given reviews:', error)
                return []
            }

            return (data || []) as FreelancerReview[]
        },
        enabled: !!company?.id,
    })

    // Submit review mutation
    // ✅ معاد بناؤها — تستدعي submitFreelancerReview المشتركة (create/update) بدل استدعاء
    // supabase مباشرة هنا، لتبقى نفس المنطق مستعملاً في usePendingReviewsPopup أيضاً
    const submitReviewMutation = useMutation({
        mutationFn: async () => {
            if (!selectedApplication && !selectedReview) {
                throw new Error('No application or review selected')
            }

            if (reviewRating === 0) {
                throw new Error('Rating is required')
            }

            if (selectedReview) {
                await submitFreelancerReview({
                    mode: 'update',
                    reviewId: selectedReview.id,
                    rating: reviewRating,
                    comment: reviewComment,
                })
            } else if (selectedApplication) {
                const estId = selectedApplication.shift?.establishment_id
                if (!estId) throw new Error('Missing establishment_id')
                await submitFreelancerReview({
                    mode: 'create',
                    freelancerId: selectedApplication.freelancer_id,
                    establishmentId: estId,
                    shiftId: selectedApplication.shift_id,
                    rating: reviewRating,
                    comment: reviewComment,
                })
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-reviews'] })
            queryClient.invalidateQueries({ queryKey: ['given-reviews'] })
            queryClient.invalidateQueries({ queryKey: ['freelancer-reviews'] })
            toast.success(t('freelancers.reviewSaved'))
            closeReviewModal()
        },
        onError: (error) => {
            logger.error('Error saving review:', error)
            toast.error(t('common.error'))
        },
    })

    const openReviewModal = (application: FreelancerApplication) => {
        setSelectedApplication(application)
        setSelectedReview(null)
        setReviewRating(0)
        setReviewComment('')
        setIsReviewModalOpen(true)
    }

    const openEditReviewModal = (review: FreelancerReview) => {
        setSelectedApplication(null)
        setSelectedReview(review)
        setReviewRating(review.rating)
        setReviewComment(review.comment || '')
        setIsReviewModalOpen(true)
    }

    const closeReviewModal = () => {
        setIsReviewModalOpen(false)
        setSelectedApplication(null)
        setSelectedReview(null)
        setReviewRating(0)
        setReviewComment('')
    }

    const isLoading = loadingPending || loadingGiven

    return {
        t,
        dateFnsLocale,
        activeTab,
        handleTabChange,
        pendingReviews,
        givenReviews,
        isLoading,
        isReviewModalOpen,
        setIsReviewModalOpen,
        selectedApplication,
        selectedReview,
        reviewRating,
        setReviewRating,
        reviewComment,
        setReviewComment,
        hoverRating,
        setHoverRating,
        submitReviewMutation,
        openReviewModal,
        openEditReviewModal,
        closeReviewModal,
    }
}