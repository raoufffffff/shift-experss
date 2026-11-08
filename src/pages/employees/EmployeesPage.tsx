import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { useLocale } from '@/hooks/useLocale';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { InviteDialog } from '@/components/employees/InviteDialog';
import { GenerateInvitationDialog } from '@/components/invitations/GenerateInvitationDialog';
import { CsvImportDialog } from '@/components/employees/CsvImportDialog';
import { ShiftReadinessScore } from '@/components/onboarding/ShiftReadinessScore';
import { UpgradeBanner } from '@/components/subscription/UpgradeBanner';
import { EmployeesSkeleton } from '@/components/skeletons/EmployeesSkeleton';
import { EmployeeCardView } from './components/EmployeeCardView';
import { EmployeesTableView } from './components/EmployeesTableView';
import { useEmployeesData } from './hooks/useEmployeesData';
import { useEmployeesMutations } from './hooks/useEmployeesMutations';
import { UserPlus, Mail, Loader2, ArrowUpDown, Link2, ExternalLink, ChevronDown, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Employee, SortOption } from './types';

export function EmployeesPage() {
  const { t } = useTranslation();
  const { navigate } = useLocale();
  const { company } = useAuthStore();
  const { selectedEstablishmentId } = useEstablishmentStore();

  // UI state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [generateInvitationDialogOpen, setGenerateInvitationDialogOpen] = useState(false);
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [selectedEstablishmentForInvitation, setSelectedEstablishmentForInvitation] = useState<{ id: string; name: string } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [showReadinessScore] = useState(() => {
    const stored = localStorage.getItem('shift-express-show-readiness-score');
    return stored === null ? true : stored === 'true';
  });
  const [isReadinessCollapsed, setIsReadinessCollapsed] = useState(false);
  const [inviteConfirmDialogOpen, setInviteConfirmDialogOpen] = useState(false);
  const [employeeToInvite, setEmployeeToInvite] = useState<Employee | null>(null);

  // Data
  const {
    usage, establishments, filteredEmployees, activeEmployees,
    notInvitedEmployees, pendingInvitations, sortedMembers,
    totalActiveCount, totalCount, isLoading,
    shiftReadinessScore, activeEmployeesCount,
  } = useEmployeesData(sortBy);

  // Mutations
  const {
    deleteInvitationMutation, deleteEmployeeMutation, sendInvitationMutation,
    bulkDeleteMutation, bulkInviteMutation, bulkDeactivateMutation, checkRateLimit,
  } = useEmployeesMutations({
    filteredEmployees, activeEmployees, establishments,
    setSelectedEmployeeIds, setInviteConfirmDialogOpen, setEmployeeToInvite,
  });

  // Handlers
  const handleInviteClick = useCallback((employee: Employee) => {
    if (!checkRateLimit()) return;
    setEmployeeToInvite(employee);
    setInviteConfirmDialogOpen(true);
  }, [checkRateLimit]);

  const handleConfirmInvite = useCallback(() => {
    if (employeeToInvite) sendInvitationMutation.mutate(employeeToInvite.id);
  }, [employeeToInvite, sendInvitationMutation]);

  const handleDeleteInvitation = useCallback((invitationId: string, email: string) => {
    if (confirm(t('employees.confirmCancelInvitation', { email }))) {
      deleteInvitationMutation.mutate(invitationId);
    }
  }, [t, deleteInvitationMutation]);

  const handleDeleteEmployee = useCallback((employeeId: string, name: string) => {
    if (confirm(t('employees.confirmDelete', { name }))) {
      deleteEmployeeMutation.mutate(employeeId);
    }
  }, [t, deleteEmployeeMutation]);

  const handleToggleEmployee = useCallback((employeeId: string) => {
    setSelectedEmployeeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) newSet.delete(employeeId);
      else newSet.add(employeeId);
      return newSet;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    const allIds = filteredEmployees.map(e => e.id);
    setSelectedEmployeeIds(prev =>
      prev.size === allIds.length ? new Set() : new Set(allIds)
    );
  }, [filteredEmployees]);

  const handleBulkAction = useCallback(() => {
    if (selectedEmployeeIds.size === 0) { toast.error(t('employees.noEmployeesSelected')); return; }

    const employeeIds = Array.from(selectedEmployeeIds);

    if (bulkAction === 'delete') {
      if (confirm(t('employees.confirmBulkDelete', { count: employeeIds.length }))) {
        bulkDeleteMutation.mutate(employeeIds);
      }
    } else if (bulkAction === 'invite') {
      const notInvitedIds = employeeIds.filter(id => {
        const emp = filteredEmployees.find(e => e.id === id);
        return emp && emp.status === 'not_invited';
      });
      if (notInvitedIds.length === 0) { toast.error(t('employees.noNotInvitedEmployeesSelected')); return; }
      bulkInviteMutation.mutate(notInvitedIds);
    } else if (bulkAction === 'deactivate') {
      const activeIds = employeeIds.filter(id => {
        const emp = filteredEmployees.find(e => e.id === id);
        return emp && emp.status === 'active';
      });
      if (activeIds.length === 0) { toast.error(t('employees.noActiveEmployeesSelected')); return; }
      if (confirm(t('employees.confirmBulkDeactivate', { count: activeIds.length }))) {
        bulkDeactivateMutation.mutate(activeIds);
      }
    }

    setBulkAction('');
  }, [selectedEmployeeIds, bulkAction, bulkDeleteMutation, bulkInviteMutation, bulkDeactivateMutation, filteredEmployees, t]);

  if (isLoading) return <EmployeesSkeleton />;

  return (
    <div className="space-y-6 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">{t('employees.title')}</h1>
            {usage?.employees && (() => {
              const percentage = usage.employees.isUnlimited ? 0 : (usage.employees.current / usage.employees.max) * 100;
              const colorClass = usage.employees.isUnlimited
                ? 'border border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-600'
                : percentage >= 90
                  ? 'border border-red-500 text-red-600 bg-red-50/50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-600'
                  : percentage >= 70
                    ? 'border border-orange-500 text-orange-600 bg-orange-50/50 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-600'
                    : 'border border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-600';
              return (
                <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight ${colorClass}`}>
                  {usage.employees.isUnlimited
                    ? `${usage.employees.current}/∞ ${t('common.used')}`
                    : `${usage.employees.current}/${usage.employees.max} ${t('common.used')}`}
                </span>
              );
            })()}
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">{t('employees.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setInviteDialogOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-2" />{t('employees.invite')}
          </Button>
          <Button variant="outline" onClick={() => setCsvImportDialogOpen(true)} className="w-full sm:w-auto">
            <FileUp className="w-4 h-4 mr-2" />{t('employees.importCsv')}
          </Button>
          <Button variant="outline" onClick={() => {
            if (!establishments || establishments.length === 0) { toast.error(t('employees.noEstablishmentsAvailable')); return; }
            if (!selectedEstablishmentId) { toast.error(t('employees.selectEstablishmentFirst')); return; }
            const est = establishments.find(e => e.id === selectedEstablishmentId);
            if (est) { setSelectedEstablishmentForInvitation({ id: est.id, name: est.name }); setGenerateInvitationDialogOpen(true); }
            else toast.error(t('employees.establishmentNotFound'));
          }} className="w-full sm:w-auto">
            <Link2 className="w-4 h-4 mr-2" />{t('employees.createLink')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/establishments/invitations')} className="w-full sm:w-auto">
            <ExternalLink className="w-4 h-4 mr-2" />{t('employees.viewLinks')}
          </Button>
        </div>
      </div>

      {/* Upgrade banner */}
      {usage?.employees && !usage.employees.canCreate && !usage.employees.isUnlimited && (
        <UpgradeBanner limitType="employees" current={usage.employees.current} max={usage.employees.max} />
      )}

      {/* Shift Readiness Score */}
      {showReadinessScore && (
        <div>
          {isReadinessCollapsed ? (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-foreground">{t('onboarding.readiness.title')}</div>
                <div className="text-2xl font-bold text-primary">{shiftReadinessScore}%</div>
              </div>
              <button onClick={() => setIsReadinessCollapsed(prev => !prev)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <ShiftReadinessScore
              activeEmployees={activeEmployeesCount}
              score={shiftReadinessScore}
              onInviteClick={() => setInviteDialogOpen(true)}
              onCollapseClick={() => setIsReadinessCollapsed(prev => !prev)}
            />
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totalActiveCount}</div><p className="text-xs text-gray-600">{t('employees.activeEmployees')}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{pendingInvitations.length}</div><p className="text-xs text-gray-600">{t('employees.pendingInvitations')}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-amber-600">{notInvitedEmployees.length}</div><p className="text-xs text-gray-600">{t('employees.toInvite')}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{totalCount}</div><p className="text-xs text-muted-foreground">{t('employees.totalTeam')}</p></CardContent></Card>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('employees.teamMembers')}</CardTitle></CardHeader>
        <CardContent>
          {totalCount === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">{t('employees.noEmployeesMessage')}</p>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />{t('employees.invite')}
              </Button>
            </div>
          ) : (
            <>
              {/* Sort + bulk actions toolbar */}
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    options={[
                      { value: 'status', label: t('employees.sortByStatus') },
                      { value: 'name-asc', label: t('employees.nameAsc') },
                      { value: 'name-desc', label: t('employees.nameDesc') },
                      { value: 'date-desc', label: t('employees.dateDesc') },
                      { value: 'date-asc', label: t('employees.dateAsc') },
                    ]}
                    className="text-sm"
                  />
                </div>
                {selectedEmployeeIds.size > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="px-3 py-1 bg-primary/10 text-primary rounded-md text-sm font-medium whitespace-nowrap">
                      {t('employees.selected', { count: selectedEmployeeIds.size })}
                    </div>
                    <Select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                      options={[
                        { value: '', label: t('employees.bulkActions') },
                        { value: 'invite', label: t('employees.inviteSelected') },
                        { value: 'deactivate', label: t('employees.deactivateSelected') },
                        { value: 'delete', label: t('employees.deleteSelected') },
                      ]}
                      className="text-sm"
                    />
                    {bulkAction && (
                      <Button size="sm" onClick={handleBulkAction}
                        disabled={bulkInviteMutation.isPending || bulkDeleteMutation.isPending || bulkDeactivateMutation.isPending}>
                        {t('common.apply')}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <EmployeeCardView
                sortedMembers={sortedMembers}
                onInviteClick={handleInviteClick}
                onDeleteEmployee={handleDeleteEmployee}
                onDeleteInvitation={handleDeleteInvitation}
                sendInvitationPending={sendInvitationMutation.isPending}
                deleteEmployeePending={deleteEmployeeMutation.isPending}
                deleteInvitationPending={deleteInvitationMutation.isPending}
              />

              <EmployeesTableView
                sortedMembers={sortedMembers}
                filteredEmployeesCount={filteredEmployees.length}
                selectedEmployeeIds={selectedEmployeeIds}
                onToggleEmployee={handleToggleEmployee}
                onToggleAll={handleToggleAll}
                onInviteClick={handleInviteClick}
                onDeleteEmployee={handleDeleteEmployee}
                onDeleteInvitation={handleDeleteInvitation}
                sendInvitationPending={sendInvitationMutation.isPending}
                deleteEmployeePending={deleteEmployeeMutation.isPending}
                deleteInvitationPending={deleteInvitationMutation.isPending}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}
        onSwitchToGeneralLink={(id, name) => { setSelectedEstablishmentForInvitation({ id, name }); setGenerateInvitationDialogOpen(true); }} />

      {selectedEstablishmentForInvitation && (
        <GenerateInvitationDialog
        companyId={company?.id || ""}
          open={generateInvitationDialogOpen} onOpenChange={setGenerateInvitationDialogOpen}
          establishmentId={selectedEstablishmentForInvitation.id} establishmentName={selectedEstablishmentForInvitation.name} />
      )}

      <CsvImportDialog open={csvImportDialogOpen} onOpenChange={setCsvImportDialogOpen} establishments={establishments} />

      <Dialog open={inviteConfirmDialogOpen} onOpenChange={setInviteConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('employees.confirmInviteTitle')}</DialogTitle>
            <DialogDescription>
              {employeeToInvite && t('employees.confirmInviteMessage', {
                name: `${employeeToInvite.user.first_name} ${employeeToInvite.user.last_name}`,
                email: employeeToInvite.user.email,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setInviteConfirmDialogOpen(false); setEmployeeToInvite(null); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmInvite} disabled={sendInvitationMutation.isPending}>
              {sendInvitationMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('employees.sending')}</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" />{t('employees.sendInvite')}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
