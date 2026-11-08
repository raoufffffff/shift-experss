import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, Briefcase, Clock, ArrowRight, ArrowLeft, Loader2, AlertTriangle, Zap, UserCheck, CheckCircle, CheckCircle2, XCircle, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StepProps, Employee } from './types';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

// Hash-based color for the initial-letter fallback avatar — même convention
// que le filtre employé (ShiftTypeFilterBar) : couleur stable par personne.
const AVATAR_COLORS = [
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
];

function avatarColorFor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// 📊 إحصائيات موظف واحد مع الشركة (كل الفروع/establishments) — عدد المهام
// المقبولة سابقا وعدد الانسحابات، جايين من useCreateShift.ts (employeeStatsMap)
interface EmployeeStat {
    completed: number;
    withdrawn: number;
}

// 🎯 employees.job_position_ids : les rôles que le client a attribués à l'employé
// (colonne remontée par le select('*') de useCreateShift). Type local pour ne pas
// dépendre de types.ts.
type EmployeeWithRoles = Employee & { job_position_ids?: string[] | null };

interface RecipientsStepProps extends StepProps {
    employees: Employee[];
    loadingEmployees: boolean;
    employeesError: Error | null;
    onNavigateToEmployees: () => void;
    // Readiness score props
    shiftReadinessScore?: number;
    activeEmployeesCount?: number;
    minimumEmployees?: number;
    // 📊 إحصائيات كل موظف (user_id -> {completed, withdrawn}) مع نفس الشركة
    employeeStatsMap?: Record<string, EmployeeStat>;
}

