import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Loader2, Info } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Shift } from '@/api/shifts';

interface BoostShiftDialogProps {
    shift: Shift | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newRate: number) => void;
}

export function BoostShiftDialog({ shift, isOpen, onClose, onSuccess }: BoostShiftDialogProps) {
    const { t } = useTranslation();
    const currentRate = shift?.freelance_hourly_rate || 0;
    const minRate = currentRate + 0.5;
    const maxRate = currentRate + 10;
    const [newRate, setNewRate] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) setNewRate(minRate.toString());
    }, [isOpen, minRate]);

    if (!shift) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const rateValue = parseFloat(newRate);
        if (isNaN(rateValue) || rateValue < minRate) {
            toast.error(t('shifts.boost.errorMinRate', { min: minRate.toFixed(2) }));
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiClient.post(`/api/shifts/${shift.id}/boost`, {
                new_rate: rateValue
            });

            if (response.data.success) {
                toast.success(t('shifts.boost.success', { notified: response.data.freelancers_notified }));
                onSuccess(rateValue);
                onClose();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } }
            const errorMessage = err.response?.data?.error || t('common.errorOccurred');
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                            {t('shifts.boost.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('shifts.boost.description')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-100 dark:border-amber-900/30">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{t('shifts.boost.currentRate')}</span>
                                <span className="font-semibold text-foreground">{currentRate.toFixed(2)}€/h</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{t('shifts.boost.minNewRate')}</span>
                                <span className="font-medium text-amber-600 dark:text-amber-400">+{0.5}€ ({minRate.toFixed(2)}€/h)</span>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="newRate">{t('shifts.boost.labelNewRate')}</Label>
                            <div className="space-y-3">
                                <input
                                    type="range"
                                    min={minRate}
                                    max={maxRate}
                                    step={0.5}
                                    value={newRate || minRate}
                                    onChange={(e) => setNewRate(e.target.value)}
                                    className="w-full h-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{minRate.toFixed(2)}€/h</span>
                                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                        {parseFloat(newRate || String(minRate)).toFixed(2)}€/h
                                    </span>
                                    <span>{maxRate.toFixed(2)}€/h</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                {t('shifts.boost.infoCooldown')}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4 mr-2 fill-current" />
                            )}
                            {t('shifts.boost.confirm')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
