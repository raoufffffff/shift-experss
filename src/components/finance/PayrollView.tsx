import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useEstablishmentStore } from '@/stores/establishmentStore'
import { useLocale } from '@/hooks/useLocale'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'
import { Download, Calendar, Building2, Users, Banknote, Settings, CheckCircle2, Clock, XCircle, CreditCard, Receipt, FileText, Search, Briefcase, UserCheck, PenTool, Eye, AlertTriangle, Landmark } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/utils/logger'
import { toast } from 'sonner'
import { PayrollSkeleton } from '@/components/skeletons/PayrollSkeleton'
import { ContractSignatureModal } from '@/pages/documents/components/ContractSignatureModal'
import { DisputePaymentDialog } from './DisputePaymentDialog' // adjust path as needed
import { SettlementCard } from './SettlementCard'
import { Chip } from '@/components/ui/Chip'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BankTransferCard, CreditLimitSummary } from './BankTransferCard'
import { BankTransfersTab } from './BankTransfersTab'
import { TransportFeesSection } from './TransportFeesSection'
// NEW invoicing system: invoices are now plain data rows, rendered to
// an on-brand HTML template in the browser and turned into a PDF only
// when the user actually clicks download (html2canvas + jsPDF). See
// components/invoices/*. This replaces the old flow where a PDF was
// pre-generated server-side (generate-invoice-pdf.ts Edge Function)
// and stored in the 'invoices' Storage bucket.
import { InvoicePreviewDialog } from './Invoicepreviewdialog'
import type { InvoiceRecord } from './Invoice'
import { getInvoiceTypeMeta, shouldHideVat } from './Invoice'

type PeriodType = 'current_month' | 'last_month' | 'custom'
type TabType = 'payroll' | 'transfers' | 'invoices' | 'contracts'
type WorkerFilter = 'all' | 'employees' | 'freelancers'

// Used only to type the <select> filter's value against a known
// invoice_type. All types the company's invoices row can carry are
// now shown in this tab (the earlier freelance_prestation/
// client_commission-only filter was removed -- refund invoices also
// belong to the company, e.g. the company is the buyer on a refund).
type CompanyFacingInvoiceType = 'freelance_prestation' | 'client_commission' | 'refund' | 'settlement_fee' | 'transport_fee'

interface Contract {
    id: string
    type: string
    status: string
    created_at: string
    signed_at: string | null
    employer_signed_at: string | null
    employer_signature_svg: string | null
    freelancer_signature_svg: string | null
    contract_url: string | null
    freelancer_application: {
        id: string
        freelancer: { id: string; first_name: string; last_name: string; city: string | null } | null
        shift: {
            break_duration_minutes: number | null;
            id: string; position_name: string; start_time: string; end_time: string
            freelance_hourly_rate: number | null
            establishment: { name: string; address: string | null; city: string | null } | null
        } | null
    } | null
}

interface WorkerShift {
    id: string
    worker_type: 'employee' | 'freelancer'
    worker_id: string
    worker_name: string
    worker_email: string
    shift_id: string
    application_id: string | null
    shift_date: string
    start_time: string
    end_time: string
    break_minutes: number
    gross_hours: number
    net_hours: number
    hourly_rate: number | null
    total_cost: number | null
    establishment_name: string
    position_name: string
    shift_status: string
}

interface WorkerSummary {
    worker_id: string
    worker_name: string
    worker_email: string
    worker_type: 'employee' | 'freelancer'
    total_shifts: number
    total_net_hours: number
    total_cost: number
}

// CHANGE (new payment system): a "payment" for a freelancer application
// is now just its own payment_status row -- there's no separate
// payment_tickets / transactions ledger to join against. total is
// total_charged_to_client (what the company actually pays via SEPA,
// wage + commission -- see charge-shift-on-acceptance).
interface PaymentRecord {
    id: string
    application_id: string
    status: string
    amount: number
    stripe_payment_intent_id: string | null
    shift_id: string
    created_at: string
    // Added so the "pending payments" list can show WHICH mission and
    // freelancer a payment belongs to, and so the dispute button can
    // be shown/hidden/labeled correctly (can't dispute an already-
    // disputed or already-transferred row).
    worker_name: string | null
    position_name: string | null
    shift_date: string | null
    company_disputed_at: string | null
    // Needed to compute dispute eligibility: the company can only
    // dispute once the shift is actually 'completed', and only within
    // the same 48h window process-freelancer-transfers uses before it
    // fires the Transfer (see cutoff logic there). Both fields come
    // straight from the shift, not recomputed independently, so the
    // eligibility window here can never drift out of sync with the
    // cron's own cutoff.
    shift_status: string | null
    shift_end_time: string | null
}