export function RecipientsStep({
    formData,
    updateFormData,
    onNext,
    onPrevious,
    employees,
    loadingEmployees,
    employeesError,
    onNavigateToEmployees,
    shiftReadinessScore = 100,
    activeEmployeesCount = 0,
    minimumEmployees = 5,
    employeeStatsMap = {},
}: RecipientsStepProps) {
    const { t } = useTranslation();

    // Toggle employee selection
    const toggleEmployee = useCallback((employeeId: string) => {
        const current = formData.selectedEmployees;
        const updated = current.includes(employeeId)
            ? current.filter((id) => id !== employeeId)
            : [...current, employeeId];
        updateFormData({ selectedEmployees: updated });
    }, [formData.selectedEmployees, updateFormData]);

    // Select all / deselect all
    const toggleAll = useCallback(() => {
        if (formData.selectedEmployees.length === employees.length) {
            updateFormData({ selectedEmployees: [] });
        } else {
            updateFormData({ selectedEmployees: employees.map((e) => e.id) });
        }
    }, [formData.selectedEmployees.length, employees, updateFormData]);

    // 🎯 Employés dont le rôle correspond au poste du shift (formData.jobPositionId) :
    // placés en tête de liste et mis en avant visuellement. Le tri est stable, donc
    // l'ordre d'origine est conservé à l'intérieur de chaque groupe.
    const { sortedEmployees, matchingIds } = useMemo(() => {
        const list = employees as EmployeeWithRoles[];
        const jobId = formData.jobPositionId;
        const matches = (e: EmployeeWithRoles) =>
            !!jobId && (e.job_position_ids ?? []).includes(jobId);
        const matching = list.filter(matches);
        const others = list.filter((e) => !matches(e));
        return {
            sortedEmployees: [...matching, ...others] as EmployeeWithRoles[],
            matchingIds: matching.map((e) => e.id),
        };
    }, [employees, formData.jobPositionId]);
    const matchingCount = matchingIds.length;

    // Sélectionne tous les employés du poste (sans toucher aux autres déjà cochés)
    const selectMatching = useCallback(() => {
        const merged = Array.from(new Set([...formData.selectedEmployees, ...matchingIds]));
        updateFormData({ selectedEmployees: merged });
    }, [formData.selectedEmployees, matchingIds, updateFormData]);

    const allMatchingSelected =
        matchingCount > 0 && matchingIds.every((id) => formData.selectedEmployees.includes(id));

    // Handle freelancer option change
    const handlePublishFreelancersChange = (checked: boolean) => {
        updateFormData({
            publishToFreelancers: checked,
            autoPublishToFreelancers: checked ? false : formData.autoPublishToFreelancers,
        });
    };

    const handleAutoPublishChange = (checked: boolean) => {
        // Only allow if employees are selected
        if (formData.selectedEmployees.length === 0) return;
        updateFormData({
            autoPublishToFreelancers: checked,
            publishToFreelancers: checked ? false : formData.publishToFreelancers,
        });
    };

    // Check if recipients are selected
    const hasRecipients = formData.selectedEmployees.length > 0 ||
        formData.publishToFreelancers ||
        formData.autoPublishToFreelancers;

    const willPublishToFreelancers = formData.publishToFreelancers || formData.autoPublishToFreelancers;

    // Check if auto-publish should be disabled (no employees selected)
    const isAutoPublishDisabled = formData.selectedEmployees.length === 0;

    // Low readiness score warning
    const showLowReadiness = shiftReadinessScore < 50 && activeEmployeesCount < minimumEmployees;

    // Validate step
    const handleNext = () => {
        if (!hasRecipients) {
            toast.error(t('shifts.selectRecipientError', { defaultValue: 'Sélectionnez au moins un destinataire ou activez la publication freelance' }));
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
                    <Users className="w-5 h-5 text-primary" />
                    {t('shifts.wizard.step4Title', { defaultValue: 'Qui prévenir ?' })}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('shifts.wizard.step4Desc', { defaultValue: 'Sélectionnez les employés et options de publication' })}
                </p>
            </div>

            {/* Employees Section */}
            <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4" />
                    {t('shifts.notifyEmployees')}
                </h3>

                {/* Low Readiness Banner - inside employees section */}
                {showLowReadiness && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    {t('shifts.lowReadinessAlert.title', { score: shiftReadinessScore, defaultValue: `Score de préparation faible : ${shiftReadinessScore}%` })}
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                    {t('shifts.lowReadinessAlert.message', {
                                        activeEmployees: activeEmployeesCount,
                                        targetEmployees: minimumEmployees,
                                        defaultValue: `Vous avez ${activeEmployeesCount} employés actifs. Invitez-en ${minimumEmployees} pour une couverture optimale.`
                                    })}
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={onNavigateToEmployees}
                                    className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50"
                                >
                                    <Users className="w-3.5 h-3.5 mr-1.5" />
                                    {t('shifts.lowReadinessAlert.inviteEmployees', { defaultValue: 'Inviter des employés' })}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {loadingEmployees ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : employeesError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {t('common.error')}: {employeesError.message}
                    </p>
                ) : employees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('shifts.noEmployeesActive')}</p>
                ) : (
                    <div className="space-y-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={toggleAll}
                            className="w-full"
                        >
                            {formData.selectedEmployees.length === employees.length
                                ? t('shifts.deselectAll')
                                : t('shifts.selectAll')}
                        </Button>

                        {/* 🎯 Bandeau poste : combien d'employés ont ce rôle + sélection rapide */}
                        {formData.jobPositionId && (
                            matchingCount > 0 ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                                    <p className="text-xs text-foreground flex items-center gap-1.5">
                                        <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                                        <span>
                                            {t('shifts.recipients.matchingRoleInfo', {
                                                count: matchingCount,
                                                position: formData.positionName,
                                                defaultValue: `${matchingCount} employé${matchingCount > 1 ? 's' : ''} avec le rôle « ${formData.positionName} »`,
                                            })}
                                        </span>
                                    </p>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={selectMatching}
                                        disabled={allMatchingSelected}
                                        className="border-primary/40 text-primary hover:bg-primary/10"
                                    >
                                        {t('shifts.recipients.selectMatching', { defaultValue: 'Sélectionner ces employés' })}
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {t('shifts.recipients.noMatchingRole', {
                                        position: formData.positionName,
                                        defaultValue: `Aucun employé n'a le rôle « ${formData.positionName} ». Vous pouvez attribuer des rôles depuis la page Employés.`,
                                    })}{' '}
                                    <button
                                        type="button"
                                        onClick={onNavigateToEmployees}
                                        className="underline hover:text-foreground"
                                    >
                                        {t('shifts.recipients.goToEmployees', { defaultValue: 'Ouvrir la page Employés' })}
                                    </button>
                                </p>
                            )
                        )}

                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {sortedEmployees.map((employee, index) => {
                                // 🎯 rôle de l'employé = poste du shift ?
                                const matchesRole =
                                    !!formData.jobPositionId &&
                                    (employee.job_position_ids ?? []).includes(formData.jobPositionId);
                                // Premier employé hors-poste → on insère un séparateur
                                const isFirstOther = !matchesRole && matchingCount > 0 && index === matchingCount;
                                const user = employee.user;
                                const displayName =
                                    user?.first_name && user?.last_name
                                        ? `${user.first_name} ${user.last_name}`
                                        : user?.email || 'Sans nom';
                                const initial = displayName.charAt(0).toUpperCase();

                                // 📊 إحصائيات هاد الموظف مع الشركة — completed = عدد
                                // shift_applications بحالة accepted، withdrawn = عدد
                                // الانسحابات بعد القبول. القيمة الافتراضية 0/0 إذا ما
                                // كانت عندوش أي سجل بعد.
                                const stats = (employee.user_id && employeeStatsMap[employee.user_id]) || { completed: 0, withdrawn: 0 };
                                const hasWithdrawals = stats.withdrawn > 0;

                                return (
                                    <div key={employee.id}>
                                    {isFirstOther && (
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground pt-2 pb-1 px-1">
                                            {t('shifts.recipients.otherEmployees', { defaultValue: 'Autres employés' })}
                                        </p>
                                    )}
                                    <label
                                        className={cn(
                                            'flex items-center space-x-3 rounded-lg cursor-pointer transition-colors',
                                            matchesRole
                                                ? 'p-2.5 border border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-sm hover:bg-primary/10'
                                                : 'p-2 border border-transparent hover:bg-accent'
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.selectedEmployees.includes(employee.id)}
                                            onChange={() => toggleEmployee(employee.id)}
                                            className="w-4 h-4 text-primary border-border"
                                        />

                                        {/* Avatar — photo si dispo, sinon initiale colorée */}
                                        {user?.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={displayName}
                                                className={cn(
                                                    'w-9 h-9 rounded-full object-cover flex-shrink-0',
                                                    matchesRole && 'ring-2 ring-primary/60'
                                                )}
                                            />
                                        ) : (
                                            <span className={cn(
                                                'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                                                avatarColorFor(employee.id),
                                                matchesRole && 'ring-2 ring-primary/60'
                                            )}>
                                                {initial}
                                            </span>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={cn(
                                                    'text-sm text-foreground block truncate',
                                                    matchesRole && 'font-semibold'
                                                )}>
                                                    {displayName}
                                                </span>
                                                {/* 🎯 Badge : cet employé a le rôle demandé par le shift */}
                                                {matchesRole && (
                                                    <span className="inline-flex items-center gap-1 flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                                                        <BadgeCheck className="w-3 h-3" />
                                                        {formData.positionName || t('shifts.recipients.roleMatch', { defaultValue: 'Poste' })}
                                                    </span>
                                                )}
                                            </div>
                                            {/* 📊 Badges d'historique — visibles seulement si l'employé a un historique avec cette company */}
                                            {(stats.completed > 0 || stats.withdrawn > 0) && (
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {stats.completed > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {t('shifts.recipients.completedCount', {
                                                                count: stats.completed,
                                                                defaultValue: `${stats.completed} mission${stats.completed > 1 ? 's' : ''}`,
                                                            })}
                                                        </span>
                                                    )}
                                                    {hasWithdrawals && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
                                                            <XCircle className="w-3 h-3" />
                                                            {t('shifts.recipients.withdrawnCount', {
                                                                count: stats.withdrawn,
                                                                defaultValue: `${stats.withdrawn} désistement${stats.withdrawn > 1 ? 's' : ''}`,
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {t('shifts.selectedCount', { count: formData.selectedEmployees.length })}
                        </p>
                    </div>
                )}
            </div>

            {/* Freelancers Section */}
            <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4" />
                    {t('shifts.freelancers.title')}
                </h3>

                <p className="text-xs text-muted-foreground mb-4">
                    {t('shifts.freelancers.marketplaceDesc')}
                </p>

                <div className="space-y-3">
                    {/* Publish immediately */}
                    <label className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
                        <input
                            type="checkbox"
                            checked={formData.publishToFreelancers}
                            onChange={(e) => handlePublishFreelancersChange(e.target.checked)}
                            className="w-4 h-4 mt-0.5 text-primary border-border"
                        />
                        <div>
                            <p className="text-sm font-medium">{t('shifts.freelancers.publishImmediately')}</p>
                            <p className="text-xs text-muted-foreground">
                                {t('shifts.freelancers.publishImmediatelyDesc')}
                            </p>
                        </div>
                    </label>

                    {/* Auto-publish if not filled - disabled when no employees selected */}
                    <label
                        className={cn(
                            "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                            isAutoPublishDisabled
                                ? "opacity-50 cursor-not-allowed bg-muted/30"
                                : "cursor-pointer hover:bg-accent"
                        )}
                    >
                        <input
                            type="checkbox"
                            checked={formData.autoPublishToFreelancers}
                            onChange={(e) => handleAutoPublishChange(e.target.checked)}
                            disabled={isAutoPublishDisabled}
                            className="w-4 h-4 mt-0.5 text-primary border-border disabled:opacity-50"
                        />
                        <div className="flex-1">
                            <p className="text-sm font-medium">{t('shifts.freelancers.autoPublish')}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                                {isAutoPublishDisabled
                                    ? t('shifts.freelancers.autoPublishRequiresEmployees', { defaultValue: 'Sélectionnez d\'abord des employés pour activer cette option' })
                                    : t('shifts.freelancers.autoPublishDesc')
                                }
                            </p>
                            {formData.autoPublishToFreelancers && (
                                <div className="flex items-center gap-2 mt-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <select
                                        value={formData.autoPublishDelayMinutes}
                                        onChange={(e) => updateFormData({ autoPublishDelayMinutes: Number(e.target.value) })}
                                        className="text-sm border rounded px-2 py-1 bg-background"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value={15}>15 {t('time.minutes')}</option>
                                        <option value={30}>30 {t('time.minutes')}</option>
                                        <option value={60}>1 {t('time.hour')}</option>
                                        <option value={120}>2 {t('time.hours')}</option>
                                        <option value={180}>3 {t('time.hours')}</option>
                                        <option value={360}>6 {t('time.hours')}</option>
                                        <option value={720}>12 {t('time.hours')}</option>
                                        <option value={1440}>24 {t('time.hours')}</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </label>

                    {/* Auto-accept favorites */}
                    {willPublishToFreelancers && (
                        <label className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                            <input
                                type="checkbox"
                                checked={formData.autoAcceptFavorites}
                                onChange={(e) => updateFormData({ autoAcceptFavorites: e.target.checked })}
                                className="w-4 h-4 mt-0.5 text-primary border-border"
                            />
                            <div>
                                <p className="text-sm font-medium flex items-center gap-2">
                                    <span className="text-yellow-500">★</span>
                                    {t('shifts.freelancers.autoAcceptFavorites')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t('shifts.freelancers.autoAcceptFavoritesDesc')}
                                </p>
                            </div>
                        </label>
                    )}
                </div>
            </div>

            {/* Application Mode Section */}
            <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4" />
                    {t('shifts.applicationMode.title', { defaultValue: 'Acceptation des candidatures' })}
                </h3>

                <p className="text-xs text-muted-foreground mb-4">
                    {t('shifts.applicationMode.description', { defaultValue: 'Choisissez comment les candidatures seront traitées pour ce shift.' })}
                </p>

                <div className="grid grid-cols-2 gap-3">
                    {/* Automatique */}
                    <button
                        type="button"
                        onClick={() => updateFormData({ autoAcceptApplications: true })}
                        className={cn(
                            'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                            formData.autoAcceptApplications
                                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                                : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                        )}
                    >
                        <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            formData.autoAcceptApplications
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                                : 'bg-muted text-muted-foreground'
                        )}>
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className={cn(
                            'text-sm font-medium',
                            formData.autoAcceptApplications ? 'text-amber-600' : 'text-foreground'
                        )}>
                            {t('shifts.applicationMode.auto', { defaultValue: 'Automatique' })}
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight">
                            {t('shifts.applicationMode.autoDesc', { defaultValue: 'Les candidatures sont acceptées immédiatement' })}
                        </span>
                        {formData.autoAcceptApplications && (
                            <div className="absolute top-2 right-2">
                                <CheckCircle className="w-4 h-4 text-amber-600" />
                            </div>
                        )}
                    </button>

                    {/* Manuelle */}
                    <button
                        type="button"
                        onClick={() => updateFormData({ autoAcceptApplications: false })}
                        className={cn(
                            'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                            !formData.autoAcceptApplications
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                                : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                        )}
                    >
                        <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            !formData.autoAcceptApplications
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                : 'bg-muted text-muted-foreground'
                        )}>
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <span className={cn(
                            'text-sm font-medium',
                            !formData.autoAcceptApplications ? 'text-blue-600' : 'text-foreground'
                        )}>
                            {t('shifts.applicationMode.manual', { defaultValue: 'Manuelle' })}
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight">
                            {t('shifts.applicationMode.manualDesc', { defaultValue: 'Vous validez chaque candidature vous-même' })}
                        </span>
                        {!formData.autoAcceptApplications && (
                            <div className="absolute top-2 right-2">
                                <CheckCircle className="w-4 h-4 text-blue-600" />
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Validation message */}
            {!hasRecipients && employees.length > 0 && (
                <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                    {t('shifts.selectRecipientError')}
                </div>
            )}

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