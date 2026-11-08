import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import {
  FileText,
  FileCheck,
  FileX,
  FileClock,
} from 'lucide-react';

interface FreelancerDocument {
  id: string;
  name: string;
  description: string;
  status: 'verified' | 'pending' | 'missing';
}

interface FreelancerDocumentsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  freelancerName: string;
  documents: FreelancerDocument[];
  t: (key: string, options?: Record<string, unknown>) => string;
}

function getDocumentStatusConfig(status: 'verified' | 'pending' | 'missing', t: (key: string, options?: Record<string, unknown>) => string) {
  switch (status) {
    case 'verified':
      return {
        label: t('freelancers.documents.verified'),
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        icon: FileCheck,
      };
    case 'pending':
      return {
        label: t('freelancers.documents.pending'),
        color: 'text-amber-600',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        icon: FileClock,
      };
    case 'missing':
    default:
      return {
        label: t('freelancers.documents.missing'),
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        icon: FileX,
      };
  }
}

export function FreelancerDocumentsModal({
  isOpen,
  onOpenChange,
  freelancerName,
  documents,
  t,
}: FreelancerDocumentsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            {t('freelancers.documents.titleFor', { name: freelancerName })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {documents.map((doc) => {
            const statusConfig = getDocumentStatusConfig(doc.status, t);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={`p-2.5 rounded-lg ${statusConfig.bgColor}`}>
                  <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{doc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                </div>

                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig.label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {t('freelancers.documents.note')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { FreelancerDocument };
