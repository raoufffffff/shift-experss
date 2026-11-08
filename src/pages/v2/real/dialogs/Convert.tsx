import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, UserRoundCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Face } from '../MissionCard';
import { SeModal, Note, sePrimary, seGhost } from './SeModal';

interface Option { userId: string; name: string; email: string | null; avatarUrl: string | null; roams: boolean }

export function Convert({
  open, onClose, shift, alreadyInvitedUserIds, daysCount, pendingFreelancerCount, isPending, onConfirm,
}: {
  open: boolean; onClose: () => void;
  shift: { id: string; company_id: string; establishment_id: string };
  alreadyInvitedUserIds: string[]; daysCount: number; pendingFreelancerCount: number;
  isPending: boolean; onConfirm: (userIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const { data: employees = [], isLoading } = useQuery<Option[]>({
    queryKey: ['convert-shift-employees', shift.company_id, shift.establishment_id],
    enabled: open,
    queryFn: async () => {
      const { data: emps, error } = await (supabase as any)
        .from('employees').select('user_id, establishment_id, active, status')
        .eq('company_id', shift.company_id).eq('status', 'active').neq('active', false);
      if (error) throw error;
      const rows = ((emps ?? []) as { user_id: string; establishment_id: string | null }[]).filter(
        (e) => e.establishment_id === null || e.establishment_id === shift.establishment_id,
      );
      if (rows.length === 0) return [];
      const { data: users } = await (supabase as any)
        .from('users').select('id, first_name, last_name, email, avatar_url').in('id', rows.map((r) => r.user_id));
      const byId = new Map<string, any>((users ?? []).map((u: any) => [u.id, u]));
      return rows
        .map((r) => {
          const u = byId.get(r.user_id);
          return {
            userId: r.user_id,
            name: `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || u?.email || 'Salarié',
            email: u?.email ?? null, avatarUrl: u?.avatar_url ?? null, roams: r.establishment_id === null,
          } as Option;
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    },
  });

  const invited = useMemo(() => new Set(alreadyInvitedUserIds), [alreadyInvitedUserIds]);
  const selectable = employees.filter((e) => !invited.has(e.userId));
  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const close = () => { if (isPending) return; setSelected([]); onClose(); };

  return (
    <SeModal
      open={open}
      onClose={close}
      title="Confier ce shift à vos salariés"
      subtitle="Retirez ce shift de la liste des auto-entrepreneurs et proposez-le à vos salariés."
      footer={
        <>
          <button type="button" className={seGhost} onClick={close} disabled={isPending}>Annuler</button>
          <button type="button" className={sePrimary} disabled={isPending || selected.length === 0} onClick={() => onConfirm(selected)}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserRoundCheck className="w-4 h-4" />}
            Inviter{selected.length > 0 ? ` ${selected.length} salarié${selected.length > 1 ? 's' : ''}` : ''}
          </button>
        </>
      }
    >
      <Note>
        <ul className="space-y-1 list-disc pl-4">
          <li>
            Le shift n'est plus visible par les auto-entrepreneurs
            {pendingFreelancerCount > 0 ? ` — ${pendingFreelancerCount} candidature${pendingFreelancerCount > 1 ? 's' : ''} en attente ${pendingFreelancerCount > 1 ? 'seront refusées' : 'sera refusée'}.` : '.'}
          </li>
          <li>Chaque salarié choisi reçoit une invitation et confirme sa disponibilité ; vous l'affectez ensuite comme d'habitude.</li>
          {daysCount > 1 && <li>Ce shift fait partie d'une série : les {daysCount} jours sont convertis ensemble.</li>}
          <li>Les frais de déplacement ne s'appliquent plus (réservés aux auto-entrepreneurs).</li>
        </ul>
      </Note>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="se-eyebrow">Salariés de l'établissement</p>
          {selectable.length > 1 && (
            <button type="button" className="text-xs font-semibold text-se-blue-ink hover:text-se-blue"
              onClick={() => setSelected((p) => (p.length === selectable.length ? [] : selectable.map((e) => e.userId)))}>
              {selected.length === selectable.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="py-8 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-se-muted" /></div>
        ) : employees.length === 0 ? (
          <p className="text-sm text-se-muted text-center rounded-se border border-dashed border-se-line py-6">Aucun salarié actif n'est rattaché à cet établissement.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto space-y-1.5">
            {employees.map((e) => {
              const disabled = invited.has(e.userId);
              const checked = selected.includes(e.userId);
              return (
                <li key={e.userId}>
                  <label className={`flex items-center gap-3 p-2.5 rounded-se-sm border transition-colors ${disabled ? 'opacity-60 cursor-not-allowed bg-se-surface-2 border-se-line' : checked ? 'border-se-blue bg-se-blue-wash/40 cursor-pointer' : 'border-se-line hover:bg-se-surface-2 cursor-pointer'}`}>
                    <input type="checkbox" className="accent-se-blue" checked={checked} disabled={disabled} onChange={() => toggle(e.userId)} />
                    <Face p={{ id: e.userId, name: e.name, photo: e.avatarUrl, kind: 'salarie' }} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-se-ink truncate">{e.name}</span>
                      {e.email && <span className="block text-xs text-se-muted truncate">{e.email}</span>}
                    </span>
                    {disabled && <span className="se-badge bg-se-surface-2 text-se-muted">Déjà invité</span>}
                    {!disabled && e.roams && <span className="se-badge bg-se-surface-2 text-se-muted">Tous établissements</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SeModal>
  );
}
