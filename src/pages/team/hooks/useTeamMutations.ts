import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { handleSupabaseError } from '@/lib/error-handler'
import { logger } from '@/utils/logger'
import { toast } from 'sonner'
import type { Establishment } from '../types'

interface UseSendInvitationOptions {
  email: string
  selectedEstablishment: string
  selectedRole: string
  establishments: Establishment[]
  onSuccess: () => void,
  names: {
      first_name: string,
      last_name: string,
  }
}

export function useSendInvitation({
  email,
  selectedEstablishment,
  selectedRole,
  establishments,
  onSuccess,
  names
}: UseSendInvitationOptions) {
  const { t } = useTranslation()
  const { user, company } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!company || !user) throw new Error('Company or user not found')

      if (!email.trim()) {
        throw new Error(t('team.errors.emailRequired'))
      }

      // Only allow manager role for now (admin is created on signup only)
      if (selectedRole !== 'manager') {
        throw new Error(t('team.errors.onlyManagerRole'))
      }

      // Manager MUST have an assigned establishment
      if (selectedEstablishment === 'all' || !selectedEstablishment) {
        throw new Error(t('team.errors.establishmentRequired'))
      }

      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          company_id: company.id, 
          created_by: user.id,
          email: email.toLowerCase().trim(),
          role: 'manager',
          establishment_id: selectedEstablishment,
          first_name: names.first_name,
          last_name: names.last_name,
        })
        .select()
        .single()

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'TeamPage',
          operation: 'query'
        });
        throw new Error(message);
      }
      return data
    },
    onSuccess: async (invitation) => {
      if (!company || !user) return

      // Send email via Edge Function
      const establishment = establishments.find(e => e.id === selectedEstablishment)

      try {
        const { data: { session } } = await supabase.auth.getSession()

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-team-invitation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              email: invitation.email,
              invitationToken: invitation.token,
              companyName: company.name,
              inviterName: user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.email,
              establishmentName: establishment?.name,
              role: 'manager',
            }),
          }
        )

        if (!response.ok) {
          throw new Error(t('team.errors.emailSendError'))
        }

        toast.success(t('team.success.invitationSent'), {
          description: t('team.success.invitationSentDescription', { email }),
        })
      } catch (error) {
        logger.error('Error sending invitation email:', error)
        // Show success anyway with link
        toast.warning(t('team.success.invitationCreated'), {
          description: `${t('team.link')}: ${window.location.origin}/invite/${invitation.token}`,
        })
      }

      onSuccess()
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] })
    },
    onError: (error: unknown) => {
      toast.error(t('team.errors.sendError'), {
        description: error instanceof Error ? error.message : t('common.error'),
      })
    },
  })
}

export function useCancelInvitation() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'TeamPage',
          operation: 'query'
        });
        throw new Error(message);
      }
    },
    onSuccess: () => {
      toast.success(t('team.success.invitationCancelled'))
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] })
    },
    onError: (error: unknown) => {
      toast.error(t('team.errors.error'), { description: error instanceof Error ? error.message : t('common.error') })
    },
  })
}

export function useRemoveMember() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memberId: string) => {
      // Delete the user (will cascade to employees table if exists)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', memberId)

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'TeamPage',
          operation: 'query'
        });
        throw new Error(message);
      }
    },
    onSuccess: () => {
      toast.success(t('team.success.managerRemoved'))
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
    onError: (error: unknown) => {
      toast.error(t('team.errors.error'), { description: error instanceof Error ? error.message : t('common.error') })
    },
  })
}
