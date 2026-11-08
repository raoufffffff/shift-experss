import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileText, XCircle, Loader2, Download } from 'lucide-react';
import { logger } from '@/utils/logger';
import { InvoiceTemplate } from '../../components/finance/Invoicetemplate';
import { useInvoicePdf } from '../../components/finance/Useinvoicepdf';
import { getInvoiceTypeMeta } from '../../components/finance/Invoice';
import type { InvoiceRecord } from '../../components/finance/Invoice';

// Public invoice view page — reuses the SAME renderers as the
// authenticated app's InvoicePreviewDialog (InvoiceTemplate for the
// on-screen look, useInvoicePdf for the actual downloaded PDF) so
// there is only ever one invoice layout to maintain, not a second
// divergent one for this public page.
//
// Outer shell (loading / error states, light mode forced, Card
// styling) mirrors InvitePage — same public-page pattern, no login
// required: the invoice's own `id` (an unguessable UUID) is the
// access key, exactly like an invitation's `token`.
//
// Reached from the payment-success / transfer-success emails (see
// _shared/email-templates.ts, buildInvoiceUrl), which append
// ?freelancer=true when the recipient is the freelancer rather than
// the company. Purely cosmetic here — InvoiceTemplate always shows
// both parties in full, so there's nothing to gate on this flag.

const NATURAL_WIDTH = 794; // InvoiceTemplate's fixed A4-at-96dpi width, in px

// Scales the (fixed-width) invoice document down to fit whatever
// width its container actually has — the same idea as
// InvoicePreviewDialog's hardcoded `scale(0.62)`, but responsive
// instead of a magic number, since this page (unlike the dialog) has
// to work on a phone screen opened straight from an email.
function useScaleToFit(naturalWidth: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const containerWidth = el.clientWidth;
      if (containerWidth > 0) {
        setScale(Math.min(1, containerWidth / naturalWidth));
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [naturalWidth]);

  return { containerRef, scale };
}

export function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isFreelancerView = searchParams.get('freelancer') === 'true';
  const { isGenerating, downloadPdf } = useInvoicePdf();
  const { containerRef, scale } = useScaleToFit(NATURAL_WIDTH);

  // Force light mode for this page — same reasoning as InvitePage:
  // it's opened from an email link, often outside any app session.
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
  }

  const { data: invoice, isLoading, error } = useQuery<InvoiceRecord>({
    queryKey: ['public-invoice', id],
    queryFn: async () => {
      if (!id) throw new Error('id is required');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-invoice-details`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ invoiceId: id }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'not_found');
      }

      return result.invoice as InvoiceRecord;
    },
    enabled: !!id,
    retry: false,
  });

  logger.log('Invoice view', { id, isFreelancerView, invoice });

  // ─────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Chargement de la facture...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Error / not found
  // ─────────────────────────────────────────────────────────────
  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              Facture introuvable
            </h2>
            <p className="text-gray-600">
              Ce lien n'est plus valide ou la facture n'existe pas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Success — the invoice itself, rendered by the same
  // InvoiceTemplate/useInvoicePdf pair the authenticated app uses.
  // ─────────────────────────────────────────────────────────────
  const meta = getInvoiceTypeMeta(invoice.type);
  const scaledHeight = (invoice ? 1123 : 0) * scale; // reserve the right vertical space so the page doesn't jump once the template mounts

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Slim header card — reference, type badge, download action */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{invoice.reference}</p>
                  <Badge variant="outline" className={meta.badgeClass}>
                    {meta.label}
                  </Badge>
                </div>
              </div>

              <Button onClick={() => downloadPdf(invoice)} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? 'Génération...' : 'Télécharger le PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Document preview — same InvoiceTemplate the authenticated
            app's InvoicePreviewDialog renders, scaled to fit whatever
            width this container has instead of a fixed magic number,
            since this page has to work on a phone opened from email. */}
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div
              ref={containerRef}
              className="bg-muted/30 rounded-lg overflow-hidden flex justify-center"
              style={{ height: scaledHeight || undefined }}
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                <InvoiceTemplate invoice={invoice} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}