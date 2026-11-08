export interface Application {
    id: string
    shift_id: string
    user_id?: string
    freelancer_id?: string
    status: string
    applied_at?: string
    created_at?: string
    compatibility_score?: number
    type: 'employee' | 'freelancer'
    shift?: {
        id: string
        position_name: string
        start_time: string
        end_time: string
        break_duration_minutes?: number
        freelance_hourly_rate?: number
        status: string
        establishment_id: string
        job_position_id?: string | null
        event_id?: string | null
        establishments?: {
            id: string
            name: string
            city?: string
            latitude?: number | null
            longitude?: number | null
            category_id?: string | null
        } | null
        shift_required_pms?: { id: string; pms_id: string }[]
    }
    user?: {
        id: string
        first_name: string
        last_name: string
        email: string
        avatar_url?: string
        employee?: {
            verified_hourly_rate: number | null
        } | null
    }
    freelancer_rating?: { average: number; count: number } | null
    freelancer?: {
        id: string
        first_name: string
        last_name: string
        full_name: string
        profile_photo_url: string | null
        email: string
        phone: string | null
        city: string | null
        latitude?: number | null
        longitude?: number | null
        freelancer_pms?: { id: string; pms_id: string; pms: { id: string; name: string; type: 'pms' | 'pos' } }[]
        freelancer_professional_skills?: { skill_id: string }[]
    }
}

export interface ApplicationStats {
    total: number
    pending: number
    accepted: number
    rejected: number
}

export interface ConfirmDialogState {
    action: 'accept' | 'reject'
    apps: Application[]
}

export type ApplicationDisplayItem =
    | { type: 'single'; app: Application }
    | { type: 'event'; eventId: string; candidateId: string; apps: Application[] }
