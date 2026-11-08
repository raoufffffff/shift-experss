import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Building2, LayoutGrid, User, ChevronDown, Check } from 'lucide-react';
import type { ShiftTypeFilter, FilterableEmployee } from '@/pages/shifts/hooks/useShiftsPage';

interface ShiftTypeFilterBarProps {
    shiftTypeFilter: ShiftTypeFilter;
    setShiftTypeFilter: (f: ShiftTypeFilter) => void;
    selectedEmployeeId: string | null;
    setSelectedEmployeeId: (id: string | null) => void;
    filterableEmployees: FilterableEmployee[];
}

function getInitial(name: string): string {
    return (name.trim()[0] || '?').toUpperCase();
}

// ✅ couleur d'avatar stable, dérivée du nom (utilisée seulement en fallback,
// quand l'employé n'a pas de photo — voir avatarUrl)
const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
];

function avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ✅ Avatar réutilisable — photo (avatarUrl) si dispo, sinon initiale colorée.
// Un <option> HTML natif ne peut pas afficher d'image, d'où le dropdown
// personnalisé (bouton + panneau) ci-dessous à la place d'un <select>.
function EmployeeAvatar({ name, avatarUrl, size = 'sm' }: { name: string; avatarUrl?: string | null; size?: 'sm' | 'xs' }) {
    const dims = size === 'xs' ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]';
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name}
                className={`${dims} rounded-full object-cover flex-shrink-0`}
            />
        );
    }
    return (
        <span className={`flex items-center justify-center ${dims} rounded-full font-bold flex-shrink-0 ${avatarColor(name)}`}>
            {getInitial(name)}
        </span>
    );
}

export function ShiftTypeFilterBar({
    shiftTypeFilter,
    setShiftTypeFilter,
    selectedEmployeeId,
    setSelectedEmployeeId,
    filterableEmployees,
}: ShiftTypeFilterBarProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fermer le dropdown au clic extérieur
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options: { key: ShiftTypeFilter; label: string; icon: React.ReactNode }[] = [
        { key: 'all', label: t('shifts.typeFilter.all', { defaultValue: 'Tous' }), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
        { key: 'freelance', label: t('shifts.typeFilter.freelance', { defaultValue: 'Freelance' }), icon: <Zap className="w-3.5 h-3.5" /> },
        { key: 'employee', label: t('shifts.typeFilter.employee', { defaultValue: 'Employé' }), icon: <Building2 className="w-3.5 h-3.5" /> },
    ];

    const activeEmployee = filterableEmployees.find((e) => e.userId === selectedEmployeeId);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/60">
                {options.map((opt) => {
                    const isActive = shiftTypeFilter === opt.key;
                    const activeClass =
                        opt.key === 'freelance'
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                            : opt.key === 'employee'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                                : 'bg-background text-foreground shadow-sm';
                    return (
                        <button
                            key={opt.key}
                            onClick={() => setShiftTypeFilter(opt.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                isActive ? activeClass : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {opt.icon}
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            {/* ✅ فلتر فرعي: dropdown مخصص (بدل <select>) باش تبان صورة كل موظف — يظهر فقط عند اختيار "موظف" */}
            {shiftTypeFilter === 'employee' && filterableEmployees.length > 0 && (
                <div className="relative" ref={containerRef}>
                    <button
                        type="button"
                        onClick={() => setIsOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-xs border border-border rounded-lg pl-2 pr-2.5 py-1.5 bg-background hover:bg-muted/40 transition-colors max-w-[200px]"
                    >
                        {activeEmployee ? (
                            <EmployeeAvatar name={activeEmployee.name} avatarUrl={activeEmployee.avatarUrl} />
                        ) : (
                            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="truncate">
                            {activeEmployee ? activeEmployee.name : t('shifts.typeFilter.allEmployees', { defaultValue: 'Tous les employés' })}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                        <div className="absolute z-20 mt-1 w-56 max-h-72 overflow-y-auto rounded-lg border border-border bg-background shadow-lg py-1">
                            <button
                                type="button"
                                onClick={() => { setSelectedEmployeeId(null); setIsOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left"
                            >
                                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="flex-1 truncate">{t('shifts.typeFilter.allEmployees', { defaultValue: 'Tous les employés' })}</span>
                                {!selectedEmployeeId && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                            </button>

                            <div className="border-t border-border/60 my-1" />

                            {filterableEmployees.map((emp) => {
                                const isSelected = emp.userId === selectedEmployeeId;
                                return (
                                    <button
                                        key={emp.userId}
                                        type="button"
                                        onClick={() => { setSelectedEmployeeId(emp.userId); setIsOpen(false); }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left ${isSelected ? 'bg-muted/40' : ''}`}
                                    >
                                        <EmployeeAvatar name={emp.name} avatarUrl={emp.avatarUrl} />
                                        <span className="flex-1 truncate">{emp.name}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}