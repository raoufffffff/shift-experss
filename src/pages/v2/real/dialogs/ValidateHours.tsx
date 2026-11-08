import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, Building2, Check, CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { DEFAULT_PLATFORM_FEE_RATE } from '@shift-express/shared';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { SeModal, Note, sePrimary, seGhost } from './SeModal';

interface ShiftIn {
  id: string; start_time: string; end_time: string;
  actual_start_time?: string | null; actual_end_time?: string | null;
  break_duration_minutes: number; actual_break_duration_minutes?: number | null;
  freelance_hourly_rate?: number | null; platform_fee_rate?: number | null;
}

const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 10000;
const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const newReference = () =>
  `PAY-${Array.from(crypto.getRandomValues(new Uint8Array(3))).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

// Coordonnées bancaires : identiques à l'écran existant (WireTransferConfirmation)
const WIRE = { beneficiary: 'SHIFT EXPRESS SAS', iban: 'FR76 XXXX XXXX XXXX XXXX XXXX XXX', bic: 'XXXXXXXX' };

type Step = 'form' | 'processing' | 'wire';
const STEPS = ['Vérification du shift…', 'Connexion au système de paiement…', 'Traitement du prélèvement SEPA…', 'Finalisation…'];

export function ValidateHours({
  shift, acceptedFreelancers, open, onClose,
}: { shift: ShiftIn; acceptedFreelancers: number; open: boolean; onClose: () => void }) {
  const { company, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('form');
  const [procStep, setProcStep] = useState(0);
  const [wireRef, setWireRef] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: pay, isLoading: payLoading } = useQuery({
    queryKey: ['company-payment-config', company?.id],
    enabled: !!company?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('preferred_payment_method, sepa_payment_method_id, sepa_iban_last4, sepa_status' as never)
        .eq('id', company?.id ?? '')
        .single();
      if (error) throw error;
      return data as unknown as {
        preferred_payment_method: string | null; sepa_payment_method_id: string | null;
        sepa_iban_last4: string | null; sepa_status: string | null;
      };
    },
  });
  const sepaOk = !!pay?.sepa_payment_method_id && pay?.sepa_status === 'active';
  const pref = pay?.preferred_payment_method ?? null;
  const method: 'sepa' | 'wire' = pref === 'sepa' && sepaOk ? 'sepa' : pref === 'wire_transfer' ? 'wire' : sepaOk ? 'sepa' : 'wire';

  const costs = useMemo(() => {
    const start = new Date(shift.actual_start_time || shift.start_time);
    const end = new Date(shift.actual_end_time || shift.end_time);
    const hours = (end.getTime() - start.getTime()) / 3_600_000;
    const rate = shift.freelance_hourly_rate || 0;
    const fee = shift.platform_fee_rate ?? company?.platform_fee_rate ?? DEFAULT_PLATFORM_FEE_RATE;
    const base = Math.round(hours * rate * 100) / 100;
    const withFee = Math.round(base * (1 + fee / 100) * 100) / 100;
    const count = acceptedFreelancers || 1;
    const total = withFee * count;
    return { hours, rate, fee, total, commission: total - base * count };
  }, [shift, company, acceptedFreelancers]);

  const errors: string[] = [];
  const warnings: string[] = [];
  if (costs.total < MIN_AMOUNT) errors.push(`Le montant minimum est de ${eur(MIN_AMOUNT)}`);
  if (costs.total > MAX_AMOUNT) errors.push(`Le montant maximum est de ${eur(MAX_AMOUNT)}`);
  if (!costs.rate || costs.rate <= 0) errors.push('Aucun taux horaire défini pour ce shift');
  if (costs.hours <= 0) errors.push('La durée du shift est invalide');
  if (costs.hours > 12) warnings.push(`Ce shift dure ${costs.hours.toFixed(1)} h — vérifiez que c'est correct`);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['shift', shift.id] });
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    queryClient.invalidateQueries({ queryKey: ['v2-planning-missions'] });
  };
  const close = () => {
    onClose();
    setTimeout(() => { setStep('form'); setWireRef(null); }, 200);
  };

  const sepa = useMutation({
    mutationFn: async () => {
      if (errors.length) throw new Error(errors[0]);
      const r = await apiClient.post(`/api/stripe/shifts/${shift.id}/validate`);
      return r.data as { status: string };
    },
    onSuccess: (data) => {
      setProcStep(3);
      setTimeout(() => {
        if (data.status === 'succeeded') {
          toast.success('Heures validées', { description: `Prélèvement SEPA de ${eur(costs.total)} initié` });
          refresh(); close();
        } else if (data.status === 'pending_approval') {
          toast.info('Approbation en attente', { description: "La personne a été notifiée de vos ajustements. Le paiement partira dès qu'elle les aura acceptés, ou automatiquement après 48 h." });
          refresh(); close();
        }
        setStep('form');
      }, 1000);
    },
    onError: (error: unknown) => {
      setStep('form');
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error('Erreur de validation', { description: err.response?.data?.error || err.message || 'Erreur' });
    },
  });

  const wire = useMutation({
    mutationFn: async () => {
      if (errors.length) throw new Error(errors[0]);
      if (!company?.id || !user?.id) throw new Error('Données manquantes');
      const reference = newReference();
      const { error: tErr } = await supabase.from('payment_tickets' as never).insert({
        reference, shift_id: shift.id, company_id: company.id, requested_by: user.id, amount: costs.total,
      } as never);
      if (tErr) throw tErr;
      const { error: sErr } = await supabase.from('shifts').update({ status: 'pending_payment' as never, updated_at: new Date().toISOString() }).eq('id', shift.id);
      if (sErr) throw sErr;
      return { reference };
    },
    onSuccess: (d) => { setWireRef(d.reference); setStep('wire'); refresh(); toast.success('Ticket de paiement créé'); },
    onError: (e: unknown) => toast.error('Erreur lors de la création du ticket', { description: (e as Error).message }),
  });

  const confirm = async () => {
    if (method === 'sepa') {
      setStep('processing'); setProcStep(0);
      await new Promise((r) => setTimeout(r, 800)); setProcStep(1);
      await new Promise((r) => setTimeout(r, 600)); setProcStep(2);
      sepa.mutate();
    } else wire.mutate();
  };
  const pending = sepa.isPending || wire.isPending;
  const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  if (step === 'processing')
    return (
      <SeModal open={open} onClose={() => undefined} title="Paiement en cours" subtitle={eur(costs.total)}>
        <ul className="space-y-3 py-2">
          {STEPS.map((label, i) => (
            <li key={label} className={`flex items-center gap-3 text-sm transition-opacity ${i <= procStep ? 'opacity-100' : 'opacity-30'}`}>
              <span className={`w-7 h-7 rounded-full grid place-items-center ${i < procStep ? 'bg-se-success-wash text-se-success' : 'bg-se-blue-wash text-se-blue-ink'}`}>
                {i < procStep ? <CheckCircle2 className="w-4 h-4" /> : i === procStep ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs">{i + 1}</span>}
              </span>
              <span className="font-semibold text-se-ink">{label}</span>
            </li>
          ))}
        </ul>
      </SeModal>
    );

  if (step === 'wire' && wireRef) {
    const rows: [string, string, string, boolean?][] = [
      ['Bénéficiaire', WIRE.beneficiary, WIRE.beneficiary],
      ['IBAN', WIRE.iban, WIRE.iban.replace(/\s/g, '')],
      ['BIC / SWIFT', WIRE.bic, WIRE.bic],
      ['Référence du virement', wireRef, wireRef, true],
      ['Montant exact', eur(costs.total), costs.total.toFixed(2)],
    ];
    return (
      <SeModal open={open} onClose={close} title="Ticket de paiement créé" subtitle="Effectuez le virement ci-dessous. Le shift sera validé dès réception." footer={<button type="button" className={sePrimary} onClick={close}>Fermer</button>}>
        <ul className="space-y-2">
          {rows.map(([label, value, raw, hl]) => (
            <li key={label} className={`flex items-center justify-between gap-2 rounded-se-sm p-2.5 ${hl ? 'bg-se-blue-wash' : 'bg-se-surface-2'}`}>
              <span className="min-w-0"><span className="block text-xs text-se-muted">{label}</span><span className="block font-mono text-sm font-semibold text-se-ink truncate">{value}</span></span>
              <button type="button" onClick={() => copy(raw, label)} aria-label={`Copier ${label}`} className="p-1.5 rounded-se-sm text-se-muted hover:text-se-ink">
                {copied === label ? <Check className="w-4 h-4 text-se-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
        <Note tone="warn"><b>Important :</b> indiquez la référence dans le motif du virement, sans elle nous ne pourrons pas identifier votre paiement.</Note>
      </SeModal>
    );
  }

  return (
    <SeModal
      open={open}
      onClose={close}
      title="Valider les heures"
      subtitle="Confirmez les heures travaillées pour déclencher le paiement."
      footer={
        <>
          <button type="button" className={seGhost} onClick={close} disabled={pending}>Annuler</button>
          <button type="button" className={sePrimary} onClick={confirm} disabled={pending || payLoading || errors.length > 0}>
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {method === 'sepa' ? 'Confirmer le prélèvement' : 'Payer par virement'}
          </button>
        </>
      }
    >
      {errors.length > 0 && <Note tone="danger">{errors.map((e) => <p key={e}>{e}</p>)}</Note>}
      {warnings.length > 0 && errors.length === 0 && <Note tone="warn">{warnings.map((w) => <p key={w}>{w}</p>)}</Note>}
      <div className="rounded-se-sm bg-se-surface-2 p-4 space-y-2">
        <div className="flex justify-between items-baseline"><span className="text-sm text-se-muted">Coût total</span><span className="font-display font-extrabold text-xl text-se-ink">{eur(costs.total)}</span></div>
        <div className="border-t border-se-line pt-2 space-y-1 text-xs text-se-muted">
          <div className="flex justify-between"><span>Prestation</span><span>{costs.hours.toFixed(2)} h × {eur(costs.rate)}/h = {eur(costs.total - costs.commission)}</span></div>
          <div className="flex justify-between"><span>Commission ({costs.fee} %)</span><span>+{eur(costs.commission)}</span></div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-se-sm border border-se-line p-3">
        {method === 'sepa' ? <Building2 className="w-5 h-5 text-se-blue shrink-0" /> : <Banknote className="w-5 h-5 text-se-blue shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-se-ink">{method === 'sepa' ? 'Prélèvement automatique (SEPA)' : 'Virement manuel'}</p>
          <p className="text-xs text-se-muted">{method === 'sepa' ? `IBAN ****${pay?.sepa_iban_last4 || '****'}` : 'Virement bancaire — validation par notre équipe'}</p>
        </div>
        {method === 'sepa' && <CheckCircle2 className="w-4 h-4 text-se-success shrink-0" />}
      </div>
    </SeModal>
  );
}
