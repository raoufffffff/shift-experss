import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { calculateShiftNetHours, formatShiftHours } from '@shared/utils';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { SeModal, Labeled, Note, seField, seArea, sePrimary, seGhost } from './SeModal';

interface Shift {
  id: string; start_time: string; end_time: string; break_duration_minutes: number;
  actual_start_time?: string | null; actual_end_time?: string | null;
  actual_break_duration_minutes?: number | null; adjustment_reason?: string | null;
}

const toLocalInput = (ts: string) => {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const hm = (ts: string) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function AdjustHours({ shift, open, onClose }: { shift: Shift; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const init = () => ({
    start: toLocalInput(shift.actual_start_time ?? shift.start_time),
    end: toLocalInput(shift.actual_end_time ?? shift.end_time),
    brk: shift.actual_break_duration_minutes ?? shift.break_duration_minutes,
    reason: shift.adjustment_reason || '',
  });
  const [f, setF] = useState(init);
  useEffect(() => { if (open) setF(init()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, shift]);

  const theoretical = calculateShiftNetHours(shift.start_time, shift.end_time, shift.break_duration_minutes);
  const actual = calculateShiftNetHours(f.start || shift.start_time, f.end || shift.end_time, f.brk);
  const diff = Math.round((actual - theoretical) * 60);

  const save = useMutation({
    mutationFn: async () => {
      if (!f.start || !f.end) throw new Error('Début et fin obligatoires');
      if (new Date(f.end) <= new Date(f.start)) throw new Error('La fin doit être après le début');
      if (f.brk < 0) throw new Error('Pause invalide');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');
      const { error } = await supabase.from('shifts').update({
        actual_start_time: new Date(f.start).toISOString(),
        actual_end_time: new Date(f.end).toISOString(),
        actual_break_duration_minutes: f.brk,
        hours_adjusted_by: user.id,
        hours_adjusted_at: new Date().toISOString(),
        adjustment_reason: f.reason || null,
        updated_at: new Date().toISOString(),
      }).eq('id', shift.id);
      if (error) throw error;
      const { error: nErr } = await supabase.functions.invoke('send-hours-adjustment-notification', { body: { shift_id: shift.id } });
      if (nErr) {
        logger.error('Error sending notification:', nErr);
        toast.warning('Heures ajustées', { description: "La notification n'a pas pu être envoyée : prévenez la personne directement." });
      }
    },
    onSuccess: () => {
      toast.success('Heures ajustées', { description: 'La personne a été notifiée.' });
      queryClient.invalidateQueries({ queryKey: ['shift', shift.id] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['v2-planning-missions'] });
      onClose();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <SeModal
      open={open}
      onClose={onClose}
      title="Ajuster les heures"
      subtitle="Corrigez les horaires réellement travaillés."
      footer={
        <>
          <button type="button" className={seGhost} onClick={onClose} disabled={save.isPending}>Annuler</button>
          <button type="button" className={sePrimary} onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Ajuster
          </button>
        </>
      }
    >
      <div className="rounded-se-sm bg-se-surface-2 p-3 text-sm">
        <p className="se-eyebrow mb-1">Prévu</p>
        <p className="text-se-ink font-semibold">{hm(shift.start_time)} – {hm(shift.end_time)} · {formatShiftHours(theoretical)}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Labeled label="Début réel"><input type="datetime-local" className={seField} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Labeled>
        <Labeled label="Fin réelle"><input type="datetime-local" className={seField} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Labeled>
      </div>
      <Labeled label="Motif (optionnel)">
        <textarea className={seArea} rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Ex. : service prolongé à la demande du restaurant" />
      </Labeled>
      <div className="rounded-se-sm border border-se-line p-3 text-sm grid grid-cols-3 gap-2 text-center">
        <div><p className="text-xs text-se-muted">Prévu</p><p className="font-bold text-se-ink">{formatShiftHours(theoretical)}</p></div>
        <div><p className="text-xs text-se-muted">Réel</p><p className="font-bold text-se-ink">{formatShiftHours(actual)}</p></div>
        <div><p className="text-xs text-se-muted">Écart</p><p className={`font-bold ${diff === 0 ? 'text-se-muted' : diff > 0 ? 'text-se-cascade-ink' : 'text-se-blue-ink'}`}>{diff > 0 ? `+${diff}` : diff} min</p></div>
      </div>
      <Note>Le nouveau décompte sert de base à la paie et à la facturation de ce shift.</Note>
    </SeModal>
  );
}
