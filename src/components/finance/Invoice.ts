// Types & helpers for the Shift Express invoicing system.
// Covers all 6 historical/current `invoice_type` enum values so older
// rows (freelancer_to_company, platform_commission) never crash the
// UI even if the backend no longer generates them.
//
// CHANGE (event grouping — consecutive shifts sharing event_id): a
// single invoice can now cover MULTIPLE shifts at once (payment_group_id
// + group_application_ids on the invoices table, instead of a single
// application_id). InvoiceRecord gains the raw payment_group_id /
// group_application_ids columns plus three UI-only fields
// (is_group_invoice, group_shift_names, group_date_range) populated by
// the page-level query, exactly the same pattern already used for
// shift_position_name. Keep this in sync manually with the CRM's copy
// of this file if the invoices table shape changes further.

export type InvoiceType =
  | 'freelance_prestation'   // Facture 1 : Client -> Freelance (prestation)
  | 'client_commission'      // Facture 2 : Client -> Plateforme (commission)
  | 'freelance_commission'   // Facture 3 : Plateforme -> Freelance (commission)
  | 'refund'                 // Facture 4 : remboursement
  | 'settlement_fee'         // Frais de relevé (règlement groupé) : Plateforme -> Client, TVA 20 %
  | 'transport_fee'          // Frais de déplacement : Freelance -> Client, sans TVA, sans commission
  | 'freelancer_to_company'  // legacy alias of freelance_prestation
  | 'platform_commission'    // legacy alias of client_commission

export type InvoiceStatus = 'draft' | 'issued' | 'void'

export interface InvoiceRecord {
  id: string
  reference: string
  type: InvoiceType
  status: InvoiceStatus

  shift_id: string
  // Not a column on `invoices` itself -- populated via a join on
  // `shifts` in the PayrollView query so the invoice UI can show a
  // human-readable mission name instead of the raw shift UUID.
  //
  // For a group invoice, this is the FIRST shift's position_name only
  // (shift_id on a group invoice is a contextual reference to that
  // first shift). Use group_shift_names below to show every mission
  // in the group instead.
  shift_position_name?: string | null
  company_id: string
  freelancer_id: string | null
  application_id: string | null

  // NEW (event grouping): NULL for a normal, single-shift invoice.
  // When set, this invoice covers every application in
  // group_application_ids instead of just application_id (which is
  // NULL on these rows).
  payment_group_id: string | null
  group_application_ids: string[] | null

  seller_name: string
  seller_address: string | null
  seller_city: string | null
  seller_postal_code: string | null
  seller_country: string | null
  seller_siret: string | null
  seller_vat_number: string | null

  buyer_name: string
  buyer_address: string | null
  buyer_city: string | null
  buyer_postal_code: string | null
  buyer_country: string | null
  buyer_siret: string | null
  buyer_vat_number: string | null

  description: string
  quantity: number
  unit_price: number
  amount_ht: number
  tva_rate: number
  tva_amount: number
  amount_ttc: number

  stripe_payment_intent_id: string | null
  stripe_invoice_id: string | null
  issued_at: string
  created_at: string
  legal_mentions: string | null
  metadata: Record<string, unknown> | null

  // NEW (event grouping), UI-only -- populated the same way as
  // shift_position_name, by the page-level query joining on every
  // shift referenced in group_application_ids. Never present (both
  // undefined) on a normal single-shift invoice.
  is_group_invoice?: boolean
  group_shift_names?: string[]
  // Earliest start_time / latest end_time across the group's shifts,
  // ISO strings -- lets the UI show "du ... au ..." without
  // recomputing it from group_shift_names.
  group_date_range?: { earliestStart: string; latestEnd: string }
}

// Normalizes legacy type aliases to their current equivalent so the
// rest of the UI only ever has to branch on 4 cases.
export function normalizeInvoiceType(type: InvoiceType): Exclude<InvoiceType, 'freelancer_to_company' | 'platform_commission'> {
  if (type === 'freelancer_to_company') return 'freelance_prestation'
  if (type === 'platform_commission') return 'client_commission'
  return type
}

