import { supabase, type Database } from '@/lib/supabase';
import { Shift as BaseShift } from '@shared/types';
import { logger } from '@/utils/logger';

type ShiftStatusEnum = Database['public']['Enums']['shift_status'];

export type ShiftStatus = 'pending' | 'partially_filled' | 'filled' | 'pending_validation' | 'completed' | 'canceled' | 'closed' | 'expired';

// Extended Shift type with relations
export interface Shift extends BaseShift {
    establishment?: {
        id: string;
        name: string;
    };
    position?: {
        id: string;
        title: string;
    };
    shift_applications?: {
        id: string;
        status: string;
        user?: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            email: string;
        };
    }[];
    shift_freelancer_applications?: {
        id: string;
        status: string;
        freelancer_id: string;
        freelancer?: {
            id: string;
            first_name: string;
            last_name: string;
            profile_photo_url: string | null;
        };
    }[];
    // PMS required for this shift
    shift_required_pms?: {
        id: string;
        pms: {
            id: string;
            name: string;
            type: 'pms' | 'pos';
        };
    }[];
    // Add other optional fields that might be missing in BaseShift but present in the query result or usages
    // Existing fields
    published_to_freelancers?: boolean;
    validation_deadline?: string;
    validated_at?: string;
    freelance_hourly_rate?: number;

    // Public IDs & Boost fields
    public_id?: string;
    boosted_at?: string;
    boost_count?: number;
    original_freelance_hourly_rate?: number;
}

export interface FetchShiftsParams {
    companyId: string;
    userRole?: string;
    assignedEstablishmentId?: string | null;
    selectedEstablishmentId?: string | null;
    status?: string; // 'all' | ShiftStatus
    startDate?: Date;
    endDate?: Date;
}

export async function fetchShifts({
    companyId,
    userRole,
    assignedEstablishmentId,
    selectedEstablishmentId,
    status = 'all',
    startDate,
    endDate
}: FetchShiftsParams): Promise<Shift[]> {
    let query = supabase
        .from('shifts')
        .select(
            `
      *,
      establishment:establishments(id, name),
      shift_applications(id, status, user:users!shift_applications_user_id_fkey(id, first_name, last_name, email)),
      shift_freelancer_applications(id, status, freelancer_id, freelancer:freelancers!freelancer_id(id, first_name, last_name, profile_photo_url)),
      shift_required_pms(id, pms:pms(id, name, type))
    `
        )
        .order('created_at', { ascending: false });

    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

    // Admin/Manager see their own shifts, employees see pending/filled shifts
    if (isAdminOrManager && companyId) {
        // logger.log('🔍 Fetching shifts for company:', companyId);
        query = query.eq('company_id', companyId);

        // Manager only sees shifts from their assigned establishment
        if (userRole === 'manager' && assignedEstablishmentId) {
            // logger.log('👔 Manager limited to establishment:', assignedEstablishmentId);
            query = query.eq('establishment_id', assignedEstablishmentId);
        } else if (userRole === 'admin' && selectedEstablishmentId) {
            // Admin can filter by selected establishment
            // logger.log('🏢 Admin filtering by establishment:', selectedEstablishmentId);
            query = query.eq('establishment_id', selectedEstablishmentId);
        }
    } else {
        // Employees see pending shifts (available for application)
        query = query.in('status', ['pending', 'partially_filled']);
    }

    // Filter by status if not 'all'
    if (status !== 'all' && status !== 'sent' && status !== 'applications') {
        // Note: 'sent' and 'applications' are virtual tabs handled by client filtering or specific logic in the original page
        // If status is a real db status, filter by it
        if (['pending', 'partially_filled', 'filled', 'completed', 'canceled', 'closed', 'expired'].includes(status)) {
            query = query.eq('status', status as ShiftStatusEnum);
        }
    }

    // Filter by date range (using start_time is more logical for shifts planning)
    if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
    }

    if (endDate) {
        // Pour la date de fin, inclure toute la journée (si c'est la même que start ou une range)
        // On suppose que endDate est par exemple "2023-10-24T00:00:00"
        // On ajoute un jour
        const endOfDay = new Date(endDate);
        endOfDay.setDate(endOfDay.getDate() + 1);
        query = query.lt('start_time', endOfDay.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        logger.error('Error fetching shifts:', JSON.stringify(error, null, 2));
        throw error;
    }

    return (data || []) as unknown as Shift[];
}
