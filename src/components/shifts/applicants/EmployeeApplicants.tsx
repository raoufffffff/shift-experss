import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { CheckCircle, Users, Mail } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ShiftApplication } from './types';
import { applicationStatusVariants, getApplicationStatusLabel } from './types';

interface EmployeeApplicantsProps {
    applications: ShiftApplication[];
    isAdminOrManager: boolean;
    assignEmployeeMutation: UseMutationResult<void, Error, string>;
}

export function EmployeeApplicants({ applications, isAdminOrManager, assignEmployeeMutation }: EmployeeApplicantsProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">
                        {t('employees.title')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {applications.length}
                    </span>
                </div>
            </div>

            {applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-white/5">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="text-slate-500 dark:text-slate-500 text-sm italic">{t('shifts.noInvitedEmployees')}</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {applications.map((app) => (
                        <div key={app.id} className={cn(
                            "p-4 rounded-xl border transition-all duration-200 shadow-sm",
                            app.status === 'accepted'
                                ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md"
                        )}>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                                        {(app.user?.first_name || 'U').charAt(0)}{(app.user?.last_name || ' ').charAt(0)}
                                    </div>
                                    {app.status === 'accepted' && (
                                        <div className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-slate-900 rounded-full">
                                            <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                                            {app.user?.first_name && app.user?.last_name
                                                ? `${app.user.first_name} ${app.user.last_name}`
                                                : app.user?.email}
                                        </h4>
                                        <Chip variant={applicationStatusVariants[app.status]} className="text-[10px] h-5 px-2">
                                            {getApplicationStatusLabel(app.status, t)}
                                        </Chip>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {app.user?.email}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {app.status === 'applied' && isAdminOrManager && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <Button
                                        size="sm"
                                        onClick={() => assignEmployeeMutation.mutate(app.id)}
                                        disabled={assignEmployeeMutation.isPending}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        {t('shifts.assign')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
