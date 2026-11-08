import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Upload, X, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface PrintableInvitationProps {
  invitationUrl: string;
  establishmentName: string;
}

export function PrintableInvitation({
  invitationUrl,
  establishmentName,
}: PrintableInvitationProps) {
  const { t } = useTranslation();
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('invitations.printable.selectImage'));
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('invitations.printable.imageSizeLimit'));
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setCompanyLogo(reader.result as string);
      toast.success(t('invitations.printable.logoAdded'));
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    setIsGenerating(true);
    try {
      // Capture the element as canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Convert to PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // A4 dimensions
      const pdfWidth = 210;
      const pdfHeight = 297;

      // Calculate dimensions maintaining aspect ratio
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // If image is taller than page, scale it down
      if (imgHeight > pdfHeight) {
        const scale = pdfHeight / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = pdfHeight;
        const xOffset = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, scaledHeight);
      } else {
        // If shorter, center it
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`invitation-${establishmentName.replace(/\s+/g, '-').toLowerCase()}.pdf`);

      toast.success(t('invitations.printable.pdfDownloaded'));
    } catch (error) {
      logger.error('Erreur lors de la génération du PDF:', error);
      toast.error(t('invitations.printable.pdfError'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">
              {t('invitations.printable.uploadLogo')}
            </label>
            <div className="flex items-center gap-2">
              <label
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                {companyLogo ? t('common.update') : t('invitations.printable.uploadLogo')}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              {companyLogo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCompanyLogo(null);
                    toast.success(t('invitations.printable.logoRemoved'));
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('invitations.printable.removeLogo')}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('invitations.printable.logoHelp')}
            </p>
          </div>

          <Button
            onClick={handleDownloadPDF}
            size="lg"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('invitations.printable.generating')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t('invitations.printable.print')} PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Printable content (A4 format) */}
      <div
        ref={contentRef}
        className="printable-invitation"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm',
          margin: '0 auto',
          background: '#ffffff',
          boxShadow: '0 0 20px rgba(0,0,0,0.1)',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Logo section */}
        {companyLogo && (
          <div style={{
            marginBottom: '40px',
            textAlign: 'center',
          }}>
            <img
              src={companyLogo}
              alt="Company logo"
              width={320}
              height={160}
              style={{
                maxWidth: '80mm',
                maxHeight: '40mm',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* Main title */}
        <div style={{
          textAlign: 'center',
          marginBottom: '50px',
        }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '700',
            color: '#1a1a1a',
            margin: '0 0 12px 0',
            lineHeight: '1.2',
          }}>
            {t('invitations.printable.title')}
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#64748b',
            fontWeight: '400',
            margin: '0',
            lineHeight: '1.4',
          }}>
            {establishmentName}
          </p>
        </div>

        {/* QR Code - centered and prominent */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '50px',
        }}>
          <div style={{
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
          }}>
            <QRCodeSVG
              value={invitationUrl}
              size={280}
              level="H"
              includeMargin
              fgColor="#0066cc"
            />
          </div>
          <p style={{
            marginTop: '20px',
            fontSize: '16px',
            color: '#0066cc',
            fontWeight: '600',
            textAlign: 'center',
          }}>
            {t('invitations.printable.scanMe')}
          </p>
        </div>

        {/* Benefits section */}
        <div style={{
          maxWidth: '160mm',
          margin: '0 auto 40px auto',
          background: '#f8fafc',
          padding: '24px',
          borderRadius: '12px',
          border: '2px solid #e2e8f0',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#0066cc',
            margin: '0 0 16px 0',
            textAlign: 'center',
          }}>
            {t('invitations.printable.benefits.title')}
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
            {[
              { icon: '⚡', text: t('invitations.printable.benefits.instant') },
              { icon: '✅', text: t('invitations.printable.benefits.oneClick') },
              { icon: '📅', text: t('invitations.printable.benefits.calendar') },
              { icon: '🔔', text: t('invitations.printable.benefits.notifications') },
            ].map((benefit, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{
                  fontSize: '20px',
                  flexShrink: '0',
                }}>
                  {benefit.icon}
                </span>
                <p style={{
                  fontSize: '13px',
                  color: '#475569',
                  margin: '0',
                  lineHeight: '1.4',
                  fontWeight: '500',
                }}>
                  {benefit.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions - simplified */}
        <div style={{
          maxWidth: '160mm',
          margin: '0 auto',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 20px 0',
            textAlign: 'center',
          }}>
            {t('invitations.printable.howItWorks')}
          </h3>

          {[
            { num: '1', text: t('invitations.printable.step1') },
            { num: '2', text: t('invitations.printable.step2') },
            { num: '3', text: t('invitations.printable.step3') },
            { num: '4', text: t('invitations.printable.step4') },
          ].map((step) => (
            <div key={step.num} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '12px',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#0066cc',
                color: 'white',
                textAlign: 'center',
                lineHeight: '28px',
                fontSize: '14px',
                fontWeight: '600',
                flexShrink: '0',
              }}>
                {step.num}
              </div>
              <p style={{
                fontSize: '14px',
                color: '#475569',
                margin: '5px 0 0 0',
                lineHeight: '1.4',
                fontWeight: '400',
              }}>
                {step.text}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: '20mm',
          left: '20mm',
          right: '20mm',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: '400',
          }}>
            {t('invitations.printable.footer')}
          </div>
          {companyLogo && (
            <img
              src={companyLogo}
              alt="Company logo"
              width={120}
              height={32}
              style={{
                maxHeight: '32px',
                maxWidth: '120px',
                objectFit: 'contain',
              }}
            />
          )}
        </div>

      </div>
    </div>
  );
}
