import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useEstablishmentStore } from '@/stores/establishmentStore'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
// ⚠️ Adapte ces chemins d'import à l'emplacement réel de ces fichiers chez toi
import { ReviewModal } from '../pages/reviews/components/ReviewModal'
import { fetchPendingFreelancerReviews } from '../pages/reviews/hooks/fetchPendingFreelancerReviews'
import { submitFreelancerReview } from '../pages/reviews/hooks/submitFreelancerReview'
import type { FreelancerApplication } from '../pages/reviews/types'

// ✅ Popup global affiché une seule fois par lot de candidatures "accepted + terminées
// + non notées + jamais montrées en popup" (review_popup_seen_at is null).
// Dès que le lot est chargé, on marque immédiatement TOUTES ses candidatures comme vues
// côté DB — même si le client ferme la fenêtre sans rien noter, le popup ne reviendra
// jamais pour ces éléments précis. Ils restent néanmoins visibles et notables depuis
// l'onglet "En attente" de la page Avis (qui ne filtre pas sur review_popup_seen_at).
//
// À placer une seule fois dans DashboardLayout, par ex. juste avant la balise de
// fermeture du composant : <PendingReviewsPopup />
export function PendingReviewsPopup() {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const company = useAuthStore((state) => state.company)
    const selectedEstablishmentId = useEstablishmentStore((state) => state.selectedEstablishmentId)

    const [queue, setQueue] = useState<FreelancerApplication[] | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [reviewRating, setReviewRating] = useState(0)
    const [reviewComment, setReviewComment] = useState('')
    const [hoverRating, setHoverRating] = useState<number | null>(null)
    const hasInitializedRef = useRef(false)

    // ✅ staleTime: Infinity + refetchOnMount/refetchOnWindowFocus: false —
    // ne se déclenche qu'une fois par montage de DashboardLayout (donc une fois par
    // session applicative), pas à chaque navigation entre pages internes au layout.
    const { data } = useQuery({
        queryKey: ['pending-reviews-popup', company?.id, selectedEstablishmentId],
        queryFn: () => fetchPendingFreelancerReviews({
            companyId: company!.id,
            establishmentId: selectedEstablishmentId,
        }),
        enabled: !!company?.id,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    })

    useEffect(() => {
        if (!data || hasInitializedRef.current) return

        const unseen = (data as (FreelancerApplication & { review_popup_seen_at?: string | null })[])
            .filter((item) => !item.review_popup_seen_at)

        if (unseen.length === 0) return

        hasInitializedRef.current = true
        setQueue(unseen)
        setCurrentIndex(0)
        setIsOpen(true)

        // ✅ يُعلَّم كل عناصر هذه الدفعة "مشاهدة" فوراً — قبل حتى أن يقيّم العميل أياً منها
        const applicationIds = unseen.map((item) => item.id)
        supabase
            .from('shift_freelancer_applications')
            .update({ review_popup_seen_at: new Date().toISOString() })
            .in('id', applicationIds)
            .then(({ error }) => {
                if (error) logger.error('Failed to mark review popup as seen:', error)
            })
    }, [data])

    const currentItem = queue?.[currentIndex] ?? null

    const resetForm = () => {
        setReviewRating(0)
        setReviewComment('')
        setHoverRating(null)
    }

    const advance = () => {
        resetForm()
        if (!queue || currentIndex >= queue.length - 1) {
            setIsOpen(false)
            setQueue(null)
            return
        }
        setCurrentIndex((i) => i + 1)
    }

    const submitMutation = useMutation({
        mutationFn: async () => {
            if (!currentItem) throw new Error('No item selected')
            if (reviewRating === 0) throw new Error('Rating is required')
            const estId = currentItem.shift?.establishment_id
            if (!estId) throw new Error('Missing establishment_id')
            await submitFreelancerReview({
                mode: 'create',
                freelancerId: currentItem.freelancer_id,
                establishmentId: estId,
                shiftId: currentItem.shift_id,
                rating: reviewRating,
                comment: reviewComment,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-reviews'] })
            queryClient.invalidateQueries({ queryKey: ['given-reviews'] })
            toast.success(t('freelancers.reviewSaved'))
            advance()
        },
        onError: () => {
            toast.error(t('common.error'))
        },
    })

    const handleClose = () => {
        // العناصر مُعلَّمة "مشاهدة" أصلاً منذ لحظة التحميل — الإغلاق هنا لا يُعيد إظهارها لاحقاً
        setIsOpen(false)
        resetForm()
    }

    if (!currentItem) return null

    return (
        <ReviewModal
            isOpen={isOpen}
            onOpenChange={(open: boolean) => { if (!open) handleClose() }}
            selectedApplication={currentItem}
            selectedReview={null}
            reviewRating={reviewRating}
            setReviewRating={setReviewRating}
            reviewComment={reviewComment}
            setReviewComment={setReviewComment}
            hoverRating={hoverRating}
            setHoverRating={setHoverRating}
            onSubmit={() => submitMutation.mutate()}
            onClose={handleClose}
            isPending={submitMutation.isPending}
            t={t}
        />
    )
}