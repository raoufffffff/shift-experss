export interface CVExperience {
  id: string;
  title: string;
  company: string;
  period: string;
  description?: string;
  source?: 'platform' | 'external';
}

export interface CVFormation {
  id: string;
  title: string;
  school: string;
  year: string;
}

export interface MasteredPms {
  id: string;
  pms_id: string;
  pms: {
    id: string;
    name: string;
    type: 'pms' | 'pos';
    job_position: {
      id: string;
      name_translations: Record<string, string>;
    } | null;
  };
}

export interface ProfessionalSkill {
  id: string;
  skill_id: string;
  skill: {
    id: string;
    name: string;
    name_translations: Record<string, string>;
    category_id: string | null;
  };
}

export interface FreelancerCertification {
  id: string;
  certification_id: string | null;
  certification: {
    id: string;
    name: string;
    allows_specialization: boolean;
  } | null;
  custom_name: string | null;
  specialization: string | null;
  institution: string | null;
  year: string | null;
  proof_status?: string | null;
}

export interface Freelancer {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  profile_photo_url: string | null;
  public_id?: string;
  bio: string | null;
  cv_experiences: CVExperience[];
  cv_formations: CVFormation[];
  created_at: string;
  updated_at: string;
  user_id: string;
  mastered_pms?: MasteredPms[];
  professional_skills?: ProfessionalSkill[];
  certifications?: FreelancerCertification[];
}

export interface EstablishmentFreelancer {
  id: string;
  establishment_id: string;
  freelancer_id: string;
  is_favorite: boolean;
  notes: string | null;
}

export interface FreelancerReview {
  id: string;
  freelancer_id: string;
  establishment_id: string;
  shift_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  establishments?: {
    id: string;
    name: string;
  } | null;
}

export interface FreelancerApplication {
  id: string;
  shift_id: string;
  freelancer_id: string;
  status: 'applied' | 'accepted' | 'rejected' | 'withdrawn';
  applied_at: string;
  responded_at: string | null;
  shift?: {
    id: string;
    position_name: string;
    start_time: string;
    end_time: string;
    status: string;
    establishments?: {
      id: string;
      name: string;
    } | null;
  };
}
