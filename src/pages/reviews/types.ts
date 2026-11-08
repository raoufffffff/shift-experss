import type { Locale } from 'date-fns'

export interface FreelancerApplication {
    id: string
    shift_id: string
    freelancer_id: string
    status: string
    applied_at: string
    shift?: {
        id: string
        position_name: string
        start_time: string
        end_time: string
        status: string
        establishment_id: string
        establishments?: {
            id: string
            name: string
        } | null
    }
    freelancer?: {
        id: string
        first_name: string
        last_name: string
        full_name: string
        profile_photo_url: string | null
    }
}

export interface FreelancerReview {
    id: string
    freelancer_id: string
    establishment_id: string
    shift_id: string | null
    rating: number
    comment: string | null
    created_at: string
    updated_at: string
    freelancer?: {
        id: string
        first_name: string
        last_name: string
        full_name: string
        profile_photo_url: string | null
    }
    shift?: {
        id: string
        position_name: string
        start_time: string
        end_time: string
    } | null
    establishments?: {
        id: string
        name: string
    } | null
}

export interface ReviewsTabProps {
    t: (key: string) => string
    dateFnsLocale: Locale
}

export interface PendingReviewsTabProps extends ReviewsTabProps {
    applications: FreelancerApplication[]
    onEvaluate: (app: FreelancerApplication) => void
}

export interface GivenReviewsTabProps extends ReviewsTabProps {
    reviews: FreelancerReview[]
    onEdit: (review: FreelancerReview) => void
}

export interface ReviewModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    selectedApplication: FreelancerApplication | null
    selectedReview: FreelancerReview | null
    reviewRating: number
    setReviewRating: (rating: number) => void
    reviewComment: string
    setReviewComment: (comment: string) => void
    hoverRating: number | null
    setHoverRating: (rating: number | null) => void
    onSubmit: () => void
    onClose: () => void
    isPending: boolean
    t: (key: string) => string
}
