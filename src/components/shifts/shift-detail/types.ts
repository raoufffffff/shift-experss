// Types for ShiftDetailModal and related components

import type { Locale } from 'date-fns';

export type ShiftStatus = 'pending' | 'partially_filled' | 'filled' | 'pending_validation' | 'completed' | 'cancelled' | 'closed';
export type ApplicationStatus = 'pending' | 'applied' | 'accepted' | 'rejected' | 'withdrawn';
export type FreelancerApplicationStatus = 'applied' | 'accepted' | 'rejected' | 'withdrawn';

export interface ShiftApplication {
    id: string;
    shift_id: string;
    user_id: string;
    status: ApplicationStatus;
    applied_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    viewed_at?: string | null;
    no_show: boolean | null;
    no_show_reported_by: string | null;
    no_show_reported_at: string | null;
    employee?: {
        id: string;
        user_id: string;
        phone: string | null;
        verified_hourly_rate: number | null;
    };
    user?: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
    };
}

export interface FreelancerApplication {
    id: string;
    shift_id: string;
    freelancer_id: string;
    status: FreelancerApplicationStatus;
    applied_at: string;
    responded_at: string | null;
    freelance_hourly_rate: number | null; 
    freelancer?: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
        phone: string | null;
        city: string | null;
        profile_photo_url: string | null;
    };
}

export interface MatchingResult {
    score: number;
}

export interface Shift {
    id: string;
    is_extended: boolean;
    company_id: string;
    establishment_id: string;
    position_id: string | null;
    position_name: string;
    created_by: string | null;
    title: string;
    description: string | null;
    private_note?: string | null;
    private_attachment_url?: string | null;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    actual_start_time?: string | null;
    actual_end_time?: string | null;
    actual_break_duration_minutes?: number | null;
    hours_adjusted_by?: string | null;
    hours_adjusted_at?: string | null;
    adjustment_reason?: string | null;
    hourly_rate: number;
    required_employees: number;
    filled_employees: number;
    status: ShiftStatus;
    location: string | null;
    published_at: string | null;
    filled_at: string | null;
    cancelled_at: string | null;
    created_at: string;
    updated_at: string;
    published_to_freelancers?: boolean;
    auto_publish_to_freelancers?: boolean;
    auto_accept_favorite_freelancers?: boolean;
    freelance_hourly_rate?: number | null;
    public_id?: string;
    boosted_at?: string;
    boost_count?: number;
    original_freelance_hourly_rate?: number;
    establishment?: {
        id: string;
        name: string;
        address: string | null;
        city: string | null;
    };
    position?: {
        id: string;
        title: string;
    };
    shift_applications?: ShiftApplication[];
}

export interface ShiftDetailModalProps {
    shiftId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

// Helper type for date locale
export type DateLocaleGetter = () => Locale;