/**
 * Fenêtre d'un shift (nouveau design) : équipe validée, candidatures à accepter
 * ou refuser (salariés et auto-entrepreneurs), annulation. Même logique et mêmes
 * tables que la fiche shift existante (useShiftDetail) ; seuls le rendu change.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Check, ExternalLink, Loader2, MapPin, Clock, Ban, Timer, BadgeCheck, CalendarClock, CalendarPlus, Zap, PhoneCall, UserCheck, BellRing, UserX, Undo2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useShiftDetail } from '@/pages/shifts/hooks/useShiftDetail';

import { AdjustHours } from './dialogs/AdjustHours';
import { ValidateHours } from './dialogs/ValidateHours';
import { Boost } from './dialogs/Boost';
import { Reschedule } from './dialogs/Reschedule';
import { AutoCall } from './dialogs/AutoCall';
import { Convert } from './dialogs/Convert';
import { Extend } from './dialogs/Extend';
import { coverageBand, Face } from './MissionCard';
import { PersonWindow, type PersonRef } from './PersonWindow';
import type { PlacedPerson } from './usePlanningMissions';

const DEFAULT_TZ = 'Europe/Paris';

const fmt = (iso: string, tz: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: tz, ...o }).format(new Date(iso));

const STATUS_LABEL: Record<string, string> = {
  pending: 'Publié',
  partially_filled: 'Partiellement pourvu',
  filled: 'Complet',
  pending_validation: 'Heures à valider',
  completed: 'Terminé',
  canceled: 'Annulé',
  closed: 'Clôturé',
  expired: 'Expiré',
};

interface Candidate {
  key: string;
  appId: string;
  personId: string;
  kind: 'salarie' | 'freelance';
  name: string;
  sub: string;
  photo: string | null;
  rate?: number | null;
  viaCall?: boolean;
}

export function ShiftWindow({ shiftId, onClose }: { shiftId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const { locale = 'fr' } = useParams<{ locale: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const detail = useShiftDetail(shiftId);
  const {
    shift, isLoading, freelancerApplications, hasAcceptedApplicant, mutations,
    adjustHoursDialogOpen, setAdjustHoursDialogOpen, isValidateDialogOpen, setIsValidateDialogOpen,
    isBoostDialogOpen, setIsBoostDialogOpen, isBoostable, isRescheduleDialogOpen, setIsRescheduleDialogOpen,
    canReschedule, rescheduleTargetShifts, canConvertToEmployees, isConvertDialogOpen, setIsConvertDialogOpen,
    eventGroupSummary, autoCallStatus, isAutoCallDialogOpen, setIsAutoCallDialogOpen,
  } = detail;
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [person, setPerson] = useState<PersonRef | null>(null);

  useEffect(() => {
    // Si le profil d'une personne est ouvert, Échap ne ferme que lui (géré dans PersonWindow)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !person && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, person]);

  // Refus d'un salarié (la fiche existante ne le fait que via la page Candidatures)
  const rejectEmployee = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase
        .from('shift_applications')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? '' })
        .eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
      queryClient.invalidateQueries({ queryKey: ['v2-planning-missions'] });
      toast.success('Candidature refusée');
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const s = shift as any;
  const tz: string = s?.establishment?.timezone || DEFAULT_TZ;
  const required: number = s?.required_employees || 1;

  const { placed, candidates } = useMemo(() => {
    const placed: (PlacedPerson & { sub: string; personId: string; appId?: string; noShow?: boolean })[] = [];
    const candidates: Candidate[] = [];
    for (const a of (s?.shift_applications ?? []) as any[]) {
      const name = [a.user?.first_name, a.user?.last_name].filter(Boolean).join(' ') || a.user?.email || 'Salarié';
      if (a.status === 'accepted')
        placed.push({ id: `e-${a.id}`, appId: a.id, noShow: !!a.no_show, personId: a.user_id, name, photo: a.user?.avatar_url ?? null, kind: 'salarie', sub: a.user?.email ?? '' });
      else if (a.status === 'applied' || a.status === 'pending')
        candidates.push({ key: `e-${a.id}`, appId: a.id, personId: a.user_id, kind: 'salarie', name, sub: a.user?.email ?? '', photo: a.user?.avatar_url ?? null });
    }
    for (const a of (freelancerApplications ?? []) as any[]) {
      const name = [a.freelancer?.first_name, a.freelancer?.last_name].filter(Boolean).join(' ') || 'Auto-entrepreneur';
      const sub = [a.freelancer?.city, a.freelancer?.phone].filter(Boolean).join(' · ');
      if (a.status === 'accepted')
        placed.push({ id: `f-${a.id}`, personId: a.freelancer_id, name, photo: a.freelancer?.profile_photo_url ?? null, kind: 'freelance', sub });
      else if (a.status === 'applied')
        candidates.push({
          key: `f-${a.id}`, appId: a.id, personId: a.freelancer_id, kind: 'freelance', name, sub,
          photo: a.freelancer?.profile_photo_url ?? null, rate: a.freelance_hourly_rate, viaCall: a.applied_via_call,
        });
    }
    return { placed, candidates };
  }, [s, freelancerApplications]);

  const full = placed.length >= required;
  const { band } = coverageBand(placed.length, required);
  const status: string = s?.status ?? '';
  const terminal = ['completed', 'closed', 'expired', 'canceled'].includes(status);
  const busy = mutations.assignEmployee.isPending || mutations.acceptFreelancer.isPending || mutations.rejectFreelancer.isPending || rejectEmployee.isPending;

  const accept = (c: Candidate) =>
    c.kind === 'salarie' ? mutations.assignEmployee.mutate(c.appId) : mutations.acceptFreelancer.mutate(c.appId);
  const reject = (c: Candidate) =>
    c.kind === 'salarie' ? rejectEmployee.mutate(c.appId) : mutations.rejectFreelancer.mutate(c.appId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-se-ink/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Fenêtre du shift"
        className="se-root relative w-full max-w-xl bg-se-bg h-full overflow-y-auto shadow-se-md border-l border-se-line"
      >
        {isLoading || !s ? (
          <div className="h-full grid place-items-center text-se-muted">
            <Loader2 className="w-5 h-5 animate-spin" aria-label="Chargement" />
          </div>
        ) : (
          <>
            {/* En-tête */}
            <div className="sticky top-0 z-10 bg-se-surface border-b border-se-line">
              <div className={`h-1.5 ${status === 'canceled' ? 'bg-se-line' : band}`} />
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <h2 className="font-display font-extrabold text-xl text-se-ink truncate">{s.position_name || 'Shift'}</h2>
                  <p className="text-sm text-se-muted capitalize mt-0.5">
                    {fmt(s.start_time, tz, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-se-muted">
                    <span className="inline-flex items-center gap-1 font-semibold text-se-ink">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {fmt(s.start_time, tz, { hour: '2-digit', minute: '2-digit' })}–{fmt(s.end_time, tz, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {s.establishment?.name && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        {s.establishment.name}
                      </span>
                    )}
                    <span className="se-badge bg-se-surface-2 text-se-muted">{STATUS_LABEL[status] ?? status}</span>
                  </div>
                </div>
                <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-se-sm text-se-muted hover:text-se-ink hover:bg-se-surface-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Équipe validée */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <p className="se-eyebrow">Équipe validée</p>
                  <span className={`text-sm font-bold ${full ? 'text-se-success' : placed.length ? 'text-se-cascade-ink' : 'text-se-danger'}`}>
                    {placed.length}/{required}
                  </span>
                </div>
                {placed.length === 0 ? (
                  <p className="text-sm text-se-muted rounded-se border border-dashed border-se-line p-4">Personne n'est encore placé sur ce shift.</p>
                ) : (
                  <ul className="space-y-2">
                    {placed.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 rounded-se border border-se-line bg-se-surface p-3">
                        <button type="button" onClick={() => setPerson({ kind: p.kind, id: p.personId, name: p.name, photo: p.photo, showContact: true })} className="flex items-center gap-3 min-w-0 flex-1 text-left" aria-label={`Ouvrir le profil de ${p.name}`}>
                          <Face p={p} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-se-ink truncate">{p.name}</span>
                            <span className="block text-xs text-se-muted truncate">{p.sub}</span>
                          </span>
                        </button>
                        {p.noShow && <span className="se-badge bg-se-danger-wash text-se-danger">Absent</span>}
                        <span className={`se-badge ${p.kind === 'freelance' ? 'bg-se-freelance-wash text-se-freelance-ink' : 'bg-se-blue-wash text-se-blue-ink'}`}>
                          {p.kind === 'freelance' ? 'Auto-entrepreneur' : 'Salarié'}
                        </span>
                        {p.kind === 'salarie' && p.appId && !terminal && (
                          p.noShow ? (
                            <button type="button" title="Annuler l'absence" aria-label="Annuler l'absence" onClick={() => mutations.cancelNoShow.mutate(p.appId!)} className="p-1.5 rounded-se-sm text-se-muted hover:text-se-ink hover:bg-se-surface-2">
                              <Undo2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button type="button" title="Signaler une absence" aria-label="Signaler une absence" onClick={() => mutations.reportNoShow.mutate(p.appId!)} className="p-1.5 rounded-se-sm text-se-muted hover:text-se-danger hover:bg-se-danger-wash">
                              <UserX className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Candidatures */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <p className="se-eyebrow">Candidatures</p>
                  <span className="text-sm font-bold text-se-ink">{candidates.length}</span>
                </div>
                {candidates.length === 0 ? (
                  <p className="text-sm text-se-muted rounded-se border border-dashed border-se-line p-4">Aucune candidature en attente.</p>
                ) : (
                  <ul className="space-y-2">
                    {candidates.map((c) => (
                      <li key={c.key} className="rounded-se border border-se-line bg-se-surface p-3">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setPerson({ kind: c.kind, id: c.personId, name: c.name, photo: c.photo })} className="flex items-center gap-3 min-w-0 flex-1 text-left" aria-label={`Ouvrir le profil de ${c.name}`}>
                            <Face p={{ id: c.key, name: c.name, photo: c.photo, kind: c.kind }} size={36} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-se-ink truncate">{c.name}</span>
                              <span className="block text-xs text-se-muted truncate">{c.sub}</span>
                            </span>
                          </button>
                          <span className={`se-badge ${c.kind === 'freelance' ? 'bg-se-freelance-wash text-se-freelance-ink' : 'bg-se-blue-wash text-se-blue-ink'}`}>
                            {c.kind === 'freelance' ? 'Auto-entrepreneur' : 'Salarié'}
                          </span>
                        </div>
                        {(c.rate != null || c.viaCall) && (
                          <p className="text-xs text-se-muted mt-2">
                            {c.rate != null && <>Tarif proposé : <b className="text-se-ink">{c.rate} €/h</b></>}
                            {c.viaCall && <span className="ml-2">· Candidature suite à un appel</span>}
                          </p>
                        )}
                        {!terminal && (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => reject(c)}
                              className="py-2 rounded-se-sm text-sm font-semibold border border-se-line bg-se-surface text-se-ink hover:bg-se-surface-2 disabled:opacity-50"
                            >
                              Refuser
                            </button>
                            <button
                              type="button"
                              disabled={busy || full}
                              onClick={() => accept(c)}
                              title={full ? 'Le shift est déjà complet' : undefined}
                              className="inline-flex items-center justify-center gap-1.5 py-2 rounded-se-sm text-sm font-semibold bg-se-blue text-white hover:bg-se-blue-ink disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" aria-hidden="true" /> Accepter
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Infos */}
              {(s.description || s.private_note || s.freelance_hourly_rate != null) && (
                <section className="space-y-3">
                  <p className="se-eyebrow">Détails</p>
                  {s.freelance_hourly_rate != null && (
                    <p className="text-sm text-se-ink">Tarif auto-entrepreneur : <b>{s.freelance_hourly_rate} €/h</b></p>
                  )}
                  {s.description && <p className="text-sm text-se-ink whitespace-pre-wrap">{s.description}</p>}
                  {s.private_note && (
                    <p className="text-sm text-se-muted whitespace-pre-wrap rounded-se-sm bg-se-surface-2 p-3">
                      <b className="text-se-ink">Note privée · </b>{s.private_note}
                    </p>
                  )}
                </section>
              )}

              {/* Actions */}
              <section className="space-y-3 pt-2 border-t border-se-line">
                <p className="se-eyebrow">Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {(status === 'completed' || status === 'pending_validation') && (
                    <ActionBtn icon={Timer} label="Ajuster les heures" onClick={() => setAdjustHoursDialogOpen(true)} />
                  )}
                  {status === 'pending_validation' && (
                    <ActionBtn icon={BadgeCheck} label="Valider les heures" primary onClick={() => setIsValidateDialogOpen(true)} />
                  )}
                  {canReschedule && <ActionBtn icon={CalendarClock} label="Changer le créneau" onClick={() => setIsRescheduleDialogOpen(true)} />}
                  {status === 'completed' && !s.is_extended && <ActionBtn icon={CalendarPlus} label="Prolonger" onClick={() => setIsExtendOpen(true)} />}
                  {isBoostable && <ActionBtn icon={Zap} label="Booster" onClick={() => setIsBoostDialogOpen(true)} />}
                  {!!autoCallStatus && (autoCallStatus.enabled || autoCallStatus.visible) && (
                    <ActionBtn icon={PhoneCall} label="Relance par appel" onClick={() => setIsAutoCallDialogOpen(true)} />
                  )}
                  {canConvertToEmployees && <ActionBtn icon={UserCheck} label="Convertir en salariés" onClick={() => setIsConvertDialogOpen(true)} />}
                  {(status === 'pending' || status === 'partially_filled') && (
                    <ActionBtn icon={BellRing} label="Relancer" disabled={mutations.sendReminder.isPending} onClick={() => mutations.sendReminder.mutate()} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/${locale}/shifts/${shiftId}`)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-se-sm text-sm font-semibold border border-se-line bg-se-surface text-se-ink hover:bg-se-surface-2"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" /> Fiche complète (frais de transport…)
                </button>
                {!terminal && !hasAcceptedApplicant && (
                  confirmCancel ? (
                    <div className="rounded-se border border-se-danger/40 bg-se-danger-wash p-3 text-sm">
                      <p className="text-se-danger font-semibold mb-2">Annuler ce shift ? Les candidatures en attente seront refusées.</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setConfirmCancel(false)} className="py-2 rounded-se-sm font-semibold border border-se-line bg-se-surface text-se-ink">Non</button>
                        <button
                          type="button"
                          disabled={mutations.closeShift.isPending}
                          onClick={() => mutations.closeShift.mutate(undefined, { onSuccess: onClose })}
                          className="py-2 rounded-se-sm font-semibold bg-se-danger text-white disabled:opacity-50"
                        >
                          Oui, annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-se-sm text-sm font-semibold text-se-danger hover:bg-se-danger-wash"
                    >
                      <Ban className="w-4 h-4" aria-hidden="true" /> Annuler le shift
                    </button>
                  )
                )}
              </section>
            </div>
          </>
        )}
      </aside>
      <WindowDialogs
        shift={s}
        detail={detail}
        isExtendOpen={isExtendOpen}
        setIsExtendOpen={setIsExtendOpen}
      />
      {person && <PersonWindow person={person} onClose={() => setPerson(null)} />}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, primary, disabled }: { icon: typeof Timer; label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-se-sm text-sm font-semibold transition-colors disabled:opacity-50 ${
        primary ? 'bg-se-blue text-white hover:bg-se-blue-ink' : 'border border-se-line bg-se-surface text-se-ink hover:bg-se-surface-2'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Dialogues du nouveau design (mêmes mutations et mêmes tables que la fiche existante). */
function WindowDialogs({ shift, detail, isExtendOpen, setIsExtendOpen }: { shift: any; detail: ReturnType<typeof useShiftDetail>; isExtendOpen: boolean; setIsExtendOpen: (v: boolean) => void }) {
  if (!shift || !detail.isAdminOrManager) return null;
  const d = detail;
  const acceptedFreelancers = d.freelancerApplications.filter((a: any) => a.status === 'accepted').length;
  return (
    <>
      <AdjustHours shift={shift} open={d.adjustHoursDialogOpen} onClose={() => d.setAdjustHoursDialogOpen(false)} />
      <ValidateHours shift={shift} acceptedFreelancers={acceptedFreelancers} open={d.isValidateDialogOpen} onClose={() => d.setIsValidateDialogOpen(false)} />
      <Boost shift={shift} open={d.isBoostDialogOpen} onClose={() => d.setIsBoostDialogOpen(false)} />
      <AutoCall
        open={d.isAutoCallDialogOpen}
        onClose={() => d.setIsAutoCallDialogOpen(false)}
        status={d.autoCallStatus}
        isPending={d.mutations.setAutoCalls.isPending}
        onToggle={(enabled) => d.mutations.setAutoCalls.mutate(enabled)}
      />
      <Convert
        open={d.isConvertDialogOpen}
        onClose={() => d.setIsConvertDialogOpen(false)}
        shift={{ id: shift.id, company_id: shift.company_id, establishment_id: shift.establishment_id }}
        alreadyInvitedUserIds={(shift.shift_applications || [])
          .filter((a: any) => ['pending', 'applied', 'accepted'].includes(a.status))
          .map((a: any) => a.user_id)}
        daysCount={d.eventGroupSummary?.daysCount ?? 1}
        pendingFreelancerCount={d.freelancerApplications.filter((a: any) => a.status === 'applied').length}
        isPending={d.mutations.convertToEmployees.isPending}
        onConfirm={(userIds) => d.mutations.convertToEmployees.mutate(userIds)}
      />
      <Reschedule
        open={d.isRescheduleDialogOpen}
        onClose={() => d.setIsRescheduleDialogOpen(false)}
        shifts={d.rescheduleTargetShifts}
        isPending={d.mutations.rescheduleShift.isPending}
        onConfirm={(entries) => d.mutations.rescheduleShift.mutate(entries)}
      />
      {shift.status === 'completed' && <Extend shift={shift} open={isExtendOpen} onClose={() => setIsExtendOpen(false)} />}
    </>
  );
}
