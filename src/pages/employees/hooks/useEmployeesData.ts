import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { calculateUsage } from '@shared/subscription-limits';
import { logger } from '@/utils/logger';
import { handleSupabaseError } from '@/lib/error-handler';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import type { Employee, Invitation, SortOption, SortedMember } from '../types';

export function useEmployeesData(sortBy: SortOption) {
  const { company } = useAuthStore();
  const { selectedEstablishmentId } = useEstablishmentStore();
  const queryClient = useQueryClient();

  const { shiftReadinessScore, activeEmployeesCount } = useOnboardingProgress();

  // Plan usage
  const { data: usage } = useQuery({
    queryKey: ['plan-usage', company?.id, selectedEstablishmentId],
    queryFn: async () => {
      if (!company?.id) return null;

      const { count: establishmentsCount } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'active');

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      let shiftsQuery = supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .gte('created_at', monthStart);

      if (selectedEstablishmentId && selectedEstablishmentId !== 'null') {
        shiftsQuery = shiftsQuery.eq('establishment_id', selectedEstablishmentId);
      }
      const { count: shiftsCount } = await shiftsQuery;

      let employeesQuery = supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      if (selectedEstablishmentId && selectedEstablishmentId !== 'null') {
        employeesQuery = employeesQuery.eq('establishment_id', selectedEstablishmentId);
      }
      const { count: employeesCount } = await employeesQuery;

      return calculateUsage(
        establishmentsCount || 0,
        shiftsCount || 0,
        employeesCount || 0,
        company.subscription_plan || 'free'
      );
    },
    enabled: !!company?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!company?.id) return;

    logger.log('Subscribing to employees realtime updates for company:', company.id);

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['employees', company.id] });
      queryClient.invalidateQueries({ queryKey: ['team-invitations', company.id] });
    };

    // Single consolidated channel instead of 2 separate channels
    const channel = supabase
      .channel(`employees_page_${company.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees', filter: `company_id=eq.${company.id}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invitations', filter: `company_id=eq.${company.id}` }, invalidate)
      .subscribe();

    return () => {
      logger.log('Unsubscribing from employees realtime');
      supabase.removeChannel(channel);
    };
  }, [company?.id, queryClient]);

  // Establishments
  const { data: establishments = [] } = useQuery({
    queryKey: ['establishments', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name');
      if (error) {
        const message = handleSupabaseError(error, { context: 'EmployeesPage', operation: 'query' });
        throw new Error(message);
      }
      return data;
    },
    enabled: !!company?.id,
  });

  // Employees
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      // ✅ avatar_url مضاف — لعرض صورة الموظف الحقيقية فـ الجدول والبطاقات
      const { data, error } = await supabase
        .from('employees')
        .select('*, public_id, user:users(first_name, last_name, email, avatar_url), establishment:establishments(id, name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) {
        const message = handleSupabaseError(error, { context: 'EmployeesPage', operation: 'query' });
        throw new Error(message);
      }
      return data as Employee[];
    },
    enabled: !!company?.id,
  });

  // Invitations
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
    queryKey: ['team-invitations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*, establishment:establishments(id, name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) {
        const message = handleSupabaseError(error, { context: 'EmployeesPage', operation: 'query' });
        throw new Error(message);
      }
      return data as Invitation[];
    },
    enabled: !!company?.id,
  });

  // Filtered lists
  const filteredEmployees = useMemo(() =>
    selectedEstablishmentId
      ? employees.filter((e) => e.establishment_id === selectedEstablishmentId)
      : employees,
    [employees, selectedEstablishmentId]);

  const filteredInvitations = useMemo(() =>
    selectedEstablishmentId
      ? invitations.filter((inv) => inv.establishment_id === selectedEstablishmentId)
      : invitations,
    [invitations, selectedEstablishmentId]);

  const notInvitedEmployees = useMemo(() => {
    const pendingInvitationEmails = new Set(
      filteredInvitations.filter(inv => !inv.accepted_at).map(inv => inv.email.toLowerCase())
    );
    return filteredEmployees.filter((e) =>
      e.status === 'not_invited' && !pendingInvitationEmails.has(e.user.email.toLowerCase())
    );
  }, [filteredEmployees, filteredInvitations]);

  const activeEmployees = useMemo(() =>
    filteredEmployees.filter((e) => e.status === 'active'),
    [filteredEmployees]);

  const inactiveEmployees = useMemo(() =>
    filteredEmployees.filter((e) => e.status === 'inactive'),
    [filteredEmployees]);

  const pendingInvitations = useMemo(() =>
    filteredInvitations.filter((inv) => !inv.accepted_at),
    [filteredInvitations]);

  // Sorted members
  const sortedMembers = useMemo((): SortedMember[] => {
    const allMembers: SortedMember[] = [
      ...activeEmployees.map((e) => ({
        type: 'employee' as const, id: e.id,
        name: `${e.user.first_name} ${e.user.last_name}`,
        email: e.user.email, date: e.created_at || '',
        status: 'active' as const, data: e,
      })),
      ...pendingInvitations.map((inv) => ({
        type: 'invitation' as const, id: inv.id,
        name: inv.first_name && inv.last_name ? `${inv.first_name} ${inv.last_name}` : inv.email,
        email: inv.email, date: inv.created_at || '',
        status: 'invited' as const, data: inv,
      })),
      ...notInvitedEmployees.map((e) => ({
        type: 'employee' as const, id: e.id,
        name: `${e.user.first_name} ${e.user.last_name}`,
        email: e.user.email, date: e.created_at || '',
        status: 'not_invited' as const, data: e,
      })),
      ...inactiveEmployees.map((e) => ({
        type: 'employee' as const, id: e.id,
        name: `${e.user.first_name} ${e.user.last_name}`,
        email: e.user.email, date: e.created_at || '',
        status: 'inactive' as const, data: e,
      })),
    ];

    switch (sortBy) {
      case 'status':
        return allMembers.sort((a, b) => {
          const order = { active: 0, invited: 1, not_invited: 2, inactive: 3 };
          return order[a.status] - order[b.status];
        });
      case 'name-asc':
        return allMembers.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return allMembers.sort((a, b) => b.name.localeCompare(a.name));
      case 'date-desc':
        return allMembers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'date-asc':
        return allMembers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      default:
        return allMembers;
    }
  }, [activeEmployees, notInvitedEmployees, inactiveEmployees, pendingInvitations, sortBy]);

  const totalActiveCount = activeEmployees.length;
  const totalCount = filteredEmployees.length + pendingInvitations.length;
  const isLoading = loadingEmployees || loadingInvitations;

  return {
    usage,
    establishments,
    filteredEmployees,
    activeEmployees,
    notInvitedEmployees,
    pendingInvitations,
    sortedMembers,
    totalActiveCount,
    totalCount,
    isLoading,
    shiftReadinessScore,
    activeEmployeesCount,
  };
}