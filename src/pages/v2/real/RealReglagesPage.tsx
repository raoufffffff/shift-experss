/**
 * Réglages — l'entreprise, les établissements, les tarifs, les liens, les
 * notifications. Branché sur Supabase. Des lignes cliquables ouvrent un panneau ;
 * les réglages avancés restent dans les pages d'origine (abonnement, paiement…).
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, Bell, Building2, ChevronRight, CreditCard, Link2, Loader2, Plug, Settings2, Tag, Users, Copy, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { CreateEstablishmentDialog } from '@/components/establishments/CreateEstablishmentDialog';
import { SeModal, Labeled, Note, seField, sePrimary, seGhost } from './dialogs/SeModal';

type Panel = 'company' | 'payment' | 'establishments' | 'rates' | 'links' | 'notifications' | null;
interface Row { key: string; icon: LucideIcon; label: string; hint: string; go: () => void }

const PLAN: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', business: 'Business', enterprise: 'Enterprise' };
const trName = (t: Record<string, string> | null | undefined) => t?.fr || (t ? Object.values(t)[0] : '') || '';

export function RealReglagesPage() {
  const navigate = useNavigate();
  const { locale = 'fr' } = useParams<{ locale: string }>();
  const { company, user } = useAuthStore();
  const [panel, setPanel] = useState<Panel>(null);
  const [creating, setCreating] = useState(false);
  const isAdmin = user?.role === 'admin';
  const to = (p: string) => () => navigate(`/${locale}/${p}`);

  const { data: co } = useQuery({
    queryKey: ['v2-reglages-company', company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('companies')
        .select('name, subscription_plan, subscription_status, preferred_payment_method, sepa_status, sepa_iban_last4, payment_mode, settlement_collection')
        .eq('id', company!.id).single();
      if (error) throw error;
      return data as any;
    },
  });
  const { data: ests = [] } = useQuery({
    queryKey: ['v2-reglages-ests', company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('establishments').select('id, name, address, city, postal_code, phone, status, auto_accept_applications').eq('company_id', company!.id).order('name');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const active = ests.filter((e) => e.status === 'active');

  const sepa = co?.sepa_status === 'active' || co?.sepa_status === 'configured' ? `SEPA · •••• ${co?.sepa_iban_last4 ?? ''}` : co?.preferred_payment_method === 'bank_transfer' || co?.settlement_collection === 'bank_transfer' ? 'Virement bancaire' : 'Moyen de paiement à configurer';
  const plan = PLAN[co?.subscription_plan ?? 'free'] ?? co?.subscription_plan ?? 'Free';

  const exploitation: Row[] = [
    { key: 'company', icon: Settings2, label: 'Entreprise & profil', hint: `${co?.name ?? company?.name ?? ''} · SIRET, e-mail de facturation, votre nom`, go: () => setPanel('company') },
    { key: 'plan', icon: BadgeCheck, label: 'Abonnement', hint: `Formule ${plan}${co?.subscription_status ? ` · ${co.subscription_status}` : ''}`, go: to('subscription') },
    { key: 'payment', icon: CreditCard, label: 'Paiement', hint: sepa, go: () => setPanel('payment') },
  ];
  const lieux: Row[] = [
    { key: 'ests', icon: Building2, label: 'Établissements', hint: `${active.length} établissement${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}`, go: () => setPanel('establishments') },
    { key: 'rates', icon: Tag, label: 'Tarification', hint: 'Fourchette de tarif auto-entrepreneur par poste et par établissement', go: () => setPanel('rates') },
    { key: 'links', icon: Link2, label: 'Liens à partager', hint: "Inscription de l'équipe à chaque établissement", go: () => setPanel('links') },
    { key: 'team', icon: Users, label: 'Équipe & accès', hint: 'Gestionnaires et invitations', go: to('team') },
    { key: 'notifs', icon: Bell, label: 'Notifications', hint: 'E-mail et notifications push', go: () => setPanel('notifications') },
    { key: 'integ', icon: Plug, label: 'Intégrations', hint: 'Connexions à vos autres outils', go: to('integrations') },
    { key: 'more', icon: Settings2, label: 'Autres réglages du compte', hint: 'Langue, suppression du compte…', go: to('settings') },
  ];

  const list = (rows: Row[]) => (
    <ul className="rounded-se border border-se-line bg-se-surface shadow-se overflow-hidden">
      {rows.map(({ key, icon: Icon, label, hint, go }) => (
        <li key={key}>
          <button type="button" onClick={go} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-se-line last:border-0 text-left hover:bg-se-surface-2">
            <span className="w-9 h-9 rounded-se-sm bg-se-surface-2 grid place-items-center text-se-ink shrink-0"><Icon className="w-4 h-4" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="font-semibold text-se-ink block">{label}</span><span className="text-xs text-se-muted block truncate">{hint}</span></span>
            <ChevronRight className="w-5 h-5 text-se-muted shrink-0" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <p className="se-eyebrow mb-1">Entreprise &amp; compte</p>
        <h1 className="text-3xl font-extrabold text-se-ink">Réglages</h1>
      </header>
      <section className="mb-7"><p className="se-eyebrow mb-2">Entreprise</p>{list(exploitation)}</section>
      <section><p className="se-eyebrow mb-2">Établissements &amp; équipe</p>{list(lieux)}</section>

      {panel === 'company' && <CompanyPanel onClose={() => setPanel(null)} isAdmin={isAdmin} />}
      {panel === 'payment' && <PaymentPanel co={co} onClose={() => setPanel(null)} onOpenWallet={to('payroll')} />}
      {panel === 'establishments' && <EstablishmentsPanel ests={ests} isAdmin={isAdmin} onClose={() => setPanel(null)}
        onCreate={() => { setPanel(null); setCreating(true); }} onRates={(id) => navigate(`/${locale}/establishments/rates/${id}`)} />}
      {panel === 'rates' && <RatesPanel ests={active} onClose={() => setPanel(null)} />}
      {panel === 'links' && <LinksPanel ests={active} onClose={() => setPanel(null)} />}
      {panel === 'notifications' && <NotificationsPanel onClose={() => setPanel(null)} />}
      <CreateEstablishmentDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

/* ── Entreprise & profil ── */
function CompanyPanel({ onClose, isAdmin }: { onClose: () => void; isAdmin: boolean }) {
  const { company, user, setCompany, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: company?.name ?? '', siret: company?.siret ?? '', billing_email: '', vat_number: '', first: user?.first_name ?? '', last: user?.last_name ?? '' });
  const q = useQuery({
    queryKey: ['v2-reglages-company-full', company?.id], enabled: !!company?.id,
    queryFn: async () => (await supabase.from('companies').select('billing_email, vat_number, forward_withdrawn_shifts_to_freelancers' as never).eq('id', company!.id).single()).data as any,
  });
  useEffect(() => { if (q.data) setF((p) => ({ ...p, billing_email: q.data.billing_email ?? '', vat_number: q.data.vat_number ?? '' })); }, [q.data]);
  const forward = !!q.data?.forward_withdrawn_shifts_to_freelancers;

  const save = useMutation({
    mutationFn: async () => {
      if (isAdmin) {
        const { data, error } = await supabase.from('companies').update({ name: f.name.trim(), siret: f.siret.trim() || null, billing_email: f.billing_email.trim() || null, vat_number: f.vat_number.trim() || null } as never).eq('id', company!.id).select().single();
        if (error) throw error; setCompany(data as never);
      }
      const { data: u, error: ue } = await supabase.from('users').update({ first_name: f.first.trim(), last_name: f.last.trim() }).eq('id', user!.id).select().single();
      if (ue) throw ue; setUser(u as never);
    },
    onSuccess: () => { toast.success('Enregistré'); qc.invalidateQueries({ queryKey: ['v2-reglages-company'] }); onClose(); },
    onError: () => toast.error("L'enregistrement a échoué"),
  });
  const toggle = useMutation({
    mutationFn: async (v: boolean) => { const { error } = await supabase.from('companies').update({ forward_withdrawn_shifts_to_freelancers: v } as never).eq('id', company!.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['v2-reglages-company-full'] }); toast.success('Réglage mis à jour'); },
    onError: () => toast.error('Mise à jour impossible'),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <SeModal open onClose={onClose} title="Entreprise & profil" wide
      footer={<><button type="button" className={seGhost} onClick={onClose}>Annuler</button><button type="button" className={sePrimary} disabled={save.isPending || (isAdmin && !f.name.trim())} onClick={() => save.mutate()}>Enregistrer</button></>}>
      <div className="space-y-4">
        {isAdmin ? (
          <>
            <Labeled label="Nom de l'entreprise"><input className={seField} value={f.name} onChange={set('name')} /></Labeled>
            <div className="grid sm:grid-cols-2 gap-3">
              <Labeled label="SIRET"><input className={seField} value={f.siret} onChange={set('siret')} inputMode="numeric" /></Labeled>
              <Labeled label="N° de TVA"><input className={seField} value={f.vat_number} onChange={set('vat_number')} /></Labeled>
            </div>
            <Labeled label="E-mail de facturation"><input type="email" className={seField} value={f.billing_email} onChange={set('billing_email')} /></Labeled>
          </>
        ) : <Note>Seul un administrateur peut modifier l'entreprise.</Note>}
        <div className="grid sm:grid-cols-2 gap-3">
          <Labeled label="Prénom"><input className={seField} value={f.first} onChange={set('first')} /></Labeled>
          <Labeled label="Nom"><input className={seField} value={f.last} onChange={set('last')} /></Labeled>
        </div>
        {isAdmin && (
          <label className="flex items-start gap-3 rounded-se-sm border border-se-line p-3 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={forward} disabled={q.isLoading || toggle.isPending} onChange={(e) => toggle.mutate(e.target.checked)} />
            <span><span className="block text-sm font-semibold text-se-ink">Transférer aux auto-entrepreneurs en cas de désistement</span>
              <span className="block text-xs text-se-muted">Quand un salarié accepté se désiste, la place est proposée automatiquement aux auto-entrepreneurs (impact sur vos coûts). Appliqué immédiatement.</span></span>
          </label>
        )}
      </div>
    </SeModal>
  );
}

