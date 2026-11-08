import { useEffect, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import type { RescheduleEntry, LinkedShift } from '@/pages/shifts/hooks/useShiftDetail';
import { SeModal, Labeled, Note, seField, sePrimary, seGhost } from './SeModal';

interface Row { shiftId: string; date: string; startTime: string; endTime: string }
const p2 = (n: number) => String(n).padStart(2, '0');
const dateOf = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const timeOf = (iso: string) => { const d = new Date(iso); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const buildIso = (date: string, time: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0, 0).toISOString();
};

export function Reschedule({
  open, onClose, shifts, isPending, onConfirm,
}: { open: boolean; onClose: () => void; shifts: LinkedShift[]; isPending: boolean; onConfirm: (e: RescheduleEntry[]) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!open) return;
    setRows(shifts.map((s) => ({ shiftId: s.id, date: dateOf(s.start_time), startTime: timeOf(s.start_time), endTime: timeOf(s.end_time) })));
  }, [open, shifts]);

  const grouped = shifts.length > 1;
  const upd = (id: string, k: keyof Row, v: string) => setRows((r) => r.map((x) => (x.shiftId === id ? { ...x, [k]: v } : x)));

  const errors: Record<string, string | null> = {};
  rows.forEach((r) => {
    if (!r.date || !r.startTime || !r.endTime) { errors[r.shiftId] = 'Veuillez remplir tous les champs'; return; }
    const s = new Date(buildIso(r.date, r.startTime)).getTime();
    let e = new Date(buildIso(r.date, r.endTime)).getTime();
    if (e <= s) e += 86_400_000; // se prolonge après minuit
    if (s <= Date.now()) { errors[r.shiftId] = 'Le nouvel horaire doit être dans le futur'; return; }
    if (e - s < 30 * 60_000) { errors[r.shiftId] = 'Le shift doit durer au moins 30 minutes'; return; }
    errors[r.shiftId] = null;
  });
  const hasErrors = Object.values(errors).some(Boolean);

  const confirm = () => {
    if (hasErrors) return;
    onConfirm(rows.map((r) => {
      const newStartTime = buildIso(r.date, r.startTime);
      let newEndTime = buildIso(r.date, r.endTime);
      if (new Date(newEndTime).getTime() <= new Date(newStartTime).getTime()) {
        const d = new Date(newEndTime); d.setDate(d.getDate() + 1); newEndTime = d.toISOString();
      }
      return { shiftId: r.shiftId, newStartTime, newEndTime };
    }));
  };

  return (
    <SeModal
      open={open}
      onClose={onClose}
      wide
      title="Changer le créneau"
      footer={
        <>
          <button type="button" className={seGhost} onClick={onClose} disabled={isPending}>Annuler</button>
          <button type="button" className={sePrimary} onClick={confirm} disabled={isPending || hasErrors || rows.length === 0}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Confirmer
          </button>
        </>
      }
    >
      {grouped && (
        <Note><span className="inline-flex items-center gap-2"><Link2 className="w-4 h-4" aria-hidden="true" />Les {shifts.length} jours de cette série seront mis à jour en une fois.</span></Note>
      )}
      <Note tone="warn">Les candidatures en attente sur le(s) shift(s) replanifié(s) seront supprimées automatiquement.</Note>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.shiftId} className="rounded-se border border-se-line p-3 space-y-2">
            {grouped && <p className="se-eyebrow">Jour {i + 1}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Labeled label="Date"><input type="date" className={seField} value={row.date} onChange={(e) => upd(row.shiftId, 'date', e.target.value)} /></Labeled>
              <Labeled label="Début"><input type="time" className={seField} value={row.startTime} onChange={(e) => upd(row.shiftId, 'startTime', e.target.value)} /></Labeled>
              <Labeled label="Fin"><input type="time" className={seField} value={row.endTime} onChange={(e) => upd(row.shiftId, 'endTime', e.target.value)} /></Labeled>
            </div>
            {errors[row.shiftId] && <p className="text-xs font-semibold text-se-danger">{errors[row.shiftId]}</p>}
          </div>
        ))}
      </div>
    </SeModal>
  );
}
