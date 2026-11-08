import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SeModal, Labeled, sePrimary, seGhost } from './SeModal';

interface ShiftIn {
  id: string; end_time: string; company_id: string; establishment_id: string;
  position_name?: string | null; job_position_id?: string | null; freelance_hourly_rate?: number | null;
  required_employees: number; description?: string | null; targets_employees?: boolean | null;
}
const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function Extend({ shift, open, onClose }: { shift: ShiftIn; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [hours, setHours] = useState(1);
  const newEnd = new Date(new Date(shift.end_time).getTime() + hours * 3_600_000);

  const extend = useMutation({
    mutationFn: async () => {
      const { error: uErr } = await supabase.from('shifts').update({ is_extended: true }).eq('id', shift.id);
      if (uErr) throw uErr;

      const { data: created, error: iErr } = await supabase.from('shifts').insert({
        company_id: shift.company_id, establishment_id: shift.establishment_id,
        start_time: shift.end_time, end_time: newEnd.toISOString(),
        position_name: shift.position_name, job_position_id: shift.job_position_id,
        freelance_hourly_rate: shift.freelance_hourly_rate, break_duration_minutes: 0,
        required_employees: shift.required_employees, description: shift.description,
        targets_employees: shift.targets_employees, status: 'completed',
      }).select('id').single();
      if (iErr) throw iErr;

      const { data: emps } = await supabase.from('shift_applications').select('user_id, reviewed_by').eq('shift_id', shift.id).eq('status', 'accepted');
      const { data: frees } = await supabase.from('shift_freelancer_applications').select('freelancer_id').eq('shift_id', shift.id).eq('status', 'accepted');
      const now = new Date().toISOString();

      if (emps?.length) {
        const { error } = await supabase.from('shift_applications').insert(
          emps.map((e) => ({ shift_id: created.id, user_id: e.user_id, status: 'accepted' as never, applied_at: now, reviewed_at: now, reviewed_by: e.reviewed_by })) as never[],
        );
        if (error) throw error;
      }
      if (frees?.length) {
        const { error } = await supabase.from('shift_freelancer_applications').upsert(
          frees.map((f) => ({ shift_id: created.id, freelancer_id: f.freelancer_id, status: 'accepted' as never, applied_at: now, responded_at: now })) as never[],
          { onConflict: 'shift_id,freelancer_id' },
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Shift prolongé');
      queryClient.invalidateQueries({ queryKey: ['shift', shift.id] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['v2-planning-missions'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  return (
    <SeModal
      open={open}
      onClose={onClose}
      title="Prolonger le shift"
      subtitle="Crée un shift de prolongation à la suite de celui-ci, avec les mêmes personnes."
      footer={
        <>
          <button type="button" className={seGhost} onClick={onClose} disabled={extend.isPending}>Annuler</button>
          <button type="button" className={sePrimary} onClick={() => extend.mutate()} disabled={extend.isPending}>
            {extend.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} Prolonger
          </button>
        </>
      }
    >
      <p className="text-sm text-se-muted">Fin actuelle : <b className="text-se-ink">{hm(new Date(shift.end_time))}</b></p>
      <Labeled label="Durée de la prolongation">
        <input type="range" min={1} max={5} step={1} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-full accent-[#2250f4]" />
        <div className="flex justify-between items-baseline text-xs text-se-muted mt-1"><span>1 h</span><span className="text-lg font-bold text-se-ink">+{hours} h</span><span>5 h</span></div>
      </Labeled>
      <div className="rounded-se-sm bg-se-blue-wash p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-se-muted">Nouveau début</span><b className="text-se-ink">{hm(new Date(shift.end_time))}</b></div>
        <div className="flex justify-between"><span className="text-se-muted">Nouvelle fin</span><b className="text-se-ink">{hm(newEnd)}</b></div>
      </div>
    </SeModal>
  );
}
