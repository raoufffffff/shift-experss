/**
 * « Évaluer vos auto-entrepreneurs » — fenêtre proposée à la connexion tant
 * qu'une mission passée a un auto-entrepreneur validé sans évaluation.
 * Une carte par personne et par mission : cinq étoiles, un mot (facultatif),
 * Enregistrer. « Plus tard » referme pour cette session.
 *
 * Données réelles : mêmes règles d'éligibilité que l'ancien popup
 * (`fetchPendingFreelancerReviews` : candidatures acceptées, shifts terminés,
 * un seul avis par événement, pas déjà noté) et même enregistrement
 * (`submitFreelancerReview` → `freelancer_reviews`). Comme avant, le lot
 * affiché est marqué « vu » (`review_popup_seen_at`) dès le chargement : la
 * fenêtre ne revient pas, les avis restent notables depuis la page Avis.
 */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, X, Check, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { useV2Ui } from '@/stores/v2UiStore';
import { fetchPendingFreelancerReviews } from '@/pages/reviews/hooks/fetchPendingFreelancerReviews';
import { submitFreelancerReview } from '@/pages/reviews/hooks/submitFreelancerReview';
import type { FreelancerApplication } from '@/pages/reviews/types';

const TZ = 'Europe/Paris'; // même défaut que ShiftsPage tant que le fuseau n'est pas chargé ici

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
const fmtHm = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

const nameOf = (a: FreelancerApplication) =>
  a.freelancer?.full_name || `${a.freelancer?.first_name ?? ''} ${a.freelancer?.last_name ?? ''}`.trim() || 'Auto-entrepreneur';

