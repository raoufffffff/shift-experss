/**
 * Données réelles de « Factures & heures » (Supabase) :
 *  · relevé d'heures : salariés (shift_applications) + auto-entrepreneurs
 *    (shift_freelancer_applications) acceptés sur la période ;
 *  · factures : table `invoices` de l'entreprise (sans la facture de commission
 *    freelance, qui n'est pas destinée au client).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { InvoiceRecord } from '@/components/finance/Invoice';

const DEFAULT_TZ = 'Europe/Paris';

export interface HourLine {
  key: string;
  kind: 'salarie' | 'freelance';
  personId: string;
  name: string;
  date: string; // AAAA-MM-JJ (fuseau de l'établissement)
  start: string; // HH:mm
  end: string;
  minutes: number; // net de pause
  breakMin: number;
  real: boolean; // heures réelles (pointées/ajustées) plutôt que prévues
  establishmentId: string | null;
  establishment: string;
  poste: string;
  shiftId: string;
  shiftStatus: string;
  amount: number | null;
}

const hhmm = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const dayOf = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const minsBetween = (a: string, b: string) => {
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  return d > 0 ? Math.round(d) : Math.round(d + 1440);
};

export function useHourLines(from: string, to: string) {
  const company = useAuthStore((s) => s.company);
  return useQuery({
    queryKey: ['v2-factures-lines', company?.id, from, to],
    enabled: !!company?.id,
    refetchInterval: 60_000,
    queryFn: async (): Promise<HourLine[]> => {
      const lo = new Date(`${from}T00:00:00Z`); lo.setUTCDate(lo.getUTCDate() - 1);
      const hi = new Date(`${to}T00:00:00Z`); hi.setUTCDate(hi.getUTCDate() + 2);
      const shiftSel = 'shift:shifts!inner(id, start_time, end_time, actual_start_time, actual_end_time, actual_break_duration_minutes, break_duration_minutes, position_name, status, company_id, establishment_id, establishment:establishments(id, name, timezone))';

      const [emp, free, rates] = await Promise.all([
        supabase.from('shift_applications')
          .select(`user_id, no_show, ${shiftSel}, user:users!shift_applications_user_id_fkey(id, email, first_name, last_name)`)
          .eq('status', 'accepted').eq('shift.company_id', company!.id)
          .gte('shift.start_time', lo.toISOString()).lt('shift.start_time', hi.toISOString()),
        supabase.from('shift_freelancer_applications' as any)
          .select(`id, freelancer_id, total_charged_to_client, ${shiftSel}, freelancer:freelancers(id, first_name, last_name, email)`)
          .eq('status', 'accepted').eq('shift.company_id', company!.id)
          .gte('shift.start_time', lo.toISOString()).lt('shift.start_time', hi.toISOString()),
        supabase.from('employees').select('user_id, hourly_rate').eq('company_id', company!.id),
      ]);
      if (emp.error) throw emp.error;
      if (free.error) throw free.error;
      const rateOf = new Map<string, number | null>((rates.data ?? []).map((r: any) => [r.user_id, r.hourly_rate != null ? Number(r.hourly_rate) : null]));

      const out: HourLine[] = [];
      const build = (s: any, base: Omit<HourLine, 'date' | 'start' | 'end' | 'minutes' | 'breakMin' | 'real' | 'establishmentId' | 'establishment' | 'poste' | 'shiftId' | 'shiftStatus' | 'amount'>, amountFor: (net: number) => number | null) => {
        if (s.status === 'canceled') return;
        const tz = s.establishment?.timezone || DEFAULT_TZ;
        const real = !!(s.actual_start_time && s.actual_end_time);
        const a = real ? s.actual_start_time : s.start_time;
        const b = real ? s.actual_end_time : s.end_time;
        const date = dayOf(s.start_time, tz);
        if (date < from || date > to) return;
        const breakMin = s.actual_break_duration_minutes ?? s.break_duration_minutes ?? 0;
        const minutes = Math.max(0, minsBetween(a, b) - breakMin);
        out.push({
          ...base, date, start: hhmm(a, tz), end: hhmm(b, tz), minutes, breakMin, real,
          establishmentId: s.establishment_id ?? null, establishment: s.establishment?.name ?? '',
          poste: s.position_name ?? '', shiftId: s.id, shiftStatus: s.status ?? '', amount: amountFor(minutes / 60),
        });
      };
      for (const a of (emp.data ?? []) as any[]) {
        if (!a.shift || !a.user || a.no_show) continue;
        const u = a.user; const rate = rateOf.get(u.id) ?? null;
        build(a.shift, { key: `e-${a.shift.id}-${u.id}`, kind: 'salarie', personId: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email },
          (h) => (rate != null ? Math.round(h * rate * 100) / 100 : null));
      }
      for (const a of (free.data ?? []) as any[]) {
        if (!a.shift || !a.freelancer) continue;
        const f = a.freelancer;
        build(a.shift, { key: `f-${a.shift.id}-${f.id}`, kind: 'freelance', personId: f.id, name: [f.first_name, f.last_name].filter(Boolean).join(' ') || f.email },
          () => (a.total_charged_to_client != null ? Number(a.total_charged_to_client) : null));
      }
      return out.sort((x, y) => x.date.localeCompare(y.date) || x.start.localeCompare(y.start) || x.name.localeCompare(y.name, 'fr'));
    },
  });
}

export function useCompanyInvoices(from: string, to: string) {
  const company = useAuthStore((s) => s.company);
  return useQuery({
    queryKey: ['v2-factures-invoices', company?.id, from, to],
    enabled: !!company?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<InvoiceRecord[]> => {
      const hi = new Date(`${to}T00:00:00Z`); hi.setUTCDate(hi.getUTCDate() + 2);
      const lo = new Date(`${from}T00:00:00Z`); lo.setUTCDate(lo.getUTCDate() - 1);
      const { data, error } = await supabase
        .from('invoices')
        .select('*, shift:shifts(position_name)')
        .eq('company_id', company!.id).neq('status', 'void').neq('type', 'freelance_commission')
        .gte('created_at', lo.toISOString()).lt('created_at', hi.toISOString())
        .order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({ ...r, shift_position_name: r.shift?.position_name ?? null })) as InvoiceRecord[];
    },
  });
}
