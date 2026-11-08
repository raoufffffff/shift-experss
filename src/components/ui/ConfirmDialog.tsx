import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './Dialog';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'primary' | 'danger';
    isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant = 'primary',
    isLoading = false,
}) => {
    const { t } = useTranslation();
    const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');
    const resolvedCancelLabel = cancelLabel ?? t('common.cancel');
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl">
                <div className="p-8">
                    <DialogHeader className="space-y-4 mb-0">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ${variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'
                            }`}>
                            <AlertTriangle className="w-7 h-7" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-foreground">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                            {description}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="mt-10 gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 rounded-2xl py-6 font-bold text-muted-foreground border-muted hover:bg-muted/50 hover:text-foreground transition-all active:scale-95"
                            disabled={isLoading}
                        >
                            {resolvedCancelLabel}
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 rounded-2xl py-6 font-bold shadow-lg transition-all active:scale-95 ${variant === 'danger'
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200'
                                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
                                }`}
                        >
                            {resolvedConfirmLabel}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};
