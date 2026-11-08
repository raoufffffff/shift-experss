/**
 * Carte de mission : bandeau coloré (rouge vide · orange incomplet · vert complet)
 * portant le poste et le ratio placés/besoin, horaire, % de couverture, visages.
 */
import { Link2, Clock } from 'lucide-react';
import type { PlanningMission, PlacedPerson } from './usePlanningMissions';

const MAX_FACES = 4;

export function coverageBand(placed: number, required: number) {
  if (placed <= 0) return { band: 'bg-se-danger', label: 'Manque' };
  if (placed < required) return { band: 'bg-se-cascade', label: `Incomplet · ${placed}/${required}` };
  return { band: 'bg-se-success', label: 'Complet' };
}

const kindDot: Record<PlacedPerson['kind'], string> = { salarie: 'bg-se-blue', freelance: 'bg-se-freelance' };

export function Face({ p, size = 24 }: { p: PlacedPerson; size?: number }) {
  const initials = p.name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <span
      title={p.name}
      style={{ width: size, height: size }}
      className={`relative inline-grid place-items-center rounded-full ring-2 ring-se-surface overflow-hidden text-[10px] font-bold text-white shrink-0 ${kindDot[p.kind]}`}
    >
      {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" loading="lazy" /> : initials}
    </span>
  );
}

export function MissionCard({ mission: m, onOpen, dense }: { mission: PlanningMission; onOpen: () => void; dense?: boolean }) {
  const placed = m.placed.length;
  const { band, label } = coverageBand(placed, m.required);
  const pct = m.required > 0 ? Math.min(100, Math.round((placed / m.required) * 100)) : 0;
  const faces = m.placed.slice(0, MAX_FACES);
  const extra = Math.max(placed - faces.length, 0);
  const empty = m.cancelled ? 0 : Math.max(Math.min(m.required - placed, MAX_FACES - faces.length), 0);
  const status = m.cancelled ? 'Annulée' : label;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={status}
      aria-label={`${m.poste} · ${status} · ${placed} sur ${m.required}`}
      className={`w-full text-left border border-se-line rounded-se overflow-hidden shadow-se hover:border-se-muted transition-colors ${
        m.cancelled ? 'se-hatched' : 'bg-se-surface'
      } ${m.past && !m.cancelled ? 'opacity-80' : ''}`}
    >
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 ${
          m.cancelled ? 'bg-se-surface-2 text-se-muted border-b border-se-line' : `${band} text-white`
        }`}
      >
        <span className={`font-semibold leading-tight truncate ${m.cancelled ? 'line-through' : ''}`}>{m.poste}</span>
        <span className="font-bold text-sm whitespace-nowrap">{m.cancelled ? 'Annulée' : `${placed}/${m.required}`}</span>
      </div>

      <div className={dense ? 'p-2.5' : 'p-3.5'}>
        <div className="flex items-center gap-1.5 text-xs text-se-muted">
          <span className={`font-medium ${m.cancelled ? 'line-through' : 'text-se-ink'}`}>
            {m.start}–{m.end}
          </span>
          {!m.cancelled && (
            <>
              <span aria-hidden="true">·</span>
              <span>{pct} %</span>
            </>
          )}
        </div>

        <div className={`flex items-center mt-2 ${m.cancelled ? 'grayscale opacity-70' : ''}`}>
          {faces.map((p, i) => (
            <span key={p.id} className={i > 0 ? '-ml-1' : ''}>
              <Face p={p} />
            </span>
          ))}
          {extra > 0 && (
            <span className="-ml-1.5 w-[22px] h-[22px] rounded-full ring-2 ring-se-surface bg-se-surface-2 text-se-muted text-[10px] font-bold grid place-items-center">
              +{extra}
            </span>
          )}
          {Array.from({ length: empty }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`w-[22px] h-[22px] rounded-full border-2 border-dashed border-se-line bg-se-surface ${faces.length + i > 0 ? '-ml-1.5' : ''}`}
            />
          ))}
          {!dense && <span className="se-badge bg-se-surface-2 text-se-muted ml-2 max-w-full truncate">{m.establishment}</span>}
        </div>
        {dense && <span className="se-badge bg-se-surface-2 text-se-muted mt-2 max-w-full truncate">{m.establishment}</span>}

        {m.pending > 0 && !m.cancelled && (
          <span className="se-badge bg-se-blue-wash text-se-blue-ink mt-1.5 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {m.pending} candidature{m.pending > 1 ? 's' : ''}
          </span>
        )}
        {m.eventId && (
          <span className="se-badge bg-se-surface-2 text-se-muted mt-1.5 inline-flex items-center gap-1">
            <Link2 className="w-3 h-3" aria-hidden="true" />
            Événement
          </span>
        )}
      </div>
    </button>
  );
}
