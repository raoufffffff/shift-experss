import { Info, Loader2, PhoneCall, ShieldCheck } from 'lucide-react';
import { AUTO_CALL_REASON_FR, type AutoCallStatus } from '@/pages/shifts/hooks/useShiftDetail';
import { SeModal, Note, sePrimary, seGhost } from './SeModal';

const cents = (c: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((c || 0) / 100);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-se-sm border border-se-line bg-se-surface-2 p-3">
      <p className="se-eyebrow">{label}</p>
      <p className="font-display font-bold text-lg text-se-ink mt-0.5">{value}</p>
    </div>
  );
}

export function AutoCall({
  open, onClose, status, isPending, onToggle,
}: { open: boolean; onClose: () => void; status: AutoCallStatus | undefined; isPending: boolean; onToggle: (enabled: boolean) => void }) {
  if (!status) return null;

  if (status.enabled)
    return (
      <SeModal
        open={open}
        onClose={onClose}
        title="Relance par appel active"
        subtitle="Nous appelons les auto-entrepreneurs disponibles, un par un, entre 8 h et 21 h (heure de Paris)."
        footer={
          <>
            <button type="button" className={seGhost} onClick={onClose}>Fermer</button>
            <button type="button" className={`${seGhost} !text-se-danger`} disabled={isPending} onClick={() => onToggle(false)}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Arrêter les appels
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Appels passés" value={`${status.calls_made} / ${status.max_calls}`} />
          <Stat label="Appels décrochés" value={String(status.calls_answered)} />
          <Stat label="Candidatures via appel" value={String(status.applications_via_call)} />
          <Stat label="Coût (décrochés)" value={cents(status.cost_cents)} />
        </div>
      </SeModal>
    );

  const reason = status.reason ? AUTO_CALL_REASON_FR[status.reason] || '' : '';
  return (
    <SeModal
      open={open}
      onClose={onClose}
      title="Trouver un auto-entrepreneur par appel"
      subtitle="Un appel automatique propose votre mission aux auto-entrepreneurs disponibles qui ont accepté d'être appelés."
      footer={
        <>
          <button type="button" className={seGhost} onClick={onClose}>Annuler</button>
          <button type="button" className={sePrimary} disabled={!status.can_enable || isPending} onClick={() => onToggle(true)}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />} <PhoneCall className="w-4 h-4" aria-hidden="true" /> Lancer les appels
          </button>
        </>
      }
    >
      {!status.live && <Note tone="warn"><span className="inline-flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />Mode simulation : aucun appel réel n'est passé pour le moment.</span></Note>}
      <div className="rounded-se bg-se-success-wash p-4 text-center">
        <p className="font-display font-black text-4xl text-se-success leading-none">{status.available_count}</p>
        <p className="text-sm text-se-ink mt-1">{status.available_count > 1 ? 'auto-entrepreneurs disponibles et compatibles' : 'auto-entrepreneur disponible et compatible'}</p>
      </div>
      <ul className="space-y-2 text-sm text-se-muted list-disc pl-5">
        <li>
          {status.available_count > 0
            ? `Nous appelons les ${status.will_call} mieux classés, un par un, entre 8 h et 21 h (heure de Paris).`
            : "Aucun n'est disponible pour l'instant : les appels démarreront dès qu'un auto-entrepreneur compatible sera disponible, entre 8 h et 21 h (heure de Paris)."}
        </li>
        <li><b className="text-se-ink">{cents(status.price_cents)} par appel décroché.</b> Les appels sans réponse ou sur messagerie ne sont pas facturés. Maximum : {cents(status.max_cost_cents)}.</li>
        <li>Un auto-entrepreneur qui appuie sur 1 postule seulement : c'est vous qui acceptez ensuite.</li>
        <li>Les appels s'arrêtent dès que le shift est complet ou annulé, ou quand vous les arrêtez.</li>
      </ul>
      <div className="flex items-start gap-2 rounded-se-sm bg-se-surface-2 p-3 text-xs text-se-muted">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        Les identités et coordonnées ne vous sont communiquées qu'après leur candidature. Aucune garantie de réponse.
      </div>
      {reason && !status.can_enable && <p className="text-sm font-semibold text-se-danger">{reason}</p>}
    </SeModal>
  );
}
