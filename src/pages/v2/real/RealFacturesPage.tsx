/**
 * Factures & heures — l'argent et les heures au même endroit, par période.
 * Branché sur Supabase : relevé d'heures (salariés + auto-entrepreneurs) et
 * factures de l'entreprise. Période et établissement filtrent tout.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Clock, Download, FileText, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PeriodPicker, monthRange, rangeLabel } from '../factures/PeriodPicker';
import type { DateRange, PeriodKey } from '../factures/PeriodPicker';
import { InvoicePreviewDialog } from '@/components/finance/Invoicepreviewdialog';
import { getInvoiceTypeMeta } from '@/components/finance/Invoice';
import type { InvoiceRecord } from '@/components/finance/Invoice';
import { usePlanningEstablishments } from './usePlanningMissions';
import { useCompanyInvoices, useHourLines } from './useFacturesData';
import type { HourLine } from './useFacturesData';
import { Face } from './MissionCard';
import { fmtDay, todayISO } from './dates';

type Tab = 'heures' | 'factures';
type Who = 'all' | 'salarie' | 'freelance';

const eur = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
const dur = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Validé', cls: 'bg-se-success-wash text-se-success' },
  closed: { label: 'Validé', cls: 'bg-se-success-wash text-se-success' },
  pending_payment: { label: 'Paiement en cours', cls: 'bg-se-blue-wash text-se-blue-ink' },
  pending_validation: { label: 'À valider', cls: 'bg-se-cascade-wash text-se-cascade-ink' },
};

function downloadCsv(lines: HourLine[], periode: string) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['Date', 'Nom', 'Type', 'Arrivée', 'Sortie', 'Pause (min)', 'Durée', 'Lieu', 'Poste', 'Statut', 'Montant (€)'];
  const rows = lines.map((r) => [
    r.date.split('-').reverse().join('/'), r.name, r.kind === 'salarie' ? 'Salarié' : 'Auto-entrepreneur',
    r.start, r.end, r.breakMin, `${Math.floor(r.minutes / 60)}:${String(r.minutes % 60).padStart(2, '0')}`,
    r.establishment, r.poste, STATUS[r.shiftStatus]?.label ?? 'Planifié', r.amount === null ? '' : String(r.amount).replace('.', ','),
  ].map(esc).join(';'));
  const csv = '﻿' + [header.map(esc).join(';'), ...rows].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `releve-heures-${periode.replace(/[^\w]+/g, '-').toLowerCase()}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

export function RealFacturesPage() {
  const navigate = useNavigate();
  const { locale = 'fr' } = useParams<{ locale: string }>();
  const today = todayISO();
  const [tab, setTab] = useState<Tab>('heures');
  const [periodKey, setPeriodKey] = useState<PeriodKey>('current');
  const [range, setRange] = useState<DateRange>(() => monthRange(today, 0));
  const [estId, setEstId] = useState('');
  const [who, setWho] = useState<Who>('all');
  const [q, setQ] = useState('');
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const periode = rangeLabel(range);

  const { data: establishments = [] } = usePlanningEstablishments();
  const linesQ = useHourLines(range.from, range.to);
  const invQ = useCompanyInvoices(range.from, range.to);

  const lines = useMemo(() => (linesQ.data ?? []).filter((l) => !estId || l.establishmentId === estId), [linesQ.data, estId]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return lines.filter((l) => (who === 'all' || l.kind === who) && (!s || l.name.toLowerCase().includes(s) || l.poste.toLowerCase().includes(s) || l.establishment.toLowerCase().includes(s)));
  }, [lines, who, q]);

  const totalMin = lines.reduce((s, l) => s + l.minutes, 0);
  const paie = lines.filter((l) => l.kind === 'salarie').reduce((s, l) => s + (l.amount ?? 0), 0);
  const freeTTC = lines.filter((l) => l.kind === 'freelance').reduce((s, l) => s + (l.amount ?? 0), 0);
  const noRate = lines.filter((l) => l.kind === 'salarie' && l.amount === null).length;
  const toValidate = new Set(lines.filter((l) => l.shiftStatus === 'pending_validation').map((l) => l.shiftId)).size;

  const invoices = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (invQ.data ?? []).filter((i) => !s || [i.reference, i.seller_name, i.buyer_name, i.description].some((v) => (v ?? '').toLowerCase().includes(s)));
  }, [invQ.data, q]);

  const openShift = (id: string) => navigate(`/${locale}/v2?shift=${id}`);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="se-eyebrow mb-1">Argent &amp; heures au même endroit</p>
          <h1 className="text-3xl font-extrabold text-se-ink">Factures &amp; heures</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {establishments.length > 1 && (
            <label className="relative inline-flex items-center">
              <Building2 className="absolute left-3 w-4 h-4 text-se-muted pointer-events-none" aria-hidden="true" />
              <select value={estId} onChange={(e) => setEstId(e.target.value)} aria-label="Établissement"
                className={`h-10 pl-9 pr-8 rounded-se-sm border text-sm font-semibold appearance-none bg-se-surface focus:outline-none focus:border-se-blue ${estId ? 'border-se-blue text-se-blue-ink' : 'border-se-line text-se-ink'}`}>
                <option value="">Tous les établissements</option>
                {establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
          )}
          <PeriodPicker today={today} value={periodKey} range={range} onChange={(k, r) => { setPeriodKey(k); setRange(r); }} />
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Heures" value={dur(totalMin)} hint={`${lines.length} ligne${lines.length > 1 ? 's' : ''} sur la période`} />
        <Stat label="Paie (salariés)" value={eur(paie)} hint={noRate ? `${noRate} ligne${noRate > 1 ? 's' : ''} sans tarif horaire` : 'heures × tarif de la fiche salarié'} />
        <Stat label="Auto-entrepreneurs" value={`${eur(freeTTC)} TTC`} hint="facturé via Shift Express" accent />
        <Stat label="À valider" value={String(toValidate)} hint={toValidate ? `shift${toValidate > 1 ? 's' : ''} dont les heures attendent` : 'rien en attente'} />
      </div>

      <div role="tablist" aria-label="Factures & heures" className="flex gap-1 border-b border-se-line mb-4">
        {([['heures', "Relevé d'heures", Clock], ['factures', 'Factures', FileText]] as const).map(([key, label, Icon]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors ${tab === key ? 'border-se-blue text-se-ink' : 'border-transparent text-se-muted hover:text-se-ink'}`}>
            <Icon className={`w-4 h-4 ${tab === key ? 'text-se-blue-ink' : ''}`} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-se-muted" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'heures' ? 'Nom, poste, lieu…' : 'Référence, nom, description…'}
            className="w-full h-10 pl-9 pr-3 rounded-se-sm border border-se-line bg-se-surface text-sm text-se-ink focus:outline-none focus:border-se-blue" />
        </div>
        {tab === 'heures' && (
          <>
            {([['all', 'Tous'], ['salarie', 'Salariés'], ['freelance', 'Auto-entrepreneurs']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setWho(k)}
                className={`h-8 px-3 rounded-full text-xs font-semibold border ${who === k ? 'bg-se-ink text-white border-se-ink' : 'bg-se-surface text-se-ink border-se-line hover:bg-se-surface-2'}`}>{l}</button>
            ))}
            <button type="button" disabled={shown.length === 0}
              onClick={() => { downloadCsv(shown, periode); toast.success('Relevé téléchargé'); }}
              className="ml-auto inline-flex items-center gap-1.5 h-10 px-3.5 rounded-se-sm text-sm font-semibold bg-se-blue text-white hover:bg-se-blue-ink disabled:opacity-50">
              <Download className="w-4 h-4" aria-hidden="true" /> Exporter en Excel
            </button>
          </>
        )}
      </div>

      {tab === 'heures' ? (
        linesQ.isLoading ? <Loading /> : linesQ.isError ? <Err /> : shown.length === 0 ? (
          <Empty text="Aucune heure sur cette période." />
        ) : (
          <div className="bg-se-surface border border-se-line rounded-se shadow-se overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-se-muted border-b border-se-line">
                  <th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Nom</th><th className="px-3 py-2.5">Arrivée</th>
                  <th className="px-3 py-2.5">Sortie</th><th className="px-3 py-2.5">Durée</th><th className="px-3 py-2.5">Lieu</th>
                  <th className="px-3 py-2.5">Poste</th><th className="px-3 py-2.5">Statut</th><th className="px-3 py-2.5 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-se-line-soft">
                {shown.map((l) => {
                  const st = STATUS[l.shiftStatus];
                  return (
                    <tr key={l.key} onClick={() => openShift(l.shiftId)} className="cursor-pointer hover:bg-se-surface-2">
                      <td className="px-3 py-2 whitespace-nowrap text-se-ink">{fmtDay(l.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2"><Face p={{ id: l.personId, name: l.name, photo: null, kind: l.kind }} size={24} /><span className="font-semibold text-se-ink">{l.name}</span></span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{l.start}</td>
                      <td className="px-3 py-2 tabular-nums">{l.end}{!l.real && <span className="ml-1 text-[10px] text-se-muted" title="Heures prévues, non encore ajustées">prévu</span>}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{dur(l.minutes)}</td>
                      <td className="px-3 py-2 text-se-muted max-w-[160px] truncate">{l.establishment}</td>
                      <td className="px-3 py-2 text-se-ink max-w-[160px] truncate">{l.poste}</td>
                      <td className="px-3 py-2">{st ? <span className={`se-badge ${st.cls}`}>{st.label}</span> : <span className="text-xs text-se-muted">Planifié</span>}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {l.kind === 'freelance'
                          ? <span className="font-semibold text-se-freelance-ink">{l.amount !== null ? eur(l.amount) : '—'}<span className="block text-[11px] font-normal text-se-muted">TTC · au devis</span></span>
                          : <span className="font-semibold text-se-ink">{l.amount !== null ? eur(l.amount) : '—'}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : invQ.isLoading ? <Loading /> : invQ.isError ? <Err /> : invoices.length === 0 ? (
        <Empty text="Aucune facture sur cette période." />
      ) : (
        <div className="bg-se-surface border border-se-line rounded-se shadow-se overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-se-muted border-b border-se-line">
                <th className="px-3 py-2.5">Référence</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Émetteur</th>
                <th className="px-3 py-2.5">Description</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5 text-right">HT</th><th className="px-3 py-2.5 text-right">TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-se-line-soft">
              {invoices.map((i) => (
                <tr key={i.id} onClick={() => setInvoice(i)} className="cursor-pointer hover:bg-se-surface-2">
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-se-ink whitespace-nowrap">{i.reference}</td>
                  <td className="px-3 py-2 whitespace-nowrap"><span className="se-badge bg-se-surface-2 text-se-ink">{getInvoiceTypeMeta(i.type).shortLabel}</span></td>
                  <td className="px-3 py-2 text-se-ink max-w-[180px] truncate">{i.seller_name}</td>
                  <td className="px-3 py-2 text-se-muted max-w-[240px] truncate">{i.description}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-se-muted">{new Date(i.issued_at ?? i.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-3 py-2">{i.status === 'issued' ? <span className="se-badge bg-se-success-wash text-se-success">Émise</span> : <span className="se-badge bg-se-cascade-wash text-se-cascade-ink">Brouillon</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(Number(i.amount_ht))}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-se-ink">{eur(Number(i.amount_ttc))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-se-muted mt-2">
        {tab === 'heures'
          ? "Clic sur une ligne : ouvre le shift pour ajuster ou valider les heures. Les heures des auto-entrepreneurs ne se modifient pas : la facture au devis fait foi."
          : 'Clic sur une facture : aperçu et téléchargement du PDF.'}
      </p>

      <InvoicePreviewDialog invoice={invoice} isOpen={!!invoice} onClose={() => setInvoice(null)} />
    </div>
  );
}

const Loading = () => <div className="py-12 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-se-muted" aria-label="Chargement" /></div>;
const Err = () => <p className="text-sm text-se-danger bg-se-danger-wash rounded-se p-6 text-center">Impossible de charger les données. Réessayez dans un instant.</p>;
const Empty = ({ text }: { text: string }) => <p className="text-sm text-se-muted bg-se-surface border border-se-line rounded-se p-8 text-center">{text}</p>;

function Stat({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className="bg-se-surface border border-se-line rounded-se px-4 py-3.5 shadow-se">
      <p className="se-eyebrow mb-1">{label}</p>
      <p className={`text-xl font-extrabold font-display ${accent ? 'text-se-freelance-ink' : 'text-se-ink'}`}>{value}</p>
      <p className="text-xs text-se-muted mt-0.5">{hint}</p>
    </div>
  );
}
