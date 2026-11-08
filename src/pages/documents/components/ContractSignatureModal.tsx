import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { PenTool, X, Trash2, CheckCircle2 } from 'lucide-react';
import type { Contract } from '../LegalDocumentsPage';

interface ContractSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
    onSigned: () => void;
}

export function ContractSignatureModal({ isOpen, onClose, contract, onSigned }: ContractSignatureModalProps) {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize Canvas
    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#000000';
            }
        }
    }, [isOpen]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleSign = async () => {
        if (!hasSignature || !isAccepted || !contract) return;

        setIsSubmitting(true);
        try {
            const canvas = canvasRef.current;
            if (!canvas) throw new Error('Canvas not found');

            // Convert canvas to SVG or Base64 (here Base64 for simplicity in this step)
            const signatureData = canvas.toDataURL('image/png');

            const { error } = await supabase.from('contracts')
                .update({
                    employer_signature_svg: signatureData, // We reuse the column for base64 now
                    employer_signed_at: new Date().toISOString(),
                    status: contract.status === 'signed_freelancer' ? 'signed' : 'signed_employer'
                })
                .eq('id', contract.id);

            if (error) throw error;

            toast.success(t('legalDocuments.signature.success'));
            onSigned();
            onClose();
        } catch (error) {
            logger.error('Error signing contract:', error);
            toast.error(t('legalDocuments.signature.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                        <PenTool className="w-6 h-6 text-primary" />
                        {t('legalDocuments.signature.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('legalDocuments.signature.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 flex flex-col gap-6">
                    {/* Contract Preview (Placeholder for now) */}
                    <div className="bg-muted/30 rounded-xl p-6 border border-border/40 max-h-[300px] overflow-y-auto text-sm leading-relaxed text-muted-foreground italic">
                        <p className="font-bold mb-4 text-foreground not-italic">{t('legalDocuments.signature.contractSummary')}</p>
                        <p>{t('legalDocuments.signature.betweenParties', { firstName: contract?.freelancer_application?.freelancer?.first_name, lastName: contract?.freelancer_application?.freelancer?.last_name })}</p>
                        <p className="mt-2 text-xs">{t('legalDocuments.signature.missionAttestation', { position: contract?.freelancer_application?.shift?.position_name, date: contract?.freelancer_application?.shift?.start_time ? new Date(contract.freelancer_application.shift.start_time).toLocaleDateString() : '' })}</p>
                        <div className="mt-4 border-t border-border/20 pt-4 text-[10px]">
                            {t('legalDocuments.signature.termsCommitment')}
                        </div>
                    </div>

                    {/* Signature Area */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                {t('legalDocuments.signature.yourSignature')}
                                <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t('legalDocuments.signature.useMouseOrFinger')}</span>
                            </label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearCanvas}
                                className="h-8 text-destructive hover:text-white hover:bg-destructive rounded-lg flex items-center gap-2 px-3"
                                disabled={!hasSignature}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t('legalDocuments.signature.clear')}
                            </Button>
                        </div>

                        <div className="relative aspect-[3/1] bg-white border-2 border-dashed border-border/60 rounded-xl overflow-hidden cursor-crosshair group hover:border-primary/40 transition-colors shadow-inner">
                            <canvas
                                ref={canvasRef}
                                width={600}
                                height={200}
                                className="w-full h-full"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                            {!hasSignature && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground/40 gap-2">
                                    <PenTool className="w-8 h-8 opacity-20" />
                                    <span className="text-xs font-medium">{t('legalDocuments.signature.signHere')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Accept Checkbox */}
                    <div className="flex items-start space-x-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
                        <input
                            type="checkbox"
                            id="accept"
                            checked={isAccepted}
                            onChange={(e) => setIsAccepted(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="accept"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                {t('legalDocuments.signature.acceptTerms')}
                            </label>
                            <p className="text-xs text-muted-foreground">
                                {t('legalDocuments.signature.legalValidation')}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/20 border-t border-border/40 gap-3 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl px-6 h-11" disabled={isSubmitting}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleSign}
                        disabled={!hasSignature || !isAccepted || isSubmitting}
                        className="rounded-xl px-8 h-11 bg-primary hover:bg-primary/90 flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4" />
                        )}
                        {t('legalDocuments.signature.confirmAndSign')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
