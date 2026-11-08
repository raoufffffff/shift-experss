
import { ChangeEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, Crown, Upload, X, Paperclip, ArrowRight, ArrowLeft, Monitor, Languages } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { StepProps } from './types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface PmsOption {
    id: string;
    name: string;
    type: 'pms' | 'pos';
}

export function DetailsStep({ formData, updateFormData, onNext, onPrevious }: StepProps) {
    const { t } = useTranslation();
    const [availablePms, setAvailablePms] = useState<PmsOption[]>([]);
    const [loadingPms, setLoadingPms] = useState(false);

    // Fetch PMS for the selected job position
    useEffect(() => {
        if (!formData.jobPositionId) {
            setAvailablePms([]);
            return;
        }

        setLoadingPms(true);
        supabase
            .from('pms')
            .select('id, name, type')
            .eq('job_position_id', formData.jobPositionId)
            .order('name')
            .then(({ data, error }) => {
                if (!error && data) {
                    setAvailablePms(data as PmsOption[]);
                } else {
                    setAvailablePms([]);
                }
                setLoadingPms(false);
            });
    }, [formData.jobPositionId]);

    // Handle file change
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error(t('shifts.fileTooLarge', { defaultValue: 'Le fichier est trop volumineux (max 5Mo)' }));
                return;
            }
            updateFormData({ privateAttachmentFile: file });
        }
    };

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
                    <FileText className="w-5 h-5 text-primary" />
                    {t('shifts.wizard.step3Title', { defaultValue: 'Détails de la mission' })}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('shifts.wizard.step3Desc', { defaultValue: 'Description et informations complémentaires' })}
                </p>
            </div>

            <div className="space-y-6">
                {/* Description - Public */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        {t('shifts.description', { defaultValue: 'Description publique' })}
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                        {t('shifts.descriptionDesc', { defaultValue: 'Cette description sera visible par tous les employés.' })}
                    </p>
                    <Textarea
                        placeholder={t('shifts.descriptionPlaceholder', { defaultValue: 'Détails sur la mission, tenue requise, etc...' })}
                        value={formData.description}
                        onChange={(e) => updateFormData({ description: e.target.value })}
                        className="min-h-[120px]"
                    />
                </div>

                {/* PMS/POS Software Section — dropdown select */}
                {formData.jobPositionId && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            {t('shifts.requiredSoftware', { defaultValue: 'Logiciel utilisé' })}
                        </label>
                        {loadingPms ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                {t('common.loading', { defaultValue: 'Chargement...' })}
                            </div>
                        ) : availablePms.length > 0 ? (
                            <select
                                value={(formData.requiredPmsIds || [])[0] || ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    updateFormData({ requiredPmsIds: value ? [value] : [] });
                                }}
                                className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                            >
                                <option value="">{t('shifts.selectSoftware', { defaultValue: 'Aucun logiciel requis' })}</option>
                                {availablePms.map((pms) => (
                                    <option key={pms.id} value={pms.id}>
                                        {pms.type?.toUpperCase() || 'POS'} — {pms.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-xs text-muted-foreground/70 italic py-1">
                                {t('shifts.noPmsForPosition', { defaultValue: 'Aucun logiciel configuré pour ce poste.' })}
                            </p>
                        )}
                    </div>
                )}

                {/* Required Languages */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        {t('shifts.requiredLanguages', { defaultValue: 'Langues requises' })}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{t('common.optional', { defaultValue: '(optionnel)' })}</span>
                    </label>
                    <select
                        value=""
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value && !(formData.requiredLanguages || []).includes(value)) {
                                updateFormData({ requiredLanguages: [...(formData.requiredLanguages || []), value] });
                            }
                        }}
                        className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                        <option value="">{t('shifts.addLanguage', { defaultValue: 'Ajouter une langue...' })}</option>
                        {[
                            { value: 'fr', label: 'Français' },
                            { value: 'en', label: 'English' },
                            { value: 'es', label: 'Español' },
                            { value: 'it', label: 'Italiano' },
                            { value: 'de', label: 'Deutsch' },
                            { value: 'pt', label: 'Português' },
                            { value: 'ar', label: 'العربية' },
                            { value: 'zh', label: '中文' },
                            { value: 'ru', label: 'Русский' },
                            { value: 'ja', label: '日本語' },
                        ].filter(lang => !(formData.requiredLanguages || []).includes(lang.value)).map((lang) => (
                            <option key={lang.value} value={lang.value}>{lang.label}</option>
                        ))}
                    </select>
                    {(formData.requiredLanguages || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {formData.requiredLanguages.map((lang) => {
                                const labels: Record<string, string> = { fr: 'Français', en: 'English', es: 'Español', it: 'Italiano', de: 'Deutsch', pt: 'Português', ar: 'العربية', zh: '中文', ru: 'Русский', ja: '日本語' };
                                return (
                                    <span key={lang} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                                        {labels[lang] || lang}
                                        <button
                                            type="button"
                                            onClick={() => updateFormData({ requiredLanguages: formData.requiredLanguages.filter(l => l !== lang) })}
                                            className="hover:text-destructive"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Private Section */}
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200/50 dark:border-amber-900/50">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-900 dark:text-amber-500">
                        <Crown className="w-4 h-4" />
                        <span>{t('shifts.privateSection', { defaultValue: 'Informations privées' })}</span>
                        <span className="text-[10px] font-normal ml-auto bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                            {t('shifts.visibleAfterAcceptance', { defaultValue: 'Visible après acceptation' })}
                        </span>
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('shifts.privateNote', { defaultValue: 'Note complémentaire' })}
                            </label>
                            <Textarea
                                value={formData.privateNote}
                                onChange={(e) => updateFormData({ privateNote: e.target.value })}
                                placeholder={t('shifts.privateNotePlaceholder', { defaultValue: 'Instructions d\'accès, codes...' })}
                                className="min-h-[80px] bg-card"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Paperclip className="w-4 h-4" />
                                {t('shifts.privateDocument', { defaultValue: 'Document joint' })}
                            </label>

                            {!formData.privateAttachmentFile ? (
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-[80px] border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 border-border transition-colors">
                                        <div className="flex flex-col items-center justify-center">
                                            <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-semibold">{t('common.clickToUpload', { defaultValue: 'Ajouter' })}</span>
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            accept=".pdf,.jpg,.jpeg,.png"
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-2 bg-card border border-border rounded-lg h-[80px]">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium truncate">{formData.privateAttachmentFile.name}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {(formData.privateAttachmentFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => updateFormData({ privateAttachmentFile: null })}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={onPrevious}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('shifts.wizard.previous', { defaultValue: 'Précédent' })}
                </Button>
                <Button type="button" onClick={onNext} className="min-w-32">
                    {t('shifts.wizard.next', { defaultValue: 'Suivant' })}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </motion.div>
    );
}