/* ── Paiement (lecture) ── */
function PaymentPanel({ co, onClose, onOpenWallet }: { co: any; onClose: () => void; onOpenWallet: () => void }) {
  const bt = co?.payment_mode === 'settlement' && co?.settlement_collection === 'bank_transfer';
  const rows: [string, string][] = [
    ['Moyen préféré', co?.preferred_payment_method === 'sepa' ? 'Prélèvement SEPA' : co?.preferred_payment_method === 'bank_transfer' ? 'Virement' : co?.preferred_payment_method ?? '—'],
    ['Prélèvement SEPA', co?.sepa_status ? `${co.sepa_status}${co.sepa_iban_last4 ? ` · •••• ${co.sepa_iban_last4}` : ''}` : 'Non configuré'],
    ['Mode de règlement', co?.payment_mode === 'settlement' ? `Règlement groupé${bt ? ' · virement' : ''}` : 'Par mission'],
  ];
  return (
    <SeModal open onClose={onClose} title="Paiement" subtitle="Comment vos auto-entrepreneurs sont réglés"
      footer={<><button type="button" className={seGhost} onClick={onClose}>Fermer</button><button type="button" className={sePrimary} onClick={onOpenWallet}>Gérer le paiement</button></>}>
      <dl className="text-sm space-y-2">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-se-muted">{k}</dt><dd className="text-se-ink text-right font-semibold">{v}</dd></div>)}</dl>
      <p className="text-xs text-se-muted mt-4">La configuration du SEPA et du virement se fait dans « Gérer le paiement ».</p>
    </SeModal>
  );
}

