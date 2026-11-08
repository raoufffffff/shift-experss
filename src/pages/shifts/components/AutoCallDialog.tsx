import { PhoneCall, Info, ShieldCheck, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AUTO_CALL_REASON_FR, type AutoCallStatus } from '../hooks/useShiftDetail';

interface AutoCallDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    status: AutoCallStatus | undefined;
    isPending: boolean;
    onToggle: (enabled: boolean) => void;
    t: (key: string, options?: Record<string, unknown>) => string;
}

export function formatCents(cents: number, locale = 'fr-FR') {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

export function AutoCallDialog({ open, onOpenChange, status, isPending, onToggle, t }: AutoCallDialogProps) {
    if (!status) return null;

    const price = formatCents(status.price_cents);
    const maxCost = formatCents(status.max_cost_cents);

    // ── Relance déjà active : résumé + bouton d'arrêt ──
    if (status.enabled) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PhoneCall className="w-5 h-5 text-emerald-600" />
                            {t('shifts.autoCalls.activeTitle', { defaultValue: 'Relance par appel active' })}
                        </DialogTitle>
                        <DialogDescription>
                            {t('shifts.autoCalls.activeDesc', {
                                defaultValue: "Nous appelons les freelances disponibles, l'un après l'autre, entre 8h et 21h (heure de Paris).",
                            })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <Stat label={t('shifts.autoCalls.statCalls', { defaultValue: 'Appels passés' })} value={`${status.calls_made} / ${status.max_calls}`} />
                        <Stat label={t('shifts.autoCalls.statAnswered', { defaultValue: 'Appels décrochés' })} value={String(status.calls_answered)} />
                        <Stat label={t('shifts.autoCalls.statApplications', { defaultValue: 'Candidatures via appel' })} value={String(status.applications_via_call)} />
                        <Stat label={t('shifts.autoCalls.statCost', { defaultValue: 'Coût (appels décrochés)' })} value={formatCents(status.cost_cents)} />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            {t('common.close', { defaultValue: 'Fermer' })}
                        </Button>
                        <Button variant="outline" disabled={isPending} onClick={() => onToggle(false)} className="border-red-200 text-red-600 hover:bg-red-50">
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t('shifts.autoCalls.stop', { defaultValue: 'Arrêter les appels' })}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // ── Pas encore activée : aperçu + confirmation ──
    const reasonText = status.reason
        ? t(`shifts.autoCalls.reasons.${status.reason}`, { defaultValue: AUTO_CALL_REASON_FR[status.reason] || '' })
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PhoneCall className="w-5 h-5 text-emerald-600" />
                        {t('shifts.autoCalls.title', { defaultValue: 'Trouver un freelance par appel' })}
                    </DialogTitle>
                    <DialogDescription>
                        {t('shifts.autoCalls.subtitle', {
                            defaultValue: "Un appel automatique propose votre mission aux freelances disponibles qui ont accepté d'être appelés.",
                        })}
                    </DialogDescription>
                </DialogHeader>

                {!status.live && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                            {t('shifts.autoCalls.simulation', {
                                defaultValue: "Mode simulation : aucun appel réel n'est passé pour le moment.",
                            })}
                        </span>
                    </div>
                )}

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-center">
                    <div className="text-4xl font-black text-emerald-700 leading-none">{status.available_count}</div>
                    <div className="mt-1 text-sm text-emerald-800">
                        {t('shifts.autoCalls.availableLabel', {
                            count: status.available_count,
                            defaultValue: status.available_count > 1
                                ? 'freelances disponibles et compatibles'
                                : 'freelance disponible et compatible',
                        })}
                    </div>
                </div>

                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>
                        {status.available_count > 0
                            ? t('shifts.autoCalls.howItWorks', {
                                count: status.will_call,
                                defaultValue: `Nous appelons les ${status.will_call} mieux classés, l'un après l'autre, entre 8h et 21h (heure de Paris).`,
                            })
                            : t('shifts.autoCalls.noneYet', {
                                defaultValue: "Aucun freelance n'est disponible pour l'instant : les appels démarreront dès qu'un freelance compatible sera disponible, entre 8h et 21h (heure de Paris).",
                            })}
                    </li>
                    <li>
                        <strong className="text-foreground">
                            {t('shifts.autoCalls.priceLine', {
                                price,
                                defaultValue: `${price} par appel décroché.`,
                            })}
                        </strong>{' '}
                        {t('shifts.autoCalls.priceNote', {
                            max: maxCost,
                            defaultValue: `Les appels sans réponse ou sur messagerie ne sont pas facturés. Maximum : ${maxCost}.`,
                        })}
                    </li>
                    <li>
                        {t('shifts.autoCalls.applyNote', {
                            defaultValue: "Un freelance qui appuie sur 1 postule seulement : c'est vous qui acceptez ensuite.",
                        })}
                    </li>
                    <li>
                        {t('shifts.autoCalls.stopNote', {
                            defaultValue: "Les appels s'arrêtent dès que le shift est complet ou annulé, ou quand vous les arrêtez.",
                        })}
                    </li>
                </ul>

                <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                        {t('shifts.autoCalls.privacy', {
                            defaultValue: "Les identités et coordonnées des freelances ne vous sont communiquées qu'après leur candidature. Aucune garantie de réponse.",
                        })}
                    </span>
                </div>

                {reasonText && !status.can_enable && (
                    <p className="text-sm font-medium text-red-600">{reasonText}</p>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        {t('common.cancel', { defaultValue: 'Annuler' })}
                    </Button>
                    <Button
                        disabled={!status.can_enable || isPending}
                        onClick={() => onToggle(true)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t('shifts.autoCalls.start', { defaultValue: 'Lancer les appels' })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
        </div>
    );
}