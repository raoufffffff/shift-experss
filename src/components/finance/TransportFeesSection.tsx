import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Car, Check, X, FileText, Loader2, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

// Frais de déplacement (transport fees): a freelancer claims ONE all-inclusive amount + a receipt for a
// mission (or for a whole multi-day group, linked to the group leader's application). The company approves
// or rejects it here.
//
// Money path (all server-side, see transport_fees triggers + process-transport-fee-transfers):
//  - standard company  -> on approval the amount is debited by itself (SEPA, no commission, no VAT) and paid
//                         out to the freelancer as soon as the debit is confirmed;
//  - settlement company -> on approval the amount joins the next settlement (payment_status =
//                         'awaiting_settlement') and is paid out once the settlement is paid.
// Fees never count toward the credit ceiling (the ceiling only gates publishing).

const formatEur = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n ?? 0))

export interface TransportFeeRow {
  id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  payment_status: string
  rejection_reason: string | null
  receipt_url: string | null
  created_at: string
  reviewed_at: string | null
  settlement_id: string | null
  shift: { id: string; position_name: string | null; start_time: string | null } | null
  freelancer: { id: string; first_name: string | null; last_name: string | null } | null
}

// Approved fees still waiting for the next settlement (settlement companies). Used by SettlementCard so
// the amount to pay includes them (no commission, no VAT, not part of the "frais de relevé" base).
export function useAwaitingTransportFees() {
  const { company } = useAuthStore()
  return useQuery<{ count: number; total: number }>({
    queryKey: ['transport-fees-awaiting-settlement', company?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('transport_fees')
        .select('amount')
        .eq('company_id', company!.id)
        .eq('status', 'approved')
        .eq('payment_status', 'awaiting_settlement')
        .is('settlement_id', null)
      if (error) throw error
      const rows = (data ?? []) as { amount: number }[]
      return {
        count: rows.length,
        total: Math.round(rows.reduce((s, r) => s + Number(r.amount), 0) * 100) / 100,
      }
    },
    enabled: !!company?.id,
    staleTime: 15_000,
  })
}

function paymentLabel(
  fee: TransportFeeRow,
): { label: string; cls: string; icon: 'ok' | 'wait' | 'warn' } {
  switch (fee.payment_status) {
    case 'awaiting_settlement':
      return { label: fee.settlement_id ? 'Règlement en cours' : 'Ajouté au prochain règlement', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'wait' }
    case 'transferred':
      return { label: 'Payé · versé au freelance', cls: 'bg-green-50 text-green-700 border-green-200', icon: 'ok' }
    case 'charge_failed':
      return { label: 'Prélèvement échoué', cls: 'bg-red-50 text-red-700 border-red-200', icon: 'warn' }
    case 'refunded':
      return { label: 'Remboursé', cls: 'bg-red-50 text-red-700 border-red-200', icon: 'warn' }
    case 'charge_disputed':
    case 'charge_disputed_lost':
      return { label: 'Litige bancaire', cls: 'bg-red-50 text-red-700 border-red-200', icon: 'warn' }
    default:
      return { label: 'Paiement en cours', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'wait' }
  }
}

interface Props {
  paymentMode?: string | null
  /**
   * When provided, only the claims linked to these shifts are shown (shift detail page: the shift itself,
   * or every day of its event series — a group claim hangs on the group leader's shift).
   * Omit it on the Payments page to list every claim of the company.
   */
  shiftIds?: string[]
}

