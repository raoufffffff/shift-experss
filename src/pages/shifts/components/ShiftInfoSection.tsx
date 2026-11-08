import type { Locale } from 'date-fns';
import { Calendar, Clock, MapPin, Crown, Paperclip, FileText, Timer, Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import type { Shift } from '../../../components/shifts/shift-detail/types';

interface ShiftInfoSectionProps {
    shift: Shift;
    formatDuration: (d: number) => string;
    extractTime: (t: string) => string;
    extractDate: (t: string) => Date;
    getDateLocale: () => Locale;
    effectiveDuration: number;
    isAdminOrManager: boolean;
    onAdjustHours: () => void;
    onValidate: () => void;
    t: (key: string, options?: Record<string, unknown>) => string;
    i18n: { language: string };
}

export function ShiftInfoSection({
    shift,
    formatDuration,
    extractTime,
    extractDate,
    getDateLocale,
    effectiveDuration,
    isAdminOrManager,
    onAdjustHours,
    onValidate,
    t,
    i18n
}: ShiftInfoSectionProps) {
    return (
        <div className="space-y-6">
            {/* Horaires et Lieu */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div className="flex items-center justify-between flex-1">
                            <span>{t('shifts.planning', { defaultValue: 'Planification' })}</span>
                            {shift.public_id && (
                                <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40 uppercase tracking-tighter">
                                    {shift.public_id}
                                </span>
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
                    {/* Date & Temps */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">{t('shifts.shiftDate')}</p>
                                <p className="font-semibold">
                                    {format(extractDate(shift.start_time), 'EEEE dd MMMM yyyy', { locale: getDateLocale() })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">{t('shifts.hours')}</p>
                                <p className="font-semibold">
                                    {extractTime(shift.start_time)} — {extractTime(shift.end_time)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDuration(effectiveDuration)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Horaires Réels (si présents) */}
                    {shift.actual_start_time && (
                        <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 space-y-3">
                            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">{t('shifts.adjustedHours')}</span>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-orange-900 dark:text-orange-300">
                                    {extractTime(shift.actual_start_time)} — {extractTime(shift.actual_end_time!)}
                                </p>
                                <p className="text-xs text-orange-700/80 dark:text-orange-400/80 italic mt-1 font-medium">
                                    "{shift.adjustment_reason || t('shifts.noReasonSpecified')}"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Boost Information (si présent) */}
                    {(shift.boost_count ?? 0) > 0 && (
                        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 space-y-3">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                <Timer className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">{t('shifts.shiftBoosted')}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold">
                                    {t('shifts.freelancers.hourlyRate')}: {shift.freelance_hourly_rate}€/h
                                </p>
                                {shift.original_freelance_hourly_rate && (
                                    <p className="text-xs text-muted-foreground">
                                        {t('shifts.originalRate', { rate: shift.original_freelance_hourly_rate })}
                                    </p>
                                )}
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                    {t('shifts.boostedTimes', { count: shift.boost_count, date: format(new Date(shift.boosted_at!), 'dd/MM HH:mm') })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions d'ajustement */}
                    {isAdminOrManager && (shift.status === 'completed' || shift.status === 'pending_validation') && (
                        <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
                            <Button
                                variant="outline"
                                onClick={onAdjustHours}
                                className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900/50"
                            >
                                <Timer className="w-4 h-4 mr-2" />
                                {t('shifts.adjustActualHours')}
                            </Button>

                            {shift.status === 'pending_validation' && (
                                <Button
                                    onClick={onValidate}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    {t('shifts.validation.title')}
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Required PMS/POS Software */}
            {(shift as unknown as { shift_required_pms?: { id: string; pms: { id: string; name: string; type: 'pms' | 'pos' } }[] }).shift_required_pms &&
             (shift as unknown as { shift_required_pms: { id: string; pms: { id: string; name: string; type: 'pms' | 'pos' } }[] }).shift_required_pms.length > 0 && (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-primary" />
                            {t('shifts.requiredSoftware', { defaultValue: 'Logiciels requis' })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="flex flex-wrap gap-2">
                            {(shift as unknown as { shift_required_pms: { id: string; pms: { id: string; name: string; type: 'pms' | 'pos' } }[] }).shift_required_pms.map((srp) => (
                                <span key={srp.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${
                                    srp.pms.type === 'pms'
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                }`}>
                                    <Monitor className="w-3.5 h-3.5" />
                                    <span className="font-semibold text-xs">{srp.pms.type?.toUpperCase()}</span>
                                    {srp.pms.name}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Description & Infos Privées */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        {t('shifts.details', { defaultValue: 'Détails de la mission' })}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                    {/* Public Description */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('shifts.description')}</p>
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                            {shift.description || (
                                <span className="italic text-muted-foreground">{t('shifts.noDescriptionProvided')}</span>
                            )}
                        </div>
                    </div>

                    {/* Private Section (Visible only to company) */}
                    {(shift.private_note || shift.private_attachment_url) && (
                        <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                    <Crown className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">{t('shifts.privateSection', { defaultValue: 'Section Privée' })}</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] bg-white dark:bg-amber-950/50">
                                    {t('shifts.visibleToAccepted', { defaultValue: 'Visible uniquement par les candidats acceptés' })}
                                </Badge>
                            </div>

                            {shift.private_note && (
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-amber-800/70 dark:text-amber-500/70">{t('shifts.privateNote', { defaultValue: 'Note privée (interne)' })}</p>
                                    <p className="text-sm text-foreground leading-relaxed">{shift.private_note}</p>
                                </div>
                            )}

                            {shift.private_attachment_url && (
                                <div className="pt-2">
                                    <a
                                        href={shift.private_attachment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-background border border-amber-200 dark:border-amber-800 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all shadow-sm"
                                    >
                                        <Paperclip className="w-4 h-4 text-amber-600" />
                                        <span>{t('common.viewDocument')}</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

import { CheckCircle } from 'lucide-react';
