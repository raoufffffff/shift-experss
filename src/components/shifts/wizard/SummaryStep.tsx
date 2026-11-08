import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    CheckCircle, CalendarDays, MapPin, Briefcase, Users,
    Clock, ArrowLeft, Loader2, Crown, Edit2, Euro, FileText, Monitor, Languages, Zap, UserCheck, Wallet, Car
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { StepProps, Establishment, Employee } from './types';
import { JobPosition } from '@shared/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';

interface SummaryStepProps extends StepProps {
    establishments: Establishment[];
    employees: Employee[];
    jobPositions: JobPosition[];
    isSubmitting: boolean;
    onSubmit: () => void;
    onGoToStep: (step: number) => void;
    canCreate: boolean;
    limitMessage?: string | null;
    onNavigateToSubscription: () => void;
    // 🚗 Frais de déplacement proposés (freelances) + plafond optionnel — affichés dans le récapitulatif
    offersTransportFee?: boolean;
    transportFeeCap?: string;
}

export function SummaryStep({
    formData,
    updateFormData,
    onPrevious,
    establishments,
    employees,
    jobPositions,
    isSubmitting,
    onSubmit,
    onGoToStep,
    canCreate,
    limitMessage,
    onNavigateToSubscription,
    offersTransportFee = false,
    transportFeeCap = '',
}: SummaryStepProps) {
    const { t } = useTranslation();

    // Get establishment name
    const establishmentName = useMemo(() => {
        const est = establishments.find((e) => e.id === formData.establishmentId);
        return est?.name || '-';
    }, [establishments, formData.establishmentId]);

    // Get selected employees names
    const selectedEmployeeNames = useMemo(() => {
        return employees
            .filter((e) => formData.selectedEmployees.includes(e.id))
            .map((e) => {
                const user = e.user;
                return user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.email || 'Sans nom';
            });
    }, [employees, formData.selectedEmployees]);

    // Format dates
    const dateDisplay = useMemo(() => {
        if (!formData.dateRangeStart) return '-';

        if (!formData.dateRangeEnd || formData.dateRangeStart.toDateString() === formData.dateRangeEnd.toDateString()) {
            return format(formData.dateRangeStart, 'EEEE d MMMM yyyy', { locale: fr });
        }

        return `${format(formData.dateRangeStart, 'd MMM', { locale: fr })} → ${format(formData.dateRangeEnd, 'd MMM yyyy', { locale: fr })}`;
    }, [formData.dateRangeStart, formData.dateRangeEnd]);

    // Format time for single day
    const timeDisplay = useMemo(() => {
        if (formData.isMultiDay) {
            return `${formData.defaultStartTime} - ${formData.defaultEndTime}`;
        }

        if (!formData.startTime || !formData.endTime) return '-';

        const start = new Date(formData.startTime);
        const end = new Date(formData.endTime);

        const startStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        const endStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
        return `${startStr} - ${endStr}`;
    }, [formData]);

    // Calculate duration
    const duration = useMemo(() => {
        if (formData.isMultiDay) {
            const [startH, startM] = formData.defaultStartTime.split(':').map(Number);
            const [endH, endM] = formData.defaultEndTime.split(':').map(Number);
            const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM) - formData.defaultBreakMinutes;
            if (totalMinutes <= 0) return null;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return { hours, minutes, totalMinutes };
        }

        if (!formData.startTime || !formData.endTime) return null;

        const start = new Date(formData.startTime);
        const end = new Date(formData.endTime);

        if (end <= start) return null;

        const totalMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
        const workMinutes = totalMinutes - formData.breakDurationMinutes;

        if (workMinutes <= 0) return null;

        const hours = Math.floor(workMinutes / 60);
        const minutes = workMinutes % 60;

        return { hours, minutes, totalMinutes: workMinutes };
    }, [formData]);

    // Count excluded days and exceptions
    const daysInfo = useMemo(() => {
        if (!formData.isMultiDay || !formData.dateRangeStart || !formData.dateRangeEnd) {
            return null;
        }

        let totalDays = 0;
        const current = new Date(formData.dateRangeStart);
        while (current <= formData.dateRangeEnd) {
            totalDays++;
            current.setDate(current.getDate() + 1);
        }

        const includedDays = totalDays - formData.excludedDays.size;
        const exceptionsCount = formData.shiftExceptions.size;

        return { totalDays, includedDays, exceptionsCount };
    }, [formData]);

    // Resolve PMS data
    const [pmsData, setPmsData] = useState<{ name: string; type: 'pms' | 'pos' }[]>([]);
    useEffect(() => {
        if (!formData.requiredPmsIds || formData.requiredPmsIds.length === 0) {
            setPmsData([]);
            return;
        }
        supabase
            .from('pms')
            .select('id, name, type')
            .in('id', formData.requiredPmsIds)
            .then(({ data }) => {
                if (data) setPmsData(data.map((p) => ({ name: p.name, type: (p.type as 'pms' | 'pos') || 'pos' })));
            });
    }, [formData.requiredPmsIds]);

    const willPublishToFreelancers = formData.publishToFreelancers || formData.autoPublishToFreelancers;
    const hasEmployees = selectedEmployeeNames.length > 0;

    // Coût employés estimé = tarif horaire unique du shift (fixé par le client,
    // même champ que pour les freelances) × durée — s'affiche dès que ce tarif
    // est renseigné et que des employés sont invités.
    const totalEmployeeCost = useMemo(() => {
        if (!duration || !hasEmployees || !formData.freelanceHourlyRate) return 0;
        const rate = parseFloat(formData.freelanceHourlyRate);
        if (isNaN(rate) || rate <= 0) return 0;
        return rate * (duration.totalMinutes / 60);
    }, [hasEmployees, formData.freelanceHourlyRate, duration]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Step Title */}
            <div className="text-center">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    {t('shifts.wizard.step5Title', { defaultValue: 'Récapitulatif' })}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('shifts.wizard.step5Desc', { defaultValue: 'Vérifiez les informations avant de créer le shift' })}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="space-y-4">
                {/* Date & Time Card */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <CalendarDays className="w-5 h-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('shifts.wizard.step1Title', { defaultValue: 'Quand ?' })}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{dateDisplay}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">{timeDisplay}</span>
                                        {duration && (
                                            <span className="text-sm font-medium text-primary">
                                                ({duration.hours}h{duration.minutes > 0 && `${duration.minutes}min`})
                                            </span>
                                        )}
                                    </div>
                                    {daysInfo && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {daysInfo.includedDays} jour{daysInfo.includedDays > 1 ? 's' : ''} inclus
                                            {daysInfo.exceptionsCount > 0 && ` • ${daysInfo.exceptionsCount} exception${daysInfo.exceptionsCount > 1 ? 's' : ''}`}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => onGoToStep(1)}>
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Location Card */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('shifts.wizard.step2Title', { defaultValue: 'Où ?' })}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{establishmentName}</p>
                                    {formData.shiftAddress && (
                                        <p className="text-xs text-muted-foreground">{formData.shiftAddress}</p>
                                    )}
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => onGoToStep(2)}>
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Position Card */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <Briefcase className="w-5 h-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('shifts.wizard.step3Title', { defaultValue: 'Détails' })}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{formData.positionName || '-'}</p>
                                    {formData.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                            <FileText className="w-3 h-3 inline mr-1" />
                                            {formData.description}
                                        </p>
                                    )}
                                    {pmsData.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <Monitor className="w-3 h-3 text-muted-foreground" />
                                            {pmsData.map((pms) => (
                                                <span key={pms.name} className={`text-xs px-2 py-0.5 rounded-full ${
                                                    pms.type === 'pms'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                                                }`}>
                                                    <span className="font-semibold">{pms.type.toUpperCase()}</span> {pms.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {formData.requiredLanguages && formData.requiredLanguages.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <Languages className="w-3 h-3 text-muted-foreground" />
                                            {formData.requiredLanguages.map((lang) => {
                                                const labels: Record<string, string> = { fr: 'Français', en: 'English', es: 'Español', it: 'Italiano', de: 'Deutsch', pt: 'Português', ar: 'العربية', zh: '中文', ru: 'Русский', ja: '日本語' };
                                                return (
                                                    <span key={lang} className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
                                                        {labels[lang] || lang}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {(formData.privateNote || formData.privateAttachmentFile) && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            <Crown className="w-3 h-3 inline mr-1" />
                                            Infos privées ajoutées
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => onGoToStep(3)}>
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recipients Card */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <Users className="w-5 h-5 text-primary mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('shifts.wizard.step4Title', { defaultValue: 'Qui prévenir ?' })}</p>

                                    {/* Employees */}
                                    {selectedEmployeeNames.length > 0 ? (
                                        <div className="mt-1">
                                            <p className="text-sm text-muted-foreground">
                                                {t('shifts.selectedEmployees', { count: selectedEmployeeNames.length })}
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {selectedEmployeeNames.slice(0, 3).join(', ')}
                                                {selectedEmployeeNames.length > 3 && ` +${selectedEmployeeNames.length - 3}`}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground mt-1">{t('shifts.noEmployeeSelected')}</p>
                                    )}

                                    {/* Employee cost */}
                                    {totalEmployeeCost > 0 && (
                                        <div className="mt-1 flex items-center gap-2">
                                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                {t('shifts.employeeCostEstimate', { defaultValue: 'Coût employés estimé' })} : {totalEmployeeCost.toFixed(2)}€
                                            </span>
                                        </div>
                                    )}

                                    {/* Freelancers */}
                                    {willPublishToFreelancers && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="text-sm text-emerald-600 dark:text-emerald-400">
                                                {formData.publishToFreelancers
                                                    ? t('shifts.immediatePublish')
                                                    : t('shifts.autoPublish', { minutes: formData.autoPublishDelayMinutes })
                                                }
                                            </span>
                                        </div>
                                    )}

                                    {/* Hourly rate — un seul tarif pour tout le shift (employés et/ou freelances) */}
                                    {formData.freelanceHourlyRate && (
                                        <div className="mt-1 flex items-center gap-2">
                                            <Euro className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                {formData.freelanceHourlyRate}€/h
                                            </span>
                                        </div>
                                    )}

                                    {/* Frais de déplacement */}
                                    {offersTransportFee && (
                                        <div className="mt-1 flex items-center gap-2">
                                            <Car className="w-3.5 h-3.5 text-sky-600" />
                                            <span className="text-sm text-sky-600 dark:text-sky-400">
                                                {t('shifts.transportFee.summary', { defaultValue: 'Frais de déplacement remboursables' })}
                                                {parseFloat(transportFeeCap) > 0 && ` (${t('shifts.transportFee.summaryCap', { defaultValue: "plafond" })} ${parseFloat(transportFeeCap).toFixed(2)}€)`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Application mode */}
                                    <div className="mt-1 flex items-center gap-2">
                                        {formData.autoAcceptApplications ? (
                                            <>
                                                <Zap className="w-3.5 h-3.5 text-amber-600" />
                                                <span className="text-sm text-amber-600 dark:text-amber-400">
                                                    {t('shifts.applicationMode.autoLabel', { defaultValue: 'Acceptation automatique' })}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                                                <span className="text-sm text-blue-600 dark:text-blue-400">
                                                    {t('shifts.applicationMode.manualLabel', { defaultValue: 'Acceptation manuelle' })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => onGoToStep(4)}>
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Limit Warning */}
            {!canCreate && limitMessage && (
                <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3 space-y-3">
                    <p>{limitMessage}</p>
                    <Button
                        type="button"
                        size="sm"
                        onClick={onNavigateToSubscription}
                        className="w-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 text-white border-0"
                    >
                        <Crown className="w-4 h-4 mr-2" />
                        {t('common.upgrade')}
                    </Button>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={onPrevious}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('shifts.wizard.previous', { defaultValue: 'Précédent' })}
                </Button>
                <Button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting || !canCreate}
                    className={cn('min-w-40', !canCreate && 'opacity-50')}
                >
                    {!canCreate && <Crown className="w-4 h-4 mr-2" />}
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('common.creating')}
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {formData.isMultiDay
                                ? t('shifts.wizard.createMultiple', { defaultValue: 'Créer les shifts' })
                                : t('shifts.wizard.create', { defaultValue: 'Créer le shift' })
                            }
                        </>
                    )}
                </Button>
            </div>
        </motion.div>
    );
}