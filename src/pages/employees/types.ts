export type EmployeeStatus = 'not_invited' | 'active' | 'inactive';

export interface Employee {
  id: string;
  user_id?: string;
  company_id?: string;
  user: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  public_id?: string;
  active: boolean;
  status: EmployeeStatus;
  reliability_score: number;
  created_at?: string;
  establishment_id: string | null;
  establishment?: {
    id: string;
    name: string;
  } | null;
  verified_hourly_rate: number | null;
  /** Métiers (job_positions.id) attribués par l'employeur à ce compte employé */
  job_position_ids?: string[] | null;
}

export interface ShiftApplication {
  id: string;
  status: string;
  applied_at: string | null;
  shifts: {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    position_name: string;
    created_at: string;
    positions?: {
      id: string;
      title: string;
    } | null;
    establishments?: {
      id: string;
      name: string;
    } | null;
  };
}

export interface Establishment {
  id: string;
  name: string;
}

export interface JobPosition {
  id: string;
  slug: string;
  label: string;
  active: boolean;
}

export interface EmployeeDetailStats {
  totalInvited: number;
  acceptedShifts: ShiftApplication[];
  rejectedShifts: ShiftApplication[];
  withdrawnShifts: ShiftApplication[];
  pendingShifts: ShiftApplication[];
  completedShifts: ShiftApplication[];
  upcomingShifts: ShiftApplication[];
  averageResponseTime: number;
  reliabilityScore: number;
  allApplications: ShiftApplication[];
}

export interface Invitation {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
  establishment_id: string | null;
  establishment?: {
    id: string;
    name: string;
  };
  verified_hourly_rate: number | null;
}

export type SortOption = 'status' | 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc';

export interface SortedMember {
  type: 'employee' | 'invitation';
  id: string;
  name: string;
  email: string;
  date: string;
  status: 'active' | 'invited' | 'not_invited' | 'inactive';
  data: Employee | Invitation;
}