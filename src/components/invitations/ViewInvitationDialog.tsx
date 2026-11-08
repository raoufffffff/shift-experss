import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Printer, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { PrintableInvitation } from './PrintableInvitation';

interface ViewInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  establishmentName: string;
}

export function ViewInvitationDialog({
  open,
  onOpenChange,
  token,
  establishmentName,
}: ViewInvitationDialogProps) {
  const { t } = useTranslation();
  const [showPrintable, setShowPrintable] = useState(false);

  const invitationUrl = `${window.location.origin}/invite/general/${token}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invitationUrl);
    toast.success(t('employees.linkCopied'));
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('view-qr-code-svg') as unknown as SVGSVGElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-code-${establishmentName.replace(/\s+/g, '-').toLowerCase()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

      toast.success(t('employees.qrCodeDownloaded'));
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {!showPrintable ? (
          <>
            <h2 className="text-2xl font-bold mb-2">
              {t('invitations.viewQrCode')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {establishmentName}
            </p>

            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center p-6 bg-white rounded-lg border-2 border-dashed border-border">
                <QRCodeSVG
                  id="view-qr-code-svg"
                  value={invitationUrl}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>

              {/* URL Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('employees.invitationLink')}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={invitationUrl}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={downloadQRCode}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('employees.downloadQR')}
                </Button>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  {t('employees.copyLink')}
                </Button>
                <Button
                  onClick={() => setShowPrintable(true)}
                  className="bg-primary text-white"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {t('employees.printVersion')}
                </Button>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-900">
                  {t('employees.securityWarning')}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {t('invitations.printable.print')}
              </h2>
              <Button
                variant="outline"
                onClick={() => setShowPrintable(false)}
              >
                {t('common.back')}
              </Button>
            </div>

            <PrintableInvitation
              invitationUrl={invitationUrl}
              establishmentName={establishmentName}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
