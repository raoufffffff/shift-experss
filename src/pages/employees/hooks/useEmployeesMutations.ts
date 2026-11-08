import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { handleSupabaseError } from '@/lib/error-handler';
import { canAddEmployee, canAddEmployees } from '@shared/subscription-limits';
import type { Employee } from '../types';

interface UseEmployeesMutationsParams {
  filteredEmployees: Employee[];
  activeEmployees: Employee[];
  establishments: { id: string; name: string }[];
  setSelectedEmployeeIds: (ids: Set<string>) => void;
  setInviteConfirmDialogOpen: (open: boolean) => void;
  setEmployeeToInvite: (employee: Employee | null) => void;
}

export function useEmployeesMutations({
  filteredEmployees,
  activeEmployees,
  establishments,
  setSelectedEmployeeIds,
  setInviteConfirmDialogOpen,
  setEmployeeToInvite,
}: UseEmployeesMutationsParams) {
  const { t } = useTranslation();
  const { company, user } = useAuthStore();
  const queryClient = useQueryClient();

  const updateEmployeeEstablishmentMutation = useMutation({
    mutationFn: async ({ employeeId, establishmentId }: { employeeId: string; establishmentId: string }) => {
      const { error } = await supabase
        .from('employees')
        .update({ establishment_id: establishmentId })
        .eq('id', employeeId);
      if (error) {
        const message = handleSupabaseError(error, { context: 'EmployeesPage', operation: 'query' });
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(t('employees.updateEstablishmentSuccess'));
    },
    onError: () => { toast.error(t('employees.updateEstablishmentError')); },
  });

  const updateInvitationEstablishmentMutation = useMutation({
    mutationFn: async ({ invitationId, establishmentId }: { invitationId: string; establishmentId: string }) => {
      const { error } = await supabase
        .from('team_invitations')
        .update({ establishment_id: establishmentId })
        .eq('id', invitationId);
      if (error) {
        const message = handleSupabaseError(error, { context: 'EmployeesPage', operation: 'query' });
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast.success(t('employees.updateEstablishmentSuccess'));
    },
    onError: () => { toast.error(t('employees.updateEstablishmentError')); },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);
      if (error) {
        const message = handleSupabaseError(error, { context: 'EmployeesPage', operation: 'query' });
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast.success(t('employees.cancelSuccess'));
    },
    onError: () => { toast.error(t('employees.cancelError')); },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: { employee_id: employeeId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error('Failed to delete employee');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(t('employees.deleteSuccess'));
    },
    onError: (error) => {
      console.error('Delete employee error:', error);
      toast.error(t('employees.deleteError'));
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const employee = filteredEmployees.find(e => e.id === employeeId);
      if (!employee || !company?.id) throw new Error('Employee or company not found');

      const plan = company.subscription_plan || 'free';
      const limitCheck = canAddEmployee(activeEmployees.length, plan);
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.message || 'Employee limit reached');
      }

      const { data: invitation, error: invitationError } = await supabase
        .from('team_invitations')
        .insert({
          company_id: company.id,
          email: employee.user.email,
          first_name: employee.user.first_name,
          last_name: employee.user.last_name,
          establishment_id: employee.establishment_id,
          verified_hourly_rate: employee.verified_hourly_rate,
          role: 'employee',
        })
        .select()
        .single();

      if (invitationError) {
        const message = handleSupabaseError(invitationError, { context: 'EmployeesPage', operation: 'createInvitation' });
        throw new Error(message);
      }

      const establishment = establishments.find(e => e.id === employee.establishment_id);
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email: employee.user.email,
          invitationToken: invitation.token,
          companyName: company.name,
          inviterName: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Team',
          establishmentName: establishment?.name,
          role: 'employee',
        },
      });

      if (emailError) {
        console.warn('Email sending failed:', emailError);
        toast.warning(t('employees.invitationCreatedWarning'));
      }

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(t('employees.invitationSentSuccess'));
      setInviteConfirmDialogOpen(false);
      setEmployeeToInvite(null);
    },
    onError: () => {
      toast.error(t('employees.invitationSentError'));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      const promises = employeeIds.map(id =>
        supabase.functions.invoke('delete-employee', { body: { employee_id: id } })
      );
      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) throw new Error(`${failures.length} deletion(s) failed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(t('employees.deleteSuccess'));
      setSelectedEmployeeIds(new Set());
    },
    onError: () => { toast.error(t('employees.deleteError')); },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      if (!company?.id) throw new Error('No company ID');

      const employeesToInvite = filteredEmployees.filter(e => employeeIds.includes(e.id) && e.status === 'not_invited');
      const plan = company.subscription_plan || 'free';
      const limitCheck = canAddEmployees(activeEmployees.length, employeesToInvite.length, plan);
      if (!limitCheck.allowed) throw new Error(limitCheck.message || 'Employee limit reached');

      const promises = employeesToInvite.map(async (employee) => {
        const { data: invitation, error: invitationError } = await supabase
          .from('team_invitations')
          .insert({
            company_id: company.id,
            email: employee.user.email,
            first_name: employee.user.first_name,
            last_name: employee.user.last_name,
            establishment_id: employee.establishment_id,
            verified_hourly_rate: employee.verified_hourly_rate,
            role: 'employee',
          })
          .select()
          .single();

        if (invitationError) throw invitationError;

        const establishment = establishments.find(e => e.id === employee.establishment_id);
        const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
          body: {
            email: employee.user.email,
            invitationToken: invitation.token,
            companyName: company.name,
            inviterName: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Team',
            establishmentName: establishment?.name,
            role: 'employee',
          },
        });

        if (emailError) console.warn('Email sending failed for', employee.user.email, emailError);
        return invitation;
      });

      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) throw new Error(`${failures.length} invitation(s) failed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(t('employees.invitationSentSuccess'));
      setSelectedEmployeeIds(new Set());
    },
    onError: () => { toast.error(t('employees.invitationSentError')); },
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'inactive', active: false })
        .in('id', employeeIds);
      if (error) {
        const message = handleSupabaseError(error, { context: 'EmployeesPage', operation: 'update' });
        throw new Error(message);
      }
    },
    onSuccess: (_, employeeIds) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(t('employees.deactivateSuccess', { count: employeeIds.length }));
      setSelectedEmployeeIds(new Set());
    },
    onError: () => { toast.error(t('employees.deactivateError')); },
  });

  // Rate limiting
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const rateLimitKey = 'invite-rate-limit';
    const rateLimitData = localStorage.getItem(rateLimitKey);

    if (rateLimitData) {
      const { count, timestamp } = JSON.parse(rateLimitData);
      const oneMinute = 60 * 1000;

      if (now - timestamp < oneMinute) {
        if (count >= 5) {
          toast.error(t('employees.inviteRateLimitExceeded'));
          return false;
        }
        localStorage.setItem(rateLimitKey, JSON.stringify({ count: count + 1, timestamp }));
      } else {
        localStorage.setItem(rateLimitKey, JSON.stringify({ count: 1, timestamp: now }));
      }
    } else {
      localStorage.setItem(rateLimitKey, JSON.stringify({ count: 1, timestamp: now }));
    }

    return true;
  }, [t]);

  return {
    updateEmployeeEstablishmentMutation,
    updateInvitationEstablishmentMutation,
    deleteInvitationMutation,
    deleteEmployeeMutation,
    sendInvitationMutation,
    bulkDeleteMutation,
    bulkInviteMutation,
    bulkDeactivateMutation,
    checkRateLimit,
  };
}
