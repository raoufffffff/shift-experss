/**
 * Tableau de bord — ce qu'un directeur veut savoir en arrivant : l'essentiel à
 * traiter, la semaine en chiffres, les prochaines missions, l'équipe.
 * Branché sur Supabase (mêmes sources que le Planning).
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarDays, Check, Clock, Scale, Star, UserPlus, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanningMissions } from './usePlanningMissions';
import { useDashboardExtras, type TeamMember } from './useDashboardData';
import { Face } from './MissionCard';
import { PersonWindow, type PersonRef } from './PersonWindow';
import { addDays, fmtDay, hoursOf, mondayOf, parseISO, todayISO } from './dates';

const fmtShort = (iso: string) => fmtDay(iso, { weekday: 'short', day: 'numeric', month: 'short' });

export function RealDashboardPage() {
  const navigate = useNavigate();
  const { locale = 'fr' } = useParams<{ locale: string }>();
  const today = todayISO();
  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const [person, setPerson] = useState<PersonRef | null>(null);

  const { data: week = [], isLoading: weekLoading } = usePlanningMissions(monday, sunday);
  const { data: ahead = [] } = usePlanningMissions(today, addDays(today, 45));
  const { finance, toValidate, reviews, team } = useDashboardExtras(monday, sunday);

  const liveWeek = week.filter((m) => !m.cancelled);
  const required = liveWeek.reduce((s, m) => s + m.required, 0);
  const placed = liveWeek.reduce((s, m) => s + Math.min(m.placed.length, m.required), 0);
  const missing = Math.max(required - placed, 0);
  const coverage = required ? Math.round((placed / required) * 100) : 100;
  const hours = liveWeek.reduce((s, m) => s + hoursOf(m.start, m.end) * m.placed.length, 0);

  const upcoming = useMemo(
    () => ahead.filter((m) => !m.cancelled && m.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).slice(0, 6),
    [ahead, today],
  );
  const upcomingOpenWeek = liveWeek.filter((m) => m.date >= today && m.placed.length < m.required);
  const applicants = ahead.filter((m) => !m.cancelled && m.date >= today && m.pending > 0);
  const applicantCount = applicants.reduce((s, m) => s + m.pending, 0);

  const openShift = (id: string) => navigate(`/${locale}/v2?shift=${id}`);
  const negotiated = finance.data?.negotiated ?? [];
  const pendingHours = toValidate.data ?? [];
  const reviewCount = reviews.data?.length ?? 0;

  const todo = [
    {
      key: 'missing', icon: AlertTriangle, tone: 'bg-se-danger-wash text-se-danger',
      count: upcomingOpenWeek.reduce((s, m) => s + (m.required - m.placed.length), 0),
      label: `place${missing > 1 ? 's' : ''} à pourvoir cette semaine`,
      hint: `${liveWeek.length} shift${liveWeek.length > 1 ? 's' : ''} · ${coverage} % couvert`,
      action: () => upcomingOpenWeek[0] ? openShift(upcomingOpenWeek[0].id) : navigate(`/${locale}/v2`),
      cta: 'Voir le shift',
    },
    {
      key: 'applicants', icon: UserPlus, tone: 'bg-se-blue-wash text-se-blue-ink',
      count: applicantCount,
      label: `candidature${applicantCount > 1 ? 's' : ''} à étudier`,
      hint: applicants.slice(0, 2).map((m) => `${m.poste} · ${fmtShort(m.date)}`).join(', '),
      action: () => applicants[0] && openShift(applicants[0].id),
      cta: 'Voir',
    },
    {
      key: 'negotiations', icon: Scale, tone: 'bg-se-cascade-wash text-se-cascade-ink',
      count: negotiated.length,
      label: `tarif${negotiated.length > 1 ? 's' : ''} négocié${negotiated.length > 1 ? 's' : ''} à répondre`,
      hint: negotiated.slice(0, 3).map((n) => `${n.name} · ${n.rate} €/h`).join(', '),
      action: () => negotiated[0] && openShift(negotiated[0].shiftId),
      cta: 'Répondre',
    },
    {
      key: 'hours', icon: Clock, tone: 'bg-se-danger-wash text-se-danger',
      count: pendingHours.length,
      label: `shift${pendingHours.length > 1 ? 's' : ''} aux heures à valider`,
      hint: 'à valider avant la paie',
      action: () => pendingHours[0] && openShift(pendingHours[0].id),
      cta: 'Valider',
    },
    {
      key: 'reviews', icon: Star, tone: 'bg-amber-50 text-amber-700',
      count: reviewCount,
      label: `évaluation${reviewCount > 1 ? 's' : ''} à donner`,
      hint: '',
      action: () => navigate(`/${locale}/reviews`),
      cta: 'Évaluer',
    },
  ].filter((t) => t.count > 0);

  const members = team.data ?? [];
  const groups: { kind: TeamMember['kind']; label: string; text: string }[] = [
    { kind: 'salarie', label: 'Salariés', text: 'text-se-blue-ink' },
    { kind: 'freelance', label: 'Auto-entrepreneurs', text: 'text-se-freelance-ink' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <header className="mb-5">
        <p className="se-eyebrow mb-1 capitalize">{fmtDay(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="text-3xl font-extrabold text-se-ink">Tableau de bord</h1>
        <p className="text-se-muted mt-1 text-sm">
          {todo.length === 0 ? 'Rien à traiter : tout est en ordre.' : `${todo.length} chose${todo.length > 1 ? 's' : ''} à traiter.`}
        </p>
      </header>

      {/* À traiter */}
      {weekLoading ? (
        <div className="py-8 grid place-items-center text-se-muted"><Loader2 className="w-5 h-5 animate-spin" aria-label="Chargement" /></div>
      ) : todo.length === 0 ? (
        <div className="rounded-se border border-se-line bg-se-surface shadow-se p-6 flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-full bg-se-success-wash text-se-success grid place-items-center"><Check className="w-5 h-5" aria-hidden="true" /></span>
          <div>
            <p className="font-semibold text-se-ink">Tout est en ordre</p>
            <p className="text-sm text-se-muted">Aucune place à pourvoir, aucune candidature ni heure en attente.</p>
          </div>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
          {todo.map((t) => (
            <li key={t.key}>
              <button type="button" onClick={t.action} className="w-full text-left rounded-se border border-se-line bg-se-surface shadow-se p-4 flex items-start gap-3 hover:border-se-muted transition-colors">
                <span className={cn('w-10 h-10 rounded-se-sm grid place-items-center shrink-0', t.tone)}><t.icon className="w-5 h-5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block">
                    <span className="text-2xl font-extrabold font-display text-se-ink leading-none">{t.count}</span>{' '}
                    <span className="text-sm font-semibold text-se-ink">{t.label}</span>
                  </span>
                  {t.hint && <span className="block text-xs text-se-muted truncate mt-1">{t.hint}</span>}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-se-blue-ink mt-2">{t.cta} <ArrowRight className="w-3 h-3" aria-hidden="true" /></span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* La semaine en chiffres */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Shifts cette semaine" value={String(liveWeek.length)} hint={`${fmtShort(monday)} → ${fmtShort(sunday)}`} />
        <Stat label="Couverture" value={`${coverage} %`} hint={`${placed}/${required} places`}
          tone={coverage >= 100 ? 'text-se-success' : placed === 0 && required > 0 ? 'text-se-danger' : 'text-se-cascade-ink'} />
        <Stat label="Heures planifiées" value={`${Math.round(hours * 10) / 10} h`} hint="personnes placées × durée" />
        <Stat label="Auto-entrepreneurs" value={`${Math.round(finance.data?.freelanceTTC ?? 0)} € TTC`} hint="facturé cette semaine" tone="text-se-freelance-ink" />
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
        {/* Prochains shifts */}
        <section className="rounded-se border border-se-line bg-se-surface shadow-se p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-3.5 h-3.5 text-se-muted" aria-hidden="true" />
            <h2 className="se-eyebrow">Prochains shifts</h2>
            <button type="button" onClick={() => navigate(`/${locale}/v2`)} className="ml-auto text-xs font-semibold text-se-blue-ink hover:text-se-blue">Tout le planning</button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-se-muted">Aucun shift à venir.</p>
          ) : (
            <ul className="divide-y divide-se-line-soft">
              {upcoming.map((m) => {
                const p = m.placed.length;
                const band = p <= 0 ? 'bg-se-danger' : p < m.required ? 'bg-se-cascade' : 'bg-se-success';
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => openShift(m.id)} className="w-full flex items-center gap-3 py-2 text-left hover:bg-se-surface-2 rounded-se-sm px-1 -mx-1">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${band}`} aria-hidden="true" />
                      <span className="w-16 shrink-0 text-xs font-semibold text-se-ink">{fmtShort(m.date)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm"><span className="font-semibold text-se-ink">{m.poste}</span><span className="text-se-muted"> · {m.establishment}</span></span>
                      <span className="text-xs text-se-muted whitespace-nowrap">{m.start}–{m.end}</span>
                      <span className={`text-xs font-bold tabular-nums ${p <= 0 ? 'text-se-danger' : p < m.required ? 'text-se-cascade-ink' : 'text-se-success'}`}>{p}/{m.required}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Mon équipe */}
        <section className="rounded-se border border-se-line bg-se-surface shadow-se p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-se-muted" aria-hidden="true" />
            <h2 className="se-eyebrow">Mon équipe</h2>
            <span className="ml-auto text-xs text-se-muted">{members.length} personnes · clic → la fiche</span>
          </div>
          {team.isLoading ? (
            <div className="py-6 grid place-items-center"><Loader2 className="w-4 h-4 animate-spin text-se-muted" /></div>
          ) : members.length === 0 ? (
            <p className="text-sm text-se-muted">Personne pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => {
                const list = members.filter((p) => p.kind === g.kind);
                if (list.length === 0) return null;
                return (
                  <div key={g.kind}>
                    <p className={`text-xs font-semibold mb-2 ${g.text}`}>{g.label} <span className="text-se-muted font-normal">· {list.length}</span></p>
                    <ul className="grid sm:grid-cols-2 gap-1.5">
                      {list.map((p) => (
                        <li key={`${p.kind}-${p.id}`}>
                          <button type="button" onClick={() => setPerson({ kind: p.kind, id: p.id, name: p.name, photo: p.photo, showContact: p.kind === 'freelance' })}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-se-sm hover:bg-se-surface-2 text-left">
                            <Face p={{ id: p.id, name: p.name, photo: p.photo, kind: p.kind }} size={36} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-se-ink truncate">{p.name}</span>
                              <span className="block text-[11px] text-se-muted truncate">{p.sub}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {person && <PersonWindow person={person} onClose={() => setPerson(null)} />}
    </div>
  );
}

function Stat({ label, value, hint, tone = 'text-se-ink' }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div className="bg-se-surface border border-se-line rounded-se px-4 py-3.5 shadow-se">
      <p className="se-eyebrow mb-1">{label}</p>
      <p className={`text-xl font-extrabold font-display ${tone}`}>{value}</p>
      <p className="text-xs text-se-muted mt-0.5">{hint}</p>
    </div>
  );
}