/* ── Établissements ── */
function EstablishmentsPanel({ ests, isAdmin, onClose, onCreate, onRates }: { ests: any[]; isAdmin: boolean; onClose: () => void; onCreate: () => void; onRates: (id: string) => void }) {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const cur = ests.find((e) => e.id === editId);
  const [f, setF] = useState({ name: '', phone: '', auto: false });
  useEffect(() => { if (cur) setF({ name: cur.name ?? '', phone: cur.phone ?? '', auto: !!cur.auto_accept_applications }); }, [editId]); // eslint-disable-line
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('establishments').update({ name: f.name.trim(), phone: f.phone.trim() || null, auto_accept_applications: f.auto } as never).eq('id', editId!); if (error) throw error; },
    onSuccess: () => { toast.success('Établissement mis à jour'); setEditId(null); qc.invalidateQueries({ queryKey: ['v2-reglages-ests'] }); qc.invalidateQueries({ queryKey: ['v2-planning-establishments'] }); },
    onError: () => toast.error("L'enregistrement a échoué"),
  });
  return (
    <SeModal open onClose={onClose} title="Établissements" subtitle="Vos lieux de travail" wide
      footer={<><button type="button" className={seGhost} onClick={onClose}>Fermer</button>{isAdmin && <button type="button" className={sePrimary} onClick={onCreate}><Plus className="w-4 h-4" aria-hidden="true" /> Ajouter</button>}</>}>
      {cur ? (
        <div className="space-y-3">
          <Labeled label="Nom"><input className={seField} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labeled>
          <Labeled label="Téléphone"><input className={seField} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Labeled>
          <Labeled label="Adresse" hint="Pour changer l'adresse, supprimez et recréez l'établissement (géolocalisation)."><input className={seField} value={[cur.address, cur.postal_code, cur.city].filter(Boolean).join(', ')} disabled readOnly /></Labeled>
          <label className="flex items-start gap-3 rounded-se-sm border border-se-line p-3 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={f.auto} onChange={(e) => setF({ ...f, auto: e.target.checked })} />
            <span><span className="block text-sm font-semibold text-se-ink">Acceptation automatique des candidatures</span><span className="block text-xs text-se-muted">Sinon, vous validez chaque candidat vous-même.</span></span>
          </label>
          <div className="flex gap-2 justify-end pt-1"><button type="button" className={seGhost} onClick={() => setEditId(null)}>Retour</button><button type="button" className={sePrimary} disabled={!f.name.trim() || save.isPending} onClick={() => save.mutate()}>Enregistrer</button></div>
        </div>
      ) : ests.length === 0 ? <p className="text-sm text-se-muted">Aucun établissement.</p> : (
        <ul className="divide-y divide-se-line-soft">
          {ests.map((e) => (
            <li key={e.id} className="py-3 flex items-center gap-3">
              <span className="min-w-0 flex-1"><span className="block font-semibold text-se-ink truncate">{e.name}{e.status !== 'active' && <span className="ml-2 se-badge bg-se-surface-2 text-se-muted">{e.status}</span>}</span>
                <span className="block text-xs text-se-muted truncate">{[e.address, e.city].filter(Boolean).join(', ') || '—'}</span></span>
              <button type="button" className={seGhost} onClick={() => onRates(e.id)}>Tarifs</button>
              {isAdmin && <button type="button" className={seGhost} onClick={() => setEditId(e.id)}>Modifier</button>}
            </li>
          ))}
        </ul>
      )}
    </SeModal>
  );
}