function FreelancerPhoto({ name, src }: { name: string; src?: string | null }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  return (
    <span
      className="relative inline-grid place-items-center rounded-full overflow-hidden shrink-0 w-10 h-10 bg-se-freelance-wash text-se-freelance-ink font-bold text-sm leading-none"
      aria-hidden="true"
    >
      {initials}
      {src && (
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
    </span>
  );
}

type PendingApp = FreelancerApplication & { review_popup_seen_at?: string | null };

export function PendingReviewsDialog() {
  const queryClient = useQueryClient();
  const company = useAuthStore((s) => s.company);
  const selectedEstablishmentId = useEstablishmentStore((s) => s.selectedEstablishmentId);
  const log = useV2Ui((s) => s.log);

  const [queue, setQueue] = useState<PendingApp[] | null>(null);
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [justDone, setJustDone] = useState<string[]>([]);
  const initialized = useRef(false);

  // Une seule fois par session applicative (pas à chaque navigation).
  const { data } = useQuery({
    queryKey: ['v2-pending-reviews-popup', company?.id, selectedEstablishmentId],
    queryFn: () => fetchPendingFreelancerReviews({ companyId: company!.id, establishmentId: selectedEstablishmentId }),
    enabled: !!company?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!data || initialized.current) return;
    const unseen = (data as PendingApp[]).filter((item) => !item.review_popup_seen_at);
    if (unseen.length === 0) return;

    initialized.current = true;
    setQueue(unseen);
    setOpen(true);

    // Tout le lot est marqué « vu » tout de suite, même si la fenêtre est fermée sans noter.
    supabase
      .from('shift_freelancer_applications')
      .update({ review_popup_seen_at: new Date().toISOString() })
      .in(
        'id',
        unseen.map((i) => i.id),
      )
      .then(({ error }) => {
        if (error) logger.error('Failed to mark review popup as seen:', error);
      });
  }, [data]);

  const submit = useMutation({
    mutationFn: async ({ app, rating, comment }: { app: PendingApp; rating: number; comment: string }) => {
      const establishmentId = app.shift?.establishment_id;
      if (!establishmentId) throw new Error('Missing establishment_id');
      await submitFreelancerReview({
        mode: 'create',
        freelancerId: app.freelancer_id,
        establishmentId,
        shiftId: app.shift_id,
        rating,
        comment,
      });
    },
    onSuccess: (_res, { app, rating }) => {
      setJustDone((s) => [...s, app.id]);
      log({
        kind: 'personne',
        label: `${nameOf(app)} évalué·e ${rating}/5`,
        detail: `${app.shift?.position_name ?? ''}${app.shift?.start_time ? ` · ${fmtDay(app.shift.start_time)}` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['given-reviews'] });
    },
    onError: () => toast.error('Impossible d’enregistrer l’évaluation. Réessayez.'),
  });

  if (!open || !queue || queue.length === 0) return null;
  const close = () => setOpen(false);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-se-ink/50" aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Évaluer vos auto-entrepreneurs"
        className="se-root relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-se-surface rounded-se shadow-se-md overflow-hidden"
      >
        <header className="flex items-center gap-3 px-5 py-4 border-b border-se-line">
          <span className="w-9 h-9 rounded-se-sm bg-se-freelance-wash text-se-freelance-ink grid place-items-center shrink-0">
            <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-se-ink">Évaluer vos auto-entrepreneurs</h2>
            <p className="text-xs text-se-muted">
              {queue.length} mission{queue.length > 1 ? 's' : ''} terminée{queue.length > 1 ? 's' : ''} sans
              évaluation. Une note aide tout le monde : vous, pour la prochaine fois ; eux, pour leur profil.
            </p>
          </div>
          <button
            type="button"
            aria-label="Plus tard"
            onClick={close}
            className="ml-auto w-8 h-8 grid place-items-center rounded-se-sm hover:bg-se-surface-2 text-se-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <ul className="flex-1 overflow-y-auto divide-y divide-se-line">
          {queue.map((app) => {
            const k = app.id;
            const d = drafts[k] ?? { rating: 0, comment: '' };
            const done = justDone.includes(k);
            const saving = submit.isPending && submit.variables?.app.id === k;
            const name = nameOf(app);
            return (
              <li key={k} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex items-center gap-3 min-w-0 sm:w-64 shrink-0">
                  <FreelancerPhoto name={name} src={app.freelancer?.profile_photo_url} />
                  <div className="min-w-0">
                    <p className="font-semibold text-se-ink truncate">{name}</p>
                    <p className="text-xs text-se-muted truncate">
                      {app.shift?.position_name}
                      {app.shift?.start_time ? ` · ${fmtDay(app.shift.start_time)}` : ''}
                    </p>
                    <p className="text-xs text-se-muted truncate">
                      {app.shift?.establishments?.name}
                      {app.shift?.start_time && app.shift?.end_time
                        ? ` · ${fmtHm(app.shift.start_time)}–${fmtHm(app.shift.end_time)}`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  {done ? (
                    <p className="inline-flex items-center gap-1.5 text-sm text-se-success font-semibold">
                      <Check className="w-4 h-4" aria-hidden="true" /> Merci, évaluation enregistrée.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-1" role="radiogroup" aria-label="Note sur 5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={d.rating === n}
                            aria-label={`${n} sur 5`}
                            onClick={() => setDrafts((s) => ({ ...s, [k]: { ...d, rating: n } }))}
                            className="w-8 h-8 grid place-items-center rounded-se-sm hover:bg-se-surface-2"
                          >
                            <Star
                              className={`w-6 h-6 ${n <= d.rating ? 'fill-current text-amber-500' : 'text-se-line'}`}
                              aria-hidden="true"
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs text-se-muted">
                          {d.rating === 0
                            ? 'Cliquez une étoile'
                            : ['', 'À éviter', 'Moyen', 'Bien', 'Très bien', 'Excellent'][d.rating]}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          value={d.comment}
                          onChange={(e) => setDrafts((s) => ({ ...s, [k]: { ...d, comment: e.target.value } }))}
                          placeholder="Un mot (facultatif) : ponctualité, attitude, à reprendre ?"
                          className="flex-1 h-9 rounded-se-sm border border-se-line bg-se-surface px-3 text-sm text-se-ink focus:outline-none focus:border-se-blue"
                        />
                        <button
                          type="button"
                          disabled={d.rating === 0 || saving}
                          onClick={() => submit.mutate({ app, rating: d.rating, comment: d.comment })}
                          className="h-9 px-3.5 rounded-se-sm text-sm font-semibold bg-se-freelance text-white hover:opacity-90 disabled:opacity-40"
                        >
                          {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <footer className="flex items-center gap-3 px-5 py-3 border-t border-se-line">
          <p className="text-xs text-se-muted">
            Les évaluations apparaissent sur la fiche de l’auto-entrepreneur (« chez vous »).
          </p>
          <button
            type="button"
            onClick={close}
            className="ml-auto h-9 px-4 rounded-se-sm text-sm font-semibold border border-se-line text-se-ink hover:bg-se-surface-2"
          >
            Plus tard
          </button>
        </footer>
      </div>
    </div>
  );
}
