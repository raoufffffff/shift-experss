// src/pages/shifts/detail/components/ConvertToEmployeesDialog.tsx
// (à placer à côté de ExtendShiftDialog.tsx, dans le dossier components/ de la page détail)
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loader2, UserRoundCheck, Info, Users } from 'lucide-react'

interface EmployeeOption {
  userId: string
  name: string
  email: string | null
  avatarUrl: string | null
  roamsAllBranches: boolean
}

interface ConvertToEmployeesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: { id: string; company_id: string; establishment_id: string }
  /** user_id des employés qui ont déjà une candidature active sur ce shift (invités / candidats / acceptés) */
  alreadyInvitedUserIds: string[]
  /** nombre de jours concernés (série d'événement) */
  daysCount: number
  /** candidatures freelances en attente qui seront refusées */
  pendingFreelancerCount: number
  isPending: boolean
  onConfirm: (userIds: string[]) => void
}

export function ConvertToEmployeesDialog({
  open,
  onOpenChange,
  shift,
  alreadyInvitedUserIds,
  daysCount,
  pendingFreelancerCount,
  isPending,
  onConfirm,
}: ConvertToEmployeesDialogProps) {
  const [selected, setSelected] = useState<string[]>([])

  const { data: employees = [], isLoading } = useQuery<EmployeeOption[]>({
    queryKey: ['convert-shift-employees', shift.company_id, shift.establishment_id],
    enabled: open,
    queryFn: async () => {
      const { data: emps, error } = await (supabase as any)
        .from('employees')
        .select('user_id, establishment_id, active, status')
        .eq('company_id', shift.company_id)
        .eq('status', 'active')
        .neq('active', false)
      if (error) throw error

      const rows = ((emps ?? []) as { user_id: string; establishment_id: string | null }[]).filter(
        (e) => e.establishment_id === null || e.establishment_id === shift.establishment_id,
      )
      if (rows.length === 0) return []

      const { data: users } = await (supabase as any)
        .from('users')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', rows.map((r) => r.user_id))
      const byId = new Map<string, any>((users ?? []).map((u: any) => [u.id, u]))

      return rows
        .map((r) => {
          const u = byId.get(r.user_id)
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || u?.email || 'Employé'
          return {
            userId: r.user_id,
            name,
            email: u?.email ?? null,
            avatarUrl: u?.avatar_url ?? null,
            roamsAllBranches: r.establishment_id === null,
          } as EmployeeOption
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    },
  })

  const invited = useMemo(() => new Set(alreadyInvitedUserIds), [alreadyInvitedUserIds])
  const selectable = employees.filter((e) => !invited.has(e.userId))

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleOpenChange = (o: boolean) => {
    if (isPending) return
    if (!o) setSelected([])
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundCheck className="w-5 h-5 text-blue-500" />
            Confier ce shift à vos employés
          </DialogTitle>
          <DialogDescription>
            Aucun freelance n&apos;a été accepté. Vous pouvez retirer ce shift de la liste des freelances et le
            proposer à des employés de votre établissement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs space-y-1.5 text-blue-900 dark:text-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Le shift n&apos;est plus visible par les freelances
                {pendingFreelancerCount > 0
                  ? ` — ${pendingFreelancerCount} candidature${pendingFreelancerCount > 1 ? 's' : ''} freelance en attente ${pendingFreelancerCount > 1 ? 'seront refusées' : 'sera refusée'}.`
                  : '.'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Chaque employé choisi reçoit une invitation et confirme sa disponibilité ; vous l&apos;affectez ensuite
                comme d&apos;habitude.
              </span>
            </div>
            {daysCount > 1 && (
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Ce shift fait partie d&apos;une série : les {daysCount} jours sont convertis ensemble.</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Les frais de déplacement ne s&apos;appliquent plus (réservés aux freelances).</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Employés de l&apos;établissement
              </span>
              {selectable.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.length === selectable.length ? [] : selectable.map((e) => e.userId),
                    )
                  }
                >
                  {selected.length === selectable.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : employees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                Aucun employé actif n&apos;est rattaché à cet établissement.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {employees.map((e) => {
                  const disabled = invited.has(e.userId)
                  const checked = selected.includes(e.userId)
                  return (
                    <label
                      key={e.userId}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                        disabled
                          ? 'opacity-60 cursor-not-allowed bg-muted/30'
                          : checked
                          ? 'border-blue-300 bg-blue-50/60 cursor-pointer'
                          : 'hover:bg-muted/40 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(e.userId)}
                      />
                      <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center overflow-hidden shrink-0">
                        {e.avatarUrl ? (
                          <img src={e.avatarUrl} alt={e.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-sm font-bold text-blue-700">{e.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{e.name}</div>
                        {e.email && <div className="text-xs text-muted-foreground truncate">{e.email}</div>}
                      </div>
                      {disabled && (
                        <Badge variant="outline" className="text-[10px]">
                          Déjà invité
                        </Badge>
                      )}
                      {!disabled && e.roamsAllBranches && (
                        <Badge variant="outline" className="text-[10px]">
                          Tous établissements
                        </Badge>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={() => onConfirm(selected)}
            disabled={isPending || selected.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Conversion…
              </>
            ) : (
              <>
                <UserRoundCheck className="w-4 h-4 mr-2" />
                Inviter {selected.length > 0 ? `${selected.length} employé${selected.length > 1 ? 's' : ''}` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}