/* ── Tarification ── */
function RatesPanel({ ests, onClose }: { ests: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [estId, setEstId] = useState(ests[0]?.id ?? '');
  const [edit, setEdit] = useState<Record<string, { min?: string; max?: string }>>({});
  const q = useQuery({
    queryKey: ['v2-reglages-rates', estId], enabled: !!estId,
    queryFn: async () => {
      const { data, error } = await supabase.from('establishment_job_rates').select('id, min_rate, max_rate, job_position:job_positions(name_translations, recommended_hourly_rate_min, recommended_hourly_rate_max), category:establishment_categories(name_translations)').eq('establishment_id', estId).order('category_id');
      if (error) throw error; return (data ?? []) as any[];
    },
  });
  useEffect(() => setEdit({}), [estId]);
  const dirty = Object.keys(edit);
  const save = useMutation({
    mutationFn: async () => {
      const rows = q.data!.filter((r) => edit[r.id]);
      for (const r of rows) {
        const min = parseFloat(edit[r.id].min ?? String(r.min_rate)); const max = parseFloat(edit[r.id].max ?? String(r.max_rate));
        if (!(min >= 0) || !(max >= min)) throw new Error('bad');
        const { error } = await supabase.from('establishment_job_rates').update({ min_rate: min, max_rate: max }).eq('id', r.id); if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Tarification mise à jour'); setEdit({}); qc.invalidateQueries({ queryKey: ['v2-reglages-rates', estId] }); },
    onError: (e: any) => toast.error(e?.message === 'bad' ? 'Le maximum doit être supérieur ou égal au minimum' : "L'enregistrement a échoué"),
  });
  const inp = (r: any, k: 'min' | 'max') => (
    <input aria-label={`${k === 'min' ? 'Minimum' : 'Maximum'} ${trName(r.job_position?.name_translations)}`} inputMode="decimal" className={`${seField} !h-9 w-24 text-right`}
      value={edit[r.id]?.[k] ?? String(k === 'min' ? r.min_rate : r.max_rate)} onChange={(e) => setEdit({ ...edit, [r.id]: { ...edit[r.id], [k]: e.target.value } })} />
  );
  return (
    <SeModal open onClose={onClose} title="Tarification" subtitle="Fourchette de tarif horaire (€/h) proposée aux auto-entrepreneurs" wide
      footer={<><button type="button" className={seGhost} onClick={onClose}>Fermer</button><button type="button" className={sePrimary} disabled={!dirty.length || save.isPending} onClick={() => save.mutate()}>Enregistrer</button></>}>
      {ests.length > 1 && <select value={estId} onChange={(e) => setEstId(e.target.value)} aria-label="Établissement" className={`${seField} mb-3`}>{ests.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>}
      {q.isLoading ? <div className="py-8 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-se-muted" /></div> : !q.data?.length ? <p className="text-sm text-se-muted">Aucun tarif défini pour cet établissement.</p> : (
        <table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase text-se-muted"><th className="py-1.5">Poste</th><th className="py-1.5 text-right">Min</th><th className="py-1.5 text-right">Max</th><th className="py-1.5 text-right hidden sm:table-cell">Conseillé</th></tr></thead>
          <tbody className="divide-y divide-se-line-soft">{q.data.map((r) => (
            <tr key={r.id}><td className="py-2"><span className="font-semibold text-se-ink">{trName(r.job_position?.name_translations)}</span><span className="block text-[11px] text-se-muted">{trName(r.category?.name_translations)}</span></td>
              <td className="py-2 text-right">{inp(r, 'min')}</td><td className="py-2 text-right">{inp(r, 'max')}</td>
              <td className="py-2 text-right text-xs text-se-muted hidden sm:table-cell">{r.job_position?.recommended_hourly_rate_min ?? '—'}–{r.job_position?.recommended_hourly_rate_max ?? '—'}</td></tr>))}</tbody></table>
      )}
    </SeModal>
  );
}

/* ── Liens à partager ── */
function LinksPanel({ ests, onClose }: { ests: any[]; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['v2-reglages-links', ests.map((e) => e.id).join()], enabled: ests.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('establishment_invitations').select('id, token, establishment_id, expires_at, max_uses, current_uses').eq('is_active', true).in('establishment_id', ests.map((e) => e.id));
      if (error) throw error; return (data ?? []) as any[];
    },
  });
  const copy = (token: string) => { void navigator.clipboard.writeText(`${window.location.origin}/invite/general/${token}`); toast.success('Lien copié'); };
  return (
    <SeModal open onClose={onClose} title="Liens à partager" subtitle="Votre équipe s'inscrit à l'établissement via ce lien" wide
      footer={<button type="button" className={seGhost} onClick={onClose}>Fermer</button>}>
      {q.isLoading ? <div className="py-8 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-se-muted" /></div> : (
        <ul className="divide-y divide-se-line-soft">
          {ests.map((e) => {
            const inv = (q.data ?? []).filter((i) => i.establishment_id === e.id);
            return (
              <li key={e.id} className="py-3">
                <p className="font-semibold text-se-ink">{e.name}</p>
                {inv.length === 0 ? <p className="text-xs text-se-muted">Aucun lien actif.</p> : inv.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 mt-1.5">
                    <code className="flex-1 min-w-0 truncate text-xs bg-se-surface-2 rounded-se-sm px-2 py-2">{`${window.location.origin}/invite/general/${i.token}`}</code>
                    <button type="button" className={seGhost} onClick={() => copy(i.token)} aria-label="Copier le lien"><Copy className="w-4 h-4" /></button>
                  </div>))}
              </li>
            );
          })}
        </ul>
      )}
    </SeModal>
  );
}

