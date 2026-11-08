import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Banknote, Loader2, Clock, AlertTriangle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAwaitingTransportFees } from './TransportFeesSection'

// Settlement mode ("liquidation"): the company is NOT charged at acceptance.
// Every accepted freelancer application is frozen with payment_status =
// 'awaiting_settlement'; the company later pays all of them in ONE SEPA
// debit by calling the create-company-settlement Edge Function.
//
// This card is only rendered by PayrollView when companies.payment_mode is
// 'settlement' (standard companies keep the existing Paie & Export view).

interface SettlementCardProps {
  sepaActive: boolean
  sepaIbanLast4?: string | null
}

interface AwaitingRow {
  id: string
  freelancer_id: string
  total_charged_to_client: number | null
  base_amount: number | null
  transport_fee: number | null
  settlement_id: string | null
}

interface LatestSettlement {
  id: string
  status: 'pending' | 'paid' | 'failed'
  total_amount: number
  applications_count: number
  failure_message: string | null
  created_at: string
}

// Same rules as create-company-settlement: fee = rate % of the HT missions
// amount (base + transport), plus 20 % VAT. The server recomputes and freezes
// the real values; this is only the preview.
const FEE_VAT_RATE = 20
const round2 = (n: number) => Math.round(n * 100) / 100

const formatEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

// supabase.functions.invoke hides the JSON body of a non-2xx response inside
// error.context (a Response). Pull the server's message out of it.
async function readFunctionError(error: unknown): Promise<{ status?: number; message: string }> {
  const ctx = (error as { context?: Response } | null)?.context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json()
      return { status: ctx.status, message: body?.error || 'Erreur inconnue' }
    } catch {
      return { status: ctx.status, message: 'Erreur inconnue' }
    }
  }
  return { message: error instanceof Error ? error.message : 'Erreur inconnue' }
}