export function TransportFeesSection({ paymentMode: paymentModeProp, shiftIds }: Props) {
  const { company } = useAuthStore()
  const queryClient = useQueryClient()
  const [rejectTarget, setRejectTarget] = useState<TransportFeeRow | null>(null)
  const [reason, setReason] = useState('')
  const [openingReceipt, setOpeningReceipt] = useState<string | null>(null)

  const scoped = shiftIds !== undefined
  const scopeKey = scoped ? [...shiftIds].sort().join(',') : 'all'

  // The Payments page already knows the payment mode; on the shift page we look it up ourselves.
  const { data: fetchedMode } = useQuery<string | null>({
    queryKey: ['company-payment-mode', company?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from('companies').select('payment_mode').eq('id', company!.id).maybeSingle()
      return (data?.payment_mode as string | null) ?? null
    },
    enabled: paymentModeProp === undefined && !!company?.id,
    staleTime: 5 * 60_000,
  })
  const paymentMode = paymentModeProp !== undefined ? paymentModeProp : fetchedMode

  const { data: fees = [], isLoading } = useQuery<TransportFeeRow[]>({
    queryKey: ['transport-fees', company?.id, scopeKey],
    queryFn: async () => {
      if (scoped && shiftIds.length === 0) return []
      let q = (supabase as any)
        .from('transport_fees')
        .select(
          'id, amount, status, payment_status, rejection_reason, receipt_url, created_at, reviewed_at, settlement_id, shift:shifts(id, position_name, start_time), freelancer:freelancers(id, first_name, last_name)',
        )
        .eq('company_id', company!.id)
      if (scoped) q = q.in('shift_id', shiftIds)
      const { data, error } = await q.order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return (data ?? []) as TransportFeeRow[]
    },
    enabled: !!company?.id,
    // The payment pipeline moves in the background (settlement webhook, transfer cron).
    refetchInterval: 30_000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['transport-fees'] })
    queryClient.invalidateQueries({ queryKey: ['transport-fees-awaiting-settlement'] })
    queryClient.invalidateQueries({ queryKey: ['my-company-overview'] })
    queryClient.invalidateQueries({ queryKey: ['company-pending-transport-fees'] })
  }

  const decide = useMutation({
    mutationFn: async (vars: { id: string; status: 'approved' | 'rejected'; reason?: string }) => {
      const patch: Record<string, unknown> = { status: vars.status }
      if (vars.status === 'rejected') patch.rejection_reason = vars.reason?.trim() || null
      const { data, error } = await (supabase as any)
        .from('transport_fees')
        .update(patch)
        .eq('id', vars.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Cette demande a déjà été traitée.')
    },
    onSuccess: (_d, vars) => {
      if (vars.status === 'approved') {
        toast.success(
          paymentMode === 'settlement'
            ? 'Frais approuvés : ils seront ajoutés à votre prochain règlement.'
            : 'Frais approuvés : le montant va être prélevé puis versé au freelance.',
        )
      } else {
        toast.success('Demande refusée.')
      }
      setRejectTarget(null)
      setReason('')
      refresh()
    },
    onError: (e: unknown) => {
      toast.error('Action impossible', { description: e instanceof Error ? e.message : undefined })
      refresh()
    },
  })

  const openReceipt = async (fee: TransportFeeRow) => {
    if (!fee.receipt_url) return
    setOpeningReceipt(fee.id)
    try {
      const { data, error } = await supabase.storage.from('transport-receipts').createSignedUrl(fee.receipt_url, 300)
      if (error || !data?.signedUrl) throw error ?? new Error('Justificatif introuvable')
      window.open(data.signedUrl, '_blank', 'noopener')
    } catch {
      toast.error("Impossible d'ouvrir le justificatif")
    } finally {
      setOpeningReceipt(null)
    }
  }

  const pending = fees.filter((f) => f.status === 'pending')
  const history = fees.filter((f) => f.status !== 'pending')

  if (isLoading || fees.length === 0) return null

  const name = (f: TransportFeeRow) =>
    `${f.freelancer?.first_name || ''} ${f.freelancer?.last_name || ''}`.trim() || 'Freelance'

  const subtitle = (f: TransportFeeRow) => (
    <div className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{name(f)}</span>
      {f.shift?.position_name && <span> · {f.shift.position_name}</span>}
      {f.shift?.start_time && <span> · {format(new Date(f.shift.start_time), 'dd MMM yyyy', { locale: fr })}</span>}
    </div>
  )

  return (
    <>
      {pending.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-blue-700 dark:text-blue-400">
              <Car className="w-4 h-4" /> {pending.length} demande{pending.length > 1 ? 's' : ''} de frais de déplacement à valider
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Le montant approuvé est réglé à part, sans commission ni TVA, et versé intégralement au freelance.
              {paymentMode === 'settlement'
                ? ' Il sera ajouté à votre prochain règlement.'
                : ' Il sera prélevé dès votre accord.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                <div className="min-w-0">
                  {subtitle(f)}
                  <div className="text-xs text-muted-foreground">
                    Demandé le {format(new Date(f.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold tabular-nums">{formatEur(f.amount)}</span>
                  <Button size="sm" variant="outline" disabled={!f.receipt_url || openingReceipt === f.id} onClick={() => openReceipt(f)}>
                    {openingReceipt === f.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
                    Justificatif
                  </Button>
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: f.id, status: 'approved' })}
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" /> Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    disabled={decide.isPending}
                    onClick={() => { setRejectTarget(f); setReason('') }}
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" /> Refuser
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="w-4 h-4" /> Frais de déplacement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.slice(0, 10).map((f) => {
              const rejected = f.status === 'rejected'
              const pay = paymentLabel(f)
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  {rejected ? (
                    <X className="w-4 h-4 text-red-500 shrink-0" />
                  ) : pay.icon === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : pay.icon === 'warn' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">Frais de déplacement</span>
                      <Badge variant="outline" className={rejected ? 'bg-red-50 text-red-700 border-red-200' : pay.cls}>
                        {rejected ? 'Refusé' : pay.label}
                      </Badge>
                    </div>
                    {subtitle(f)}
                    {rejected && f.rejection_reason && (
                      <div className="text-xs text-muted-foreground">Motif : {f.rejection_reason}</div>
                    )}
                  </div>
                  <span className={`font-bold tabular-nums ${rejected ? 'text-red-500 line-through' : ''}`}>{formatEur(f.amount)}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o && !decide.isPending) setRejectTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser les frais de déplacement</DialogTitle>
            <DialogDescription>
              {rejectTarget ? `${name(rejectTarget)} · ${formatEur(rejectTarget.amount)}. ` : ''}
              Le freelance verra le motif de votre refus. Cette décision est définitive.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex : justificatif illisible, montant non conforme…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={decide.isPending}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={decide.isPending || !reason.trim()}
              onClick={() => rejectTarget && decide.mutate({ id: rejectTarget.id, status: 'rejected', reason })}
            >
              {decide.isPending ? 'Envoi…' : 'Confirmer le refus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}