/* ── Notifications ── */
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['v2-reglages-notif', user?.id], enabled: !!user?.id,
    queryFn: async () => (await supabase.from('notification_preferences').select('id, email_enabled, push_enabled').eq('user_id', user!.id).is('freelancer_id', null).maybeSingle()).data as any,
  });
  const set = useMutation({
    mutationFn: async (patch: { email_enabled?: boolean; push_enabled?: boolean }) => {
      if (q.data?.id) { const { error } = await supabase.from('notification_preferences').update(patch).eq('id', q.data.id); if (error) throw error; }
      else { const { error } = await supabase.from('notification_preferences').insert({ user_id: user!.id, email_enabled: true, push_enabled: true, ...patch } as never); if (error) throw error; }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v2-reglages-notif'] }),
    onError: () => toast.error('Mise à jour impossible'),
  });
  const Row = ({ k, label, hint }: { k: 'email_enabled' | 'push_enabled'; label: string; hint: string }) => (
    <label className="flex items-start gap-3 rounded-se-sm border border-se-line p-3 cursor-pointer">
      <input type="checkbox" className="mt-1" checked={q.data ? !!q.data[k] : true} disabled={q.isLoading || set.isPending} onChange={(e) => set.mutate({ [k]: e.target.checked })} />
      <span><span className="block text-sm font-semibold text-se-ink">{label}</span><span className="block text-xs text-se-muted">{hint}</span></span>
    </label>
  );
  return (
    <SeModal open onClose={onClose} title="Notifications" subtitle="Appliqué immédiatement" footer={<button type="button" className={seGhost} onClick={onClose}>Fermer</button>}>
      <div className="space-y-2.5">
        <Row k="email_enabled" label="E-mail" hint="Candidatures, validations, factures." />
        <Row k="push_enabled" label="Notifications push" hint="Sur l'application mobile et le navigateur." />
      </div>
    </SeModal>
  );
}