export function SettlementCard({ sepaActive, sepaIbanLast4 }: SettlementCardProps) {
  const { company } = useAuthStore()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  // Everything still waiting to be collected: accepted + awaiting_settlement.
  // Rows already linked to a settlement (settlement_id set) are in flight and
  // are not collectable again -- same rule as the Edge Function.
  const { data: awaiting = [], isLoading } = useQuery<AwaitingRow[]>({
    queryKey: ['settlement-awaiting', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('shift_freelancer_applications' as any)
        .select('id, freelancer_id, total_charged_to_client, base_amount, transport_fee, settlement_id, shift:shifts!inner(company_id)')
        .eq('status', 'accepted')
        .eq('payment_status', 'awaiting_settlement')
        .eq('shift.company_id', company.id)
      if (error) throw error
      return (data as unknown as AwaitingRow[]) || []
    },
    enabled: !!company?.id,
  })

  const { data: feeRate = 0 } = useQuery<number>({
    queryKey: ['settlement-fee-rate', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0
      const { data, error } = await supabase
        .from('companies' as any)
        .select('settlement_fee_rate')
        .eq('id', company.id)
        .maybeSingle()
      if (error) throw error
      return Number((data as any)?.settlement_fee_rate) || 0
    },
    enabled: !!company?.id,
  })

  const { data: latest } = useQuery<LatestSettlement | null>({
    queryKey: ['settlement-latest', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      const { data, error } = await supabase
        .from('client_settlements' as any)
        .select('id, status, total_amount, applications_count, failure_message, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as unknown as LatestSettlement) ?? null
    },
    enabled: !!company?.id,
    // A SEPA debit confirms asynchronously (webhook): keep the in-flight
    // state fresh without the user having to reload.
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 15_000 : false),
  })

  // Approved transport fees waiting for this settlement: collected on their own (no commission, no VAT,
  // not part of the "frais de relevé" base) and paid out to the freelancer once the settlement is paid.
  const { data: fees } = useAwaitingTransportFees()
  const feesCount = fees?.count ?? 0
  const feesTotal = fees?.total ?? 0

  const collectable = awaiting.filter((a) => !a.settlement_id)
  const shiftsCount = collectable.length
  const freelancersCount = new Set(collectable.map((a) => a.freelancer_id)).size
  const missionsTotal = round2(collectable.reduce((s, a) => s + (Number(a.total_charged_to_client) || 0), 0))
  const feeBase = round2(
    collectable.reduce((s, a) => s + (Number(a.base_amount) || 0) + (Number(a.transport_fee) || 0), 0),
  )
  const feeHt = round2(feeBase * (feeRate / 100))
  const feeVat = round2(feeHt * (FEE_VAT_RATE / 100))
  const feeTtc = round2(feeHt + feeVat)
  const totalAmount = round2(missionsTotal + feeTtc + feesTotal)
  const hasUnfrozen = collectable.some((a) => a.total_charged_to_client == null)

  const inFlight = latest?.status === 'pending'
  const lastFailed = latest?.status === 'failed' && shiftsCount > 0

  const canPay = (shiftsCount > 0 || feesCount > 0) && sepaActive && !inFlight && !hasUnfrozen && !isPaying

  const handlePay = async () => {
    setIsPaying(true)
    try {
      // Company users never send a company_id: the function reads it from
      // their own profile (and rejects any other company).
      const { data, error } = await supabase.functions.invoke('create-company-settlement', { body: {} })
      if (error) {
        const { status, message } = await readFunctionError(error)
        if (status === 403) {
          toast.error('Seuls les administrateurs et managers peuvent régler une liquidation.')
        } else if (status === 409) {
          toast.error('Un règlement est déjà en cours ou les missions ont changé. Actualisez puis réessayez.')
        } else {
          toast.error('Le prélèvement a échoué', { description: message })
        }
        return
      }
      if (data?.error) {
        toast.error('Le prélèvement a échoué', { description: data.error })
        return
      }

      toast.success(
        `Prélèvement SEPA de ${formatEur(Number(data?.total_amount ?? totalAmount))} lancé pour ${data?.applications_count ?? shiftsCount} mission(s).`,
      )
      setConfirmOpen(false)
    } finally {
      setIsPaying(false)
      queryClient.invalidateQueries({ queryKey: ['settlement-awaiting'] })
      queryClient.invalidateQueries({ queryKey: ['settlement-latest'] })
      queryClient.invalidateQueries({ queryKey: ['transport-fees'] })
      queryClient.invalidateQueries({ queryKey: ['transport-fees-awaiting-settlement'] })
      queryClient.invalidateQueries({ queryKey: ['company-payments-v2'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-freelancers'] })
    }
  }

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Règlement groupé (liquidation)</p>
                <p className="text-xs text-muted-foreground">
                  Les missions acceptées sont figées ; vous les réglez toutes en un seul prélèvement SEPA.
                </p>
              </div>
            </div>
            {inFlight && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                <Clock className="w-3 h-3 mr-1 inline" />
                Prélèvement en cours
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-background p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">En attente de liquidation</div>
              <div className="mt-1 text-2xl font-bold">{isLoading ? '…' : shiftsCount}</div>
              <div className="text-xs text-muted-foreground">shift{shiftsCount > 1 ? 's' : ''}</div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3" /> Freelances
              </div>
              <div className="mt-1 text-2xl font-bold">{isLoading ? '…' : freelancersCount}</div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-background p-3 col-span-2 md:col-span-1">
              <div className="text-xs text-primary uppercase tracking-wider font-medium">Montant à prélever</div>
              <div className="mt-1 text-2xl font-bold text-primary">{isLoading ? '…' : formatEur(totalAmount)}</div>
              <div className="text-[10px] text-muted-foreground">
                {feeTtc > 0 ? 'Commission, TVA et frais de relevé inclus' : 'Commission et TVA incluses'}
              </div>
            </div>
          </div>

          {((shiftsCount > 0 && feeTtc > 0) || feesCount > 0) && (
            <div className="rounded-lg border bg-background p-3 text-sm space-y-1">
              {shiftsCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Missions (commission et TVA incluses)</span>
                  <span>{formatEur(missionsTotal)}</span>
                </div>
              )}
              {feeTtc > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Frais de relevé ({feeRate} % de {formatEur(feeBase)} HT)
                    </span>
                    <span>{formatEur(feeHt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA sur frais de relevé ({FEE_VAT_RATE} %)</span>
                    <span>{formatEur(feeVat)}</span>
                  </div>
                </>
              )}
              {feesCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Frais de déplacement ({feesCount} demande{feesCount > 1 ? 's' : ''}, sans commission ni TVA)
                  </span>
                  <span>{formatEur(feesTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total à prélever</span>
                <span>{formatEur(totalAmount)}</span>
              </div>
            </div>
          )}

          {inFlight && latest && (
            <p className="text-xs text-muted-foreground">
              Un prélèvement de {formatEur(Number(latest.total_amount))} ({latest.applications_count} mission
              {latest.applications_count > 1 ? 's' : ''}) est en cours de traitement par la banque. Les missions seront
              confirmées automatiquement dès réception.
            </p>
          )}

          {lastFailed && latest && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Le dernier prélèvement ({formatEur(Number(latest.total_amount))}) a échoué
                {latest.failure_message ? ` : ${latest.failure_message}` : ''}. Les missions sont de nouveau
                disponibles : vérifiez votre moyen de paiement SEPA puis relancez le règlement.
              </span>
            </div>
          )}

          {!sepaActive && shiftsCount > 0 && (
            <p className="text-xs text-amber-700">
              Aucun mandat SEPA actif : configurez votre moyen de paiement dans les paramètres pour pouvoir régler.
            </p>
          )}

          {hasUnfrozen && (
            <p className="text-xs text-destructive">
              Certaines missions n'ont pas encore de montant figé. Réessayez dans un instant ou contactez le support.
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setConfirmOpen(true)} disabled={!canPay}>
              {isPaying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Banknote className="w-4 h-4 mr-2" />}
              {shiftsCount > 0 || feesCount > 0 ? `Payer ${formatEur(totalAmount)}` : 'Rien à régler'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open && !isPaying) setConfirmOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le règlement</DialogTitle>
            <DialogDescription>
              Un prélèvement SEPA unique de <strong>{formatEur(totalAmount)}</strong> sera effectué
              {sepaIbanLast4 ? ` sur le compte IBAN •••• ${sepaIbanLast4}` : ' sur votre compte'} pour{' '}
              {shiftsCount} shift{shiftsCount > 1 ? 's' : ''} ({freelancersCount} freelance
              {freelancersCount > 1 ? 's' : ''})
              {feesCount > 0 ? ` et ${feesCount} demande${feesCount > 1 ? 's' : ''} de frais de déplacement` : ''}. Les
              factures vous seront envoyées dès confirmation du paiement.
            </DialogDescription>
          </DialogHeader>
          {feeTtc > 0 && (
            <p className="text-xs text-muted-foreground">
              Ce montant comprend {formatEur(feeTtc)} de frais de relevé ({feeRate} % HT + TVA), facturés séparément.
            </p>
          )}
          {feesCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Les frais de déplacement ({formatEur(feesTotal)}) sont réglés sans commission ni TVA et reversés
              intégralement au freelance dès confirmation du paiement.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Seules les missions encore acceptées sont incluses ; une mission annulée avant le règlement n'est jamais
            facturée.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPaying}>
              Annuler
            </Button>
            <Button onClick={handlePay} disabled={isPaying}>
              {isPaying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isPaying ? 'Envoi…' : 'Confirmer le prélèvement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}