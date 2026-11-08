/**
 * Planning — accueil de l'espace client, branché sur les shifts réels (Supabase).
 * Vues Jour · Semaine (grille par poste) · Mois. Un clic sur une carte ouvre le
 * détail du shift ; « Publier un shift » ouvre la création existante.
 */
import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Building2, Plus, Loader2 } from 'lucide-react';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { MissionCard } from './MissionCard';
import { ShiftWindow } from './ShiftWindow';
import { PublishPanel } from './PublishPanel';
import { usePlanningMissions, usePlanningEstablishments, type PlanningMission } from './usePlanningMissions';
import { addDays, mondayOf, todayISO, fmtDay, parseISO, toISO } from './dates';

type View = 'jour' | 'semaine' | 'mois';
const VIEW_KEY = 'se-planning-view';
const VIEWS: { id: View; label: string }[] = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
];

const loadView = (): View => {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'jour' || v === 'semaine' || v === 'mois') return v;
  } catch { /* stockage indisponible */ }
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'jour' : 'semaine';
};

const live = (m: PlanningMission) => !m.cancelled;
const sum = (ms: PlanningMission[]) => ({
  placed: ms.reduce((s, m) => s + Math.min(m.placed.length, m.required), 0),
  required: ms.reduce((s, m) => s + m.required, 0),
});
const tone = (placed: number, required: number) =>
  required <= 0 ? 'text-se-muted' : placed >= required ? 'text-se-success' : placed <= 0 ? 'text-se-danger' : 'text-se-cascade-ink';

