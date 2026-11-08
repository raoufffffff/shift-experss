/**
 * Données réelles du Planning : lit `shifts` (+ candidatures, établissement) dans
 * Supabase et les convertit en « missions » pour le calendrier. Les horaires sont
 * ramenés dans le fuseau de l'établissement (défaut Europe/Paris).
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';

export type PersonKind = 'salarie' | 'freelance';

export interface PlacedPerson {
  id: string;
  name: string;
  photo: string | null;
  kind: PersonKind;
}

export interface PlanningMission {
  id: string;
  /** jour local (établissement) AAAA-MM-JJ */
  date: string;
  /** heures locales HH:mm */
  start: string;
  end: string;
  poste: string;
  establishmentId: string;
  establishment: string;
  required: number;
  placed: PlacedPerson[];
  /** candidatures en attente (salariés + auto-entrepreneurs) */
  pending: number;
  status: string;
  cancelled: boolean;
  /** terminé / clôturé / expiré : lecture seule */
  past: boolean;
  eventId: string | null;
  published: boolean;
  targetsEmployees: boolean;
}

export interface PlanningEstablishment {
  id: string;
  name: string;
  timezone: string;
}

const DEFAULT_TZ = 'Europe/Paris';

function localParts(iso: string, tz: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour')}:${g('minute')}` };
}

export function usePlanningEstablishments() {
  const company = useAuthStore((s) => s.company);
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['v2-planning-establishments', company?.id, user?.role, user?.assigned_establishment_id],
    enabled: !!company?.id,
    queryFn: async (): Promise<PlanningEstablishment[]> => {
      let q = supabase.from('establishments').select('id, name, timezone').eq('company_id', company!.id).eq('status', 'active');
      if (user?.role === 'manager' && user.assigned_establishment_id) q = q.eq('id', user.assigned_establishment_id);
      const { data, error } = await q.order('name');
      if (error) throw error;
      return (data ?? []).map((e: any) => ({ id: e.id, name: e.name, timezone: e.timezone || DEFAULT_TZ }));
    },
  });
}

/** Missions dont le jour local tombe entre `from` et `to` (inclus, AAAA-MM-JJ). */
export function usePlanningMissions(from: string, to: string) {
  const company = useAuthStore((s) => s.company);
  const user = useAuthStore((s) => s.user);
  const { selectedEstablishmentId } = useEstablishmentStore();
  const queryClient = useQueryClient();
  const { data: establishments = [] } = usePlanningEstablishments();

  useEffect(() => {
    if (!company?.id) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['v2-planning-missions'] });
    const channel = supabase
      .channel('v2-planning-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `company_id=eq.${company.id}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_applications' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_freelancer_applications' }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, queryClient]);

  const tzOf = new Map(establishments.map((e) => [e.id, e.timezone]));

  return useQuery({
    queryKey: ['v2-planning-missions', company?.id, user?.role, user?.assigned_establishment_id, selectedEstablishmentId, from, to, establishments.length],
    enabled: !!company?.id,
    queryFn: async (): Promise<PlanningMission[]> => {
      // Marge d'un jour de chaque côté : le filtre exact se fait sur le jour local.
      const lo = new Date(`${from}T00:00:00Z`);
      lo.setUTCDate(lo.getUTCDate() - 1);
      const hi = new Date(`${to}T00:00:00Z`);
      hi.setUTCDate(hi.getUTCDate() + 2);

      let q = supabase
        .from('shifts')
        .select(
          `id, establishment_id, start_time, end_time, position_name, required_employees, status, event_id,
           published_to_freelancers, targets_employees,
           establishment:establishments(id, name, timezone),
           shift_applications(id, status, user:users!shift_applications_user_id_fkey(id, first_name, last_name, email, avatar_url)),
           shift_freelancer_applications(id, status, freelancer:freelancers!freelancer_id(id, first_name, last_name, profile_photo_url))`,
        )
        .eq('company_id', company!.id)
        .gte('start_time', lo.toISOString())
        .lt('start_time', hi.toISOString())
        .order('start_time');

      if (user?.role === 'manager' && user.assigned_establishment_id) q = q.eq('establishment_id', user.assigned_establishment_id);
      else if (selectedEstablishmentId) q = q.eq('establishment_id', selectedEstablishmentId);

      const { data, error } = await q;
      if (error) throw error;

      const now = Date.now();
      const out: PlanningMission[] = [];
      for (const s of (data ?? []) as any[]) {
        const tz = s.establishment?.timezone || tzOf.get(s.establishment_id) || DEFAULT_TZ;
        const a = localParts(s.start_time, tz);
        if (a.date < from || a.date > to) continue;
        const b = localParts(s.end_time, tz);

        const placed: PlacedPerson[] = [];
        let pending = 0;
        for (const app of s.shift_applications ?? []) {
          if (app.status === 'accepted' && app.user) {
            const name = [app.user.first_name, app.user.last_name].filter(Boolean).join(' ') || app.user.email;
            placed.push({ id: `e-${app.id}`, name, photo: app.user.avatar_url ?? null, kind: 'salarie' });
          } else if (app.status === 'applied') pending++;
        }
        for (const app of s.shift_freelancer_applications ?? []) {
          if (app.status === 'accepted' && app.freelancer) {
            const name = [app.freelancer.first_name, app.freelancer.last_name].filter(Boolean).join(' ');
            placed.push({ id: `f-${app.id}`, name, photo: app.freelancer.profile_photo_url ?? null, kind: 'freelance' });
          } else if (app.status === 'applied') pending++;
        }

        out.push({
          id: s.id,
          date: a.date,
          start: a.time,
          end: b.time,
          poste: s.position_name || 'Shift',
          establishmentId: s.establishment_id,
          establishment: s.establishment?.name ?? '',
          required: s.required_employees || 1,
          placed,
          pending,
          status: s.status,
          cancelled: s.status === 'canceled',
          past: ['completed', 'closed', 'expired', 'pending_validation'].includes(s.status) || new Date(s.end_time).getTime() < now,
          eventId: s.event_id ?? null,
          published: !!s.published_to_freelancers,
          targetsEmployees: !!s.targets_employees,
        });
      }
      return out;
    },
  });
}
