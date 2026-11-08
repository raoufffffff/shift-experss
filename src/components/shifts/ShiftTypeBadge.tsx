import React from 'react';
import { Zap, Building2 } from 'lucide-react';

interface ShiftTypeBadgeProps {
    publishedToFreelancers?: boolean;
    targetsEmployees?: boolean;
    /** 'full' = pill avec texte (List view) · 'icon' = icône seule (Calendar, espaces réduits) */
    variant?: 'full' | 'icon';
    className?: string;
}

/**
 * Badge de type de shift — distingue visuellement Freelance (ambre) vs Employé (bleu).
 * Un shift peut être les deux à la fois (published_to_freelancers ET targets_employees) :
 * dans ce cas les deux badges s'affichent côte à côte.
 */
export function ShiftTypeBadge({
    publishedToFreelancers,
    targetsEmployees,
    variant = 'full',
    className = '',
}: ShiftTypeBadgeProps) {
    if (!publishedToFreelancers && !targetsEmployees) return null;

    if (variant === 'icon') {
        return (
            <div className={`flex items-center gap-1 ${className}`}>
                {publishedToFreelancers && (
                    <span
                        title="Freelance"
                        className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700"
                    >
                        <Zap className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" strokeWidth={2.5} />
                    </span>
                )}
                {targetsEmployees && (
                    <span
                        title="Employé"
                        className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700"
                    >
                        <Building2 className="w-2.5 h-2.5 text-blue-700 dark:text-blue-400" strokeWidth={2.5} />
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
            {publishedToFreelancers && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <Zap className="w-3 h-3 text-amber-700 dark:text-amber-400" strokeWidth={2.5} />
                    <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">Freelance</span>
                </div>
            )}
            {targetsEmployees && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <Building2 className="w-3 h-3 text-blue-700 dark:text-blue-400" strokeWidth={2.5} />
                    <span className="text-[10px] font-semibold text-blue-800 dark:text-blue-300">Employé</span>
                </div>
            )}
        </div>
    );
}