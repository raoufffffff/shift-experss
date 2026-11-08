import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface GenerateInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishmentId: string;
  establishmentName: string;
  companyId: string;
}

export function GenerateInvitationDialog({
  open,
  onOpenChange,
  establishmentId,
  establishmentName,
  companyId
}: GenerateInvitationDialogProps) {
  const { t } = useTranslation();

   
  const qrData = JSON.stringify({
    establishment_id: establishmentId,
    name: establishmentName,
    company_id: companyId
  });




  const handleClose = () => onOpenChange(false);

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg') as unknown as SVGSVGElement;
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
      downloadLink.download = `qr-${establishmentName.replace(/\s+/g, '-').toLowerCase()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

      toast.success(t('employees.qrCodeDownloaded') );
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyData = () => {
    navigator.clipboard.writeText(qrData);
    toast.success(t('employees.linkCopied')  );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <h2 className="text-2xl font-bold mb-1">
          {t('employees.generateInvitation')  }
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {t('employees.shareMessage') }
        </p>

        <div className="space-y-6">

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-border">
            <QRCodeSVG
              id="qr-code-svg"
              value={qrData}
              size={200}
              level="H"
              includeMargin
            />
            <p className="text-sm font-semibold text-center">
              {establishmentName}
            </p>
          </div>

           {/* <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('employees.invitationLink')  }
            </label>
            <div className="flex gap-2">
              <Input
                value={qrData}
                readOnly
                className="flex-1 font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={copyData}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div> */}

           <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-muted-foreground mb-1">
              {t('employees.establishmentInfo')  }
            </p>
            <p className="text-sm font-semibold">{establishmentName}</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{establishmentId}</p>
          </div>

           <div className="flex gap-3">
            <Button variant="outline" onClick={downloadQRCode} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              {t('employees.downloadQR')  }
            </Button>
            <Button onClick={handleClose} className="flex-1">
              {t('common.close')  }
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}