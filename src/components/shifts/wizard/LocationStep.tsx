import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapPin, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StepProps, Establishment } from './types';
import { toast } from 'sonner';

interface LocationStepProps extends StepProps {
    establishments: Establishment[];
}

export function LocationStep({
    formData,
    updateFormData,
    onNext,
    onPrevious,
    establishments,
}: LocationStepProps) {
    const { t } = useTranslation();

    // Auto-select establishment if only one exists
    useEffect(() => {
        if (establishments.length === 1 && !formData.establishmentId) {
            const est = establishments[0];
            updateFormData({ establishmentId: est.id });

            // Display full address but store only street for later processing
            const fullAddress = [est.address, est.postal_code, est.city].filter(Boolean).join(', ');
            updateFormData({ shiftAddress: fullAddress });
        }
    }, [establishments, formData.establishmentId, updateFormData]);

    // Handle establishment change
    const handleEstablishmentChange = (value: string) => {
        updateFormData({ establishmentId: value });

        const selectedEst = establishments.find((e) => e.id === value);
        if (selectedEst) {
            // Display full address (street, postal, city)
            const fullAddress = [selectedEst.address, selectedEst.postal_code, selectedEst.city].filter(Boolean).join(', ');
            updateFormData({ shiftAddress: fullAddress });
        } else {
            updateFormData({ shiftAddress: '' });
        }
    };

    // Validate step
    const handleNext = () => {
        if (!formData.establishmentId) {
            toast.error(t('shifts.establishmentRequired'));
            return;
        }
        onNext();
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
                    <MapPin className="w-5 h-5 text-primary" />
                    {t('shifts.wizard.step2Title', { defaultValue: 'Où ?' })}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('shifts.wizard.step2Desc', { defaultValue: 'Sélectionnez l\'établissement et l\'adresse du shift' })}
                </p>
            </div>

            {/* Establishment Select */}
            <Select
                label={
                    <span className="inline-flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        {t('shifts.establishment')}
                    </span>
                }
                options={[
                    ...(establishments.length > 1
                        ? [{ value: '', label: t('shifts.establishmentPlaceholder') }]
                        : []),
                    ...establishments.map((e) => ({
                        value: e.id,
                        label: e.name,
                    })),
                ]}
                value={formData.establishmentId}
                onChange={(e) => handleEstablishmentChange(e.target.value)}
                required
            />

            {/* Address Input */}
            <div className="relative">
                <Input
                    type="text"
                    label={
                        <span className="inline-flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            {t('shifts.address')}
                        </span>
                    }
                    placeholder={t('shifts.addressPlaceholder')}
                    value={formData.shiftAddress}
                    onChange={(e) => updateFormData({ shiftAddress: e.target.value })}
                    helperText={
                        formData.establishmentId
                            ? t('shifts.addressAutoFilled')
                            : undefined
                    }
                />
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={onPrevious}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('shifts.wizard.previous', { defaultValue: 'Précédent' })}
                </Button>
                <Button type="button" onClick={handleNext} className="min-w-32">
                    {t('shifts.wizard.next', { defaultValue: 'Suivant' })}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </motion.div>
    );
}
