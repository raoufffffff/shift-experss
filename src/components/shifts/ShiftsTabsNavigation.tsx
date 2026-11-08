import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShiftTab } from '@/pages/shifts/hooks/useShiftsPage';

interface ShiftsTabsNavigationProps {
    activeTab: ShiftTab;
    setActiveTab: (tab: ShiftTab) => void;
    tabCounts: Record<string, number>;
}

export function ShiftsTabsNavigation({
    activeTab,
    setActiveTab,
    tabCounts,
}: ShiftsTabsNavigationProps) {
    const { t } = useTranslation();

    const tabs = [
        { key: 'all' as ShiftTab, label: t('shifts.tabs.all') },
        { key: 'sent' as ShiftTab, label: t('shifts.tabs.sent') },
        { key: 'applications' as ShiftTab, label: t('shifts.tabs.applications') },
        { key: 'filled' as ShiftTab, label: t('shifts.tabs.filled') },
        { key: 'pending_validation' as ShiftTab, label: t('shifts.tabs.pending_validation') },
        { key: 'completed' as ShiftTab, label: t('shifts.tabs.completed') },
    ];

    return (
        <div className="space-y-4">
            <div className="border-b border-border/60">
                <div className="flex items-center gap-1 overflow-x-auto pb-px">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab.key
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`}
                        >
                            {tab.label}
                            {tabCounts[tab.key] > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.key
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {tabCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-sm text-muted-foreground">
                {activeTab === 'all' && t('shifts.tabs.allDescription')}
                {activeTab === 'sent' && t('shifts.tabs.sentDescription')}
                {activeTab === 'applications' && t('shifts.tabs.applicationsDescription')}
                {activeTab === 'filled' && t('shifts.tabs.filledDescription')}
                {activeTab === 'pending_validation' && t('shifts.tabs.pendingValidationDescription')}
                {activeTab === 'completed' && t('shifts.tabs.completedDescription')}
            </p>
        </div>
    );
}
