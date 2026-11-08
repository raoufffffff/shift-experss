import { Check, CalendarDays, MapPin, Briefcase, Users, CheckCircle, Calculator, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

interface StepIndicatorProps {
    currentStep: number;
    maxStepReached?: number;
    totalSteps?: number;
    hasFreelanceStep?: boolean;
    onStepClick?: (step: number) => void;
}

const BASE_STEPS = [
    { key: 'details', icon: FileText, titleKey: 'shifts.wizard.step1Title' }, // Updated icon to represent DETAILS + TIME
    { key: 'location', icon: MapPin, titleKey: 'shifts.wizard.step2Title' },
    { key: 'recipients', icon: Users, titleKey: 'shifts.wizard.step3Title' },
];

const QUOTE_STEP = { key: 'quote', icon: Calculator, titleKey: 'shifts.wizard.quoteTitle' };
const SUMMARY_STEP = { key: 'summary', icon: CheckCircle, titleKey: 'shifts.wizard.step5Title' };

export function StepIndicator({ currentStep, maxStepReached = 1, totalSteps = 5, hasFreelanceStep = false, onStepClick }: StepIndicatorProps) {
    const { t } = useTranslation();

    // Build dynamic steps array
    const steps = hasFreelanceStep
        ? [...BASE_STEPS, QUOTE_STEP, SUMMARY_STEP]
        : [...BASE_STEPS, SUMMARY_STEP];

    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = currentStep > stepNumber;
                const isCurrent = currentStep === stepNumber;
                const isVisited = stepNumber <= maxStepReached;
                const Icon = step.icon;

                // Allow clicking on any visited step (except current)
                const isClickable = isVisited && !isCurrent && onStepClick;

                return (
                    <div key={step.key} className="flex items-center">
                        {/* Step circle */}
                        <button
                            type="button"
                            onClick={() => isClickable && onStepClick(stepNumber)}
                            disabled={!isClickable}
                            className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all duration-300',
                                isCompleted
                                    ? 'bg-primary text-primary-foreground'
                                    : isCurrent
                                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                                        : 'bg-muted text-muted-foreground',
                                isClickable && 'cursor-pointer hover:ring-4 hover:ring-primary/30 hover:scale-105'
                            )}
                            title={t(step.titleKey, { defaultValue: step.key })}
                        >
                            {isCompleted ? (
                                <Check className="w-5 h-5" />
                            ) : (
                                <Icon className="w-5 h-5" />
                            )}
                        </button>

                        {/* Connector line */}
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    'h-0.5 w-8 mx-1 transition-all duration-300',
                                    currentStep > stepNumber + 1
                                        ? 'bg-primary'
                                        : currentStep > stepNumber
                                            ? 'bg-primary/50'
                                            : 'bg-muted'
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
