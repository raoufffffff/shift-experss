import { supabase } from '@/lib/supabase'

interface CreateReviewInput {
    mode: 'create'
    freelancerId: string
    establishmentId: string
    shiftId: string | null
    rating: number
    comment: string
}

interface UpdateReviewInput {
    mode: 'update'
    reviewId: string
    rating: number
    comment: string
}

export type SubmitReviewInput = CreateReviewInput | UpdateReviewInput

// ✅ Extrait de useReviewsData.ts — logique d'insertion/mise à jour partagée entre
//    la page Reviews et le popup global (usePendingReviewsPopup), pour ne jamais
//    dupliquer l'appel Supabase à deux endroits différents.
export async function submitFreelancerReview(input: SubmitReviewInput): Promise<void> {
    if (input.rating < 1 || input.rating > 5) {
        throw new Error('Rating is required')
    }

    if (input.mode === 'update') {
        const { error } = await supabase
            .from('freelancer_reviews')
            .update({
                rating: input.rating,
                comment: input.comment.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', input.reviewId)
        if (error) throw error
        return
    }

    const { error } = await supabase
        .from('freelancer_reviews')
        .insert({
            freelancer_id: input.freelancerId,
            establishment_id: input.establishmentId,
            shift_id: input.shiftId,
            rating: input.rating,
            comment: input.comment.trim() || null,
        })
    if (error) throw error
}