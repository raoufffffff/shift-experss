import { useState } from 'react'
import jsPDF from 'jspdf'
import type { InvoiceRecord } from './Invoice'
import { getInvoiceTypeMeta, shouldHideVat, getInvoiceTotalLabel, getFreelanceRecap } from './Invoice'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const BRAND_COLOR: [number, number, number] = [29, 79, 215] // #1d4fd7
const TEXT_DARK: [number, number, number] = [15, 23, 42]
const TEXT_MUTED: [number, number, number] = [100, 116, 139]
const TEXT_LIGHT: [number, number, number] = [148, 163, 184]
const BORDER: [number, number, number] = [226, 232, 240]
const BG_SOFT: [number, number, number] = [248, 250, 252]

const PAGE_WIDTH = 210 // A4 mm
const MARGIN = 18

const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
function formatDescription(description: string, positionName: string | null | undefined): string {
  if (!positionName) return description
  if (!UUID_RE.test(description)) return description
  return description.replace(UUID_RE, `mission "${positionName}"`)
}

function addressLines(opts: {
  address: string | null
  postal: string | null
  city: string | null
  country: string | null
}): string[] {
  const line2 = [opts.postal, opts.city].filter(Boolean).join(' ')
  return [opts.address, line2 || null, opts.country].filter(Boolean) as string[]
}

// CHANGE (event grouping): mirrors the same helper in
// InvoiceTemplate.tsx -- keep both in sync.
const formatDateShort = (iso: string) => format(new Date(iso), 'dd MMM yyyy', { locale: fr })

