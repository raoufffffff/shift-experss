export type ApplicationStatus = 'pending' | 'applied' | 'accepted' | 'rejected' | 'withdrawn';

export interface Shift {
    id: string;
    position_name: string;
    published_to_freelancers: boolean;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    freelance_hourly_rate?: number | null;
    hourly_rate?: number;
    establishment?: { name: string; city: string };
    shift_applications?: ShiftApplication[];
}

export interface ShiftApplication {
    id: string;
    shift_id: string;
    user_id: string;
    status: ApplicationStatus;
    applied_at: string;
    reviewed_at?: string;
    user?: {
        id: string;
        email: string;
        first_name?: string;
        last_name?: string;
    };
    employee?: {
        id: string;
        verified_hourly_rate?: number;
    };
}

export interface FreelancerApplication {
    id: string;
    shift_id: string;
    freelancer_id: string;
    status: 'applied' | 'accepted' | 'rejected';
    applied_at: string;
    responded_at?: string;
    freelancer?: {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        profile_photo_url?: string;
    };
}

export interface MatchingResult {
    score: number;
}

export const applicationStatusVariants: Record<ApplicationStatus, 'default' | 'secondary' | 'success' | 'danger' | 'warning'> = {
    pending: 'secondary',
    applied: 'warning',
    accepted: 'success',
    rejected: 'danger',
    withdrawn: 'default',
};

export const getApplicationStatusLabel = (status: ApplicationStatus, t: (key: string, options?: Record<string, unknown>) => string): string => {
    return t(`shifts.applicationStatus.${status}`, { defaultValue: status });
};
