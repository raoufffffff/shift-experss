import { useEffect, useState } from 'react';
import { Info, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { SeModal, Labeled, sePrimary, seGhost } from './SeModal';

export function Boost({ shift, open, onClose }: { shift: { id: string; freelance_hourly_rate?: number | null }; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const current = shift.freelance_hourly_rate || 0;
  const min = current + 0.5;
  const max = current + 10;
  const [rate, setRate] = useState(String(min));
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setRate(String(min)); }, [open, min]);

  const submit = async () => {
    const v = parseFloat(rate);
    if (isNaN(v) || v < min) { toast.error(`Le nouveau tarif doit être d'au moins ${min.toFixed(2)} €/h`); return; }
    setBusy(true);
    try {
      const r = await apiClient.post(`/api/shifts/${shift.id}/boost`, { new_rate: v });
      if (r.data.success) {
        toast.success(`Shift boosté · ${r.data.freelancers_notified ?? 0} auto-entrepreneur(s) notifié(s)`);
        queryClient.invalidateQueries({ queryKey: ['shift', shift.id] });
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
        onClose();
      }
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SeModal
      open={open}
      onClose={onClose}
      title="Booster ce shift"
      subtitle="Augmentez le tarif pour attirer plus d'auto-entrepreneurs."
      footer={
        <>
          <button type="button" className={seGhost} onClick={onClose} disabled={busy}>Annuler</button>
          <button type="button" className={sePrimary} onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Booster
          </button>
        </>
      }
    >
      <div className="rounded-se-sm bg-se-cascade-wash p-4 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-se-muted">Tarif actuel</span><b className="text-se-ink">{current.toFixed(2)} €/h</b></div>
        <div className="flex justify-between"><span className="text-se-muted">Minimum</span><b className="text-se-cascade-ink">+0,50 € ({min.toFixed(2)} €/h)</b></div>
      </div>
      <Labeled label="Nouveau tarif">
        <input type="range" min={min} max={max} step={0.5} value={rate || min} onChange={(e) => setRate(e.target.value)} className="w-full accent-[#2250f4]" />
        <div className="flex justify-between items-baseline text-xs text-se-muted mt-1">
          <span>{min.toFixed(2)} €/h</span>
          <span className="text-lg font-bold text-se-ink">{parseFloat(rate || String(min)).toFixed(2)} €/h</span>
          <span>{max.toFixed(2)} €/h</span>
        </div>
      </Labeled>
      <p className="text-[11px] text-se-muted flex items-center gap-1"><Info className="w-3 h-3" aria-hidden="true" /> Un shift ne peut être boosté qu'à intervalle limité.</p>
    </SeModal>
  );
}