// Draws the invoice directly with jsPDF's native text/vector APIs
// instead of rasterizing an HTML node with html2canvas. This is the
// fix for the overlapping-text bug: html2canvas's text layout doesn't
// always match the browser's own line-height/baseline computation
// (font metrics can differ between the CSS box model and canvas text
// measurement), which is what caused every line to be stamped near
// the same vertical position in the exported PDF. jsPDF draws each
// string at an explicit (x, y) we compute ourselves, so there is no
// layout engine in the loop that can disagree with us.
export function buildInvoicePdf(invoice: InvoiceRecord): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const meta = getInvoiceTypeMeta(invoice.type)
  const contentWidth = PAGE_WIDTH - MARGIN * 2
  // Commission invoices issued without VAT: hide the TVA column/line and show a plain total.
  const hideVat = shouldHideVat(invoice)
  const recap = getFreelanceRecap(invoice)

  let y = MARGIN

  // ---- Header ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...BRAND_COLOR)
  doc.text('SHIFT EXPRESS', MARGIN, y + 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(meta.documentTitle.toUpperCase(), PAGE_WIDTH - MARGIN, y + 2, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...BRAND_COLOR)
  doc.text(invoice.reference, PAGE_WIDTH - MARGIN, y + 9, { align: 'right' })

  const rawDate = invoice.issued_at || invoice.created_at
  const issuedDate = rawDate ? new Date(rawDate) : null
  const isValidDate = issuedDate !== null && !isNaN(issuedDate.getTime())
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(
    isValidDate ? `Émise le ${format(issuedDate as Date, 'dd MMMM yyyy', { locale: fr })}` : 'Date non renseignée',
    PAGE_WIDTH - MARGIN,
    y + 14,
    { align: 'right' },
  )

  y += 20
  doc.setDrawColor(...BRAND_COLOR)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 10

  // ---- Parties (seller / buyer) ----
  const colWidth = (contentWidth - 6) / 2
  const partyBoxTop = y
  const partyBoxHeight = 34

  const drawParty = (
    x: number,
    label: string,
    name: string,
    lines: string[],
    siret: string | null,
    vat: string | null,
  ) => {
    doc.setFillColor(...BG_SOFT)
    doc.setDrawColor(...BORDER)
    doc.roundedRect(x, partyBoxTop, colWidth, partyBoxHeight, 2, 2, 'FD')

    let py = partyBoxTop + 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...TEXT_LIGHT)
    doc.text(label.toUpperCase(), x + 5, py)

    py += 5.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...TEXT_DARK)
    doc.text(name, x + 5, py)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...TEXT_MUTED)
    for (const line of lines) {
      py += 4.2
      doc.text(line, x + 5, py)
    }

    if (siret) {
      py += 4.8
      doc.setFontSize(7.5)
      doc.setTextColor(...TEXT_MUTED)
      doc.text(`SIRET : ${siret}`, x + 5, py)
    }
    if (vat) {
      py += 3.8
      doc.text(`TVA : ${vat}`, x + 5, py)
    }
  }

  drawParty(
    MARGIN,
    'Émetteur',
    invoice.seller_name,
    addressLines({
      address: invoice.seller_address,
      postal: invoice.seller_postal_code,
      city: invoice.seller_city,
      country: invoice.seller_country,
    }),
    invoice.seller_siret,
    invoice.seller_vat_number,
  )

  drawParty(
    MARGIN + colWidth + 6,
    'Client',
    invoice.buyer_name,
    addressLines({
      address: invoice.buyer_address,
      postal: invoice.buyer_postal_code,
      city: invoice.buyer_city,
      country: invoice.buyer_country,
    }),
    invoice.buyer_siret,
    invoice.buyer_vat_number,
  )

  y = partyBoxTop + partyBoxHeight + 12

  // ---- Line items table ----
  const colDesc = MARGIN
  const colQty = MARGIN + contentWidth * 0.52
  const colUnit = MARGIN + contentWidth * 0.65
  const colTva = MARGIN + contentWidth * 0.82
  const colTotal = PAGE_WIDTH - MARGIN

  doc.setFillColor(...BRAND_COLOR)
  doc.rect(MARGIN, y, contentWidth, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('DESCRIPTION', colDesc + 3, y + 5.3)
  doc.text('QTÉ', colQty, y + 5.3, { align: 'right' })
  doc.text('P.U. HT', colUnit, y + 5.3, { align: 'right' })
  if (!hideVat) doc.text('TVA', colTva, y + 5.3, { align: 'right' })
  doc.text('TOTAL HT', colTotal - 3, y + 5.3, { align: 'right' })

  y += 8

  const description = formatDescription(invoice.description, invoice.shift_position_name)
  const descLines = doc.splitTextToSize(description, contentWidth * 0.48)
  const rowHeight = Math.max(10, descLines.length * 4.5 + 5)

  doc.setDrawColor(...BORDER)
  doc.line(MARGIN, y + rowHeight, PAGE_WIDTH - MARGIN, y + rowHeight)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...TEXT_DARK)
  doc.text(descLines, colDesc + 3, y + 6)
  doc.text(String(invoice.quantity), colQty, y + 6, { align: 'right' })
  doc.text(formatMoney(invoice.unit_price), colUnit, y + 6, { align: 'right' })
  if (!hideVat) doc.text(`${invoice.tva_rate}%`, colTva, y + 6, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text(formatMoney(invoice.amount_ht), colTotal - 3, y + 6, { align: 'right' })

  y += rowHeight + 12

  // ---- CHANGE (event grouping): mission breakdown box ----
  // Same reasoning as InvoiceTemplate.tsx: the description already
  // says "N missions du X au Y", but the reader needs to see WHICH
  // missions to trust the total.
  if (invoice.is_group_invoice) {
    const missionCount = invoice.group_application_ids?.length ?? invoice.group_shift_names?.length ?? 0
    const dateRangeText = invoice.group_date_range
      ? ` du ${formatDateShort(invoice.group_date_range.earliestStart)} au ${formatDateShort(invoice.group_date_range.latestEnd)}`
      : ''
    const shiftNames = invoice.group_shift_names || []

    const boxPadding = 5
    const titleHeight = 6
    const lineHeight = 4.2
    const boxHeight = boxPadding * 2 + titleHeight + shiftNames.length * lineHeight

    doc.setFillColor(255, 251, 235) // #fffbeb
    doc.setDrawColor(253, 230, 138) // #fde68a
    doc.roundedRect(MARGIN, y, contentWidth, boxHeight, 2, 2, 'FD')

    let by = y + boxPadding + 3
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(146, 64, 14) // #92400e
    doc.text(`Cette facture couvre ${missionCount} missions${dateRangeText}`, MARGIN + 4, by)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 53, 15) // #78350f
    for (const name of shiftNames) {
      by += lineHeight
      doc.text(`•  ${name}`, MARGIN + 6, by)
    }

    y += boxHeight + 10
  }

  // ---- Totals ----
  const totalsWidth = 62
  const totalsX = PAGE_WIDTH - MARGIN - totalsWidth

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('Total HT', totalsX, y)
  doc.text(formatMoney(invoice.amount_ht), PAGE_WIDTH - MARGIN, y, { align: 'right' })

  y += 6
  if (!hideVat) {
    doc.text(`TVA (${invoice.tva_rate}%)`, totalsX, y)
    doc.text(formatMoney(invoice.tva_amount), PAGE_WIDTH - MARGIN, y, { align: 'right' })
    y += 5
  }

  doc.setFillColor(240, 244, 254)
  doc.setDrawColor(...BRAND_COLOR)
  doc.roundedRect(totalsX - 4, y, totalsWidth + 4, 11, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BRAND_COLOR)
  doc.text(getInvoiceTotalLabel(invoice), totalsX, y + 7)
  doc.setFontSize(13)
  doc.text(formatMoney(hideVat ? invoice.amount_ht : invoice.amount_ttc), PAGE_WIDTH - MARGIN, y + 7.5, { align: 'right' })

  y += 22

  // ---- Freelancer commission invoice (COMF) recap: gross - commission = net ----
  if (recap) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...TEXT_LIGHT)
    doc.text('RÉCAPITULATIF DE LA MISSION', MARGIN, y)

    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_MUTED)
    doc.text('Montant brut de la mission', MARGIN, y)
    doc.text(formatMoney(recap.gross), PAGE_WIDTH - MARGIN, y, { align: 'right' })

    y += 5.5
    doc.text('Commission Shift Express (HT, ci-dessus)', MARGIN, y)
    doc.text(`- ${formatMoney(recap.commission)}`, PAGE_WIDTH - MARGIN, y, { align: 'right' })

    y += 4
    doc.setFillColor(236, 248, 243)
    doc.setDrawColor(34, 160, 105)
    doc.roundedRect(MARGIN, y, contentWidth, 11, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(7, 116, 77)
    doc.text('Net versé au prestataire', MARGIN + 4, y + 7)
    doc.setFontSize(13)
    doc.text(formatMoney(recap.net), PAGE_WIDTH - MARGIN - 4, y + 7.5, { align: 'right' })

    y += 11 + 10
  }

  // ---- Footer metadata ----
  doc.setDrawColor(...BORDER)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TEXT_LIGHT)
  // CHANGE (event grouping): see the matching note in
  // InvoiceTemplate.tsx -- a single "Mission: X" line would only show
  // the first shift for a group invoice.
  if (invoice.is_group_invoice) {
    const missionCount = invoice.group_application_ids?.length ?? invoice.group_shift_names?.length
    doc.text(`Missions : voir le détail ci-dessus (${missionCount} missions)`, MARGIN, y)
  } else {
    const missionLabel = `Mission : ${invoice.shift_position_name || invoice.shift_id}`
    doc.text(missionLabel, MARGIN, y)
  }
  if (invoice.stripe_payment_intent_id) {
    doc.text(`Paiement : ${invoice.stripe_payment_intent_id}`, PAGE_WIDTH - MARGIN, y, { align: 'right' })
  }

  if (invoice.legal_mentions) {
    y += 6
    const legalLines = doc.splitTextToSize(invoice.legal_mentions, contentWidth)
    doc.text(legalLines, MARGIN, y)
    y += legalLines.length * 3.5
  }

  // ---- Bottom brand line ----
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TEXT_LIGHT)
  doc.text(
    'Document généré automatiquement par Shift Express — La plateforme de gestion de shifts freelance.',
    PAGE_WIDTH / 2,
    pageHeight - 12,
    { align: 'center' },
  )

  return doc
}

export function useInvoicePdf() {
  const [isGenerating, setIsGenerating] = useState(false)

  const downloadPdf = async (invoice: InvoiceRecord) => {
    setIsGenerating(true)
    try {
      const doc = buildInvoicePdf(invoice)
      doc.save(`${invoice.reference}.pdf`)
    } finally {
      setIsGenerating(false)
    }
  }

  return { isGenerating, downloadPdf }
}