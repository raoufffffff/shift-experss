import type { InvoiceRecord } from './Invoice'
import { getInvoiceTypeMeta, shouldHideVat, getInvoiceTotalLabel, getFreelanceRecap } from './Invoice'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const BRAND_COLOR = '#1d4fd7'

interface InvoiceTemplateProps {
  invoice: InvoiceRecord
}

const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

// The raw description column (written server-side) sometimes embeds
// the shift's UUID directly in the sentence, e.g. "... mission du
// fd91f12f-0da1-4a18-a783-d32f954d4412". That's not meaningful to a
// client reading their invoice. If we have the shift's position_name
// (fetched via a join, see PayrollView), swap the UUID for it.
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
function formatDescription(description: string, positionName: string | null | undefined): string {
  if (!positionName) return description
  if (!UUID_RE.test(description)) return description
  return description.replace(UUID_RE, `mission "${positionName}"`)
}

const addressLines = (opts: {
  address: string | null
  postal: string | null
  city: string | null
  country: string | null
}) => {
  const line2 = [opts.postal, opts.city].filter(Boolean).join(' ')
  return [opts.address, line2 || null, opts.country].filter(Boolean) as string[]
}

// CHANGE (event grouping): a group invoice's description already
// states "N missions du X au Y" (see generate-invoices-group.ts), but
// that alone doesn't tell the reader WHICH missions -- this renders
// the full breakdown so the invoice is self-explanatory without
// needing to look anything up elsewhere. Keep in sync with the CRM's
// copy of this helper.
const formatDateShort = (iso: string) => format(new Date(iso), 'dd MMM yyyy', { locale: fr })

