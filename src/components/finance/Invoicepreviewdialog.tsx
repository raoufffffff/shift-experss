import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Download, Loader2 } from 'lucide-react'
import { InvoiceTemplate } from './Invoicetemplate'
import { useInvoicePdf } from './Useinvoicepdf'
import type { InvoiceRecord } from './Invoice'

interface InvoicePreviewDialogProps {
  invoice: InvoiceRecord | null
  isOpen: boolean
  onClose: () => void
}

// The on-screen preview (<InvoiceTemplate>) and the downloaded PDF
// (buildInvoicePdf in useInvoicePdf.ts) are two independent renderers
// of the same `invoice` data -- the preview is plain HTML/CSS scaled
// down for the dialog, and the PDF is drawn natively with jsPDF's
// text/vector APIs. They are deliberately NOT the same DOM node
// screenshotted into the PDF (that html2canvas approach is what
// caused the overlapping-text bug), so the preview is only ever a
// visual approximation -- the PDF is the source of truth for what
// gets downloaded.
export function InvoicePreviewDialog({ invoice, isOpen, onClose }: InvoicePreviewDialogProps) {
  const { isGenerating, downloadPdf } = useInvoicePdf()

  if (!invoice) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice.reference}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center bg-muted/30 rounded-lg p-4 overflow-hidden">
          <div style={{ width: 794 * 0.62, height: 1123 * 0.62, overflow: 'hidden', position: 'relative' }}>
            <div style={{ transform: 'scale(0.62)', transformOrigin: 'top left' }}>
              <InvoiceTemplate invoice={invoice} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={() => downloadPdf(invoice)} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Génération...' : 'Télécharger le PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}