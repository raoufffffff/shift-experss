/**
 * Fenêtre d'une personne (nouveau design) : auto-entrepreneur ou salarié.
 * Lit directement Supabase : profil, fiabilité, avis, historique avec cette société.
 * Les coordonnées d'un auto-entrepreneur ne s'affichent qu'une fois validé sur un shift.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Star, MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Face } from './MissionCard';

export interface PersonRef {
  kind: 'salarie' | 'freelance';
  /** freelancers.id pour un auto-entrepreneur, users.id pour un salarié */
  id: string;
  name: string;
  photo: string | null;
  /** coordonnées visibles (personne validée) */
  showContact?: boolean;
}

interface Stat { label: string; value: string }
interface HistoryRow { id: string; date: string; poste: string; status: string }

const STATUS_FR: Record<string, string> = {
  accepted: 'Accepté', applied: 'Candidat', pending: 'Invité', rejected: 'Refusé', withdrawn: 'Désisté', removed: 'Retiré',
};
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function usePerson(p: PersonRef) {
  const company = useAuthStore((s) => s.company);
  return useQuery({
    queryKey: ['v2-person', p.kind, p.id, company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const companyId = company!.id;
      if (p.kind === 'freelance') {
        const [{ data: f }, { data: reviews }, { data: apps }] = await Promise.all([
          supabase.from('freelancers')
            .select('first_name, last_name, email, phone, city, bio, spoken_languages, reliability_score, late_cancellation_count, verification_status, cv_skills')
            .eq('id', p.id).maybeSingle(),
          supabase.from('freelancer_reviews').select('rating, comment, created_at').eq('freelancer_id', p.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('shift_freelancer_applications')
            .select('id, status, shift:shifts!inner(id, start_time, position_name, company_id)')
            .eq('freelancer_id', p.id).eq('shift.company_id', companyId).order('applied_at', { ascending: false }).limit(10),
        ]);
        const ratings = (reviews ?? []).map((r: any) => r.rating as number);
        const avg = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;
        const history: HistoryRow[] = (apps ?? []).map((a: any) => ({ id: a.id, date: a.shift.start_time, poste: a.shift.position_name || 'Shift', status: a.status }));
        return {
          sub: [f?.city].filter(Boolean).join(' · '),
          bio: f?.bio ?? null,
          email: f?.email ?? null,
          phone: f?.phone ?? null,
          languages: (f?.spoken_languages ?? []) as string[],
          verified: f?.verification_status === 'verified',
          avg,
          reviews: (reviews ?? []) as { rating: number; comment: string | null; created_at: string }[],
          stats: [
            { label: 'Fiabilité', value: f?.reliability_score != null ? `${Math.round(Number(f.reliability_score))} %` : '—' },
            { label: 'Annul. tardives', value: String(f?.late_cancellation_count ?? 0) },
            { label: 'Avec vous', value: String(history.filter((h) => h.status === 'accepted').length) },
          ] as Stat[],
          history,
        };
      }
      const [{ data: u }, { data: emp }, { data: apps }] = await Promise.all([
        supabase.from('users').select('email, phone').eq('id', p.id).maybeSingle(),
        supabase.from('employees')
          .select('hourly_rate, reliability_score, total_shifts_completed, total_shifts_accepted, total_shifts_withdrawn, total_no_shows')
          .eq('user_id', p.id).eq('company_id', companyId).maybeSingle(),
        supabase.from('shift_applications')
          .select('id, status, shift:shifts!inner(id, start_time, position_name, company_id)')
          .eq('user_id', p.id).eq('shift.company_id', companyId).order('applied_at', { ascending: false }).limit(10),
      ]);
      const history: HistoryRow[] = (apps ?? []).map((a: any) => ({ id: a.id, date: a.shift.start_time, poste: a.shift.position_name || 'Shift', status: a.status }));
      return {
        sub: emp?.hourly_rate != null ? `${emp.hourly_rate} €/h` : '',
        bio: null as string | null,
        email: u?.email ?? null,
        phone: u?.phone ?? null,
        languages: [] as string[],
        verified: false,
        avg: null as number | null,
        reviews: [] as { rating: number; comment: string | null; created_at: string }[],
        stats: [
          { label: 'Fiabilité', value: emp?.reliability_score != null ? `${Math.round(Number(emp.reliability_score))} %` : '—' },
          { label: 'Shifts faits', value: String(emp?.total_shifts_completed ?? 0) },
          { label: 'Désistements', value: String(emp?.total_shifts_withdrawn ?? 0) },
          { label: 'Absences', value: String(emp?.total_no_shows ?? 0) },
        ] as Stat[],
        history,
      };
    },
  });
}

export function PersonWindow({ person, onClose }: { person: PersonRef; onClose: () => void }) {
  const { data, isLoading } = usePerson(person);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isFree = person.kind === 'freelance';
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-se-ink/40" onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label={`Profil de ${person.name}`} className="se-root relative w-full max-w-md bg-se-bg h-full overflow-y-auto shadow-se-md border-l border-se-line">
        <div className="sticky top-0 z-10 bg-se-surface border-b border-se-line p-5 flex items-start gap-4">
          <Face p={{ id: person.id, name: person.name, photo: person.photo, kind: person.kind }} size={56} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-extrabold text-xl text-se-ink truncate">{person.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`se-badge ${isFree ? 'bg-se-freelance-wash text-se-freelance-ink' : 'bg-se-blue-wash text-se-blue-ink'}`}>
                {isFree ? 'Auto-entrepreneur' : 'Salarié'}
              </span>
              {data?.verified && (
                <span className="se-badge bg-se-success-wash text-se-success inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" aria-hidden="true" />Vérifié</span>
              )}
              {data?.sub && <span className="text-xs text-se-muted inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" />{data.sub}</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-se-sm text-se-muted hover:text-se-ink hover:bg-se-surface-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading || !data ? (
          <div className="py-20 grid place-items-center text-se-muted"><Loader2 className="w-5 h-5 animate-spin" aria-label="Chargement" /></div>
        ) : (
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-3 gap-2">
              {data.stats.slice(0, 3).map((s) => (
                <div key={s.label} className="rounded-se border border-se-line bg-se-surface p-3 text-center">
                  <p className="font-display font-bold text-lg text-se-ink">{s.value}</p>
                  <p className="text-[11px] text-se-muted">{s.label}</p>
                </div>
              ))}
            </div>
            {data.stats.length > 3 && (
              <p className="text-xs text-se-muted">{data.stats[3].label} : <b className="text-se-ink">{data.stats[3].value}</b></p>
            )}

            {data.avg != null && (
              <p className="flex items-center gap-1.5 text-sm text-se-ink">
                <Star className="w-4 h-4 text-se-cascade" aria-hidden="true" fill="currentColor" />
                <b>{data.avg.toFixed(1)}</b><span className="text-se-muted">/ 5 · {data.reviews.length} avis récents</span>
              </p>
            )}

            {data.bio && <p className="text-sm text-se-ink whitespace-pre-wrap">{data.bio}</p>}
            {data.languages.length > 0 && (
              <p className="text-sm text-se-muted">Langues : <span className="text-se-ink">{data.languages.join(', ')}</span></p>
            )}

            {(!isFree || person.showContact) ? (
              (data.email || data.phone) && (
                <section className="space-y-1.5">
                  <p className="se-eyebrow">Contact</p>
                  {data.email && <p className="text-sm text-se-ink flex items-center gap-2"><Mail className="w-4 h-4 text-se-muted" aria-hidden="true" />{data.email}</p>}
                  {data.phone && <p className="text-sm text-se-ink flex items-center gap-2"><Phone className="w-4 h-4 text-se-muted" aria-hidden="true" />{data.phone}</p>}
                </section>
              )
            ) : (
              <p className="text-xs text-se-muted rounded-se-sm bg-se-surface-2 p-3">Les coordonnées s'affichent une fois l'auto-entrepreneur validé sur un shift.</p>
            )}

            {data.reviews.length > 0 && (
              <section className="space-y-2">
                <p className="se-eyebrow">Avis</p>
                {data.reviews.map((r, i) => (
                  <div key={i} className="rounded-se border border-se-line bg-se-surface p-3">
                    <p className="text-xs font-bold text-se-ink">{'★'.repeat(r.rating)}<span className="text-se-line">{'★'.repeat(Math.max(5 - r.rating, 0))}</span> <span className="font-normal text-se-muted ml-1">{day(r.created_at)}</span></p>
                    {r.comment && <p className="text-sm text-se-ink mt-1">{r.comment}</p>}
                  </div>
                ))}
              </section>
            )}

            <section className="space-y-2">
              <p className="se-eyebrow">Historique avec votre société</p>
              {data.history.length === 0 ? (
                <p className="text-sm text-se-muted rounded-se border border-dashed border-se-line p-4">Aucun shift pour le moment.</p>
              ) : (
                <ul className="divide-y divide-se-line rounded-se border border-se-line bg-se-surface">
                  {data.history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0"><span className="font-semibold text-se-ink block truncate">{h.poste}</span><span className="text-xs text-se-muted">{day(h.date)}</span></span>
                      <span className="se-badge bg-se-surface-2 text-se-muted">{STATUS_FR[h.status] ?? h.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
