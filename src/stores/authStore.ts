import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Company } from '@shared/types'
import { logger } from '@/utils/logger'
import i18n from '@/i18n/config'

interface SignupData {
  firstName: string
  lastName: string
  establishmentName: string
  establishmentPhone?: string
  establishmentCategoryId?: string
  // Address fields
  establishmentAddress?: string
  establishmentCity?: string
  establishmentPostalCode?: string
  establishmentLatitude?: number
  establishmentLongitude?: number
}

interface AuthState {
  user: User | null
  company: Company | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setCompany: (company: Company | null) => void
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, companyName: string, data?: SignupData) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  refreshCompany: () => Promise<void>
}

// Promise partagée pour dédupliquer les appels concurrents (ex. React Strict Mode)
let sessionPromise: Promise<void> | null = null

// Colonnes du profil utilisateur réutilisées partout (inclut is_deleting/delete_day
// pour que la bannière de suppression programmée survive à un refresh)
const USER_PROFILE_COLUMNS = 'id, company_id, assigned_establishment_id, role, email, first_name, last_name, phone, level, points, weekly_points, created_at, updated_at, is_deleting, delete_day'

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  company: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setCompany: (company) => set({ company }),

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error('No user returned')

    // Vérifier que l'email est confirmé
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut()
      throw new Error(i18n.t('errors.confirmEmailBeforeLogin'))
    }

    // ✅ Fetch user profile - colonnes spécifiques seulement
    let { data: profile, error: profileError } = await supabase
      .from('users')
      .select(USER_PROFILE_COLUMNS)
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) throw profileError

    // Si le profil n'existe pas OU pas de company (signup incomplet), vérifier et compléter
    if (!profile || !profile.company_id) {
      const companyName = data.user.user_metadata?.company_name
      const firstName = data.user.user_metadata?.first_name
      const lastName = data.user.user_metadata?.last_name
      const establishmentName = data.user.user_metadata?.establishment_name

      if (companyName) {
        // Compléter le signup maintenant
        logger.log('📝 Completing signup during login...')

        const establishmentCategoryId = data.user.user_metadata?.establishment_category_id

        // Use enhanced function if we have establishment data
        const { data: signupData, error: signupError } = firstName && lastName && establishmentName
          ? await supabase.rpc('complete_employer_signup_with_establishment', {
            p_user_id: data.user.id,
            p_company_name: companyName,
            p_first_name: firstName,
            p_last_name: lastName,
            p_establishment_name: establishmentName,
            p_establishment_category_id: establishmentCategoryId || null,
            p_establishment_address: data.user.user_metadata?.establishment_address || null,
            p_establishment_city: data.user.user_metadata?.establishment_city || null,
            p_establishment_postal_code: data.user.user_metadata?.establishment_postal_code || null,
            p_establishment_latitude: data.user.user_metadata?.establishment_latitude || null,
            p_establishment_longitude: data.user.user_metadata?.establishment_longitude || null
          })
          : await supabase.rpc('complete_employer_signup', {
            p_user_id: data.user.id,
            p_company_name: companyName
          })

        if (signupError) {
          throw new Error(`Failed to complete signup: ${signupError.message}`)
        }

        // ✅ Récupérer le profil créé/mis à jour - colonnes spécifiques
        const { data: newProfile, error: profileFetchError } = await supabase
          .from('users')
          .select(USER_PROFILE_COLUMNS)
          .eq('id', data.user.id)
          .maybeSingle()

        if (profileFetchError) {
          throw new Error(`Failed to fetch profile: ${profileFetchError.message}`)
        }

        profile = newProfile
      }

      if (!profile) {
        throw new Error('User profile not found')
      }
    }

    // Vérifier que c'est bien un admin ou manager (pas employee)
    if (profile.role === 'employee') {
      await supabase.auth.signOut()
      throw new Error(i18n.t('errors.adminManagerOnly'))
    }

    // Vérifier que admin/manager ont bien une company
    if (!profile.company_id) {
      await supabase.auth.signOut()
      throw new Error(i18n.t('errors.incompleteProfileNoCompany'))
    }

    set({ user: profile, isLoading: false })

    // ✅ Fetch company - colonnes spécifiques
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, siret, logo_url, subscription_plan, subscription_status, subscription_interval, subscription_current_period_start, subscription_current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, trial_ends_at, default_language, onboarding_dismissed, created_at, updated_at, has_configured_rib, platform_fee_rate')
      .eq('id', profile.company_id)
      .maybeSingle()

    if (companyError || !company) {
      await supabase.auth.signOut()
      throw new Error(i18n.t('errors.companyNotFound'))
    }

    // Si c'est un manager, vérifier que son établissement n'est pas en stand-by
    if (profile.role === 'manager') {
      const { data: employee } = await supabase
        .from('employees')
        .select('establishment_id')
        .eq('user_id', profile.id)
        .maybeSingle()

      if (employee?.establishment_id) {
        const { data: establishment } = await supabase
          .from('establishments')
          .select('status, name')
          .eq('id', employee.establishment_id)
          .maybeSingle()

        if (establishment?.status === 'standby') {
          await supabase.auth.signOut()
          throw new Error(
            i18n.t('errors.establishmentStandby', { name: establishment.name })
          )
        }
      }
    }

    set({ company })
  },

  signup: async (email, password, companyName, data) => {
    try {
      // 1. Créer l'auth user avec confirmation email activée
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/fr/email-confirmed`,
          data: {
            company_name: companyName,
            first_name: data?.firstName,
            last_name: data?.lastName,
            establishment_name: data?.establishmentName,
            establishment_phone: data?.establishmentPhone,
            establishment_category_id: data?.establishmentCategoryId,
            // Address fields - stored in metadata to survive email confirmation flow
            establishment_address: data?.establishmentAddress,
            establishment_city: data?.establishmentCity,
            establishment_postal_code: data?.establishmentPostalCode,
            establishment_latitude: data?.establishmentLatitude,
            establishment_longitude: data?.establishmentLongitude
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // 2. Si l'email doit être confirmé, ne pas compléter le signup maintenant
      // La fonction complete_employer_signup_with_establishment sera appelée après confirmation via le hook onAuthStateChange
      // Note: authData.session sera null si confirmation requise
      if (!authData.session) {
        // Email de confirmation envoyé, l'utilisateur doit confirmer son email
        logger.log('📧 Email confirmation required')
        set({ isLoading: false })
        return
      }

      // 3. Si l'email est déjà confirmé (session créée), compléter le signup
      const { data: signupData, error: signupError } = data
        ? await supabase.rpc('complete_employer_signup_with_establishment', {
          p_user_id: authData.user.id,
          p_company_name: companyName,
          p_first_name: data.firstName,
          p_last_name: data.lastName,
          p_establishment_name: data.establishmentName,
          p_establishment_category_id: data.establishmentCategoryId || null,
          p_establishment_address: data.establishmentAddress || null,
          p_establishment_city: data.establishmentCity || null,
          p_establishment_postal_code: data.establishmentPostalCode || null,
          p_establishment_latitude: data.establishmentLatitude || null,
          p_establishment_longitude: data.establishmentLongitude || null,
        })
        : await supabase.rpc('complete_employer_signup', {
          p_user_id: authData.user.id,
          p_company_name: companyName
        })

      if (signupError) {
        throw new Error(`Failed to complete signup: ${signupError.message}`)
      }

      // Type guard pour signupData
      if (!signupData || typeof signupData !== 'object' || !('company_id' in signupData)) {
        throw new Error('No company_id returned from signup')
      }

      const companyId = (signupData as { company_id: string }).company_id

      // Update establishment phone if provided
      if (data?.establishmentPhone) {
        const { data: establishments } = await supabase
          .from('establishments')
          .select('id')
          .eq('company_id', companyId)
          .limit(1)
        if (establishments?.[0]) {
          await supabase
            .from('establishments')
            .update({ phone: data.establishmentPhone } as never)
            .eq('id', establishments[0].id)
        }
      }

      // ✅ 4. Récupérer le profil mis à jour - colonnes spécifiques
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(USER_PROFILE_COLUMNS)
        .eq('id', authData.user.id)
        .maybeSingle()

      if (userError || !user) {
        throw new Error('Failed to fetch user profile')
      }

      // Vérifier que l'utilisateur est bien admin
      if (user.role !== 'admin') {
        throw new Error('User should be admin after signup')
      }

      // ✅ 5. Récupérer la company - colonnes spécifiques
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, siret, logo_url, subscription_plan, subscription_status, subscription_interval, subscription_current_period_start, subscription_current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, trial_ends_at, default_language, onboarding_dismissed, created_at, updated_at, has_configured_rib, platform_fee_rate')
        .eq('id', companyId)
        .maybeSingle()

      set({ user, company, isLoading: false })
    } catch (error) {
      logger.error('Signup error:', error)
      throw error
    }
  },

  logout: async () => {
    logger.log('🚪 Logging out...')
    try {
      // Forcer la suppression de toutes les sessions (local + autres onglets)
      await supabase.auth.signOut({ scope: 'global' })
      logger.log('✅ Logout successful')
    } catch (error) {
      logger.error('❌ Logout error:', error)
    }
    set({ user: null, company: null, isLoading: false })
  },

  checkSession: () => {
    // Si une vérification est déjà en cours, retourner la même Promise
    // Cela évite les exécutions parallèles (ex. React Strict Mode double-mount)
    if (sessionPromise) return sessionPromise

    sessionPromise = (async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Session check timeout')), 8000)
          ),
        ])
        const { data: { session } } = sessionResult

        if (!session?.user) {
          set({ user: null, company: null, isLoading: false })
          return
        }

        // Ne rien faire sur les pages publiques (auth, reset password, etc.)
        const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/invite', '/email-confirmed']
        const pathname = window.location.pathname
        if (publicPaths.some(path => pathname.endsWith(path) || pathname.includes(path + '/'))) {
          set({ user: null, company: null, isLoading: false })
          return
        }

        // Vérifier que l'email est confirmé
        if (!session.user.email_confirmed_at) {
          await supabase.auth.signOut()
          set({ user: null, company: null, isLoading: false })
          return
        }

        // ✅ Récupérer le profil - colonnes spécifiques (inclut is_deleting/delete_day)
        const { data: profile } = await supabase
          .from('users')
          .select(USER_PROFILE_COLUMNS)
          .eq('id', session.user.id)
          .maybeSingle()

        // If no profile or no company, try to complete signup from metadata
        if (!profile || !profile.company_id) {
          const companyName = session.user.user_metadata?.company_name
          const firstName = session.user.user_metadata?.first_name
          const lastName = session.user.user_metadata?.last_name
          const establishmentName = session.user.user_metadata?.establishment_name

          if (companyName && firstName && lastName && establishmentName) {
            logger.log('📝 Completing signup during checkSession...')
            const { error: signupError } = await supabase.rpc('complete_employer_signup_with_establishment', {
              p_user_id: session.user.id,
              p_company_name: companyName,
              p_first_name: firstName,
              p_last_name: lastName,
              p_establishment_name: establishmentName,
              p_establishment_category_id: session.user.user_metadata?.establishment_category_id || null,
              p_establishment_address: session.user.user_metadata?.establishment_address || null,
              p_establishment_city: session.user.user_metadata?.establishment_city || null,
              p_establishment_postal_code: session.user.user_metadata?.establishment_postal_code || null,
              p_establishment_latitude: session.user.user_metadata?.establishment_latitude || null,
              p_establishment_longitude: session.user.user_metadata?.establishment_longitude || null,
            })

            if (!signupError) {
              // Re-fetch profile after completion
              const { data: newProfile } = await supabase
                .from('users')
                .select(USER_PROFILE_COLUMNS)
                .eq('id', session.user.id)
                .maybeSingle()

              if (newProfile && (newProfile.role === 'admin' || newProfile.role === 'manager')) {
                profile = newProfile
              } else {
                await supabase.auth.signOut()
                set({ user: null, company: null, isLoading: false })
                return
              }
            } else {
              logger.error('❌ Signup completion failed in checkSession:', signupError)
              await supabase.auth.signOut()
              set({ user: null, company: null, isLoading: false })
              return
            }
          } else if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
            await supabase.auth.signOut()
            set({ user: null, company: null, isLoading: false })
            return
          }
        } else if (profile.role !== 'admin' && profile.role !== 'manager') {
          await supabase.auth.signOut()
          set({ user: null, company: null, isLoading: false })
          return
        }

        set({ user: profile, isLoading: false })

        // ✅ Récupérer la company - colonnes spécifiques
        if (profile.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('id, name, siret, logo_url, subscription_plan, subscription_status, subscription_interval, subscription_current_period_start, subscription_current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, trial_ends_at, default_language, onboarding_dismissed, created_at, updated_at, has_configured_rib, platform_fee_rate, sepa_status')
            .eq('id', profile.company_id)
            .maybeSingle()

          if (company) {
            set({ company })
          }

          // Si c'est un manager, vérifier que son établissement n'est pas en stand-by
          if (profile.role === 'manager') {
            const { data: employee } = await supabase
              .from('employees')
              .select('establishment_id')
              .eq('user_id', profile.id)
              .maybeSingle()

            if (employee?.establishment_id) {
              const { data: establishment } = await supabase
                .from('establishments')
                .select('status, name')
                .eq('id', employee.establishment_id)
                .maybeSingle()

              if (establishment?.status === 'standby') {
                await supabase.auth.signOut()
                set({ user: null, company: null, isLoading: false })
                return
              }
            }
          }
        }
      } catch (error) {
        logger.error('Session check failed:', error)
        set({ user: null, company: null, isLoading: false })
      } finally {
        sessionPromise = null
      }
    })()

    return sessionPromise
  },

  refreshCompany: async () => {
    const state = useAuthStore.getState()
    if (!state.user?.company_id) return

    try {
      // ✅ Refresh company - colonnes spécifiques
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, siret, logo_url, subscription_plan, subscription_status, subscription_interval, subscription_current_period_start, subscription_current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, trial_ends_at, default_language, onboarding_dismissed, created_at, updated_at, has_configured_rib, platform_fee_rate, sepa_status')
        .eq('id', state.user.company_id)
        .single()

      if (company) {
        set({ company })
      }
    } catch (error) {
      logger.error('Failed to refresh company:', error)
    }
  },
}))

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  logger.log('🔔 Auth state change:', event)

  // Handle password recovery flow
  if (event === 'PASSWORD_RECOVERY') {
    logger.log('🔐 Password recovery event detected')
    // Don't set user/company - ResetPasswordPage will handle the flow
    // Just let Supabase establish the temporary session
    return
  }

  if (event === 'SIGNED_OUT') {
    logger.log('👋 User signed out')
    // Wait for any in-flight checkSession to finish before clearing state
    // This prevents checkSession from overwriting the cleared state after SIGNED_OUT
    if (sessionPromise) {
      await sessionPromise.catch((err) => logger.warn('checkSession interrupted by sign-out:', err))
    }
    useAuthStore.setState({ user: null, company: null, isLoading: false })
    return
  }

  // Gérer uniquement les confirmations email après signup
  // Ne PAS gérer SIGNED_IN car ça entre en conflit avec checkSession()
  // PASSWORD_RECOVERY is handled above - ResetPasswordPage uses the temporary session
  if (event === 'USER_UPDATED' && session?.user?.email_confirmed_at) {
    const user = session.user
    logger.log('🔔 USER_UPDATED event detected, checking profile...')

    // Vérifier si c'est un nouveau user qui vient de confirmer son email
    const { data: profile } = await supabase
      .from('users')
      .select('id, role, company_id')
      .eq('id', user.id)
      .maybeSingle()

    logger.log('🔔 Profile check:', profile)

    // Si profil existe déjà avec un role et company_id, ne rien faire
    // (c'est probablement un password reset ou autre update, pas une confirmation de signup)
    if (profile && profile.role !== 'employee' && profile.company_id) {
      logger.log('🔔 Profile is complete, ignoring USER_UPDATED event (password reset or similar)')
      return
    }

    // Si profil n'existe pas OU profil incomplet, compléter le signup
    if (!profile || (profile.role === 'employee' && !profile.company_id)) {
      const companyName = user.user_metadata?.company_name
      const firstName = user.user_metadata?.first_name
      const lastName = user.user_metadata?.last_name
      const establishmentName = user.user_metadata?.establishment_name
      const establishmentCategoryId = user.user_metadata?.establishment_category_id

      if (companyName) {
        logger.log('📝 Completing employer signup after email confirmation...')

        // Use enhanced function if we have establishment data
        const { error: signupError } = firstName && lastName && establishmentName
          ? await supabase.rpc('complete_employer_signup_with_establishment', {
            p_user_id: user.id,
            p_company_name: companyName,
            p_first_name: firstName,
            p_last_name: lastName,
            p_establishment_name: establishmentName,
            p_establishment_category_id: establishmentCategoryId || null,
            p_establishment_address: user.user_metadata?.establishment_address || null,
            p_establishment_city: user.user_metadata?.establishment_city || null,
            p_establishment_postal_code: user.user_metadata?.establishment_postal_code || null,
            p_establishment_latitude: user.user_metadata?.establishment_latitude || null,
            p_establishment_longitude: user.user_metadata?.establishment_longitude || null
          })
          : await supabase.rpc('complete_employer_signup', {
            p_user_id: user.id,
            p_company_name: companyName
          })

        if (!signupError) {
          logger.log('✅ Signup completed, please login')
          // Forcer la déconnexion pour que l'user se reconnecte avec son profil complet
          await supabase.auth.signOut()
        } else {
          logger.error('❌ Signup completion failed:', signupError)
        }
      }
    }
  }
})