export function PayrollView() {
    const { t } = useTranslation()
    const { company } = useAuthStore()
    const { selectedEstablishmentId } = useEstablishmentStore()
    const { navigate } = useLocale()

    // Tab & filters
    const [activeTab, setActiveTab] = useState<TabType>('payroll')
    const [periodType, setPeriodType] = useState<PeriodType>('current_month')
    const [startDate, setStartDate] = useState<Date>(() => {
        const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
    })
    const [endDate, setEndDate] = useState<Date>(() => {
        const d = new Date(); d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); return d
    })
    const [establishmentFilter, setEstablishmentFilter] = useState<string>(selectedEstablishmentId || 'all')
    const [workerFilter, setWorkerFilter] = useState<WorkerFilter>('all')

    // Invoice state
    const [invoiceSearch, setInvoiceSearch] = useState('')
    const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<string>('all')
    // NEW: replaces the old `downloadingInvoice` async-download state.
    // The invoice is plain data already in memory (from the query
    // below), so "opening" it is instant -- no network round trip --
    // and the PDF is only generated if/when the user clicks download
    // inside the preview dialog.
    const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null)
    const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false)

    // Contract state
    const queryClient = useQueryClient()
    const [contractSearch, setContractSearch] = useState('')
    const [contractStatusFilter, setContractStatusFilter] = useState<'all' | 'pending' | 'signed'>('all')
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)

    // Dispute dialog state — see DisputePaymentDialog.tsx
    const [disputeTarget, setDisputeTarget] = useState<PaymentRecord | null>(null)
    const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false)

    // -- Establishments --
    const { data: establishments = [] } = useQuery({
        queryKey: ['establishments', company?.id],
        queryFn: async () => {
            if (!company?.id) return []
            const { data } = await supabase.from('establishments').select('id, name')
                .eq('company_id', company.id).eq('status', 'active').order('name')
            return data || []
        },
        enabled: !!company?.id,
    })

    // -- Employee shifts --
    const { data: employeeShifts = [], isLoading: employeesLoading } = useQuery<WorkerShift[]>({
        queryKey: ['payroll-employees', company?.id, establishmentFilter, startDate.toISOString(), endDate.toISOString()],
        queryFn: async () => {
            if (!company?.id) return []
            let query = supabase
                .from('shift_applications')
                .select(`
                    shift_id, user_id, status,
                    shift:shifts!inner(id, start_time, end_time, break_duration_minutes, position_name, status, company_id, establishment_id,
                        establishment:establishments(id, name)),
                    user:users!shift_applications_user_id_fkey(id, email, first_name, last_name)
                `)
                .eq('status', 'accepted')
                .eq('shift.company_id', company.id)
                .gte('shift.start_time', startDate.toISOString())
                .lte('shift.start_time', endDate.toISOString())

            if (establishmentFilter !== 'all') query = query.eq('shift.establishment_id', establishmentFilter)
            const { data, error } = await query
            if (error) { logger.error('Payroll employee query error:', error); return [] }

            return ((data as any[]) || []).filter(a => a.shift && a.user).map((app): WorkerShift => {
                const s = app.shift, u = app.user
                 const start = new Date(s.start_time);
                 const end = new Date(s.end_time);

                  const startMins = start.getHours() * 60 + start.getMinutes();
                 const endMins = end.getHours() * 60 + end.getMinutes();

                  let diffMinutes = endMins - startMins;
                 if (diffMinutes <= 0) diffMinutes += 24 * 60;

                  const gross = diffMinutes / 60;
                 const net = Math.max(0, gross - (s.break_duration_minutes || 0) / 60);
                return {
                    id: `emp-${s.id}-${u.id}`,
                    worker_type: 'employee',
                    worker_id: u.id,
                    worker_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
                    worker_email: u.email,
                    shift_id: s.id,
                    application_id: null,
                    shift_date: format(start, 'yyyy-MM-dd'),
                    start_time: s.start_time,
                    end_time: s.end_time,
                    break_minutes: s.break_duration_minutes || 0,
                    gross_hours: gross,
                    net_hours: net,
                    hourly_rate: null,
                    total_cost: null,
                    establishment_name: s.establishment?.name || '',
                    position_name: s.position_name || '',
                    shift_status: s.status || '',
                }
            }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        },
        enabled: !!company?.id && activeTab === 'payroll',
    })

    // -- Freelancer shifts --
    // CHANGE (new commission system): total_cost now comes DIRECTLY from
    // shift_freelancer_applications.total_charged_to_client -- the frozen
    // snapshot computed once in charge-shift-on-acceptance (wage +
    // platform_fee_rate commission + transport_fee). We no longer
    // recompute it here from shift.freelance_hourly_rate /
    // shift.platform_fee_rate -- that duplicated the commission formula
    // in two places, which is exactly how it drifted out of sync before
    // (this view was still adding the commission on top of net hours
    // computed WITHOUT subtracting the break, and used a stale default
    // fee rate). The snapshot is the single source of truth; this view
    // just displays it.
    const { data: freelancerShifts = [], isLoading: freelancersLoading } = useQuery<WorkerShift[]>({
        queryKey: ['payroll-freelancers', company?.id, establishmentFilter, startDate.toISOString(), endDate.toISOString()],
        queryFn: async () => {
            if (!company?.id) return []
            let query = supabase
                .from('shift_freelancer_applications' as any)
                .select(`
                    id, freelancer_id, status,
                    base_amount, transport_fee, total_charged_to_client, payment_status,
                    shift:shifts!inner(id, start_time, end_time, actual_start_time, actual_end_time, actual_break_duration_minutes, break_duration_minutes,
                        freelance_hourly_rate, position_name, status, company_id, establishment_id,
                        establishment:establishments(id, name)),
                    freelancer:freelancers!inner(id, first_name, last_name, email)
                `)
                .eq('status', 'accepted')
                .eq('shift.company_id', company.id)
                .gte('shift.start_time', startDate.toISOString())
                .lte('shift.start_time', endDate.toISOString())

            if (establishmentFilter !== 'all') query = query.eq('shift.establishment_id', establishmentFilter)
            const { data, error } = await query
            if (error) { logger.error('Payroll freelancer query error:', error); return [] }

            return ((data as any[]) || []).filter(a => a.shift && a.freelancer).map((app): WorkerShift => {
                const s = app.shift, f = app.freelancer
                const startStr = s.actual_start_time || s.start_time;
                const endStr = s.actual_end_time || s.end_time;

                const start = new Date(startStr);
                const end = new Date(endStr);

                const startMins = start.getHours() * 60 + start.getMinutes();
                const endMins = end.getHours() * 60 + end.getMinutes();

                let diffMinutes = endMins - startMins;
                if (diffMinutes <= 0) diffMinutes += 24 * 60;

                const gross = diffMinutes / 60;
                const breakMin = s.actual_break_duration_minutes ?? s.break_duration_minutes ?? 0;
                // Bug fix: net hours must actually subtract the break --
                // the previous version computed breakMin but never used
                // it (net = Math.max(0, gross)). This only affects the
                // DISPLAYED hours figure; the billed amount below never
                // depended on this calculation to begin with (it uses
                // the frozen total_charged_to_client instead).
                const net = Math.max(0, gross - breakMin / 60);

                const rate = s.freelance_hourly_rate ?? 0;
                // total_charged_to_client is the frozen, already-correct
                // amount (wage + commission + transport). Falls back to
                // null (not 0) when the snapshot hasn't been computed yet
                // (e.g. application accepted but charge-shift-on-acceptance
                // hasn't run/completed) so the UI can show "pending"
                // rather than a misleading 0e.
                const totalCost: number | null = app.total_charged_to_client ?? null;

                return {
                    id: `free-${s.id}-${f.id}`,
                    worker_type: 'freelancer',
                    worker_id: f.id,
                    worker_name: `${f.first_name || ''} ${f.last_name || ''}`.trim() || f.email,
                    worker_email: f.email,
                    shift_id: s.id,
                    application_id: app.id,
                    shift_date: format(start, 'yyyy-MM-dd'),
                    start_time: startStr,
                    end_time: endStr,
                    break_minutes: breakMin,
                    gross_hours: gross,
                    net_hours: net,
                    hourly_rate: rate,
                    total_cost: totalCost,
                    establishment_name: s.establishment?.name || '',
                    position_name: s.position_name || '',
                    shift_status: s.status || '',
                }
            }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        },
        enabled: !!company?.id && activeTab === 'payroll',
    })

    // -- Payments --
    // CHANGE (new payment system): payment_tickets and the legacy
    // transactions ledger are gone from this flow -- a payment IS a
    // shift_freelancer_applications row now. We read payment_status +
    // stripe_payment_intent_id + total_charged_to_client directly,
    // scoped to the same period/establishment filters as the shifts
    // above (via the same date range on shift.start_time) so "pending
    // payments" reflects what's actually pending in the new system.
    const { data: payments = [] } = useQuery<PaymentRecord[]>({
        queryKey: ['company-payments-v2', company?.id, establishmentFilter, startDate.toISOString(), endDate.toISOString()],
        queryFn: async () => {
            if (!company?.id) return []

            let query = supabase
                .from('shift_freelancer_applications' as any)
                .select(`
                    id, payment_status, stripe_payment_intent_id, total_charged_to_client, created_at,
                    company_disputed_at,
                    shift:shifts!inner(id, company_id, establishment_id, start_time, end_time, status, position_name),
                    freelancer:freelancers(id, first_name, last_name)
                `)
                .eq('status', 'accepted')
                .eq('shift.company_id', company.id)
                .gte('shift.start_time', startDate.toISOString())
                .lte('shift.start_time', endDate.toISOString())
                // CHANGE (settlement mode): 'awaiting_settlement' rows were never charged
                // (the company hasn't paid yet) -- they belong to the SettlementCard, not to
                // this list of SEPA debits, and must never be offered for dispute.
                .not('payment_status', 'in', '(pending,awaiting_settlement)')

            if (establishmentFilter !== 'all') query = query.eq('shift.establishment_id', establishmentFilter)

            const { data, error } = await query
            if (error) { logger.error('Payroll payments query error:', error); return [] }

            return ((data as any[]) || []).map((app): PaymentRecord => ({
                id: app.id,
                application_id: app.id,
                status: app.payment_status,
                amount: Number(app.total_charged_to_client ?? 0),
                stripe_payment_intent_id: app.stripe_payment_intent_id,
                shift_id: app.shift?.id ?? '',
                created_at: app.created_at,
                shift_status: app.shift?.status ?? null,
                shift_end_time: app.shift?.end_time ?? null,
                worker_name: app.freelancer ? `${app.freelancer.first_name || ''} ${app.freelancer.last_name || ''}`.trim() || null : null,
                position_name: app.shift?.position_name ?? null,
                shift_date: app.shift?.start_time ?? null,
                company_disputed_at: app.company_disputed_at ?? null,
            })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        },
        enabled: !!company?.id && activeTab === 'payroll',
    })

    // -- Payment method --
    const { data: paymentPref } = useQuery({
        queryKey: ['payment-method-preference', company?.id],
        queryFn: async () => {
            if (!company?.id) return null
            const { data } = await supabase.from('companies')
.select('preferred_payment_method, sepa_status, sepa_iban_last4, payment_mode, settlement_collection' as never)
                .eq('id', company.id).single()
            return data as any
        },
        enabled: !!company?.id,
    })

    // -- Invoices --
    // NEW invoicing system: this query is unchanged from before at the
    // data level -- it still filters on the company-facing types only
    // (freelance_prestation / client_commission) and excludes
    // freelance_commission (invoice 3), which carries this company's id
    // as a contextual reference only (see generate-invoice-transfer.ts)
    // without the company being an actual party to that invoice.
    //
    // What changed is what happens to a row AFTER it's fetched: it's
    // now handed directly to <InvoiceTemplate> / <InvoicePreviewDialog>
    // as plain data (typed as InvoiceRecord) instead of being used to
    // look up a pre-rendered PDF in Storage. No pdf_storage_path /
    // pdf_url field is read anymore.
    const { data: invoices = [], isLoading: invoicesLoading } = useQuery<InvoiceRecord[]>({
        queryKey: ['company-invoices', company?.id, invoiceTypeFilter],
        queryFn: async () => {
            if (!company?.id) return []
            // NOTE: the type filter (freelance_prestation/client_commission
            // only) was removed on purpose -- refund invoices belong to
            // the company too (the company IS the buyer on a refund, see
            // the sample PDF), and excluding them hid real invoices the
            // company should be able to see. All types now come through;
            // the UI-level select below still lets the user narrow by type.
            //
            // shift:shifts(position_name) is a join purely for display --
            // it lets the invoice template show "Mission : Serveur" etc.
            // instead of the raw shift UUID. It is NOT a column on
            // `invoices` itself.
            let query = supabase
                .from('invoices')
                .select('*, shift:shifts(position_name)')
                .eq('company_id', company.id)
                .neq('status', 'void')
                // The client only sees the invoices it is a party to: PRES (client <->
                // freelancer) and COMC (client <-> platform), plus refunds. COMF
                // (platform -> freelancer) carries this company's id only as a
                // contextual reference and must never be shown to the client.
                .neq('type', 'freelance_commission')
                .order('created_at', { ascending: false })
                .limit(200)
            if (invoiceTypeFilter !== 'all') {
                query = query.eq('type', invoiceTypeFilter as CompanyFacingInvoiceType)
            }
            const { data } = await query
            return ((data as any[]) || []).map((row): InvoiceRecord => ({
                ...row,
                shift_position_name: row.shift?.position_name ?? null,
            }))
        },
        enabled: !!company?.id && activeTab === 'invoices',
        staleTime: 1000 * 60 * 5,
    })

    // -- Contracts --
    const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
        queryKey: ['contracts', company?.id, contractStatusFilter],
        queryFn: async () => {
            if (!company?.id) return []
            let query = supabase.from('contracts')
                .select(`
                    *,
                    freelancer_application:freelancer_application_id (
                        id,
                        freelancer:freelancer_id (id, first_name, last_name, city),
                        shift:shift_id (id, position_name, start_time, end_time, freelance_hourly_rate, break_duration_minutes, establishment:establishment_id (name, address, city))
                    )
                `)
                .order('created_at', { ascending: false })
            if (contractStatusFilter === 'pending') query = query.in('status', ['pending', 'signed_freelancer'])
            else if (contractStatusFilter === 'signed') query = query.eq('status', 'signed')
            const { data } = await query
            return (data || []) as unknown as Contract[]
        },
        enabled: !!company?.id && activeTab === 'contracts',
        staleTime: 1000 * 60 * 5,
    })

    // -- Derived data --
    const allShifts = [...employeeShifts, ...freelancerShifts]
    const filteredShifts = workerFilter === 'all' ? allShifts
        : allShifts.filter(s => s.worker_type === (workerFilter === 'employees' ? 'employee' : 'freelancer'))

    const workerSummaries: WorkerSummary[] = Object.values(
        filteredShifts.reduce((acc: Record<string, WorkerSummary>, s) => {
            const key = `${s.worker_type}-${s.worker_id}`
            if (!acc[key]) {
                acc[key] = { worker_id: s.worker_id, worker_name: s.worker_name, worker_email: s.worker_email, worker_type: s.worker_type, total_shifts: 0, total_net_hours: 0, total_cost: 0 }
            }
            acc[key].total_shifts += 1
            acc[key].total_net_hours += s.net_hours
            acc[key].total_cost += s.total_cost ?? 0
            return acc
        }, {})

    ).sort((a, b) => {
        return b.total_net_hours - a.total_net_hours
    }
    )

    const stats = {
        totalEmployees: workerSummaries.filter(w => w.worker_type === 'employee').length,
        totalFreelancers: workerSummaries.filter(w => w.worker_type === 'freelancer').length,
        totalShifts: filteredShifts.length,
        totalNetHours: workerSummaries.reduce((s, w) => s + w.total_net_hours, 0),
        totalFreelancerCost: workerSummaries.filter(w => w.worker_type === 'freelancer').reduce((s, w) => s + w.total_cost, 0),
    }

    // CHANGE (new payment system): pending/completed are now derived
    // from shift_freelancer_applications.payment_status values
    // (see stripe-webhook / process-freelancer-transfers) instead of
    // the old payment_tickets/transactions statuses. 'pending' here
    // covers any status that isn't a terminal success/failure -- i.e.
    // still in-flight through the SEPA charge or transfer pipeline.
    const TERMINAL_STATUSES = new Set([
        'transferred',
        'refunded',
        'partially_refunded',
        'charge_disputed_lost',
        'transfer_reversed',
    ])
    const pendingPayments = payments.filter(p => !TERMINAL_STATUSES.has(p.status) && p.status !== 'charge_failed' && p.status !== 'transfer_failed')
    const completedPayments = payments.filter(p => TERMINAL_STATUSES.has(p.status) || p.status === 'charge_failed' || p.status === 'transfer_failed')
    const isLoading = employeesLoading || freelancersLoading
    const isBankTransfer = paymentPref?.payment_mode === 'settlement' && paymentPref?.settlement_collection === 'bank_transfer'

    // Dispute eligibility: mirrors process-freelancer-transfers'
    // own cutoff exactly (shift.status === 'completed' AND
    // shift.end_time within the last 48h — see the cron's `cutoff`
    // constant). Once the shift passes that 48h mark, the cron may
    // have already picked the row up (or is about to), so disputing
    // through this UI is no longer meaningful — an already-disputed
    // row (company_disputed_at set) or an already-transferred one
    // (payment_status === 'transferred') is also never eligible,
    // regardless of timing.
    const DISPUTE_WINDOW_HOURS = 48
    const isDisputeEligible = (p: PaymentRecord): boolean => {
        if (p.company_disputed_at) return false
        if (p.status === 'transferred') return false
        if (p.shift_status !== 'completed') return false
        if (!p.shift_end_time) return false
        const hoursSinceEnd = (Date.now() - new Date(p.shift_end_time).getTime()) / (1000 * 60 * 60)
        return hoursSinceEnd >= 0 && hoursSinceEnd < DISPUTE_WINDOW_HOURS
    }

    // -- Handlers --
    const handlePeriodChange = (type: PeriodType) => {
        setPeriodType(type)
        const now = new Date()
        if (type === 'current_month') {
            setStartDate(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0))
            setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999))
        } else if (type === 'last_month') {
            setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0))
            setEndDate(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999))
        }
    }

    const generateCSV = () => {
        if (filteredShifts.length === 0) { toast.error(t('payroll.noData')); return }

        const headers = ['Type', 'Nom', 'Email', 'Date', 'Debut', 'Fin', 'Pause (min)', 'Heures brutes', 'Heures nettes', 'Taux horaire', 'Cout total', 'Etablissement', 'Poste', 'Statut shift']
        const rows = filteredShifts.map(s => [
            s.worker_type === 'employee' ? 'Employe' : 'Freelance',
            s.worker_name, s.worker_email, s.shift_date,
            format(parseISO(s.start_time), 'HH:mm'), format(parseISO(s.end_time), 'HH:mm'),
            s.break_minutes.toString(), s.gross_hours.toFixed(2), s.net_hours.toFixed(2),
            s.hourly_rate?.toFixed(2) ?? '', s.total_cost?.toFixed(2) ?? '',
            s.establishment_name, s.position_name, s.shift_status,
        ])

        const BOM = '\uFEFF'
        const csv = BOM + [headers.join(';'), ...rows.map(r => r.map(c => {
            const sc = String(c)
            return sc.includes(';') || sc.includes('"') || sc.includes('\n') ? `"${sc.replace(/"/g, '""')}"` : sc
        }).join(';'))].join('\n')

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `paie_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.csv`
        link.click()
        URL.revokeObjectURL(link.href)
        toast.success(t('payroll.exportSuccess'))
    }

    // NEW invoicing system: opening an invoice is now just setting
    // local state from data we already have in memory (the `invoices`
    // query result) -- no fetch, no Storage lookup, no HEAD request to
    // check a PDF still exists. The PDF itself is only ever generated
    // client-side, on demand, inside InvoicePreviewDialog if the user
    // clicks "Télécharger le PDF".
    //
    // This entirely replaces the old handleDownloadInvoice, which used
    // to: (1) re-fetch pdf_storage_path, (2) build a public Storage
    // URL, (3) HEAD-check the file exists, (4) window.open it. None of
    // that machinery is needed anymore since there is no server-
    // generated PDF file to locate.
    const handleOpenInvoice = (invoice: InvoiceRecord) => {
        setPreviewInvoice(invoice)
        setIsInvoicePreviewOpen(true)
    }

    const filteredInvoices = invoices.filter((inv) => {
        const q = invoiceSearch.toLowerCase()
        return inv.reference.toLowerCase().includes(q) || inv.seller_name.toLowerCase().includes(q) || inv.buyer_name.toLowerCase().includes(q) || inv.description.toLowerCase().includes(q)
    })

    const filteredContracts = contracts.filter((c) => {
        const q = contractSearch.toLowerCase()
        const name = `${c.freelancer_application?.freelancer?.first_name || ''} ${c.freelancer_application?.freelancer?.last_name || ''}`.toLowerCase()
        const position = (c.freelancer_application?.shift?.position_name || '').toLowerCase()
        return name.includes(q) || position.includes(q)
    })

    const handleViewContract = (contract: Contract) => {
        const app = contract.freelancer_application
        const shift = app?.shift; const freelancer = app?.freelancer
        if (!shift || !freelancer) return
        const fullName = `${freelancer.first_name || ''} ${freelancer.last_name || ''}`.trim()
        const establishmentName = shift.establishment?.name || 'N/A'
        const establishmentAddress = [shift.establishment?.address, shift.establishment?.city].filter(Boolean).join(', ')
        const freelancerAddress = freelancer.city || 'Non renseigne'
        const missionDate = new Date(shift.start_time).toLocaleDateString('fr-FR')
        const start = new Date(shift.start_time);
        const end = new Date(shift.end_time);

        const startTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const endTime = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const hourlyRate = shift.freelance_hourly_rate || 0;

        const startMins = start.getHours() * 60 + start.getMinutes();
        const endMins = end.getHours() * 60 + end.getMinutes();

        let diffMinutes = endMins - startMins;
        if (diffMinutes <= 0) diffMinutes += 24 * 60;

        const durationHours = (diffMinutes) / 60;

        const totalAmount = (hourlyRate * durationHours).toFixed(2);

        const freelancerSignedDate = contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('fr-FR') : ''
        const employerSignedDate = contract.employer_signed_at ? new Date(contract.employer_signed_at).toLocaleDateString('fr-FR') : ''
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Contrat ${contract.id.slice(0, 8).toUpperCase()}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');body{font-family:'Inter',Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6;padding:40px;max-width:800px;margin:0 auto}.header{text-align:center;margin-bottom:50px;padding-bottom:30px;border-bottom:2px solid #FF0058}.logo{font-size:28px;font-weight:800;color:#FF0058;letter-spacing:-1px;margin-bottom:8px;text-transform:uppercase}.doc-title{font-size:16px;text-transform:uppercase;letter-spacing:2px;color:#64748b;font-weight:600}.parties-container{display:flex;justify-content:space-between;gap:30px;margin-bottom:40px}.party-box{flex:1;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0}.party-label{font-size:11px;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:12px;letter-spacing:1px}.party-name{font-size:16px;font-weight:700;color:#0f172a;margin-bottom:4px}.party-info{font-size:13px;color:#475569}.section{margin-bottom:30px}.section-header{font-size:13px;text-transform:uppercase;font-weight:700;color:#FF0058;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:16px}.grid-row{display:flex;gap:20px;margin-bottom:15px}.info-card{flex:1;background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0}.info-label{font-size:11px;color:#64748b;margin-bottom:4px}.info-value{font-size:14px;font-weight:600;color:#0f172a}.financial-summary{background:#FF005808;border:1px solid #FF005820;border-radius:8px;padding:20px;margin-top:20px;display:flex;justify-content:space-between;align-items:center}.total-label{font-size:14px;font-weight:600;color:#FF0058}.total-amount{font-size:24px;font-weight:800;color:#FF0058}.legal-text{font-size:12px;color:#475569;text-align:justify;line-height:1.7}.signatures-section{margin-top:60px;page-break-inside:avoid}.sign-row{display:flex;justify-content:space-between;gap:40px}.sign-box{flex:1;border:1px dashed #cbd5e1;border-radius:12px;padding:24px;min-height:180px;display:flex;flex-direction:column;align-items:center;background:#fff}.sign-role{font-size:11px;text-transform:uppercase;font-weight:700;color:#94a3b8;margin-bottom:8px;letter-spacing:1px}.sign-name{font-size:14px;font-weight:600;color:#0f172a;margin-bottom:20px;text-align:center}.footer{margin-top:60px;border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;font-size:10px;color:#94a3b8}@media print{body{padding:20px}}</style></head><body>
<div class="header"><div class="logo">SHIFT EXPRESS</div><div class="doc-title">Contrat de Prestation de Services</div><div style="font-size:12px;color:#94a3b8;margin-top:8px">Ref: ${contract.id.slice(0, 8).toUpperCase()}</div></div>
<div class="parties-container"><div class="party-box"><div class="party-label">L'Entreprise (Client)</div><div class="party-name">${establishmentName}</div><div class="party-info">${establishmentAddress}</div></div><div class="party-box"><div class="party-label">Le Freelance (Prestataire)</div><div class="party-name">${fullName}</div><div class="party-info">${freelancerAddress}</div></div></div>
<div class="section"><div class="section-header">1. Details de la Mission</div><div class="grid-row"><div class="info-card"><div class="info-label">Poste</div><div class="info-value">${shift.position_name || 'Prestataire'}</div></div><div class="info-card"><div class="info-label">Date</div><div class="info-value">${missionDate}</div></div></div><div class="grid-row"><div class="info-card"><div class="info-label">Horaires</div><div class="info-value">${startTime} - ${endTime}</div></div><div class="info-card"><div class="info-label">Lieu</div><div class="info-value">${establishmentAddress}</div></div></div></div>
<div class="section">
    <div class="section-header">2. Conditions Financieres</div>
    
    <div class="grid-row">
        <div class="info-card">
            <div class="info-label">Taux Horaire</div>
            <div class="info-value">${hourlyRate}e / heure</div>
        </div>
        <div class="info-card">
            <div class="info-label">Duree Totale</div>
            <div class="info-value">$${Math.floor(durationHours)}h ${((diffMinutes) % 60).toString().padStart(2, '0')}m</div>
        </div>
        
    </div>
    
    <div class="financial-summary">
        <div class="total-label">Total Estime (net de pause)</div>
        <div class="total-amount">${totalAmount} e</div>
    </div>
</div><div class="section"><div class="section-header">3. Clauses Legales</div><div class="legal-text"><p style="margin-bottom:10px"><strong>Statut d'Independant :</strong> Le Freelance declare exercer son activite en toute independance, sans lien de subordination avec l'Entreprise.</p><p><strong>Responsabilite :</strong> Le Freelance s'engage a realiser la mission selon les regles de l'art et declare disposer d'une assurance responsabilite civile professionnelle valide.</p></div></div>
<div class="signatures-section"><div class="section-header">Signatures</div><div class="sign-row"><div class="sign-box"><div class="sign-role">Pour l'Entreprise</div><div class="sign-name">${establishmentName}</div>${contract.employer_signature_svg && contract.employer_signature_svg !== 'auto_signed' ? `<img src="${contract.employer_signature_svg}" width="180" height="90" />` : contract.status === 'signed' ? '<div style="color:#10b981;font-style:italic">Signe electroniquement</div>' : '<div style="color:#94a3b8;font-style:italic">En attente de signature</div>'}${employerSignedDate ? `<div style="font-size:10px;color:#94a3b8;margin-top:10px">Signe le ${employerSignedDate}</div>` : ''}</div><div class="sign-box" ${contract.signed_at ? 'style="border-color:#10b981;background:#f0fdf4"' : ''}><div class="sign-role">Le Freelance</div><div class="sign-name">${fullName}</div>${contract.freelancer_signature_svg && contract.freelancer_signature_svg !== 'auto_signed' ? '<div style="color:#10b981;font-style:italic">Signe numeriquement</div>' : contract.status === 'signed' ? '<div style="color:#10b981;font-style:italic">Signe electroniquement</div>' : '<div style="color:#94a3b8;font-style:italic">En attente de signature</div>'}${freelancerSignedDate ? `<div style="font-size:10px;color:#94a3b8;margin-top:10px">Signe le ${freelancerSignedDate}</div>` : ''}</div></div></div>
<div class="footer">Genere automatiquement par Shift Express -- La plateforme de gestion de shifts freelance.</div></body></html>`
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
    }

    const getContractStatusChip = (status: string) => {
        switch (status) {
            case 'signed': return <Chip variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>Signe</Chip>
            case 'pending': return <Chip variant="warning" icon={<Clock className="w-3 h-3" />}>En attente</Chip>
            case 'signed_freelancer': return <Chip variant="warning" icon={<PenTool className="w-3 h-3" />}>Signe freelance</Chip>
            case 'signed_employer': return <Chip variant="warning" icon={<PenTool className="w-3 h-3" />}>Signe employeur</Chip>
            default: return <Chip variant="default">{status}</Chip>
        }
    }

    // CHANGE (new payment system): status labels/colors now match
    // shift_freelancer_applications.payment_status values instead of
    // the old payment_tickets/transactions statuses ('succeeded',
    // 'confirmed', 'failed', 'rejected').
    const getPaymentStatusDisplay = (status: string): { label: string; variant: 'success' | 'failed' | 'pending' } => {
        switch (status) {
            case 'transferred':
                return { label: 'Paye', variant: 'success' }
            case 'charge_failed':
            case 'transfer_failed':
                return { label: 'Echoue', variant: 'failed' }
            case 'refunded':
            case 'partially_refunded':
                return { label: 'Rembourse', variant: 'failed' }
            case 'charge_disputed':
            case 'charge_disputed_lost':
                return { label: 'Litige', variant: 'failed' }
            case 'transfer_reversed':
                return { label: 'Annule', variant: 'failed' }
            default:
                return { label: 'En cours', variant: 'pending' }
        }
    }

    if (isLoading && activeTab === 'payroll') return <PayrollSkeleton />

    return (
        <div className="space-y-6">
            {/* TABS */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                <button onClick={() => setActiveTab('payroll')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'payroll' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    <div className="flex items-center gap-2"><Banknote className="w-4 h-4" />{t('payroll.tab.payroll', { defaultValue: 'Paie & Export' })}</div>
                </button>
                {isBankTransfer && (
                    <button onClick={() => setActiveTab('transfers')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'transfers' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        <div className="flex items-center gap-2"><Landmark className="w-4 h-4" />{t('payroll.tab.transfers', { defaultValue: 'Virements' })}</div>
                    </button>
                )}
                <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'invoices' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4" />{t('payroll.tab.invoices', { defaultValue: 'Factures' })}
                        {invoices.length > 0 && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{invoices.length}</span>}
                    </div>
                </button>
                <button onClick={() => setActiveTab('contracts')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'contracts' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    <div className="flex items-center gap-2">
                        <PenTool className="w-4 h-4" />{t('payroll.tab.contracts', { defaultValue: 'Contrats' })}
                        {contracts.length > 0 && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{contracts.length}</span>}
                    </div>
                </button>
            </div>

            {/* BANK TRANSFERS TAB */}
            {activeTab === 'transfers' && isBankTransfer && <BankTransfersTab />}

            {/* INVOICES TAB */}
            {activeTab === 'invoices' && (
                <>
                    <Card><CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder={t('payroll.invoices.search', { defaultValue: 'Rechercher par reference, nom...' })}
                                    value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} />
                            </div>
                            <select className="px-3 py-2 border border-border rounded-md text-sm bg-background text-foreground" value={invoiceTypeFilter} onChange={(e) => setInvoiceTypeFilter(e.target.value)}>
                                <option value="all">{t('payroll.invoices.allTypes', { defaultValue: 'Tous les types' })}</option>
                                <option value="freelance_prestation">Prestation freelance</option>
                                <option value="client_commission">Commission plateforme</option>
                                <option value="settlement_fee">Frais de relevé</option>
                                <option value="transport_fee">Frais de déplacement</option>
                                <option value="refund">Remboursement</option>
                            </select>
                        </div>
                    </CardContent></Card>

                    <Card className="overflow-hidden">
                        {invoicesLoading ? (
                            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                        ) : filteredInvoices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileText className="w-12 h-12 mb-3 opacity-40" />
                                <p className="text-sm">{t('payroll.invoices.empty', { defaultValue: 'Aucune facture' })}</p>
                                <p className="text-xs mt-1">{t('payroll.invoices.emptyHint', { defaultValue: 'Les factures sont generees automatiquement apres paiement des shifts.' })}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emetteur</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">HT</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">TVA</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">TTC</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Facture</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3 text-sm font-mono font-medium text-foreground">{inv.reference}</td>
<td className="px-4 py-3">
                                                    <Badge variant="outline" className={getInvoiceTypeMeta(inv.type).badgeClass}>{getInvoiceTypeMeta(inv.type).shortLabel}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-foreground">{inv.seller_name}</td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{inv.description}</td>
                                                <td className="px-4 py-3 text-sm text-right font-medium">{inv.amount_ht.toFixed(2)}€</td>
                                                <td className="px-4 py-3 text-sm text-right text-muted-foreground">{shouldHideVat(inv) ? '—' : `${inv.tva_amount.toFixed(2)}€`}</td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">{inv.amount_ttc.toFixed(2)}€</td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">{format(new Date(inv.issued_at), 'dd MMM yyyy', { locale: fr })}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {/* NEW: opens the in-app preview/PDF-download dialog instead
                                                        of fetching a pre-rendered PDF from Storage. */}
                                                    <Button size="sm" variant="ghost" onClick={() => handleOpenInvoice(inv)}>
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* CONTRACTS TAB */}
            {activeTab === 'contracts' && (
                <>
                    <Card><CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder={t('payroll.contracts.search', { defaultValue: 'Rechercher par freelance, poste...' })}
                                    value={contractSearch} onChange={(e) => setContractSearch(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setContractStatusFilter('all')} className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${contractStatusFilter === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                                    Tous
                                </button>
                                <button onClick={() => setContractStatusFilter('pending')} className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${contractStatusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}>
                                    A signer
                                </button>
                                <button onClick={() => setContractStatusFilter('signed')} className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${contractStatusFilter === 'signed' ? 'bg-emerald-500 text-white' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}>
                                    Signes
                                </button>
                            </div>
                        </div>
                    </CardContent></Card>

                    <Card className="overflow-hidden">
                        {contractsLoading ? (
                            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                        ) : filteredContracts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <PenTool className="w-12 h-12 mb-3 opacity-40" />
                                <p className="text-sm">{t('payroll.contracts.empty', { defaultValue: 'Aucun contrat' })}</p>
                                <p className="text-xs mt-1">{t('payroll.contracts.emptyHint', { defaultValue: 'Les contrats sont generes automatiquement lors de l\'acceptation d\'un freelance.' })}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contrat</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Freelance</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mission</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredContracts.map((contract) => (
                                            <tr key={contract.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary" /></div>
                                                        <div>
                                                            <p className="text-sm font-semibold">{contract.id.slice(0, 8).toUpperCase()}</p>
                                                            <p className="text-xs text-muted-foreground capitalize">{contract.type}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{contract.freelancer_application?.freelancer?.first_name} {contract.freelancer_application?.freelancer?.last_name}</td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-medium">{contract.freelancer_application?.shift?.position_name}</p>
                                                    <p className="text-xs text-muted-foreground">{contract.freelancer_application?.shift?.start_time && format(new Date(contract.freelancer_application.shift.start_time), 'PP', { locale: fr })}</p>
                                                </td>
                                                <td className="px-4 py-3">{getContractStatusChip(contract.status)}</td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">{format(new Date(contract.created_at), 'dd/MM/yyyy')}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {contract.status === 'signed' ? (
                                                            <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleViewContract(contract)}>
                                                                <Eye className="w-4 h-4 mr-1.5" />Voir
                                                            </Button>
                                                        ) : (
                                                            <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-700" onClick={() => { setSelectedContract(contract); setIsSignatureModalOpen(true) }}>
                                                                <PenTool className="w-4 h-4 mr-1.5" />Signer
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    <ContractSignatureModal
                        isOpen={isSignatureModalOpen}
                        onClose={() => setIsSignatureModalOpen(false)}
                        contract={selectedContract}
                        onSigned={() => queryClient.invalidateQueries({ queryKey: ['contracts'] })}
                    />
                </>
            )}

            {/* PAYROLL TAB */}
            {activeTab === 'payroll' && <>

                {/* CHANGE (settlement mode): companies on the "settlement" payment mode
                    see how many shifts await settlement + the total, and pay it all in one
                    SEPA debit. Standard companies keep the original view untouched. */}
                {paymentPref?.payment_mode === 'settlement' && (
                    isBankTransfer ? (
                        <BankTransferCard />
                    ) : (
                        <>
                            <SettlementCard
                                sepaActive={paymentPref?.sepa_status === 'active'}
                                sepaIbanLast4={paymentPref?.sepa_iban_last4}
                            />
                            <CreditLimitSummary />
                        </>
                    )
                )}

                {/* Frais de déplacement: claims to approve + status of approved ones. Collected on their own
                    (no commission, no VAT) -- see TransportFeesSection. Renders nothing when there are none. */}
                <TransportFeesSection paymentMode={paymentPref?.payment_mode} />

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('payroll.netHoursTotal', { defaultValue: 'Heures nettes' })}</div>
                            <div className="mt-1 text-2xl font-bold">{stats.totalNetHours.toFixed(1)}h</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1"><UserCheck className="w-3 h-3" /> Employes</div>
                            <div className="mt-1 text-2xl font-bold">{stats.totalEmployees}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1"><Briefcase className="w-3 h-3" /> Freelances</div>
                            <div className="mt-1 text-2xl font-bold">{stats.totalFreelancers}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('payroll.shiftsCompleted', { defaultValue: 'Shifts' })}</div>
                            <div className="mt-1 text-2xl font-bold">{stats.totalShifts}</div>
                        </CardContent>
                    </Card>
                    {stats.totalFreelancerCost > 0 && (
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-4">
                                <div className="text-xs text-primary font-medium uppercase tracking-wider">Cout freelance</div>
                                <div className="mt-1 text-2xl font-bold text-primary">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.totalFreelancerCost)}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">Commission incluse</div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Payment method */}
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {isBankTransfer
                                ? <Landmark className="w-5 h-5 text-primary" />
                                : paymentPref?.preferred_payment_method === 'sepa'
                                    ? <Building2 className="w-5 h-5 text-primary" />
                                    : <Banknote className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{
                                paymentPref?.payment_mode === 'settlement'
                                    ? (isBankTransfer
                                        ? t('payroll.paymentMethod.bankTransfer', { defaultValue: 'Règlement par virement bancaire (IBAN dédié)' })
                                        : t('payroll.paymentMethod.settlement', { defaultValue: 'Reglement groupe par prelevement SEPA' }))
                                    : paymentPref?.preferred_payment_method === 'sepa'
                                        ? t('payroll.paymentMethod.sepa', { defaultValue: 'Prelevement automatique (SEPA)' })
                                        : t('payroll.paymentMethod.wire', { defaultValue: 'Virement bancaire manuel' })
                            }</p>
                            <p className="text-xs text-muted-foreground">{
                                isBankTransfer
                                    ? 'Vos coordonnées bancaires sont affichées ci-dessus'
                                    : paymentPref?.preferred_payment_method === 'sepa' && paymentPref?.sepa_iban_last4
                                        ? `IBAN ****${paymentPref.sepa_iban_last4}`
                                        : t('payroll.paymentMethod.changeInSettings', { defaultValue: 'Cliquez pour modifier dans les parametres' })
                            }</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending payments alert */}
                {pendingPayments.length > 0 && (
                    <Card className="border-red-200 dark:border-red-900/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
                                <Clock className="w-4 h-4" /> {pendingPayments.length} paiement{pendingPayments.length > 1 ? 's' : ''} en attente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {pendingPayments.map(p => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 cursor-pointer"
                                    onClick={() => navigate(`/shifts/${p.shift_id}`)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/shifts/${p.shift_id}`) }}
                                >
                                    <div>
                                        <span className="text-sm font-semibold text-red-700 dark:text-red-400">{isBankTransfer ? 'Règlement en cours' : 'Prelevement SEPA en cours'}</span>
                                        {p.stripe_payment_intent_id && <span className="ml-2 text-[10px] font-mono font-bold bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">{p.stripe_payment_intent_id}</span>}
                                        <div className="text-xs text-muted-foreground">
                                            {p.worker_name && <span className="font-medium">{p.worker_name}</span>}
                                            {p.position_name && <span> · {p.position_name}</span>}
                                            {p.shift_date && <span> · {format(new Date(p.shift_date), 'dd MMM yyyy', { locale: fr })}</span>}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</div>
                                    </div>
                                    {/* stopPropagation on this whole action group — otherwise
                                        clicking "Contester" (or the badge) would also trigger the
                                        row's own onClick and navigate away from the dialog. */}
                                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                        <span className="font-bold text-red-700 dark:text-red-400">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(p.amount)}</span>
                                        {p.company_disputed_at ? (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                                                {t('payroll.dispute.pendingReview', { defaultValue: 'Contesté — en révision' })}
                                            </Badge>
                                        ) : isDisputeEligible(p) ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-amber-400 text-amber-700 hover:bg-amber-50 whitespace-nowrap"
                                                onClick={() => { setDisputeTarget(p); setIsDisputeDialogOpen(true) }}
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                                                {t('payroll.dispute.button', { defaultValue: 'Contester' })}
                                            </Button>
                                        ) : p.shift_status !== 'completed' ? (
                                            // Mission not finished yet — nothing to dispute about a
                                            // service that hasn't happened yet. No badge needed here;
                                            // the payment's own status (shown above) already conveys
                                            // "in progress".
                                            null
                                        ) : (
                                            // Mission completed but past the 48h dispute window —
                                            // the transfer has very likely already fired or is about
                                            // to. Disputing here would no longer stop anything.
                                            <Badge variant="outline" className="bg-muted text-muted-foreground whitespace-nowrap">
                                                {t('payroll.dispute.windowClosed', { defaultValue: 'Délai de contestation dépassé' })}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Main grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Sidebar: period + filters */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Calendar className="w-4 h-4" />{t('payroll.selectPeriod', { defaultValue: 'Periode' })}</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {(['current_month', 'last_month', 'custom'] as PeriodType[]).map(pt => (
                                    <label key={pt} className="flex items-center gap-3 cursor-pointer">
                                        <input type="radio" name="period" checked={periodType === pt} onChange={() => pt !== 'custom' ? handlePeriodChange(pt) : setPeriodType('custom')} className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">
                                            {pt === 'current_month' ? <>{t('payroll.currentMonth', { defaultValue: 'Mois en cours' })}<br /><span className="text-xs text-muted-foreground font-normal">{format(new Date(), 'MMMM yyyy', { locale: fr })}</span></> :
                                                pt === 'last_month' ? <>{t('payroll.lastMonth', { defaultValue: 'Mois precedent' })}<br /><span className="text-xs text-muted-foreground font-normal">{format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: fr })}</span></> :
                                                    t('payroll.customPeriod', { defaultValue: 'Periode personnalisee' })}
                                        </span>
                                    </label>
                                ))}
                                {periodType === 'custom' && (
                                    <div className="space-y-3 pt-2">
                                        <div><label className="text-xs font-medium mb-1.5 block text-muted-foreground">{t('common.from', { defaultValue: 'Du' })}</label>
                                            <DatePicker label="" value={startDate.toISOString()} onChange={(iso: string) => { if (iso) { const d = new Date(iso); d.setHours(0, 0, 0, 0); setStartDate(d) } }} /></div>
                                        <div><label className="text-xs font-medium mb-1.5 block text-muted-foreground">{t('common.to', { defaultValue: 'Au' })}</label>
                                            <DatePicker label="" value={endDate.toISOString()} onChange={(iso: string) => { if (iso) { const d = new Date(iso); d.setHours(23, 59, 59, 999); setEndDate(d) } }} /></div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-4 h-4" />{t('payroll.filterByEstablishment', { defaultValue: 'Etablissement' })}</CardTitle></CardHeader>
                            <CardContent>
                                <Select value={establishmentFilter} onChange={(e) => setEstablishmentFilter(e.target.value)} options={[{ value: 'all', label: t('common.all', { defaultValue: 'Tous' }) }, ...establishments.map(e => ({ value: e.id, label: e.name }))]} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Users className="w-4 h-4" />{t('payroll.filterByType', { defaultValue: 'Type de travailleur' })}</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    {(['all', 'employees', 'freelancers'] as WorkerFilter[]).map(f => (
                                        <button key={f} onClick={() => setWorkerFilter(f)} className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${workerFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                                            {f === 'all' ? 'Tous' : f === 'employees' ? 'Employes' : 'Freelances'}
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Button onClick={generateCSV} variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" /> Export CSV
                        </Button>
                    </div>

                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Worker summaries */}
                        <Card>
                            <CardHeader><div className="flex items-center justify-between">
                                <CardTitle className="text-base">{t('payroll.detailByWorker', { defaultValue: 'Recapitulatif par intervenant' })}</CardTitle>
                                <Badge variant="outline">{workerSummaries.length} intervenant{workerSummaries.length > 1 ? 's' : ''}</Badge>
                            </div></CardHeader>
                            <CardContent>
                                {workerSummaries.length > 0 ? (
                                    <div className="space-y-1">
                                        {workerSummaries.map((w) => (
                                            <div
                                                key={`${w.worker_type}-${w.worker_id}`}
                                                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer"
                                                onClick={() => navigate(w.worker_type === 'freelancer' ? `/freelancers/${w.worker_id}` : `/employees/${w.worker_id}`)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${w.worker_type === 'freelancer' ? 'bg-violet-500' : 'bg-blue-500'}`}>
                                                        {w.worker_type === 'freelancer' ? 'F' : 'E'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">{w.worker_name}</div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                            {w.worker_email}
                                                            <Badge variant={w.worker_type === 'freelancer' ? 'secondary' : 'outline'} className="text-[10px] py-0">
                                                                {w.worker_type === 'freelancer' ? 'Freelance' : 'Employe'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold">{w.total_net_hours.toFixed(1)}h</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {w.total_shifts} shift{w.total_shifts > 1 ? 's' : ''}
                                                        {w.total_cost > 0 && <span className="ml-1.5 text-primary font-medium">{w.total_cost.toFixed(0)}e</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>{t('payroll.noDataForPeriod', { defaultValue: 'Aucune donnee pour cette periode' })}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent payments */}
                        {completedPayments.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="w-4 h-4" /> Paiements recents</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {completedPayments.slice(0, 10).map(p => {
                                        const statusDisplay = getPaymentStatusDisplay(p.status)
                                        return (
                                            <div
                                                key={p.id}
                                                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/shifts/${p.shift_id}`)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/shifts/${p.shift_id}`) }}
                                            >
                                                {statusDisplay.variant === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : statusDisplay.variant === 'failed' ? <XCircle className="w-4 h-4 text-red-500 shrink-0" /> : <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium">{isBankTransfer ? 'Paiement' : 'Prelevement SEPA'}</span>
                                                        {p.stripe_payment_intent_id && <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{p.stripe_payment_intent_id}</span>}
                                                        <Badge variant="outline" className={statusDisplay.variant === 'success' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800' : statusDisplay.variant === 'failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                                                            {statusDisplay.label}
                                                        </Badge>
                                                    </div>
                                                    {/* Links this payment back to the mission it's for — the
                                                        whole row is clickable, navigating to the shift's own
                                                        detail page (same route the rest of the app already
                                                        uses, /shifts/:id). */}
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {p.worker_name && <span className="font-medium text-foreground">{p.worker_name}</span>}
                                                        {p.position_name && <span> · {p.position_name}</span>}
                                                        {p.shift_date && <span> · {format(new Date(p.shift_date), 'dd MMM yyyy', { locale: fr })}</span>}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                                                </div>
                                                <span className={`font-bold ${statusDisplay.variant === 'failed' ? 'text-red-500 line-through' : ''}`}>
                                                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(p.amount)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </>}

            <DisputePaymentDialog
                isOpen={isDisputeDialogOpen}
                onClose={() => { setIsDisputeDialogOpen(false); setDisputeTarget(null) }}
                applicationId={disputeTarget?.application_id ?? null}
                workerName={disputeTarget?.worker_name ?? undefined}
                amount={disputeTarget?.amount}
            />

            {/* NEW invoicing system: renders the branded invoice template
                and lets the user download it as a PDF, generated
                entirely client-side. Replaces the old Storage-backed
                PDF download. */}
            <InvoicePreviewDialog
                invoice={previewInvoice}
                isOpen={isInvoicePreviewOpen}
                onClose={() => { setIsInvoicePreviewOpen(false); setPreviewInvoice(null) }}
            />
        </div>
    )
}