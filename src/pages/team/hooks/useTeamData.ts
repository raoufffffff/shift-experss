import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/error-handler'
import { logger } from '@/utils/logger'
import type { Invitation, TeamMember, Establishment } from '../types'

export function useTeamData() {
  const { user, company } = useAuthStore()
  const queryClient = useQueryClient()

  // Realtime subscription pour auto-update team members et invitations
  useEffect(() => {
    if (!company?.id) return

    logger.log('🔴 Subscribing to team members realtime updates for company:', company.id)

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', company.id] })
      queryClient.invalidateQueries({ queryKey: ['team-invitations', company.id] })
    }

    // Single consolidated channel instead of 2 separate channels
    const channel = supabase
      .channel(`team_page_${company.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `company_id=eq.${company.id}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invitations', filter: `company_id=eq.${company.id}` }, invalidate)
      .subscribe()

    return () => {
      logger.log('🔴 Unsubscribing from team members realtime')
      supabase.removeChannel(channel)
    }
  }, [company?.id, queryClient])

  // Fetch team members (all users with role admin or manager in this company)
  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members', company?.id],
    queryFn: async () => {
      if (!company) throw new Error('Company not found')

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          assigned_establishment_id,
          created_at,
          establishment:establishments!assigned_establishment_id(id, name)
        `)
        .eq('company_id', company.id)
        .in('role', ['admin', 'manager'])
        .order('created_at', { ascending: false })

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'TeamPage',
          operation: 'query'
        });
        throw new Error(message);
      }
      return data as TeamMember[]
    },
    enabled: !!company?.id,
  })

  // Fetch invitations
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
    queryKey: ['team-invitations', company?.id],
    queryFn: async () => {
      if (!company) throw new Error('Company not found')

      // SELECT optimise : colonnes specifiques pour les invitations
      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          id,
          email,
          role,
          token,
          expires_at,
          accepted_at,
          created_at,
          establishment_id,
          establishment:establishments!establishment_id(name)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'TeamPage',
          operation: 'query'
        });
        throw new Error(message);
      }

      // Compute status from other fields
      const invitationsWithStatus = (data || []).map(inv => ({
        ...inv,
        status: inv.accepted_at
          ? 'accepted'
          : (inv.expires_at && new Date(inv.expires_at) < new Date() ? 'expired' : 'pending')
      }))

      return invitationsWithStatus as Invitation[]
    },
    enabled: !!company?.id,
    staleTime: 0, // Toujours considerer les donnees comme stale pour refetch apres invalidation
    refetchOnWindowFocus: true, // Refetch quand l'utilisateur revient sur l'onglet
  })

  // Fetch establishments
  const { data: establishments = [] } = useQuery({
    queryKey: ['establishments', company?.id],
    queryFn: async () => {
      if (!company) throw new Error('Company not found')

      // SELECT optimise : seulement les colonnes necessaires pour le dropdown
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('company_id', company.id)

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'TeamPage',
          operation: 'query'
        });
        throw new Error(message);
      }
      return data as Establishment[]
    },
    enabled: !!company?.id,
  })

  const pendingInvitations = invitations.filter(i => i.status === 'pending')

  return {
    user,
    company,
    teamMembers,
    loadingMembers,
    invitations,
    pendingInvitations,
    loadingInvitations,
    establishments,
  }
}
