import { useEffect, useState } from 'react';
import { Calendar, Clock, AlertTriangle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
// ⚠️ Adapte le chemin/les noms des composants Dialog à ceux réellement utilisés chez toi
// (la même bibliothèque que AdjustHoursDialog / ValidateShiftDialog / BoostShiftDialog)
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/Dialog';
import type { RescheduleEntry, LinkedShift } from '../../pages/shifts/hooks/useShiftDetail';

interface RescheduleShiftDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // ✅ Shifts concernés — un seul shift, ou toute la série si le shift fait partie d'un event
    shifts: LinkedShift[];
    isPending: boolean;
    onConfirm: (entries: RescheduleEntry[]) => void;
    t: (key: string, options?: Record<string, unknown>) => string;
}

interface RowState {
    shiftId: string;
    date: string;      // yyyy-MM-dd
    startTime: string;  // HH:mm
    endTime: string;    // HH:mm
}

function toDateInputValue(iso: string): string {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function toTimeInputValue(iso: string): string {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function buildIso(date: string, time: string): string {
    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0, 0, 0).toISOString();
}

export function RescheduleShiftDialog({
    open,
    onOpenChange,
    shifts,
    isPending,
    onConfirm,
    t,
}: RescheduleShiftDialogProps) {
    const [rows, setRows] = useState<RowState[]>([]);

    // Réinitialise les lignes à partir des shifts actuels à chaque ouverture du Dialog
    useEffect(() => {
        if (!open) return;
        setRows(
            shifts.map((s) => ({
                shiftId: s.id,
                date: toDateInputValue(s.start_time),
                startTime: toTimeInputValue(s.start_time),
                endTime: toTimeInputValue(s.end_time),
            }))
        );
    }, [open, shifts]);

    const isGrouped = shifts.length > 1;

    const updateRow = (shiftId: string, field: keyof RowState, value: string) => {
        setRows((prev) => prev.map((r) => (r.shiftId === shiftId ? { ...r, [field]: value } : r)));
    };

    // Validation : chaque ligne doit avoir un début dans le futur, et une fin après le début (avec prise en charge du chevauchement sur le lendemain)
    const rowErrors: Record<string, string | null> = {};
    rows.forEach((r) => {
        if (!r.date || !r.startTime || !r.endTime) {
            rowErrors[r.shiftId] = t('shifts.reschedule.fillAllFields', { defaultValue: 'Veuillez remplir tous les champs' });
            return;
        }
        const newStart = buildIso(r.date, r.startTime);
        const newEnd = buildIso(r.date, r.endTime);
        const startMs = new Date(newStart).getTime();
        let endMs = new Date(newEnd).getTime();
        if (endMs <= startMs) endMs += 24 * 60 * 60 * 1000; // shift de nuit qui se prolonge sur le lendemain

        if (startMs <= Date.now()) {
            rowErrors[r.shiftId] = t('shifts.reschedule.mustBeFuture', { defaultValue: 'Le nouvel horaire doit être dans le futur' });
            return;
        }
        if (endMs - startMs < 30 * 60 * 1000) {
            rowErrors[r.shiftId] = t('shifts.shiftTooShort', { defaultValue: 'Le shift doit durer au moins 30 minutes' });
            return;
        }
        rowErrors[r.shiftId] = null;
    });

    const hasErrors = Object.values(rowErrors).some((e) => !!e);

    const handleConfirm = () => {
        if (hasErrors) return;
        const entries: RescheduleEntry[] = rows.map((r) => {
            const newStartTime = buildIso(r.date, r.startTime);
            let newEndTime = buildIso(r.date, r.endTime);
            if (new Date(newEndTime).getTime() <= new Date(newStartTime).getTime()) {
                const d = new Date(newEndTime);
                d.setDate(d.getDate() + 1);
                newEndTime = d.toISOString();
            }
            return { shiftId: r.shiftId, newStartTime, newEndTime };
        });
        onConfirm(entries);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {t('shifts.reschedule.title', { defaultValue: 'Replanifier le shift' })}
                    </DialogTitle>
                </DialogHeader>

                {isGrouped && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-sm text-blue-700 dark:text-blue-400">
                        <Link2 className="w-4 h-4 shrink-0" />
                        <span>
                            {t('shifts.reschedule.groupNotice', {
                                count: shifts.length,
                                defaultValue: 'Tous les jours de cette série ({{count}} jours) seront mis à jour en une seule fois',
                            })}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                        {t('shifts.reschedule.pendingWillBeCleared', {
                            defaultValue: 'Toutes les candidatures en attente sur le(s) shift(s) replanifié(s) seront automatiquement supprimées',
                        })}
                    </span>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {rows.map((row, idx) => (
                        <div key={row.shiftId} className="p-3 rounded-xl border border-border/60 space-y-2">
                            {isGrouped && (
                                <p className="text-xs font-semibold text-muted-foreground">
                                    {t('shifts.reschedule.day', { defaultValue: 'Jour' })} {idx + 1}
                                </p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                        <Calendar className="w-3 h-3" />
                                        {t('shifts.shiftDate', { defaultValue: 'Date' })}
                                    </label>
                                    <input
                                        type="date"
                                        value={row.date}
                                        onChange={(e) => updateRow(row.shiftId, 'date', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                        <Clock className="w-3 h-3" />
                                        {t('shifts.startTime', { defaultValue: 'Heure de début' })}
                                    </label>
                                    <input
                                        type="time"
                                        value={row.startTime}
                                        onChange={(e) => updateRow(row.shiftId, 'startTime', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                        <Clock className="w-3 h-3" />
                                        {t('shifts.endTime', { defaultValue: 'Heure de fin' })}
                                    </label>
                                    <input
                                        type="time"
                                        value={row.endTime}
                                        onChange={(e) => updateRow(row.shiftId, 'endTime', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            </div>
                            {rowErrors[row.shiftId] && (
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                    {rowErrors[row.shiftId]}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        {t('common.cancel', { defaultValue: 'Annuler' })}
                    </Button>
                    <Button onClick={handleConfirm} disabled={isPending || hasErrors || rows.length === 0}>
                        {isPending
                            ? t('common.saving', { defaultValue: 'Enregistrement...' })
                            : t('shifts.reschedule.confirm', { defaultValue: 'Confirmer la replanification' })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}