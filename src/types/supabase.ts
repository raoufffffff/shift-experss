export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_whitelist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          is_supermanager: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          is_supermanager?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_supermanager?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          method: string | null
          path: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          method?: string | null
          path?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          method?: string | null
          path?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      certifications: {
        Row: {
          active: boolean
          allows_specialization: boolean
          created_at: string | null
          display_order: number
          id: string
          name: string
          name_translations: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          allows_specialization?: boolean
          created_at?: string | null
          display_order?: number
          id?: string
          name: string
          name_translations?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          allows_specialization?: boolean
          created_at?: string | null
          display_order?: number
          id?: string
          name?: string
          name_translations?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          points_reward: number
          target_value: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          points_reward: number
          target_value?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          points_reward?: number
          target_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_country: string | null
          billing_email: string | null
          billing_postal_code: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          default_language: Database["public"]["Enums"]["language_code"]
          first_shift_alert_shown: boolean | null
          has_configured_rib: boolean | null
          id: string
          last_readiness_reminder_at: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_dismissed: boolean | null
          onboarding_started_at: string | null
          platform_fee_rate: number | null
          preferred_payment_method: string | null
          public_id: string | null
          sepa_bank_code: string | null
          sepa_configured_at: string | null
          sepa_country: string | null
          sepa_iban_last4: string | null
          sepa_mandate_accepted_at: string | null
          sepa_mandate_id: string | null
          sepa_mandate_status: string | null
          sepa_payment_method_id: string | null
          sepa_status: string | null
          siret: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_current_period_start: string | null
          subscription_interval: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          trial_ends_at: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_postal_code?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          default_language?: Database["public"]["Enums"]["language_code"]
          first_shift_alert_shown?: boolean | null
          has_configured_rib?: boolean | null
          id?: string
          last_readiness_reminder_at?: string | null
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_dismissed?: boolean | null
          onboarding_started_at?: string | null
          platform_fee_rate?: number | null
          preferred_payment_method?: string | null
          public_id?: string | null
          sepa_bank_code?: string | null
          sepa_configured_at?: string | null
          sepa_country?: string | null
          sepa_iban_last4?: string | null
          sepa_mandate_accepted_at?: string | null
          sepa_mandate_id?: string | null
          sepa_mandate_status?: string | null
          sepa_payment_method_id?: string | null
          sepa_status?: string | null
          siret?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_current_period_start?: string | null
          subscription_interval?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_postal_code?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          default_language?: Database["public"]["Enums"]["language_code"]
          first_shift_alert_shown?: boolean | null
          has_configured_rib?: boolean | null
          id?: string
          last_readiness_reminder_at?: string | null
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_dismissed?: boolean | null
          onboarding_started_at?: string | null
          platform_fee_rate?: number | null
          preferred_payment_method?: string | null
          public_id?: string | null
          sepa_bank_code?: string | null
          sepa_configured_at?: string | null
          sepa_country?: string | null
          sepa_iban_last4?: string | null
          sepa_mandate_accepted_at?: string | null
          sepa_mandate_id?: string | null
          sepa_mandate_status?: string | null
          sepa_payment_method_id?: string | null
          sepa_status?: string | null
          siret?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_current_period_start?: string | null
          subscription_interval?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          trial_ends_at?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      company_documents: {
        Row: {
          company_id: string
          created_at: string | null
          expiration_date: string | null
          file_url: string
          id: string
          metadata: Json | null
          rejection_reason: string | null
          status: string
          type: string
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          expiration_date?: string | null
          file_url: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: string
          type: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          expiration_date?: string | null
          file_url?: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          application_id: string | null
          content: Json | null
          contract_url: string | null
          created_at: string | null
          employer_signature_svg: string | null
          employer_signed_at: string | null
          employer_user_id: string | null
          freelancer_application_id: string | null
          freelancer_signature_svg: string | null
          id: string
          signed_at: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          content?: Json | null
          contract_url?: string | null
          created_at?: string | null
          employer_signature_svg?: string | null
          employer_signed_at?: string | null
          employer_user_id?: string | null
          freelancer_application_id?: string | null
          freelancer_signature_svg?: string | null
          id?: string
          signed_at?: string | null
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          content?: Json | null
          contract_url?: string | null
          created_at?: string | null
          employer_signature_svg?: string | null
          employer_signed_at?: string | null
          employer_user_id?: string | null
          freelancer_application_id?: string | null
          freelancer_signature_svg?: string | null
          id?: string
          signed_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "shift_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_employer_user_id_fkey"
            columns: ["employer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_freelancer_application_id_fkey"
            columns: ["freelancer_application_id"]
            isOneToOne: false
            referencedRelation: "shift_freelancer_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          hidden_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          hidden_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          hidden_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmetic_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_cost: number
          preview_url: string | null
          rarity: string
          sort_order: number | null
          type: string
          unlock_requirement: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_cost?: number
          preview_url?: string | null
          rarity?: string
          sort_order?: number | null
          type: string
          unlock_requirement?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_cost?: number
          preview_url?: string | null
          rarity?: string
          sort_order?: number | null
          type?: string
          unlock_requirement?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          company_id: string
          content: Json
          created_at: string | null
          id: string
          title: string
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id: string
          content?: Json
          created_at?: string | null
          id?: string
          title?: string
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          content?: Json
          created_at?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          employee_id: string
          id: string
          progress: number | null
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          employee_id: string
          id?: string
          progress?: number | null
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          employee_id?: string
          id?: string
          progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_challenges_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_devices: {
        Row: {
          created_at: string | null
          id: string
          platform: string | null
          push_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string | null
          push_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string | null
          push_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          active: boolean | null
          avg_response_time_seconds: number | null
          company_id: string
          created_at: string | null
          establishment_id: string | null
          gusto_employee_id: string | null
          hourly_rate: number | null
          id: string
          public_id: string | null
          reliability_score: number | null
          source: string | null
          status: Database["public"]["Enums"]["employee_status"]
          total_no_shows: number | null
          total_shifts_accepted: number | null
          total_shifts_completed: number | null
          total_shifts_proposed: number | null
          total_shifts_rejected: number | null
          total_shifts_withdrawn: number | null
          updated_at: string | null
          user_id: string
          verified_hourly_rate: number | null
        }
        Insert: {
          active?: boolean | null
          avg_response_time_seconds?: number | null
          company_id: string
          created_at?: string | null
          establishment_id?: string | null
          gusto_employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          public_id?: string | null
          reliability_score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          total_no_shows?: number | null
          total_shifts_accepted?: number | null
          total_shifts_completed?: number | null
          total_shifts_proposed?: number | null
          total_shifts_rejected?: number | null
          total_shifts_withdrawn?: number | null
          updated_at?: string | null
          user_id: string
          verified_hourly_rate?: number | null
        }
        Update: {
          active?: boolean | null
          avg_response_time_seconds?: number | null
          company_id?: string
          created_at?: string | null
          establishment_id?: string | null
          gusto_employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          public_id?: string | null
          reliability_score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          total_no_shows?: number | null
          total_shifts_accepted?: number | null
          total_shifts_completed?: number | null
          total_shifts_proposed?: number | null
          total_shifts_rejected?: number | null
          total_shifts_withdrawn?: number | null
          updated_at?: string | null
          user_id?: string
          verified_hourly_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          name_translations: Json
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name_translations?: Json
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name_translations?: Json
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      establishment_freelancers: {
        Row: {
          created_at: string | null
          establishment_id: string
          freelancer_id: string
          id: string
          is_favorite: boolean | null
          notes: string | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          establishment_id: string
          freelancer_id: string
          id?: string
          is_favorite?: boolean | null
          notes?: string | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          establishment_id?: string
          freelancer_id?: string
          id?: string
          is_favorite?: boolean | null
          notes?: string | null
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_freelancers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_freelancers_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_invitation_signups: {
        Row: {
          employee_id: string
          id: string
          invitation_id: string
          ip_address: unknown
          metadata: Json | null
          signed_up_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          employee_id: string
          id?: string
          invitation_id: string
          ip_address?: unknown
          metadata?: Json | null
          signed_up_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          employee_id?: string
          id?: string
          invitation_id?: string
          ip_address?: unknown
          metadata?: Json | null
          signed_up_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_invitation_signups_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_invitation_signups_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "establishment_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_invitation_signups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_invitations: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          current_uses: number | null
          description: string | null
          establishment_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          max_uses: number | null
          metadata: Json | null
          token: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          current_uses?: number | null
          description?: string | null
          establishment_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_uses?: number | null
          metadata?: Json | null
          token: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          current_uses?: number | null
          description?: string | null
          establishment_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          max_uses?: number | null
          metadata?: Json | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_invitations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_job_rates: {
        Row: {
          category_id: string
          created_at: string | null
          establishment_id: string
          id: string
          job_position_id: string
          max_rate: number
          min_rate: number
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          establishment_id: string
          id?: string
          job_position_id: string
          max_rate: number
          min_rate: number
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          establishment_id?: string
          id?: string
          job_position_id?: string
          max_rate?: number
          min_rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_job_rates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "establishment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_job_rates_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_job_rates_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          category_id: string | null
          city: string | null
          company_id: string
          created_at: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string | null
          postal_code: string | null
          public_id: string | null
          status: Database["public"]["Enums"]["establishment_status"] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          city?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          postal_code?: string | null
          public_id?: string | null
          status?: Database["public"]["Enums"]["establishment_status"] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string | null
          city?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          public_id?: string | null
          status?: Database["public"]["Enums"]["establishment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_certifications: {
        Row: {
          certification_id: string | null
          created_at: string | null
          custom_name: string | null
          freelancer_id: string
          id: string
          institution: string | null
          proof_file_url: string | null
          proof_rejection_reason: string | null
          proof_status: string | null
          specialization: string | null
          year: string | null
        }
        Insert: {
          certification_id?: string | null
          created_at?: string | null
          custom_name?: string | null
          freelancer_id: string
          id?: string
          institution?: string | null
          proof_file_url?: string | null
          proof_rejection_reason?: string | null
          proof_status?: string | null
          specialization?: string | null
          year?: string | null
        }
        Update: {
          certification_id?: string | null
          created_at?: string | null
          custom_name?: string | null
          freelancer_id?: string
          id?: string
          institution?: string | null
          proof_file_url?: string | null
          proof_rejection_reason?: string | null
          proof_status?: string | null
          specialization?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_certifications_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_devices: {
        Row: {
          created_at: string | null
          freelancer_id: string
          id: string
          platform: string
          push_token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          freelancer_id: string
          id?: string
          platform: string
          push_token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          freelancer_id?: string
          id?: string
          platform?: string
          push_token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_devices_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_documents: {
        Row: {
          created_at: string | null
          expiration_date: string | null
          file_url: string
          freelancer_id: string
          id: string
          metadata: Json | null
          rejection_reason: string | null
          status: string
          type: string
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          expiration_date?: string | null
          file_url: string
          freelancer_id: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: string
          type: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          expiration_date?: string | null
          file_url?: string
          freelancer_id?: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_documents_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_pms: {
        Row: {
          created_at: string | null
          freelancer_id: string
          id: string
          pms_id: string
          proof_file_url: string | null
          proof_rejection_reason: string | null
          proof_status: string | null
        }
        Insert: {
          created_at?: string | null
          freelancer_id: string
          id?: string
          pms_id: string
          proof_file_url?: string | null
          proof_rejection_reason?: string | null
          proof_status?: string | null
        }
        Update: {
          created_at?: string | null
          freelancer_id?: string
          id?: string
          pms_id?: string
          proof_file_url?: string | null
          proof_rejection_reason?: string | null
          proof_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_pms_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_pms_pms_id_fkey"
            columns: ["pms_id"]
            isOneToOne: false
            referencedRelation: "pms"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_professional_skills: {
        Row: {
          created_at: string | null
          freelancer_id: string
          id: string
          skill_id: string
        }
        Insert: {
          created_at?: string | null
          freelancer_id: string
          id?: string
          skill_id: string
        }
        Update: {
          created_at?: string | null
          freelancer_id?: string
          id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_professional_skills_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_professional_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "professional_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancer_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          establishment_id: string
          freelancer_id: string
          id: string
          rating: number
          shift_id: string | null
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          establishment_id: string
          freelancer_id: string
          id?: string
          rating: number
          shift_id?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          establishment_id?: string
          freelancer_id?: string
          id?: string
          rating?: number
          shift_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_reviews_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_reviews_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_reviews_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      freelancers: {
        Row: {
          address: string | null
          bic: string | null
          billing_address: string | null
          billing_city: string | null
          billing_postal_code: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          cv_experiences: Json | null
          cv_formations: Json | null
          cv_skills: Json | null
          email: string
          first_name: string
          full_name: string | null
          iban: string | null
          id: string
          is_blocked: boolean | null
          last_name: string
          late_cancellation_count: number | null
          latitude: number | null
          longitude: number | null
          min_hourly_rate: number | null
          phone: string | null
          postal_code: string | null
          profile_photo_url: string | null
          public_id: string | null
          reliability_score: number | null
          search_radius_km: number | null
          siret: string | null
          spoken_languages: string[] | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
          whatsapp_enabled: boolean | null
          whatsapp_last_notified_at: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          address?: string | null
          bic?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_postal_code?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          cv_experiences?: Json | null
          cv_formations?: Json | null
          cv_skills?: Json | null
          email: string
          first_name: string
          full_name?: string | null
          iban?: string | null
          id?: string
          is_blocked?: boolean | null
          last_name: string
          late_cancellation_count?: number | null
          latitude?: number | null
          longitude?: number | null
          min_hourly_rate?: number | null
          phone?: string | null
          postal_code?: string | null
          profile_photo_url?: string | null
          public_id?: string | null
          reliability_score?: number | null
          search_radius_km?: number | null
          siret?: string | null
          spoken_languages?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_last_notified_at?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          address?: string | null
          bic?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_postal_code?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          cv_experiences?: Json | null
          cv_formations?: Json | null
          cv_skills?: Json | null
          email?: string
          first_name?: string
          full_name?: string | null
          iban?: string | null
          id?: string
          is_blocked?: boolean | null
          last_name?: string
          late_cancellation_count?: number | null
          latitude?: number | null
          longitude?: number | null
          min_hourly_rate?: number | null
          phone?: string | null
          postal_code?: string | null
          profile_photo_url?: string | null
          public_id?: string | null
          reliability_score?: number | null
          search_radius_km?: number | null
          siret?: string | null
          spoken_languages?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_last_notified_at?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      invoice_sequences: {
        Row: {
          last_number: number
          prefix: string
        }
        Insert: {
          last_number?: number
          prefix: string
        }
        Update: {
          last_number?: number
          prefix?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_ht: number
          amount_ttc: number
          buyer_address: string | null
          buyer_city: string | null
          buyer_country: string | null
          buyer_name: string
          buyer_postal_code: string | null
          buyer_siret: string | null
          buyer_vat_number: string | null
          company_id: string
          created_at: string | null
          description: string
          freelancer_id: string | null
          id: string
          issued_at: string | null
          metadata: Json | null
          pdf_storage_path: string | null
          pdf_url: string | null
          quantity: number
          reference: string
          seller_address: string | null
          seller_city: string | null
          seller_country: string | null
          seller_name: string
          seller_postal_code: string | null
          seller_siret: string | null
          seller_vat_number: string | null
          shift_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_intent_id: string | null
          tva_amount: number
          tva_rate: number
          type: Database["public"]["Enums"]["invoice_type"]
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          amount_ht: number
          amount_ttc: number
          buyer_address?: string | null
          buyer_city?: string | null
          buyer_country?: string | null
          buyer_name: string
          buyer_postal_code?: string | null
          buyer_siret?: string | null
          buyer_vat_number?: string | null
          company_id: string
          created_at?: string | null
          description: string
          freelancer_id?: string | null
          id?: string
          issued_at?: string | null
          metadata?: Json | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          quantity: number
          reference: string
          seller_address?: string | null
          seller_city?: string | null
          seller_country?: string | null
          seller_name: string
          seller_postal_code?: string | null
          seller_siret?: string | null
          seller_vat_number?: string | null
          shift_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_intent_id?: string | null
          tva_amount?: number
          tva_rate?: number
          type: Database["public"]["Enums"]["invoice_type"]
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          amount_ht?: number
          amount_ttc?: number
          buyer_address?: string | null
          buyer_city?: string | null
          buyer_country?: string | null
          buyer_name?: string
          buyer_postal_code?: string | null
          buyer_siret?: string | null
          buyer_vat_number?: string | null
          company_id?: string
          created_at?: string | null
          description?: string
          freelancer_id?: string | null
          id?: string
          issued_at?: string | null
          metadata?: Json | null
          pdf_storage_path?: string | null
          pdf_url?: string | null
          quantity?: number
          reference?: string
          seller_address?: string | null
          seller_city?: string | null
          seller_country?: string | null
          seller_name?: string
          seller_postal_code?: string | null
          seller_siret?: string | null
          seller_vat_number?: string | null
          shift_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_intent_id?: string | null
          tva_amount?: number
          tva_rate?: number
          type?: Database["public"]["Enums"]["invoice_type"]
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          active: boolean | null
          category_id: string
          created_at: string | null
          display_order: number | null
          id: string
          name_translations: Json
          recommended_hourly_rate_max: number | null
          recommended_hourly_rate_min: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          name_translations?: Json
          recommended_hourly_rate_max?: number | null
          recommended_hourly_rate_min?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          name_translations?: Json
          recommended_hourly_rate_max?: number | null
          recommended_hourly_rate_min?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_positions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "establishment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          freelancer_id: string | null
          id: string
          language: string | null
          push_enabled: boolean | null
          show_hourly_rate: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          freelancer_id?: string | null
          id?: string
          language?: string | null
          push_enabled?: boolean | null
          show_hourly_rate?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          freelancer_id?: string | null
          id?: string
          language?: string | null
          push_enabled?: boolean | null
          show_hourly_rate?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: []
      }
      payment_tickets: {
        Row: {
          admin_note: string | null
          amount: number
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          id: string
          note: string | null
          reference: string
          rejected_at: string | null
          requested_by: string
          shift_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          reference: string
          rejected_at?: string | null
          requested_by: string
          shift_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          reference?: string
          rejected_at?: string | null
          requested_by?: string
          shift_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_tickets_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_tickets_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_tickets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_integrations: {
        Row: {
          access_token: string | null
          auto_sync_enabled: boolean | null
          company_id: string
          created_at: string | null
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          provider: string
          provider_company_id: string | null
          provider_company_name: string | null
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          auto_sync_enabled?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider: string
          provider_company_id?: string | null
          provider_company_name?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          auto_sync_enabled?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider?: string
          provider_company_id?: string | null
          provider_company_name?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_sync_logs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          integration_id: string
          records_failed: number | null
          records_processed: number | null
          records_succeeded: number | null
          status: string
          sync_type: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id: string
          records_failed?: number | null
          records_processed?: number | null
          records_succeeded?: number | null
          status: string
          sync_type: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          integration_id?: string
          records_failed?: number | null
          records_processed?: number | null
          records_succeeded?: number | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "payroll_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      pms: {
        Row: {
          created_at: string | null
          id: string
          job_position_id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_position_id: string
          name: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_position_id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pms_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          company_id: string
          created_at: string | null
          default_hourly_rate: number | null
          description: string | null
          establishment_id: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_hourly_rate?: number | null
          description?: string | null
          establishment_id?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_hourly_rate?: number | null
          description?: string | null
          establishment_id?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_skills: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string | null
          display_order: number | null
          id: string
          name: string
          name_translations: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          name_translations?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          name_translations?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "establishment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          freelancer_id: string
          granted_by: string | null
          id: string
          job_position_id: string
          manually_granted: boolean | null
          passed: boolean
          score: number
          total_questions: number
        }
        Insert: {
          completed_at?: string | null
          freelancer_id: string
          granted_by?: string | null
          id?: string
          job_position_id: string
          manually_granted?: boolean | null
          passed: boolean
          score: number
          total_questions?: number
        }
        Update: {
          completed_at?: string | null
          freelancer_id?: string
          granted_by?: string | null
          id?: string
          job_position_id?: string
          manually_granted?: boolean | null
          passed?: boolean
          score?: number
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          active: boolean | null
          correct_answer_index: number
          created_at: string | null
          display_order: number | null
          id: string
          job_position_id: string
          options: Json
          question: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          correct_answer_index: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          job_position_id: string
          options: Json
          question: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          correct_answer_index?: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          job_position_id?: string
          options?: Json
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          identifier: string
          request_count: number
          updated_at: string
          window_expires_at: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          identifier: string
          request_count?: number
          updated_at?: string
          window_expires_at: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          identifier?: string
          request_count?: number
          updated_at?: string
          window_expires_at?: string
        }
        Relationships: []
      }
      shift_applications: {
        Row: {
          applied_at: string | null
          id: string
          message: string | null
          no_show: boolean | null
          no_show_reported_at: string | null
          no_show_reported_by: string | null
          response_time_seconds: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          shift_id: string
          status: Database["public"]["Enums"]["application_status"] | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          applied_at?: string | null
          id?: string
          message?: string | null
          no_show?: boolean | null
          no_show_reported_at?: string | null
          no_show_reported_by?: string | null
          response_time_seconds?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_id: string
          status?: Database["public"]["Enums"]["application_status"] | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          applied_at?: string | null
          id?: string
          message?: string | null
          no_show?: boolean | null
          no_show_reported_at?: string | null
          no_show_reported_by?: string | null
          response_time_seconds?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_id?: string
          status?: Database["public"]["Enums"]["application_status"] | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_applications_no_show_reported_by_fkey"
            columns: ["no_show_reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_applications_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_boosts: {
        Row: {
          boosted_at: string
          company_id: string
          created_at: string
          freelancers_notified: number
          id: string
          new_rate: number
          old_rate: number
          shift_id: string
        }
        Insert: {
          boosted_at?: string
          company_id: string
          created_at?: string
          freelancers_notified?: number
          id?: string
          new_rate: number
          old_rate: number
          shift_id: string
        }
        Update: {
          boosted_at?: string
          company_id?: string
          created_at?: string
          freelancers_notified?: number
          id?: string
          new_rate?: number
          old_rate?: number
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_boosts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_boosts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_freelancer_applications: {
        Row: {
          applied_at: string | null
          created_at: string | null
          freelancer_id: string
          id: string
          responded_at: string | null
          shift_id: string
          status: string | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          freelancer_id: string
          id?: string
          responded_at?: string | null
          shift_id: string
          status?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          freelancer_id?: string
          id?: string
          responded_at?: string | null
          shift_id?: string
          status?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_freelancer_applications_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_freelancer_applications_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_freelancers: {
        Row: {
          applied_at: string | null
          created_at: string | null
          freelancer_id: string
          id: string
          notification_sent: boolean | null
          notification_sent_at: string | null
          notify_immediately: boolean | null
          scheduled_notification_at: string | null
          shift_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          freelancer_id: string
          id?: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          notify_immediately?: boolean | null
          scheduled_notification_at?: string | null
          shift_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          freelancer_id?: string
          id?: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          notify_immediately?: boolean | null
          scheduled_notification_at?: string | null
          shift_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_freelancers_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_freelancers_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_required_pms: {
        Row: {
          created_at: string | null
          id: string
          pms_id: string
          shift_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pms_id: string
          shift_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pms_id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_required_pms_pms_id_fkey"
            columns: ["pms_id"]
            isOneToOne: false
            referencedRelation: "pms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_required_pms_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          actual_break_duration_minutes: number | null
          actual_end_time: string | null
          actual_start_time: string | null
          address: string | null
          adjustment_reason: string | null
          adjustment_reason_freelancer: string | null
          auto_accept_favorite_freelancers: boolean | null
          auto_notify_delay_minutes: number | null
          auto_notify_freelancers: boolean | null
          auto_publish_delay_minutes: number | null
          auto_publish_to_freelancers: boolean | null
          boost_count: number
          boosted_at: string | null
          break_duration_minutes: number
          company_id: string
          created_at: string | null
          crm_ticket_id: string | null
          description: string | null
          end_time: string
          escalated_at: string | null
          establishment_id: string
          event_id: string | null
          filled_at: string | null
          filled_employees: number
          freelance_hourly_rate: number | null
          freelancer_notification_sent: boolean | null
          freelancer_notification_sent_at: string | null
          freelancer_responded_at: string | null
          freelancer_response: string | null
          hours_adjusted_at: string | null
          hours_adjusted_by: string | null
          id: string
          job_position_id: string | null
          notify_freelancers_immediately: boolean | null
          original_freelance_hourly_rate: number | null
          payment_auto_validate_at: string | null
          platform_fee_rate: number | null
          position_name: string | null
          private_attachment_url: string | null
          private_note: string | null
          public_id: string | null
          published_at: string
          published_to_freelancers: boolean | null
          published_to_freelancers_at: string | null
          required_employees: number
          required_languages: string[] | null
          start_time: string
          status: Database["public"]["Enums"]["shift_status"] | null
          targets_employees: boolean | null
          total_hours: number | null
          updated_at: string | null
          validated_at: string | null
          is_extended: boolean
          validation_deadline: string | null
        }
        Insert: {
          actual_break_duration_minutes?: number | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          address?: string | null
          adjustment_reason?: string | null
          adjustment_reason_freelancer?: string | null
          auto_accept_favorite_freelancers?: boolean | null
          auto_notify_delay_minutes?: number | null
          auto_notify_freelancers?: boolean | null
          auto_publish_delay_minutes?: number | null
          auto_publish_to_freelancers?: boolean | null
          boost_count?: number
          boosted_at?: string | null
          break_duration_minutes?: number
          company_id: string
          created_at?: string | null
          crm_ticket_id?: string | null
          description?: string | null
          end_time: string
          escalated_at?: string | null
          establishment_id: string
          event_id?: string | null
          filled_at?: string | null
          filled_employees?: number
          freelance_hourly_rate?: number | null
          freelancer_notification_sent?: boolean | null
          freelancer_notification_sent_at?: string | null
          freelancer_responded_at?: string | null
          freelancer_response?: string | null
          hours_adjusted_at?: string | null
          hours_adjusted_by?: string | null
          id?: string
          job_position_id?: string | null
          notify_freelancers_immediately?: boolean | null
          original_freelance_hourly_rate?: number | null
          payment_auto_validate_at?: string | null
          platform_fee_rate?: number | null
          position_name?: string | null
          private_attachment_url?: string | null
          private_note?: string | null
          public_id?: string | null
          published_at?: string
          published_to_freelancers?: boolean | null
          published_to_freelancers_at?: string | null
          required_employees?: number
          required_languages?: string[] | null
          start_time: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          targets_employees?: boolean | null
          total_hours?: number | null
          updated_at?: string | null
          validated_at?: string | null
          validation_deadline?: string | null
        }
        Update: {
          actual_break_duration_minutes?: number | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          address?: string | null
          adjustment_reason?: string | null
          adjustment_reason_freelancer?: string | null
          auto_accept_favorite_freelancers?: boolean | null
          auto_notify_delay_minutes?: number | null
          auto_notify_freelancers?: boolean | null
          auto_publish_delay_minutes?: number | null
          auto_publish_to_freelancers?: boolean | null
          boost_count?: number
          boosted_at?: string | null
          break_duration_minutes?: number
          company_id?: string
          created_at?: string | null
          crm_ticket_id?: string | null
          description?: string | null
          end_time?: string
          escalated_at?: string | null
          establishment_id?: string
          event_id?: string | null
          filled_at?: string | null
          filled_employees?: number
          freelance_hourly_rate?: number | null
          freelancer_notification_sent?: boolean | null
          freelancer_notification_sent_at?: string | null
          freelancer_responded_at?: string | null
          freelancer_response?: string | null
          hours_adjusted_at?: string | null
          hours_adjusted_by?: string | null
          id?: string
          job_position_id?: string | null
          notify_freelancers_immediately?: boolean | null
          original_freelance_hourly_rate?: number | null
          payment_auto_validate_at?: string | null
          platform_fee_rate?: number | null
          position_name?: string | null
          private_attachment_url?: string | null
          private_note?: string | null
          public_id?: string | null
          published_at?: string
          published_to_freelancers?: boolean | null
          published_to_freelancers_at?: string | null
          required_employees?: number
          required_languages?: string[] | null
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          targets_employees?: boolean | null
          total_hours?: number | null
          updated_at?: string | null
          validated_at?: string | null
          validation_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_crm_ticket_id_fkey"
            columns: ["crm_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_hours_adjusted_by_fkey"
            columns: ["hours_adjusted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_accounts: {
        Row: {
          charges_enabled: boolean | null
          created_at: string | null
          details_submitted: boolean | null
          id: string
          payouts_enabled: boolean | null
          status: string | null
          stripe_account_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          payouts_enabled?: boolean | null
          status?: string | null
          stripe_account_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          charges_enabled?: boolean | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          payouts_enabled?: boolean | null
          status?: string | null
          stripe_account_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connect_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          email: string
          establishment_id: string | null
          expires_at: string | null
          first_name: string | null
          gusto_employee_id: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          source: string | null
          status: string | null
          token: string
          updated_at: string | null
          verified_hourly_rate: number | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          email: string
          establishment_id?: string | null
          expires_at?: string | null
          first_name?: string | null
          gusto_employee_id?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          source?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
          verified_hourly_rate?: number | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          email?: string
          establishment_id?: string | null
          expires_at?: string | null
          first_name?: string | null
          gusto_employee_id?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          source?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
          verified_hourly_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          company_id: string
          connect_account_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          company_id: string
          connect_account_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          connect_account_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_connect_account_id_fkey"
            columns: ["connect_account_id"]
            isOneToOne: false
            referencedRelation: "stripe_connect_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      user_cosmetics: {
        Row: {
          cosmetic_item_id: string
          created_at: string | null
          id: string
          is_equipped: boolean | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          cosmetic_item_id: string
          created_at?: string | null
          id?: string
          is_equipped?: boolean | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          cosmetic_item_id?: string
          created_at?: string | null
          id?: string
          is_equipped?: boolean | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cosmetics_cosmetic_item_id_fkey"
            columns: ["cosmetic_item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cosmetics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          resource_id: string | null
          resource_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          resource_id?: string | null
          resource_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_establishment_id: string | null
          company_id: string | null
          created_at: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_establishment_id?: string | null
          company_id?: string | null
          created_at?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_establishment_id?: string | null
          company_id?: string | null
          created_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_establishment_id_fkey"
            columns: ["assigned_establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          avg_response_time_minutes: number | null
          best_streak_days: number | null
          created_at: string | null
          current_streak_days: number | null
          equipped_badge_id: string | null
          first_responder_count: number | null
          last_login_date: string | null
          last_reset_at: string | null
          morning_shifts_accepted: number | null
          night_shifts_accepted: number | null
          no_cancellation_streak: number | null
          responses_2_to_5min: number | null
          responses_under_2min: number | null
          total_points: number | null
          total_shifts_accepted: number | null
          total_shifts_cancelled: number | null
          total_shifts_completed: number | null
          total_shifts_offered: number
          updated_at: string | null
          user_id: string
          week_start_date: string | null
          weekend_shifts_completed: number | null
          weekly_points: number | null
        }
        Insert: {
          avg_response_time_minutes?: number | null
          best_streak_days?: number | null
          created_at?: string | null
          current_streak_days?: number | null
          equipped_badge_id?: string | null
          first_responder_count?: number | null
          last_login_date?: string | null
          last_reset_at?: string | null
          morning_shifts_accepted?: number | null
          night_shifts_accepted?: number | null
          no_cancellation_streak?: number | null
          responses_2_to_5min?: number | null
          responses_under_2min?: number | null
          total_points?: number | null
          total_shifts_accepted?: number | null
          total_shifts_cancelled?: number | null
          total_shifts_completed?: number | null
          total_shifts_offered?: number
          updated_at?: string | null
          user_id: string
          week_start_date?: string | null
          weekend_shifts_completed?: number | null
          weekly_points?: number | null
        }
        Update: {
          avg_response_time_minutes?: number | null
          best_streak_days?: number | null
          created_at?: string | null
          current_streak_days?: number | null
          equipped_badge_id?: string | null
          first_responder_count?: number | null
          last_login_date?: string | null
          last_reset_at?: string | null
          morning_shifts_accepted?: number | null
          night_shifts_accepted?: number | null
          no_cancellation_streak?: number | null
          responses_2_to_5min?: number | null
          responses_under_2min?: number | null
          total_points?: number | null
          total_shifts_accepted?: number | null
          total_shifts_cancelled?: number | null
          total_shifts_completed?: number | null
          total_shifts_offered?: number
          updated_at?: string | null
          user_id?: string
          week_start_date?: string | null
          weekend_shifts_completed?: number | null
          weekly_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_equipped_badge_id_fkey"
            columns: ["equipped_badge_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_weekly_progress: {
        Row: {
          challenge_id: string
          claimed: boolean | null
          claimed_at: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_count: number | null
          id: string
          updated_at: string | null
          user_id: string
          week_start_date: string
        }
        Insert: {
          challenge_id: string
          claimed?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
          week_start_date: string
        }
        Update: {
          challenge_id?: string
          claimed?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_weekly_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_weekly_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          assigned_establishment_id: string | null
          company_id: string | null
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_blocked: boolean | null
          last_name: string | null
          late_cancellation_count: number | null
          level: number | null
          phone: string | null
          points: number | null
          public_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          weekly_points: number | null
        }
        Insert: {
          assigned_establishment_id?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          is_blocked?: boolean | null
          last_name?: string | null
          late_cancellation_count?: number | null
          level?: number | null
          phone?: string | null
          points?: number | null
          public_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          weekly_points?: number | null
        }
        Update: {
          assigned_establishment_id?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          last_name?: string | null
          late_cancellation_count?: number | null
          level?: number | null
          phone?: string | null
          points?: number | null
          public_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          weekly_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_assigned_establishment_id_fkey"
            columns: ["assigned_establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          company_id: string
          created_at: string | null
          currency: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          company_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          company_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_challenges: {
        Row: {
          challenge_key: string
          created_at: string | null
          description: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points_reward: number
          sort_order: number | null
          target_count: number
          updated_at: string | null
        }
        Insert: {
          challenge_key: string
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_reward: number
          sort_order?: number | null
          target_count?: number
          updated_at?: string | null
        }
        Update: {
          challenge_key?: string
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_reward?: number
          sort_order?: number | null
          target_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_employee_invitation: { Args: { p_token: string }; Returns: Json }
      accept_manager_invitation: {
        Args: {
          p_first_name?: string
          p_last_name?: string
          p_password: string
          p_token: string
        }
        Returns: Json
      }
      add_xp_to_user: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      auto_close_past_shifts: { Args: never; Returns: undefined }
      auto_complete_shifts: { Args: never; Returns: undefined }
      auto_validate_shifts: { Args: never; Returns: undefined }
      award_response_bonus: {
        Args: {
          p_employee_id: string
          p_response_time_seconds: number
          p_shift_id: string
        }
        Returns: Json
      }
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_reliability_score: {
        Args: { p_employee_id: string }
        Returns: number
      }
      calculate_weekly_earnings: {
        Args: { p_hourly_rate: number; p_user_id: string }
        Returns: number
      }
      can_access_establishment: {
        Args: { p_establishment_id: string; p_user_id: string }
        Returns: boolean
      }
      can_send_message: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      cancel_accepted_application: {
        Args: { p_application_id: string; p_is_freelancer: boolean }
        Returns: undefined
      }
      check_and_unlock_badges: { Args: { p_user_id: string }; Returns: Json }
      check_user_has_application: {
        Args: { p_shift_id: string; p_user_id: string }
        Returns: boolean
      }
      claim_challenge_reward: {
        Args: {
          p_challenge_id: string
          p_user_id: string
          p_week_start: string
        }
        Returns: Json
      }
      cleanup_expired_password_reset_otps: { Args: never; Returns: undefined }
      cleanup_expired_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      close_expired_shifts: { Args: never; Returns: undefined }
      complete_employer_signup: {
        Args: { p_company_name: string; p_user_id: string }
        Returns: Json
      }
      complete_employer_signup_with_establishment:
        | {
            Args: {
              p_company_name: string
              p_establishment_name: string
              p_first_name: string
              p_last_name: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_company_name: string
              p_establishment_category_id?: string
              p_establishment_name: string
              p_first_name: string
              p_last_name: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_company_name: string
              p_establishment_address?: string
              p_establishment_category_id?: string
              p_establishment_city?: string
              p_establishment_latitude?: number
              p_establishment_longitude?: number
              p_establishment_name: string
              p_establishment_postal_code?: string
              p_first_name: string
              p_last_name: string
              p_user_id: string
            }
            Returns: Json
          }
      deduct_from_wallet: {
        Args: { p_amount: number; p_company_id: string }
        Returns: boolean
      }
      deduct_points_from_user: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      delete_company: { Args: { company_id: string }; Returns: undefined }
      delete_company_safely: { Args: { p_company_id: string }; Returns: Json }
      expire_old_shifts: { Args: never; Returns: undefined }
      freelancer_has_application_on_shift: {
        Args: { p_shift_id: string; p_user_id: string }
        Returns: boolean
      }
      generate_invitation_token: { Args: never; Returns: string }
      generate_public_id: {
        Args: { prefix: string; target_table: string }
        Returns: string
      }
      get_challenges_overview: {
        Args: { p_leaderboard_limit?: number; p_user_id: string }
        Returns: Json
      }
      get_current_user_company_id: { Args: never; Returns: string }
      get_current_user_establishment_id: { Args: never; Returns: string }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_freelancer_usage_stats: {
        Args: { p_company_id: string; p_freelancer_id: string }
        Returns: Json
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          company_id: string
          company_name: string
          email: string
          expires_at: string
          id: string
          role: string
        }[]
      }
      get_quiz_question_counts: {
        Args: never
        Returns: {
          active: number
          job_position_id: string
          total: number
        }[]
      }
      get_subscription_limits: {
        Args: { plan: string }
        Returns: {
          max_employees_per_establishment: number
          max_establishments: number
          max_shifts_per_month: number
        }[]
      }
      get_unviewed_applications_count: {
        Args: { company_id_param: string }
        Returns: number
      }
      get_week_start_date: { Args: { input_date?: string }; Returns: string }
      increment_challenge_progress: {
        Args: {
          p_challenge_id: string
          p_increment?: number
          p_user_id: string
          p_week_start: string
        }
        Returns: undefined
      }
      increment_invitation_uses: {
        Args: { p_token: string }
        Returns: undefined
      }
      increment_user_points: {
        Args: { p_points: number; p_user_id: string }
        Returns: undefined
      }
      increment_user_stat: {
        Args: { p_increment?: number; p_stat_name: string; p_user_id: string }
        Returns: undefined
      }
      increment_wallet_balance: {
        Args: { p_amount: number; p_company_id: string }
        Returns: undefined
      }
      is_participant_of: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      next_invoice_reference: {
        Args: { p_type: Database["public"]["Enums"]["invoice_type"] }
        Returns: string
      }
      recalculate_all_reliability_scores: {
        Args: never
        Returns: {
          accepted: number
          completed: number
          employee_id: string
          employee_name: string
          new_score: number
          old_score: number
          proposed: number
          rejected: number
        }[]
      }
      reopen_shift: { Args: { p_shift_id: string }; Returns: undefined }
      reset_user_stat: {
        Args: { p_stat_name: string; p_user_id: string }
        Returns: undefined
      }
      set_shifts_pending_validation: { Args: never; Returns: undefined }
      signup_employer: {
        Args: { p_company_name: string; p_email: string; p_password: string }
        Returns: Json
      }
      unblock_account: {
        Args: { p_id: string; p_is_freelancer: boolean }
        Returns: undefined
      }
      unlock_badge_for_user: {
        Args: { p_badge_id: string; p_user_id: string }
        Returns: undefined
      }
      users_search_vector: {
        Args: { p_email: string; p_first_name: string; p_last_name: string }
        Returns: unknown
      }
      validate_invitation_token: {
        Args: {
          p_employee_id: string
          p_ip_address?: unknown
          p_token: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_invitation_token_readonly: {
        Args: { p_token: string }
        Returns: Json
      }
      validate_shift_with_wallet: {
        Args: {
          p_amount: number
          p_company_id: string
          p_description: string
          p_shift_id: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      application_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "applied"
        | "withdrawn"
      employee_status: "not_invited" | "active" | "inactive"
      establishment_status: "active" | "standby"
      invoice_status: "draft" | "issued" | "void"
      invoice_type: "freelancer_to_company" | "platform_commission"
      language_code: "fr" | "en" | "es" | "it" | "zh"
      shift_status:
        | "pending"
        | "partially_filled"
        | "filled"
        | "completed"
        | "canceled"
        | "closed"
        | "expired"
        | "pending_validation"
        | "pending_approval"
        | "disputed"
        | "validated"
      subscription_plan: "free" | "starter" | "pro" | "enterprise"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      transaction_status: "pending" | "succeeded" | "failed" | "canceled"
      transaction_type: "top_up" | "payment" | "payout" | "fee" | "refund"
      user_role: "admin" | "manager" | "employee" | "freelance"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "pending",
        "accepted",
        "rejected",
        "applied",
        "withdrawn",
      ],
      employee_status: ["not_invited", "active", "inactive"],
      establishment_status: ["active", "standby"],
      invoice_status: ["draft", "issued", "void"],
      invoice_type: ["freelancer_to_company", "platform_commission"],
      language_code: ["fr", "en", "es", "it", "zh"],
      shift_status: [
        "pending",
        "partially_filled",
        "filled",
        "completed",
        "canceled",
        "closed",
        "expired",
        "pending_validation",
        "pending_approval",
        "disputed",
        "validated",
      ],
      subscription_plan: ["free", "starter", "pro", "enterprise"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
      ],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      transaction_status: ["pending", "succeeded", "failed", "canceled"],
      transaction_type: ["top_up", "payment", "payout", "fee", "refund"],
      user_role: ["admin", "manager", "employee", "freelance"],
    },
  },
} as const