interface InvoiceTypeMeta {
  label: string
  shortLabel: string
  badgeClass: string
  documentTitle: string
}

const TYPE_META: Record<Exclude<InvoiceType, 'freelancer_to_company' | 'platform_commission'>, InvoiceTypeMeta> = {
  freelance_prestation: {
    label: 'Prestation freelance',
    shortLabel: 'Prestation',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    documentTitle: 'Facture de prestation',
  },
  client_commission: {
    label: 'Commission plateforme (client)',
    shortLabel: 'Commission',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    documentTitle: 'Facture de commission',
  },
  freelance_commission: {
    label: 'Commission plateforme (freelance)',
    shortLabel: 'Commission freelance',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    documentTitle: 'Facture de commission',
  },
  refund: {
    label: 'Remboursement',
    shortLabel: 'Remboursement',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    documentTitle: 'Facture d\'avoir',
  },
  transport_fee: {
    label: 'Frais de déplacement',
    shortLabel: 'Déplacement',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    documentTitle: 'Facture de frais de déplacement',
  },
  settlement_fee: {
    label: 'Frais de relevé',
    shortLabel: 'Frais de relevé',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    documentTitle: 'Facture de frais de relevé',
  },
}

// Never returns undefined: an unknown/future invoice type falls back to a neutral meta
// instead of crashing every screen that renders an invoice (list, preview, PDF).
export function getInvoiceTypeMeta(type: InvoiceType): InvoiceTypeMeta {
  return (
    TYPE_META[normalizeInvoiceType(type)] ?? {
      label: String(type),
      shortLabel: String(type),
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
      documentTitle: 'Facture',
    }
  )
}
// VAT display rules for the platform's own commission invoices (COMC for the
// client, COMF for the freelancer). VAT on those is controlled server-side
// (system_config.invoice_vat_enabled): while it is disabled the stored
// tva_rate is 0, and showing a "TVA 0%" column or a TTC total equal to HT only
// confuses readers -- so the VAT parts are hidden. When VAT is enabled later,
// tva_rate > 0 and the normal HT / TVA / TTC layout appears automatically.
// Keep in sync with the CRM's copy and with generate-invoice-pdf.ts (backend).
export function isCommissionInvoice(type: InvoiceType): boolean {
  const normalized = normalizeInvoiceType(type)
  return normalized === 'client_commission' || normalized === 'freelance_commission'
}

export function shouldHideVat(invoice: Pick<InvoiceRecord, 'type' | 'tva_rate'>): boolean {
  // Transport-fee invoices (FDT) never carry VAT: the amount is a pass-through reimbursement.
  if (normalizeInvoiceType(invoice.type) === 'transport_fee') return Number(invoice.tva_rate) === 0
  return isCommissionInvoice(invoice.type) && Number(invoice.tva_rate) === 0
}

// Label of the highlighted total box.
export function getInvoiceTotalLabel(invoice: Pick<InvoiceRecord, 'type' | 'tva_rate'>): string {
  if (!shouldHideVat(invoice)) return 'Total TTC'
  return normalizeInvoiceType(invoice.type) === 'freelance_commission' ? 'Commission HT' : 'Total'
}

// Freelancer commission invoice (COMF) recap: gross mission amount, the
// commission deducted, and the net paid. Values come from invoices.metadata
// (written by generate-invoice-transfer.ts). Returns null for any other type
// or when the metadata is missing.
export function getFreelanceRecap(
  invoice: Pick<InvoiceRecord, 'type' | 'metadata' | 'amount_ht'>,
): { gross: number; commission: number; net: number } | null {
  if (normalizeInvoiceType(invoice.type) !== 'freelance_commission') return null
  const gross = invoice.metadata?.gross_amount
  const net = invoice.metadata?.net_amount
  if (typeof gross !== 'number' || typeof net !== 'number') return null
  return { gross, commission: invoice.amount_ht, net }
}