export function RealPlanningPage() {
  const user = useAuthStore((s) => s.user);
  const { selectedEstablishmentId, setSelectedEstablishment } = useEstablishmentStore();
  const { data: establishments = [] } = usePlanningEstablishments();
  const isManagerLocked = user?.role === 'manager' && !!user.assigned_establishment_id;

  const today = todayISO();
  const [view, setViewState] = useState<View>(loadView);
  const [anchor, setAnchor] = useState(today);
  const setView = (v: View) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignoré */ }
  };

  // Plage visible
  const range = useMemo(() => {
    if (view === 'jour') return { from: anchor, to: anchor };
    if (view === 'semaine') {
      const m = mondayOf(anchor);
      return { from: m, to: addDays(m, 6) };
    }
    const first = toISO(new Date(parseISO(anchor).getFullYear(), parseISO(anchor).getMonth(), 1));
    const last = toISO(new Date(parseISO(anchor).getFullYear(), parseISO(anchor).getMonth() + 1, 0));
    return { from: mondayOf(first), to: addDays(mondayOf(last), 6) };
  }, [view, anchor]);

  const { data: missions = [], isLoading, error } = usePlanningMissions(range.from, range.to);

  const step = (dir: 1 | -1) => {
    if (view === 'jour') setAnchor(addDays(anchor, dir));
    else if (view === 'semaine') setAnchor(addDays(anchor, 7 * dir));
    else {
      const d = parseISO(anchor);
      setAnchor(toISO(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
    }
  };

  const title =
    view === 'jour'
      ? fmtDay(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : view === 'semaine'
        ? `${fmtDay(range.from, { day: 'numeric', month: 'short' })} – ${fmtDay(range.to, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : fmtDay(anchor, { month: 'long', year: 'numeric' });

  const inPeriod = missions.filter(
    (m) => live(m) && (view !== 'mois' || m.date.slice(0, 7) === anchor.slice(0, 7)),
  );
  const { placed, required } = sum(inPeriod);
  const coverage = required > 0 ? Math.round((placed / required) * 100) : null;

  const [openId, setOpenId] = useState<string | null>(null);
  const open = (id: string) => setOpenId(id);
  const [publishing, setPublishing] = useState(false);
  const publish = () => setPublishing(true);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
      {/* ── En-tête ─────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-se-ink">Planning</h1>
          <p className="text-se-muted mt-1 capitalize">{title}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {coverage !== null && (
            <div className="flex items-center gap-2" aria-label="Taux de couverture">
              <div className="w-28 h-2 rounded-full bg-se-surface-2 overflow-hidden">
                <div
                  className={cn('h-full', coverage >= 100 ? 'bg-se-success' : coverage > 0 ? 'bg-se-cascade' : 'bg-se-danger')}
                  style={{ width: `${coverage}%` }}
                />
              </div>
              <span className={cn('text-sm font-bold', tone(placed, required))}>
                {coverage} % · {placed}/{required}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={publish}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-se-sm text-sm font-semibold bg-se-blue text-white hover:bg-se-blue-ink transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Publier un shift
          </button>
        </div>
      </div>

      {/* ── Barre d'outils ──────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="inline-flex items-center rounded-se-sm border border-se-line bg-se-surface overflow-hidden">
          <button type="button" aria-label="Période précédente" onClick={() => step(-1)} className="p-2.5 text-se-muted hover:text-se-ink hover:bg-se-surface-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setAnchor(today)} className="px-3 py-2 text-sm font-semibold text-se-ink hover:bg-se-surface-2 border-x border-se-line">
            Aujourd'hui
          </button>
          <button type="button" aria-label="Période suivante" onClick={() => step(1)} className="p-2.5 text-se-muted hover:text-se-ink hover:bg-se-surface-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="inline-flex rounded-se-sm border border-se-line bg-se-surface p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                'px-3 py-1.5 rounded-[8px] text-sm font-semibold transition-colors',
                view === v.id ? 'bg-se-blue-wash text-se-blue-ink' : 'text-se-muted hover:text-se-ink',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {!isManagerLocked && establishments.length > 1 && (
          <label className="inline-flex items-center gap-2 rounded-se-sm border border-se-line bg-se-surface px-3 py-2 text-sm text-se-ink">
            <Building2 className="w-4 h-4 text-se-muted" aria-hidden="true" />
            <span className="sr-only">Filtrer par établissement</span>
            <select
              value={selectedEstablishmentId ?? 'all'}
              onChange={(e) => setSelectedEstablishment(e.target.value === 'all' ? null : e.target.value)}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les établissements</option>
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
        )}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-se-muted" aria-label="Chargement" />}
      </div>

      {error ? (
        <div className="rounded-se border border-se-danger/40 bg-se-danger-wash p-4 text-sm text-se-danger">
          Impossible de charger le planning. Réessayez dans un instant.
        </div>
      ) : view === 'semaine' ? (
        <WeekGrid missions={missions} weekStart={range.from} today={today} onOpen={open} />
      ) : view === 'jour' ? (
        <DayList missions={missions.filter((m) => m.date === anchor)} onOpen={open} loading={isLoading} />
      ) : (
        <MonthGrid
          missions={missions}
          anchor={anchor}
          from={range.from}
          today={today}
          onPickDay={(d) => {
            setAnchor(d);
            setView('jour');
          }}
        />
      )}
      {publishing && <PublishPanel onClose={() => setPublishing(false)} />}
      {openId && <ShiftWindow shiftId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/* ── Semaine : une ligne par poste, une colonne par jour ───────────── */
function WeekGrid({ missions, weekStart, today, onOpen }: { missions: PlanningMission[]; weekStart: string; today: string; onOpen: (id: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const postes = Array.from(new Set(missions.map((m) => m.poste))).sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid gap-2 min-w-full" style={{ gridTemplateColumns: `140px repeat(7, minmax(148px, 1fr))` }}>
        <div aria-hidden="true" />
        {days.map((d) => {
          const dm = missions.filter((m) => m.date === d && live(m));
          const { placed, required } = sum(dm);
          return (
            <div
              key={d}
              className={cn('rounded-se-sm border px-3 py-2', d === today ? 'border-se-blue bg-se-blue-wash/40' : 'border-se-line bg-se-surface')}
            >
              <p className="se-eyebrow capitalize">{fmtDay(d, { weekday: 'short' })}</p>
              <div className="flex items-baseline justify-between">
                <span className="font-display font-bold text-lg text-se-ink">{parseISO(d).getDate()}</span>
                {dm.length > 0 && <span className={cn('text-xs font-bold', tone(placed, required))}>{placed}/{required}</span>}
              </div>
            </div>
          );
        })}

        {postes.length === 0 && (
          <div className="col-span-8 rounded-se border border-dashed border-se-line p-10 text-center text-se-muted text-sm">
            Aucun shift cette semaine.
          </div>
        )}

        {postes.map((poste) => (
          <WeekRow key={poste} poste={poste} days={days} missions={missions.filter((m) => m.poste === poste)} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function WeekRow({ poste, days, missions, onOpen }: { poste: string; days: string[]; missions: PlanningMission[]; onOpen: (id: string) => void }) {
  return (
    <>
      <div className="rounded-se-sm bg-se-surface-2 px-3 py-2 text-sm font-semibold text-se-ink self-start break-words">{poste}</div>
      {days.map((d) => (
        <div key={d} className="space-y-2 min-h-[44px]">
          {missions.filter((m) => m.date === d).map((m) => (
            <MissionCard key={m.id} mission={m} dense onOpen={() => onOpen(m.id)} />
          ))}
        </div>
      ))}
    </>
  );
}

/* ── Jour : liste de cartes ────────────────────────────────────────── */
function DayList({ missions, onOpen, loading }: { missions: PlanningMission[]; onOpen: (id: string) => void; loading: boolean }) {
  if (!loading && missions.length === 0)
    return (
      <div className="rounded-se border border-dashed border-se-line p-10 text-center text-se-muted text-sm flex flex-col items-center gap-2">
        <CalendarDays className="w-6 h-6" aria-hidden="true" />
        Aucun shift ce jour.
      </div>
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {missions.map((m) => (
        <MissionCard key={m.id} mission={m} onOpen={() => onOpen(m.id)} />
      ))}
    </div>
  );
}

/* ── Mois : calendrier, une pastille par shift ─────────────────────── */
function MonthGrid({ missions, anchor, from, today, onPickDay }: { missions: PlanningMission[]; anchor: string; from: string; today: string; onPickDay: (d: string) => void }) {
  const month = anchor.slice(0, 7);
  const weeks = 6;
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(from, i));
  let needed = 0;
  days.forEach((d, i) => { if (d.slice(0, 7) === month) needed = i + 1; });
  const shown = days.slice(0, Math.ceil(needed / 7) * 7);

  return (
    <div className="rounded-se border border-se-line bg-se-surface overflow-hidden">
      <div className="grid grid-cols-7 border-b border-se-line bg-se-surface-2">
        {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map((d) => (
          <div key={d} className="se-eyebrow px-2 py-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {shown.map((d) => {
          const dm = missions.filter((m) => m.date === d && live(m));
          const { placed, required } = sum(dm);
          const out = d.slice(0, 7) !== month;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPickDay(d)}
              className={cn(
                'min-h-[96px] border-b border-r border-se-line p-1.5 text-left align-top hover:bg-se-surface-2 transition-colors',
                out && 'bg-se-surface-2/50 text-se-muted',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-semibold w-6 h-6 grid place-items-center rounded-full',
                    d === today ? 'bg-se-blue text-white' : out ? 'text-se-muted' : 'text-se-ink',
                  )}
                >
                  {parseISO(d).getDate()}
                </span>
                {dm.length > 0 && <span className={cn('text-[10px] font-bold', tone(placed, required))}>{placed}/{required}</span>}
              </div>
              <div className="mt-1 space-y-0.5">
                {dm.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'truncate rounded px-1.5 py-0.5 text-[10px] font-semibold text-white',
                      m.placed.length <= 0 ? 'bg-se-danger' : m.placed.length < m.required ? 'bg-se-cascade' : 'bg-se-success',
                    )}
                  >
                    {m.start} {m.poste}
                  </div>
                ))}
                {dm.length > 3 && <div className="text-[10px] font-semibold text-se-muted px-1">+{dm.length - 3}</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
