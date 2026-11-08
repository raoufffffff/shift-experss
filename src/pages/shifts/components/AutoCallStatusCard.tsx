import { PhoneCall } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { formatCents } from './AutoCallDialog';
import type { AutoCallStatus } from '../hooks/useShiftDetail';

interface AutoCallStatusCardProps {
    status: AutoCallStatus;
    onManage: () => void;
    t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * Bandeau de suivi de la relance par appel (chiffres agrégés uniquement :
 * jamais de nom ni de numéro avant la candidature du freelance).
 */
export function AutoCallStatusCard({ status, onManage, t }: AutoCallStatusCardProps) {
    return (
        <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
            <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                        <PhoneCall className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                {t('shifts.autoCalls.cardTitle', { defaultValue: 'Relance par appel' })}
                            </h3>
                            <Chip variant={status.enabled ? 'success' : 'default'} className="h-5 text-[10px]">
                                {status.enabled
                                    ? t('shifts.autoCalls.cardActive', { defaultValue: 'En cours' })
                                    : t('shifts.autoCalls.cardStopped', { defaultValue: 'Arrêtée' })}
                            </Chip>
                            {!status.live && (
                                <Chip variant="warning" className="h-5 text-[10px]">
                                    {t('shifts.autoCalls.cardSimulation', { defaultValue: 'Simulation' })}
                                </Chip>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t('shifts.autoCalls.cardSummary', {
                                calls: status.calls_made,
                                max: status.max_calls,
                                answered: status.calls_answered,
                                cost: formatCents(status.cost_cents),
                                apps: status.applications_via_call,
                                defaultValue: `${status.calls_made}/${status.max_calls} appels · ${status.calls_answered} décrochés (${formatCents(status.cost_cents)}) · ${status.applications_via_call} candidature(s) via appel`,
                            })}
                        </p>
                    </div>
                </div>

                <Button variant="outline" size="sm" className="rounded-xl" onClick={onManage}>
                    {status.enabled
                        ? t('shifts.autoCalls.manage', { defaultValue: 'Gérer' })
                        : t('shifts.autoCalls.details', { defaultValue: 'Détails' })}
                </Button>
            </CardContent>
        </Card>
    );
}