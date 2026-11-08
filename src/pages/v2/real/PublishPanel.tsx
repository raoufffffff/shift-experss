/**
 * Panneau « Publier un shift » (nouveau design). Aucune règle n'est réécrite :
 * il pilote le hook existant `useCreateShift` (limites du plan, SIRET/SEPA,
 * tarif min/max, fuseau de l'établissement, notifications, shifts multi-jours),
 * seul le rendu change.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Loader2, Send, AlertTriangle } from 'lucide-react';
import { getTranslatedName } from '@shared/types';
import { useCreateShift } from '@/pages/shifts/hooks/useCreateShift';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full h-11 rounded-se-sm border border-se-line bg-se-surface px-3 text-sm text-se-ink placeholder:text-se-muted/70 focus:outline-none focus:border-se-blue disabled:opacity-50';
const areaCls =
  'w-full rounded-se-sm border border-se-line bg-se-surface px-3 py-2.5 text-sm text-se-ink placeholder:text-se-muted/70 focus:outline-none focus:border-se-blue';

const pad = (n: number) => String(n).padStart(2, '0');
const dateInput = (d: Date | null) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '');
const fromDateInput = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const withTime = (day: Date, hhmm: string, plusDay = 0) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + plusDay, h, m);
};
const hhmmOf = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="se-eyebrow block mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-se-muted mt-1">{hint}</span>}
    </label>
  );
}

export function PublishPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { locale = 'fr' } = useParams<{ locale: string }>();
  const w = useCreateShift();
  const {
    formData, updateFormData, establishments, categories, jobPositions, employees, loadingEmployees,
    canCreate, limitMessage, isSubmitting, handleSubmit, company, siretDocument, isSiretLoading,
    establishmentJobRate, currentLang, employeeStatsMap,
  } = w;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Paiement / vérification : même blocage que le formulaire existant.
  const isSiretVerified = siretDocument?.status === 'verified';
  const isBankTransfer =
    (company as any)?.payment_mode === 'settlement' && (company as any)?.settlement_collection === 'bank_transfer';
  const isSepaActive = company?.sepa_status === 'active' || isBankTransfer;
  const blocked = !isSiretLoading && !!company?.id && (!isSiretVerified || !isSepaActive);

  const multi = formData.isMultiDay;
  const positions = useMemo(
    () => jobPositions.filter((p: any) => !formData.categoryId || p.category_id === formData.categoryId),
    [jobPositions, formData.categoryId],
  );

  const setEstablishment = (id: string) => {
    const e = establishments.find((x) => x.id === id);
    const address = e ? [e.address, e.postal_code, e.city].filter(Boolean).join(', ') : '';
    updateFormData({ establishmentId: id, shiftAddress: address, selectedEmployees: [] });
  };

  // Jour + horaires (un seul jour) → startTime/endTime au format attendu par le hook
  const setSingleTimes = (day: Date | null, start: string, end: string) => {
    if (!day || !start || !end) {
      updateFormData({ dateRangeStart: day, dateRangeEnd: day, startTime: '', endTime: '' });
      return;
    }
    const s = withTime(day, start);
    const e = withTime(day, end, end <= start ? 1 : 0); // fin après minuit
    updateFormData({ dateRangeStart: day, dateRangeEnd: day, startTime: s.toISOString(), endTime: e.toISOString() });
  };
  const startHHMM = multi ? formData.defaultStartTime : hhmmOf(formData.startTime);
  const endHHMM = multi ? formData.defaultEndTime : hhmmOf(formData.endTime);

  const onStartDate = (v: string) => {
    const d = fromDateInput(v);
    if (multi) updateFormData({ dateRangeStart: d });
    else setSingleTimes(d, startHHMM, endHHMM);
  };
  const onStartTime = (v: string) =>
    multi ? updateFormData({ defaultStartTime: v }) : setSingleTimes(formData.dateRangeStart, v, endHHMM);
  const onEndTime = (v: string) =>
    multi ? updateFormData({ defaultEndTime: v }) : setSingleTimes(formData.dateRangeStart, startHHMM, v);

  const toggleMulti = (on: boolean) => {
    if (on) {
      updateFormData({
        isMultiDay: true,
        defaultStartTime: startHHMM || '09:00',
        defaultEndTime: endHHMM || '18:00',
        dateRangeEnd: formData.dateRangeStart,
      });
    } else {
      updateFormData({ isMultiDay: false });
      setSingleTimes(formData.dateRangeStart, formData.defaultStartTime, formData.defaultEndTime);
    }
  };

  const toggleEmployee = (id: string) =>
    updateFormData({
      selectedEmployees: formData.selectedEmployees.includes(id)
        ? formData.selectedEmployees.filter((x) => x !== id)
        : [...formData.selectedEmployees, id],
    });

  const hasRecipient = formData.selectedEmployees.length > 0 || formData.publishToFreelancers || formData.autoPublishToFreelancers;
  const rate = parseFloat(formData.freelanceHourlyRate);
  const datesOk = multi ? !!formData.dateRangeStart && !!formData.dateRangeEnd : !!formData.startTime && !!formData.endTime;
  const valid = datesOk && !!formData.establishmentId && !!formData.jobPositionId && hasRecipient && rate > 0 && canCreate;

  const submit = () => {
    setError(null);
    if (!valid) {
      setError(limitMessage || 'Complétez la date, l\'établissement, le poste, les destinataires et le tarif horaire.');
      return;
    }
    handleSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-se-ink/40" onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label="Publier un shift" className="se-root relative w-full max-w-xl bg-se-bg h-full overflow-y-auto shadow-se-md border-l border-se-line">
        <div className="sticky top-0 z-10 bg-se-surface border-b border-se-line flex items-center justify-between p-5">
          <div>
            <h2 className="font-display font-extrabold text-xl text-se-ink">Publier un shift</h2>
            <p className="text-sm text-se-muted">Vos salariés et/ou les auto-entrepreneurs.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-se-sm text-se-muted hover:text-se-ink hover:bg-se-surface-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {blocked ? (
          <div className="p-5">
            <div className="rounded-se border border-se-cascade/50 bg-se-cascade-wash p-4 space-y-3">
              <p className="font-semibold text-se-cascade-ink flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                {!isSiretVerified ? "Vérification de l'entreprise requise" : 'Moyen de paiement requis'}
              </p>
              <p className="text-sm text-se-ink">
                {!isSiretVerified
                  ? "Pour publier des shifts et recruter des auto-entrepreneurs, nous devons d'abord vérifier votre SIRET."
                  : 'Pour publier des shifts, configurez d\'abord un moyen de paiement SEPA valide.'}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/${locale}/settings`)}
                className="px-4 py-2.5 rounded-se-sm text-sm font-semibold bg-se-blue text-white hover:bg-se-blue-ink"
              >
                {!isSiretVerified ? "Aller aux paramètres de l'entreprise" : 'Configurer le paiement'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Quand */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="se-eyebrow">Quand</p>
                <label className="inline-flex items-center gap-2 text-sm text-se-ink cursor-pointer">
                  <input type="checkbox" className="accent-se-blue" checked={multi} onChange={(e) => toggleMulti(e.target.checked)} />
                  Plusieurs jours
                </label>
              </div>
              <div className={cn('grid gap-3', multi ? 'grid-cols-2' : 'grid-cols-1')}>
                <Field label={multi ? 'Du' : 'Jour'}>
                  <input type="date" className={inputCls} value={dateInput(formData.dateRangeStart)} onChange={(e) => onStartDate(e.target.value)} />
                </Field>
                {multi && (
                  <Field label="Au">
                    <input
                      type="date"
                      className={inputCls}
                      min={dateInput(formData.dateRangeStart)}
                      value={dateInput(formData.dateRangeEnd)}
                      onChange={(e) => updateFormData({ dateRangeEnd: fromDateInput(e.target.value) })}
                    />
                  </Field>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Début"><input type="time" className={inputCls} value={startHHMM} onChange={(e) => onStartTime(e.target.value)} /></Field>
                <Field label="Fin"><input type="time" className={inputCls} value={endHHMM} onChange={(e) => onEndTime(e.target.value)} /></Field>
                <Field label="Pause (min)">
                  <input
                    type="number" min={0} step={5} className={inputCls}
                    value={multi ? formData.defaultBreakMinutes : formData.breakDurationMinutes}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value || '0', 10));
                      updateFormData(multi ? { defaultBreakMinutes: v } : { breakDurationMinutes: v });
                    }}
                  />
                </Field>
              </div>
              {multi && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Personnes par jour">
                    <input type="number" min={1} className={inputCls} value={formData.defaultRequiredEmployees}
                      onChange={(e) => updateFormData({ defaultRequiredEmployees: Math.max(1, parseInt(e.target.value || '1', 10)) })} />
                  </Field>
                  <Field label="Publication">
                    <select className={inputCls} value={formData.publishMode} onChange={(e) => updateFormData({ publishMode: e.target.value as 'event' | 'separate' })}>
                      <option value="separate">Jours séparés</option>
                      <option value="event">Un seul événement</option>
                    </select>
                  </Field>
                </div>
              )}
            </section>

            {/* Où & quoi */}
            <section className="space-y-3">
              <p className="se-eyebrow">Où et quoi</p>
              <Field label="Établissement">
                <select className={inputCls} value={formData.establishmentId} onChange={(e) => setEstablishment(e.target.value)}>
                  <option value="">Choisir…</option>
                  {establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Catégorie">
                  <select className={inputCls} value={formData.categoryId}
                    onChange={(e) => updateFormData({ categoryId: e.target.value, jobPositionId: '', positionName: '' })}>
                    <option value="">Choisir…</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{getTranslatedName(c.name_translations, currentLang)}</option>)}
                  </select>
                </Field>
                <Field label="Poste">
                  <select className={inputCls} value={formData.jobPositionId} disabled={!formData.categoryId}
                    onChange={(e) => {
                      const p: any = jobPositions.find((x: any) => x.id === e.target.value);
                      updateFormData({ jobPositionId: e.target.value, positionName: p ? getTranslatedName(p.name_translations, currentLang) : '' });
                    }}>
                    <option value="">Choisir…</option>
                    {positions.map((p: any) => <option key={p.id} value={p.id}>{getTranslatedName(p.name_translations, currentLang)}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description (optionnel)">
                <textarea className={areaCls} rows={3} value={formData.description} onChange={(e) => updateFormData({ description: e.target.value })} placeholder="Tenue, consignes, matériel…" />
              </Field>
              <Field label="Note privée (optionnel)" hint="Visible uniquement par les personnes validées.">
                <textarea className={areaCls} rows={2} value={formData.privateNote} onChange={(e) => updateFormData({ privateNote: e.target.value })} />
              </Field>
            </section>

            {/* Qui */}
            <section className="space-y-3">
              <p className="se-eyebrow">Qui</p>
              <div className="rounded-se border border-se-line bg-se-surface p-3 space-y-2">
                <p className="text-sm font-semibold text-se-ink">Mes salariés</p>
                {!formData.establishmentId ? (
                  <p className="text-xs text-se-muted">Choisissez un établissement pour voir vos salariés.</p>
                ) : loadingEmployees ? (
                  <Loader2 className="w-4 h-4 animate-spin text-se-muted" />
                ) : employees.length === 0 ? (
                  <p className="text-xs text-se-muted">Aucun salarié actif pour cet établissement.</p>
                ) : (
                  <ul className="max-h-48 overflow-y-auto divide-y divide-se-line">
                    {employees.map((e: any) => {
                      const name = [e.user?.first_name, e.user?.last_name].filter(Boolean).join(' ') || e.user?.email;
                      const st = (employeeStatsMap as any)?.[e.user_id];
                      return (
                        <li key={e.id}>
                          <label className="flex items-center gap-3 py-2 cursor-pointer">
                            <input type="checkbox" className="accent-se-blue" checked={formData.selectedEmployees.includes(e.id)} onChange={() => toggleEmployee(e.id)} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-se-ink truncate">{name}</span>
                              {st && <span className="block text-xs text-se-muted">{st.completed ?? st.accepted ?? 0} shifts · {st.withdrawn ?? 0} désistement(s)</span>}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <label className={cn('flex items-start gap-3 rounded-se border p-3 cursor-pointer', formData.publishToFreelancers ? 'border-se-freelance bg-se-freelance-wash/40' : 'border-se-line bg-se-surface')}>
                <input type="checkbox" className="mt-1 accent-se-blue" checked={formData.publishToFreelancers}
                  onChange={(e) => updateFormData({ publishToFreelancers: e.target.checked, autoPublishToFreelancers: e.target.checked ? false : formData.autoPublishToFreelancers })} />
                <span>
                  <span className="block text-sm font-semibold text-se-ink">Publier aux auto-entrepreneurs</span>
                  <span className="block text-xs text-se-muted">Visible tout de suite par les auto-entrepreneurs de la zone.</span>
                </span>
              </label>
              <label className={cn('flex items-start gap-3 rounded-se border p-3 cursor-pointer', formData.autoPublishToFreelancers ? 'border-se-cascade bg-se-cascade-wash/40' : 'border-se-line bg-se-surface')}>
                <input type="checkbox" className="mt-1 accent-se-blue" checked={formData.autoPublishToFreelancers}
                  onChange={(e) => updateFormData({ autoPublishToFreelancers: e.target.checked, publishToFreelancers: e.target.checked ? false : formData.publishToFreelancers })} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-se-ink">Cascade : salariés d'abord</span>
                  <span className="block text-xs text-se-muted">Publié aux auto-entrepreneurs si personne n'accepte après un délai.</span>
                  {formData.autoPublishToFreelancers && (
                    <span className="flex items-center gap-2 mt-2 text-xs text-se-ink">
                      Délai
                      <input type="number" min={5} step={5} className={cn(inputCls, 'h-9 w-24')} value={formData.autoPublishDelayMinutes}
                        onChange={(e) => updateFormData({ autoPublishDelayMinutes: Math.max(5, parseInt(e.target.value || '30', 10)) })} />
                      min
                    </span>
                  )}
                </span>
              </label>
              <label className="flex items-center gap-3 text-sm text-se-ink cursor-pointer">
                <input type="checkbox" className="accent-se-blue" checked={formData.autoAcceptApplications} onChange={(e) => updateFormData({ autoAcceptApplications: e.target.checked })} />
                Accepter automatiquement les candidatures
              </label>
            </section>

            {/* Tarif */}
            <section className="space-y-2">
              <p className="se-eyebrow">Tarif horaire</p>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} step="0.5" className={cn(inputCls, 'max-w-[140px]')}
                  value={formData.freelanceHourlyRate}
                  onChange={(e) => updateFormData({ freelanceHourlyRate: e.target.value })}
                  placeholder="0.00"
                  aria-label="Tarif horaire en euros"
                />
                <span className="text-sm text-se-muted">€/h</span>
                {establishmentJobRate && (
                  <button
                    type="button"
                    className="ml-2 text-xs font-semibold text-se-blue-ink hover:text-se-blue"
                    onClick={() => updateFormData({ freelanceHourlyRate: ((Number(establishmentJobRate.min_rate) + Number(establishmentJobRate.max_rate)) / 2).toFixed(2) })}
                  >
                    Utiliser {((Number(establishmentJobRate.min_rate) + Number(establishmentJobRate.max_rate)) / 2).toFixed(2)} €
                  </button>
                )}
              </div>
              {establishmentJobRate && (
                <p className="text-xs text-se-muted">Fourchette recommandée : {establishmentJobRate.min_rate}–{establishmentJobRate.max_rate} €/h (appliquée aux auto-entrepreneurs).</p>
              )}
            </section>

            {(error || (!canCreate && limitMessage)) && (
              <p className="text-sm text-se-danger rounded-se-sm bg-se-danger-wash p-3">{error || limitMessage}</p>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={submit}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-se-sm text-sm font-semibold bg-se-blue text-white hover:bg-se-blue-ink disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" aria-hidden="true" />}
              Publier
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
