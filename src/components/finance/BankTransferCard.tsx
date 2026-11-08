import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Landmark, Copy, Info, Wallet, ArrowDownToLine, Gauge, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Settlement mode, collection = bank transfer ("virement"): the company wires money to its own dedicated
// IBAN (Stripe virtual account). Every wire is credited to its balance; the platform automatically settles
// the oldest accepted missions that the balance can fully cover (a mission is never split). Anything left
// is the company's credit ("excédent") at Shift Express.
//
// Rendered by PayrollView instead of SettlementCard when companies.settlement_collection = 'bank_transfer'.
// CreditLimitSummary (bottom) is also used for SEPA settlement companies that have a ceiling.

const formatEur = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n ?? 0))

interface Instructions {
  success: boolean
  iban: string
  bic: string | null
  account_holder: string | null
  reference_hint: string
  balance: number
  awaiting_settlement_total: number
  amount_to_transfer: number
}

interface Overview {
  credit_limit: number | null
  debt_accepted: number
  debt_accepted_count: number
  open_slots_total: number
  open_shifts_count: number
  estimated_fee_ttc: number
  committed_total: number
  headroom: number | null
  pending_settlement_total: number
}

async function readFunctionError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response } | null)?.context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json()
      return body?.error || 'Erreur inconnue'
    } catch {
      return 'Erreur inconnue'
    }
  }
  return error instanceof Error ? error.message : 'Erreur inconnue'
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text.replace(/\s/g, '')).then(
    () => toast.success(`${label} copié`),
    () => toast.error('Copie impossible'),
  )
}

function formatIban(iban: string) {
  return iban.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
}

export function CreditLimitSummary() {
  const { company } = useAuthStore()
  const { data } = useQuery<Overview | null>({
    queryKey: ['my-company-overview', company?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('my_company_overview')
      if (error) throw error
      return data as Overview
    },
    enabled: !!company?.id,
    staleTime: 30_000,
  })

  if (!data || data.credit_limit === null || data.credit_limit === undefined) return null
  const limit = Number(data.credit_limit)
  const pct = limit > 0 ? Math.min(100, (data.committed_total / limit) * 100) : 100
  const over = (data.headroom ?? 0) < 0

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Plafond d'encours</p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full ${over ? 'bg-destructive' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            Utilisé : <strong className="text-foreground">{formatEur(data.committed_total)}</strong> sur {formatEur(limit)}
          </span>
          <span className={over ? 'text-destructive font-semibold' : 'font-semibold'}>
            Disponible : {formatEur(Math.max(0, data.headroom ?? 0))}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Missions acceptées non réglées ({formatEur(data.debt_accepted)}) + places ouvertes des missions publiées (
          {formatEur(data.open_slots_total)}) + frais de relevé estimés ({formatEur(data.estimated_fee_ttc)}). Au-delà du
          plafond, la publication de nouvelles missions est bloquée jusqu'à règlement.
        </p>
      </CardContent>
    </Card>
  )
}

export function BankTransferCard() {
  const { company } = useAuthStore()

  const {
    data: info,
    isLoading: infoLoading,
    error: infoError,
    refetch: refetchInfo,
  } = useQuery<Instructions>({
    queryKey: ['bank-transfer-instructions', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-bank-transfer-instructions', { body: {} })
      if (error) throw new Error(await readFunctionError(error))
      if (!data?.success) throw new Error(data?.error || 'Réponse invalide')
      return data as Instructions
    },
    enabled: !!company?.id,
    // The balance changes when a wire arrives and the allocation runs in the background.
    refetchInterval: 30_000,
  })

  const debt = info?.awaiting_settlement_total ?? 0
  const balance = info?.balance ?? 0
  const toWire = info?.amount_to_transfer ?? 0

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Règlement par virement bancaire</p>
              <p className="text-xs text-muted-foreground">
                Virez le montant de votre choix sur l'IBAN ci-dessous : vos missions acceptées sont réglées
                automatiquement, de la plus ancienne à la plus récente, dès réception.
              </p>
            </div>
          </div>

          {infoLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement de vos coordonnées bancaires…
            </div>
          ) : infoError || !info ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive space-y-2">
              <p>Impossible de charger vos coordonnées bancaires.</p>
              <p className="text-xs opacity-80">{(infoError as Error | null)?.message}</p>
              <Button size="sm" variant="outline" onClick={() => refetchInfo()}>
                Réessayer
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-background p-4 space-y-3">
                {[
                  { label: 'IBAN', value: formatIban(info.iban), raw: info.iban },
                  { label: 'BIC', value: info.bic, raw: info.bic },
                  { label: 'Bénéficiaire', value: info.account_holder, raw: info.account_holder },
                ]
                  .filter((r) => r.value)
                  .map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.label}</p>
                        <p className="font-mono text-sm break-all">{r.value}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyText(String(r.raw), r.label === 'Bénéficiaire' ? 'Nom du bénéficiaire' : r.label)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Cet IBAN est dédié à votre entreprise. Indiquez le bénéficiaire exact et, si possible, la référence «{' '}
                  {info.reference_hint} ». Les virements SEPA sont irrévocables : vérifiez l'IBAN avant de valider.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ArrowDownToLine className="w-3 h-3" /> Dette à régler
            </div>
            <div className="mt-1 text-2xl font-bold">{infoLoading ? '…' : formatEur(debt)}</div>
            <div className="text-[10px] text-muted-foreground">Missions acceptées non réglées, frais de relevé inclus</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Excédent chez Shift Express
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-600">{infoLoading ? '…' : formatEur(balance)}</div>
            <div className="text-[10px] text-muted-foreground">
              Virements reçus non encore utilisés ; appliqués automatiquement à vos prochaines missions
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <div className="text-xs text-primary uppercase tracking-wider font-medium">Reste à virer</div>
            <div className="mt-1 text-2xl font-bold text-primary">{infoLoading ? '…' : formatEur(toWire)}</div>
            <div className="text-[10px] text-muted-foreground">
              {toWire > 0 ? 'Pour régler toutes vos missions en attente' : 'Rien à virer pour le moment'}
            </div>
          </CardContent>
        </Card>
      </div>

      {balance > 0 && debt > 0 && (
        <p className="text-xs text-muted-foreground">
          Votre excédent ne couvre pas encore la prochaine mission : une mission n'est jamais réglée partiellement. Elle
          sera réglée automatiquement dès que le solde la couvre entièrement.
        </p>
      )}

      <CreditLimitSummary />

      <p className="text-xs text-muted-foreground">
        Retrouvez l'historique de vos virements dans l'onglet « Virements », et les factures dans l'onglet « Factures ».
      </p>
    </div>
  )
}