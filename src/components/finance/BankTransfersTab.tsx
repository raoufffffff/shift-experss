import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Landmark, Search, ChevronDown, ChevronRight, ArrowDownToLine, CheckCircle2, Wallet, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Onglet « Virements » de la page Paie : galerie des virements reçus sur l'IBAN dédié de l'entreprise,
// avec, pour chacun, les règlements (et les missions) qu'il a financés.
// Affiché uniquement quand companies.payment_mode = 'settlement' ET settlement_collection = 'bank_transfer'.

const formatEur = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n ?? 0))

interface LedgerRow {
  transfer_id: string
  transfer_amount: number
  received_at: string
  sender_name: string | null
  reference: string | null
  settlement_id: string | null
  allocated_amount: number
  settlement_status: string | null
  settlement_created_at: string | null
  settlement_paid_at: string | null
  applications_count: number | null
}

interface ReleasedShift {
  shift_id: string
  start_time: string
  end_time: string
  description: string | null
  freelancer_name: string | null
  amount: number
}

interface TransferView {
  id: string
  amount: number
  received_at: string
  sender_name: string | null
  reference: string | null
  used: number
  remaining: number
  settlements: LedgerRow[]
}

function SettlementMissions({ settlementId }: { settlementId: string }) {
  const { data = [], isLoading } = useQuery<ReleasedShift[]>({
    queryKey: ['settlement-released-shifts', settlementId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('settlement_released_shifts', { p_settlement_id: settlementId })
      if (error) throw error
      return (data ?? []) as ReleasedShift[]
    },
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Chargement des missions…
      </div>
    )
  }
  if (data.length === 0) return <p className="text-xs text-muted-foreground py-2">Aucune mission rattachée.</p>

  return (
    <div className="mt-2 space-y-1">
      {data.map((s) => (
        <div key={s.shift_id} className="flex justify-between gap-3 text-xs">
          <span className="text-muted-foreground min-w-0 truncate">
            {format(new Date(s.start_time), 'dd MMM yyyy', { locale: fr })} · {s.description || 'Mission'}
            {s.freelancer_name ? ` · ${s.freelancer_name}` : ''}
          </span>
          <span className="tabular-nums shrink-0">{formatEur(s.amount)}</span>
        </div>
      ))}
    </div>
  )
}

export function BankTransfersTab() {
  const { company } = useAuthStore()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [openSettlement, setOpenSettlement] = useState<Record<string, boolean>>({})

  const { data: ledger = [], isLoading } = useQuery<LedgerRow[]>({
    queryKey: ['bank-transfer-ledger', company?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('bank_transfer_ledger', { p_company_id: company!.id })
      if (error) throw error
      return (data ?? []) as LedgerRow[]
    },
    enabled: !!company?.id,
    refetchInterval: 30_000,
  })

  const transfers = useMemo<TransferView[]>(() => {
    const map = new Map<string, TransferView>()
    for (const r of ledger) {
      let t = map.get(r.transfer_id)
      if (!t) {
        t = {
          id: r.transfer_id,
          amount: Number(r.transfer_amount),
          received_at: r.received_at,
          sender_name: r.sender_name,
          reference: r.reference,
          used: 0,
          remaining: 0,
          settlements: [],
        }
        map.set(r.transfer_id, t)
      }
      if (r.settlement_id) {
        t.used += Number(r.allocated_amount)
        t.settlements.push(r)
      } else {
        t.remaining += Number(r.allocated_amount)
      }
    }
    return [...map.values()].sort((a, b) => +new Date(b.received_at) - +new Date(a.received_at))
  }, [ledger])

  const totals = useMemo(
    () => ({
      received: transfers.reduce((s, t) => s + t.amount, 0),
      used: transfers.reduce((s, t) => s + t.used, 0),
      remaining: transfers.reduce((s, t) => s + t.remaining, 0),
    }),
    [transfers],
  )

  const filtered = transfers.filter((t) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      (t.sender_name || '').toLowerCase().includes(q) ||
      (t.reference || '').toLowerCase().includes(q) ||
      String(t.amount).includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ArrowDownToLine className="w-3 h-3" /> Total reçu
            </div>
            <div className="mt-1 text-2xl font-bold">{formatEur(totals.received)}</div>
            <div className="text-[10px] text-muted-foreground">
              {transfers.length} virement{transfers.length > 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Utilisé pour vos règlements
            </div>
            <div className="mt-1 text-2xl font-bold">{formatEur(totals.used)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Excédent disponible
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-600">{formatEur(totals.remaining)}</div>
            <div className="text-[10px] text-muted-foreground">Appliqué automatiquement à vos prochaines missions</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Rechercher par expéditeur, référence, montant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Landmark className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Aucun virement reçu</p>
            <p className="text-xs mt-1">Vos virements apparaîtront ici dès leur réception sur votre IBAN dédié.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((t) => {
              const isOpen = !!open[t.id]
              const fullyUsed = t.remaining < 0.005
              return (
                <div key={t.id}>
                  <button
                    type="button"
                    className="w-full flex flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Landmark className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {format(new Date(t.received_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.sender_name || 'Expéditeur inconnu'}
                          {t.reference ? ` · ${t.reference}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{formatEur(t.amount)}</p>
                      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                        <span>
                          Utilisé {formatEur(t.used)} · Reste {formatEur(t.remaining)}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            fullyUsed
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }
                        >
                          {fullyUsed ? 'Utilisé' : 'Solde disponible'}
                        </Badge>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pl-[4.25rem] space-y-3">
                      {t.settlements.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Ce virement n'a pas encore servi à régler de mission : il reste disponible en excédent.
                        </p>
                      ) : (
                        t.settlements.map((s) => {
                          const sid = s.settlement_id!
                          const sOpen = !!openSettlement[sid]
                          return (
                            <div key={sid} className="border-l-2 pl-3">
                              <button
                                type="button"
                                className="w-full flex justify-between gap-2 text-left text-sm"
                                onClick={() => setOpenSettlement((o) => ({ ...o, [sid]: !o[sid] }))}
                              >
                                <span className="flex items-center gap-1.5">
                                  {sOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  Règlement du{' '}
                                  {s.settlement_created_at
                                    ? format(new Date(s.settlement_created_at), 'dd MMM yyyy', { locale: fr })
                                    : '—'}{' '}
                                  · {s.applications_count} mission{(s.applications_count ?? 0) > 1 ? 's' : ''}
                                  {s.settlement_status === 'pending' && (
                                    <Badge variant="outline" className="ml-1 text-[10px]">
                                      en cours
                                    </Badge>
                                  )}
                                </span>
                                <span className="tabular-nums font-medium">{formatEur(s.allocated_amount)}</span>
                              </button>
                              {sOpen && <SettlementMissions settlementId={sid} />}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        Les factures de chaque règlement sont disponibles dans l'onglet « Factures ».
      </p>
    </div>
  )
}