import React from 'react';
import { useTranslation } from 'react-i18next';
import { LocalizedLink as Link } from '@/components/LocalizedLink';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

interface UsageData {
    shifts?: {
        current: number;
        max: number;
        isUnlimited: boolean;
    };
}

interface ShiftsPageHeaderProps {
    isAdminOrManager: boolean;
    usage: UsageData | null;
}

export function ShiftsPageHeader({
    isAdminOrManager,
    usage,
}: ShiftsPageHeaderProps) {
    const { t } = useTranslation();

    const getUsageColorClass = (percentage: number, isUnlimited: boolean) => {
        if (isUnlimited) return 'border border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-600';
        if (percentage >= 90) return 'border border-red-500 text-red-600 bg-red-50/50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-600';
        if (percentage >= 70) return 'border border-orange-500 text-orange-600 bg-orange-50/50 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-600';
        return 'border border-primary/50 text-primary bg-primary/10 dark:bg-primary/20 dark:text-primary dark:border-primary/50';
    };

    return (
        <div className="pb-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold">
                            {isAdminOrManager ? t('shifts.myShifts') : t('shifts.availableShifts')}
                        </h1>
                        {usage?.shifts && (
                            <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight ${getUsageColorClass(
                                usage.shifts.isUnlimited ? 0 : (usage.shifts.current / usage.shifts.max) * 100,
                                usage.shifts.isUnlimited
                            )}`}>
                                {usage.shifts.isUnlimited
                                    ? `${usage.shifts.current}/∞ ${t('common.used')} ${t('common.thisMonth')}`
                                    : `${usage.shifts.current}/${usage.shifts.max} ${t('common.used')} ${t('common.thisMonth')}`
                                }
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5">
                        {t('shifts.subtitle')}
                    </p>
                </div>

                {isAdminOrManager && (
                    <Link to="/shifts/new" className="w-full sm:w-auto">
                        <Button className="shadow-sm w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" />
                            {t('shifts.newShift')}
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}
