/**
 * Données réelles du Tableau de bord (Supabase) : candidatures à traiter,
 * tarifs négociés, heures à valider, équipe (salariés + auto-entrepreneurs
 * déjà passés chez vous). Les missions viennent de usePlanningMissions.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { fetchPendingFreelancerReviews } from '@/pages/reviews/hooks/fetchPendingFreelancerReviews';

export interface TeamMember {
  id: string; // users.id (salarié) ou freelancers.id
  kind: 'salarie' | 'freelance';
  name: string;
  sub: string;
  photo: string | null;
}

export interface NegotiatedRate { appId: string; shiftId: string; name: string; rate: number }

export function useDashboardExtras(from: string, to: string) {
  const company = useAuthStore((s) => s.company);
  const user = useAuthStore((s) => s.user);
  const { selectedEstablishmentId } = useEstablishmentStore();
  const estId = user?.role === 'manager' && user.assigned_establishment_id ? user.assigned_establishment_id : selectedEstablishmentId;

  const companyId = company?.id;

  /** Tarifs négociés en attente de réponse + TTC des auto-entrepreneurs de la semaine. */
  const finance = useQuery({
    queryKey: ['v2-dash-finance', companyId, estId, from, to],
    enabled: !!companyId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const lo = new Date(`${from}T00:00:00Z`); lo.setUTCDate(lo.getUTCDate() - 1);
      const hi = new Date(`${to}T00:00:00Z`); hi.setUTCDate(hi.getUTCDate() + 2);

      let nq = supabase
        .from('shift_freelancer_applications')
        .select('id, shift_id, freelance_hourly_rate, freelancer:freelancers(first_name, last_name), shift:shifts!inner(company_id, establishment_id, start_time, status)')
        .eq('status', 'applied').eq('negotiated', true).eq('shift.company_id', companyId!)
        .gte('shift.start_time', new Date().toISOString());
      if (estId) nq = nq.eq('shift.establishment_id', estId);
      const { data: neg } = await nq;

      let wq = supabase
        .from('shift_freelancer_applications')
        .select('total_charged_to_client, shift:shifts!inner(company_id, establishment_id, start_time, status)')
        .eq('status', 'accepted').eq('shift.company_id', companyId!)
        .gte('shift.start_time', lo.toISOString()).lt('shift.start_time', hi.toISOString());
      if (estId) wq = wq.eq('shift.establishment_id', estId);
      const { data: week } = await wq;

      const negotiated: NegotiatedRate[] = (neg ?? []).map((a: any) => ({
        appId: a.id, shiftId: a.shift_id, rate: Number(a.freelance_hourly_rate),
        name: [a.freelancer?.first_name, a.freelancer?.last_name].filter(Boolean).join(' ') || 'Auto-entrepreneur',
      }));
      const freelanceTTC = (week ?? [])
        .filter((a: any) => a.shift?.status !== 'canceled')
        .reduce((s: number, a: any) => s + Number(a.total_charged_to_client ?? 0), 0);
      return { negotiated, freelanceTTC };
    },
  });

  /** Shifts passés dont les heures attendent une validation. */
  const toValidate = useQuery({
    queryKey: ['v2-dash-to-validate', companyId, estId],
    enabled: !!companyId,
    refetchInterval: 30_000,
    queryFn: async () => {
      let q = supabase.from('shifts').select('id, position_name, start_time').eq('company_id', companyId!).eq('status', 'pending_validation').order('start_time');
      if (estId) q = q.eq('establishment_id', estId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id: string; position_name: string | null; start_time: string }[];
    },
  });

  const reviews = useQuery({
    queryKey: ['v2-dash-pending-reviews', companyId, estId],
    enabled: !!companyId,
    queryFn: async () => (await fetchPendingFreelancerReviews({ companyId: companyId!, establishmentId: estId })) as any[],
  });

  /** Équipe : salariés actifs + auto-entrepreneurs ayant déjà été acceptés chez vous. */
  const team = useQuery({
    queryKey: ['v2-dash-team', companyId, estId],
    enabled: !!companyId,
    queryFn: async (): Promise<TeamMember[]> => {
      let eq = supabase
        .from('employees')
        .select('user_id, hourly_rate, establishment_id, user:users(first_name, last_name, email, avatar_url)')
        .eq('company_id', companyId!).eq('active', true);
      if (estId) eq = eq.or(`establishment_id.eq.${estId},establishment_id.is.null`);
      const { data: emps } = await eq;

      let fq = supabase
        .from('shift_freelancer_applications')
        .select('freelancer_id, freelancer:freelancers(id, first_name, last_name, city, profile_photo_url), shift:shifts!inner(company_id, establishment_id)')
        .eq('status', 'accepted').eq('shift.company_id', companyId!)
        .order('applied_at', { ascending: false }).limit(500);
      if (estId) fq = fq.eq('shift.establishment_id', estId);
      const { data: frees } = await fq;

      const out: TeamMember[] = [];
      for (const e of (emps ?? []) as any[]) {
        const u = e.user;
        out.push({
          id: e.user_id, kind: 'salarie',
          name: [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || 'Salarié',
          sub: e.hourly_rate != null ? `${e.hourly_rate} €/h` : (u?.email ?? ''),
          photo: u?.avatar_url ?? null,
        });
      }
      const seen = new Set<string>();
      for (const a of (frees ?? []) as any[]) {
        const f = a.freelancer;
        if (!f || seen.has(f.id)) continue;
        seen.add(f.id);
        out.push({
          id: f.id, kind: 'freelance',
          name: [f.first_name, f.last_name].filter(Boolean).join(' ') || 'Auto-entrepreneur',
          sub: f.city ?? '', photo: f.profile_photo_url ?? null,
        });
      }
      return out.sort((x, y) => x.name.localeCompare(y.name, 'fr'));
    },
  });

  return { finance, toValidate, reviews, team };
}
