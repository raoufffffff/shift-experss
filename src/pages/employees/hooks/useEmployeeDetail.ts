import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { handleSupabaseError } from '@/lib/error-handler';
import { toast } from 'sonner';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';
import type { Employee, EmployeeStatus, ShiftApplication, Establishment, EmployeeDetailStats } from '../types';
import { useJobPositions, resolveJobPositionLabel } from './useJobPositions';

export function useEmployeeDetail(id: string | undefined) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Dialog state
  const [isEditingEstablishment, setIsEditingEstablishment] = useState(false);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>('');
  const [isEditingHourlyRate, setIsEditingHourlyRate] = useState(false);
  const [hourlyRateValue, setHourlyRateValue] = useState<string>('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<EmployeeStatus>('active');
  const [isEditingJobPositions, setIsEditingJobPositions] = useState(false);
  const [selectedJobPositionIds, setSelectedJobPositionIds] = useState<string[]>([]);

  // Catalogue des métiers (job_positions) — partagé via le cache react-query
  const { jobPositions } = useJobPositions();

  // Get locale based on current language
  const getDateFnsLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'es': return es;
      case 'it': return it;
      case 'zh': return zhCN;
      default: return enUS;
    }
  };
  const dateFnsLocale = getDateFnsLocale();

  // Fetch employee details
  // ✅ avatar_url ajouté — pour afficher la vraie photo de l'employé (au lieu de l'initiale)
  const { data: employee, isLoading: loadingEmployee, isError: employeeError, error: employeeFetchError } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) throw new Error('Employee ID is required');

      const { data, error } = await supabase
        .from('employees')
        .select('*, user:users(first_name, last_name, email, avatar_url), establishment:establishments(id, name)')
        .eq('id', id)
        .single();

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'EmployeeDetailPage',
          operation: 'fetchEmployee',
          metadata: { employeeId: id }
        });
        throw new Error(message);
      }
      return data as Employee;
    },
    enabled: !!id,
  });

  // Fetch establishments
  const { data: establishments = [] } = useQuery({
    queryKey: ['establishments', employee?.company_id],
    queryFn: async () => {
      if (!employee?.company_id) return [];

      const { data, error } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('company_id', employee.company_id)
        .order('name');

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'EmployeeDetailPage',
          operation: 'fetchEstablishments'
        });
        throw new Error(message);
      }
      return data as Establishment[];
    },
    enabled: !!employee?.company_id,
  });

  // Update employee establishment mutation
  const updateEmployeeEstablishmentMutation = useMutation({
    mutationFn: async (establishmentId: string) => {
      if (!id) throw new Error('Employee ID is required');

      const { error } = await supabase
        .from('employees')
        .update({ establishment_id: establishmentId || null })
        .eq('id', id);

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'EmployeeDetailPage',
          operation: 'updateEstablishment'
        });
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success(t('employees.updateEstablishmentSuccess'));
      setIsEditingEstablishment(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update hourly rate mutation
  const updateHourlyRateMutation = useMutation({
    mutationFn: async (rate: number | null) => {
      if (!id) throw new Error('Employee ID is required');

      const { error } = await supabase
        .from('employees')
        .update({ verified_hourly_rate: rate })
        .eq('id', id);

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'EmployeeDetailPage',
          operation: 'updateHourlyRate'
        });
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success(t('employees.hourlyRateUpdated'));
      setIsEditingHourlyRate(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: EmployeeStatus) => {
      if (!id) throw new Error('Employee ID is required');

      const { error } = await supabase
        .from('employees')
        .update({
          status: newStatus,
          active: newStatus === 'active'
        })
        .eq('id', id);

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'EmployeeDetailPage',
          operation: 'updateStatus'
        });
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success(t('employees.statusUpdated'));
      setIsEditingStatus(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update job positions (métiers) mutation
  // Le trigger SQL validate_employee_job_positions refuse les ids inconnus et
  // dédoublonne ; seul l'employeur (admin/manager) peut modifier ce champ.
  const updateJobPositionsMutation = useMutation({
    mutationFn: async (jobPositionIds: string[]) => {
      if (!id) throw new Error('Employee ID is required');

      const { error } = await supabase
        .from('employees')
        .update({ job_position_ids: jobPositionIds })
        .eq('id', id);

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'EmployeeDetailPage',
          operation: 'updateJobPositions'
        });
        throw new Error(message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(t('employees.jobPositionsUpdated', { defaultValue: 'Métiers mis à jour' }));
      setIsEditingJobPositions(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Fetch shift applications
  // ✅ الخلل الأصلي: العلاقة كانت مكتوبة positions(id, title) داخل الـ select
  // المتشعب لـ shifts. أول تصحيح (job_positions(id, title) مباشرة داخل الـ
  // select) رجّع خطأ Postgres: "column job_positions_2.title does not exist" —
  // معناه أن shifts وjob_positions مرتبطين بأكثر من مسار/FK محتمل، فـ PostgREST
  // يخلق alias تلقائي (job_positions_2) لا يطابق البنية الحقيقية، وحتى تحديد
  // الـ FK بالاسم صراحة (!shifts_job_position_id_fkey) يبقى تخمين بلا رؤية
  // للـ schema الحقيقي. الحل الأضمن: نتخلى كليًا عن الـ embed المتشعب لـ
  // job_positions، ونجيب position_name/job_position_id فقط هنا (بلا أي علاقة)،
  // ثم نجلب job_positions فـ query ثانية منفصلة بالـ IDs — نفس المنطق الدفاعي
  // المستعمل فـ useShiftDetail.ts لجلب employees بعد الـ query الرئيسي.
  const { data: shiftApplications = [], isLoading: loadingShifts, error: shiftsError } = useQuery({
    queryKey: ['employee-shifts', employee?.user_id],
    queryFn: async () => {
      if (!employee?.user_id) {
        logger.log('No user_id available for employee');
        return [];
      }

      logger.log('Fetching shift applications for user_id:', employee.user_id);

      const { data, error } = await supabase
        .from('shift_applications')
        .select(`
          id,
          status,
          applied_at,
          withdrawal_reason,
          shifts (
            id,
            start_time,
            end_time,
            status,
            position_name,
            job_position_id,
            created_at,
            establishments (id, name)
          )
        `)
        .eq('user_id', employee.user_id)
        .order('applied_at', { ascending: false });

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'EmployeeDetailPage',
          operation: 'fetchShiftApplications',
          metadata: { userId: employee.user_id }
        });
        logger.error('Error fetching shift applications:', error);
        throw new Error(message);
      }

      logger.log('Fetched shift applications:', data);

      const apps = (data || []) as any[];

      // ✅ جلب job_positions فـ query منفصلة بالـ IDs الفريدة، بلا أي join/relation
      // متشعب — هذا يتجنب كليًا مشكلة الـ FK الغامضة أعلاه.
      const jobPositionIds = Array.from(
        new Set(apps.map((app) => app.shifts?.job_position_id).filter(Boolean))
      );

      let jobPositionsMap = new Map<string, { id: string; title: string }>();
      if (jobPositionIds.length > 0) {
        const { data: jobPositionsData, error: jpError } = await supabase
          .from('job_positions')
          .select('id, slug, name_translations')
          .in('id', jobPositionIds);
        if (jpError) {
          logger.error('Error fetching job_positions:', jpError);
        } else {
          const lang = (i18n.language || 'fr').split('-')[0];
          jobPositionsMap = new Map(
            (jobPositionsData || []).map((jp) => [
              jp.id,
              {
                id: jp.id,
                title: resolveJobPositionLabel(jp.name_translations as Record<string, string> | null, jp.slug, lang),
              },
            ])
          );
        }
      }

      // ✅ normalisation: on rattache positions manuellement depuis la map,
      // pour que le reste du code qui lit déjà app.shifts.positions?.title continue à fonctionner
      // ✅ FIX (crash page employé): un employé peut avoir des candidatures sur des
      // shifts d'AUTRES entreprises. Le RLS masque ces shifts => `app.shifts === null`.
      // Les calculs de stats lisent app.shifts.status / created_at sans garde
      // => TypeError. On ne garde donc que les candidatures dont le shift est visible.
      return apps
        .filter((app) => app.shifts)
        .map((app) => ({
          ...app,
          shifts: {
            ...app.shifts,
            positions: app.shifts.job_position_id
              ? jobPositionsMap.get(app.shifts.job_position_id) || null
              : null,
          },
        })) as unknown as ShiftApplication[];
    },
    enabled: !!employee?.user_id,
  });

  const isLoading = loadingEmployee || loadingShifts;

  // Calculate statistics
  const stats: EmployeeDetailStats | null = employee ? (() => {
    const totalInvited = shiftApplications.length;
    const acceptedShifts = shiftApplications.filter((app) => app.status === 'accepted');
    const rejectedShifts = shiftApplications.filter((app) => app.status === 'rejected');
    const pendingShifts = shiftApplications.filter((app) => app.status === 'applied' || app.status === 'pending');
    // ✅ جديد — الانسحابات (retirées après acceptation), non comptées auparavant
    const withdrawnShifts = shiftApplications.filter((app) => app.status === 'withdrawn');

    const completedShifts = acceptedShifts.filter(
      (app) => app.shifts.status === 'completed'
    );
    const upcomingShifts = acceptedShifts.filter(
      (app) =>
        app.shifts.status === 'pending' ||
        app.shifts.status === 'filled' ||
        app.shifts.status === 'partially_filled' ||
        app.shifts.status === 'pending_validation'
    );

    // Calculate average response time (in minutes) - only for accepted and rejected
    const applicationsWithResponseTime = shiftApplications.filter(
      (app) => app.applied_at && (app.status === 'accepted' || app.status === 'rejected')
    );
    const averageResponseTime = applicationsWithResponseTime.length > 0
      ? applicationsWithResponseTime.reduce((sum, app) => {
        const shiftCreatedTime = new Date(app.shifts.created_at).getTime();
        const responseTime = new Date(app.applied_at!).getTime();
        const diffMinutes = (responseTime - shiftCreatedTime) / (1000 * 60);
        return sum + diffMinutes;
      }, 0) / applicationsWithResponseTime.length
      : 0;

    // Calculate reliability score
    const reliabilityScore = (() => {
      if (totalInvited === 0) return 100;

      const acceptanceRate = (acceptedShifts.length / totalInvited) * 100;
      const responseRate = ((acceptedShifts.length + rejectedShifts.length) / totalInvited) * 100;
      const speedBonus = averageResponseTime < 15 ? 10 : averageResponseTime < 60 ? 5 : 0;

      const score = (acceptanceRate * 0.5) + (responseRate * 0.3) + (speedBonus * 2);
      return Math.min(100, Math.round(score));
    })();

    return {
      totalInvited,
      acceptedShifts,
      rejectedShifts,
      pendingShifts,
      withdrawnShifts,
      completedShifts,
      upcomingShifts,
      averageResponseTime,
      reliabilityScore,
      // ✅ جديد — كل الطلبات (كل الحالات) لعرض تاريخ كامل مع رابط لكل شيفت
      allApplications: shiftApplications,
    };
  })() : null;

  // Open dialog helpers
  const openEstablishmentDialog = () => {
    if (employee) {
      setSelectedEstablishmentId(employee.establishment_id || '');
      setIsEditingEstablishment(true);
    }
  };

  const openHourlyRateDialog = () => {
    if (employee) {
      setHourlyRateValue(employee.verified_hourly_rate?.toString() || '');
      setIsEditingHourlyRate(true);
    }
  };

  const openStatusDialog = () => {
    if (employee) {
      setSelectedStatus(employee.status);
      setIsEditingStatus(true);
    }
  };

  const openJobPositionsDialog = () => {
    if (employee) {
      setSelectedJobPositionIds(employee.job_position_ids || []);
      setIsEditingJobPositions(true);
    }
  };

  return {
    // Data
    employee,
    jobPositions,
    establishments,
    shiftApplications,
    stats,
    isLoading,
    employeeError,
    employeeFetchError,
    shiftsError,
    dateFnsLocale,

    // Dialog state
    isEditingEstablishment,
    setIsEditingEstablishment,
    selectedEstablishmentId,
    setSelectedEstablishmentId,
    isEditingHourlyRate,
    setIsEditingHourlyRate,
    hourlyRateValue,
    setHourlyRateValue,
    isEditingStatus,
    setIsEditingStatus,
    selectedStatus,
    setSelectedStatus,
    isEditingJobPositions,
    setIsEditingJobPositions,
    selectedJobPositionIds,
    setSelectedJobPositionIds,

    // Dialog openers
    openEstablishmentDialog,
    openHourlyRateDialog,
    openStatusDialog,
    openJobPositionsDialog,

    // Mutations
    updateEmployeeEstablishmentMutation,
    updateHourlyRateMutation,
    updateStatusMutation,
    updateJobPositionsMutation,
  };
}