// Pure on-screen preview -- this is now presentational only. The
// downloaded PDF is generated independently by buildInvoicePdf
// (useInvoicePdf.ts) using jsPDF's native drawing APIs, not by
// capturing this component. See InvoicePreviewDialog for why.
export function InvoiceTemplate({ invoice }: InvoiceTemplateProps) {
    const meta = getInvoiceTypeMeta(invoice.type)
    // Commission invoices issued without VAT: hide the TVA column/line and show a plain total.
    const hideVat = shouldHideVat(invoice)
    const recap = getFreelanceRecap(invoice)
    // issued_at can be null on some rows (draft invoices, or older
    // rows written before the column was consistently populated) --
    // fall back to created_at, and only show "-" if truly neither
    // exists, instead of silently rendering nothing.
    const rawDate = invoice.issued_at || invoice.created_at
    const issuedDate = rawDate ? new Date(rawDate) : null
    const isValidDate = issuedDate !== null && !isNaN(issuedDate.getTime())

    const sellerLines = addressLines({
      address: invoice.seller_address,
      postal: invoice.seller_postal_code,
      city: invoice.seller_city,
      country: invoice.seller_country,
    })
    const buyerLines = addressLines({
      address: invoice.buyer_address,
      postal: invoice.buyer_postal_code,
      city: invoice.buyer_city,
      country: invoice.buyer_country,
    })

    return (
      <div
        id="invoice-template-root"
        dir="ltr"
        style={{
          width: 794,
          minHeight: 1123,
          background: '#ffffff',
          color: '#0f172a',
          fontFamily: "Helvetica, Arial, 'Segoe UI', sans-serif",
          padding: '48px 56px',
          boxSizing: 'border-box',
          direction: 'ltr',
          textAlign: 'left',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: `2px solid ${BRAND_COLOR}`,
            paddingBottom: 24,
            marginBottom: 32,
          }}
        >
          <img
            src="/logo-header.svg"
            alt="Shift Express"
            style={{ height: 36, objectFit: 'contain' }}
          />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748b', fontWeight: 700 }}>
              {meta.documentTitle}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: BRAND_COLOR, marginTop: 4 }}>
              {invoice.reference}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {isValidDate ? `Émise le ${format(issuedDate as Date, 'dd MMMM yyyy', { locale: fr })}` : 'Date non renseignée'}
            </div>
          </div>
        </div>

        {/* Parties */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', fontWeight: 700, marginBottom: 10 }}>
              Émetteur
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{invoice.seller_name}</div>
            {sellerLines.map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: '#475569' }}>{l}</div>
            ))}
            {invoice.seller_siret && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>SIRET&nbsp;: {invoice.seller_siret}</div>
            )}
            {invoice.seller_vat_number && (
              <div style={{ fontSize: 11, color: '#64748b' }}>TVA&nbsp;: {invoice.seller_vat_number}</div>
            )}
          </div>

          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', fontWeight: 700, marginBottom: 10 }}>
              Client
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{invoice.buyer_name}</div>
            {buyerLines.map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: '#475569' }}>{l}</div>
            ))}
            {invoice.buyer_siret && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>SIRET&nbsp;: {invoice.buyer_siret}</div>
            )}
            {invoice.buyer_vat_number && (
              <div style={{ fontSize: 11, color: '#64748b' }}>TVA&nbsp;: {invoice.buyer_vat_number}</div>
            )}
          </div>
        </div>

        {/* Line items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: BRAND_COLOR }}>
              <th style={thStyle('left')}>Description</th>
              <th style={thStyle('right')}>Qté</th>
              <th style={thStyle('right')}>P.U. HT</th>
              {!hideVat && <th style={thStyle('right')}>TVA</th>}
              <th style={thStyle('right')}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle('left')}>{formatDescription(invoice.description, invoice.shift_position_name)}</td>
              <td style={tdStyle('right')}>{invoice.quantity}</td>
              <td style={tdStyle('right')}>{formatMoney(invoice.unit_price)}</td>
              {!hideVat && <td style={tdStyle('right')}>{invoice.tva_rate}%</td>}
              <td style={tdStyle('right')}>{formatMoney(invoice.amount_ht)}</td>
            </tr>
          </tbody>
        </table>

        {/* CHANGE (event grouping): explicit breakdown of every
            mission covered by this invoice, so the reader knows
            exactly what the total corresponds to. */}
        {invoice.is_group_invoice && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 10,
              padding: '14px 18px',
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
              Cette facture couvre {invoice.group_application_ids?.length ?? invoice.group_shift_names?.length ?? 'plusieurs'} missions
              {invoice.group_date_range &&
                ` du ${formatDateShort(invoice.group_date_range.earliestStart)} au ${formatDateShort(invoice.group_date_range.latestEnd)}`}
            </div>
            {invoice.group_shift_names && invoice.group_shift_names.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#78350f', lineHeight: 1.7 }}>
                {invoice.group_shift_names.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
          <div style={{ width: 260 }}>
            <TotalRow label="Total HT" value={formatMoney(invoice.amount_ht)} />
            {!hideVat && <TotalRow label={`TVA (${invoice.tva_rate}%)`} value={formatMoney(invoice.tva_amount)} />}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                marginTop: 8,
                background: `${BRAND_COLOR}0f`,
                border: `1px solid ${BRAND_COLOR}33`,
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: BRAND_COLOR }}>{getInvoiceTotalLabel(invoice)}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: BRAND_COLOR }}>{formatMoney(hideVat ? invoice.amount_ht : invoice.amount_ttc)}</span>
            </div>
          </div>
        </div>

        {/* Freelancer commission invoice (COMF): gross - commission = net paid.
            Only rendered when the metadata exists; never shown to clients. */}
        {recap && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>
              Récapitulatif de la mission
            </div>
            <TotalRow label="Montant brut de la mission" value={formatMoney(recap.gross)} />
            <TotalRow label="Commission Shift Express (HT, ci-dessus)" value={`- ${formatMoney(recap.commission)}`} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                marginTop: 8,
                background: '#ecf8f3',
                border: '1px solid #22a069',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#07744d' }}>Net versé au prestataire</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#07744d' }}>{formatMoney(recap.net)}</span>
            </div>
          </div>
        )}

        {/* Reference / metadata footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
            {/* CHANGE (event grouping): a single "Mission: X" line
                would only ever show the first shift's name/id for a
                group invoice -- misleading since it covers several.
                The full list is already shown above. */}
            {invoice.is_group_invoice ? (
              <span>Missions&nbsp;: voir le détail ci-dessus ({invoice.group_application_ids?.length ?? invoice.group_shift_names?.length} missions)</span>
            ) : (
              <span>Mission&nbsp;: {invoice.shift_position_name || invoice.shift_id}</span>
            )}
            {invoice.stripe_payment_intent_id && <span>Paiement&nbsp;: {invoice.stripe_payment_intent_id}</span>}
          </div>
        </div>

        {invoice.legal_mentions && (
          <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.6, marginBottom: 24 }}>
            {invoice.legal_mentions}
          </div>
        )}

        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 10, color: '#94a3b8', paddingTop: 24 }}>
          Document généré automatiquement par Shift Express — La plateforme de gestion de shifts freelance.
        </div>
      </div>
    )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px', fontSize: 12, color: '#475569' }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function thStyle(align: 'left' | 'right'): React.CSSProperties {
  return {
    textAlign: align,
    color: '#ffffff',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 700,
    padding: '10px 12px',
  }
}

function tdStyle(align: 'left' | 'right'): React.CSSProperties {
  return {
    textAlign: align,
    fontSize: 13,
    padding: '14px 12px',
    borderBottom: '1px solid #e2e8f0',
  }
}