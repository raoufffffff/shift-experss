export interface Invitation {
  id: string
  email: string
  role: string
  status: string
  token: string
  expires_at: string
  created_at: string
  establishment_id: string | null
  establishment: {
    name: string
  } | null
}

export interface TeamMember {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  assigned_establishment_id: string | null
  created_at: string
  establishment: {
    id: string
    name: string
  } | null
}

export interface Establishment {
  id: string
  name: string
}
