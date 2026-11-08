import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/Table';
import { Building2, Clock, Trash2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { EmployeeRoleChips } from './EmployeeRoleChips';
import type { Employee, Invitation, SortedMember } from '../types';

interface EmployeesTableViewProps {
  sortedMembers: SortedMember[];
  filteredEmployeesCount: number;
  selectedEmployeeIds: Set<string>;
  onToggleEmployee: (id: string) => void;
  onToggleAll: () => void;
  onInviteClick: (employee: Employee) => void;
  onDeleteEmployee: (id: string, name: string) => void;
  onDeleteInvitation: (id: string, email: string) => void;
  sendInvitationPending: boolean;
  deleteEmployeePending: boolean;
  deleteInvitationPending: boolean;
}

export function EmployeesTableView({
  sortedMembers,
  filteredEmployeesCount,
  selectedEmployeeIds,
  onToggleEmployee,
  onToggleAll,
  onInviteClick,
  onDeleteEmployee,
  onDeleteInvitation,
  sendInvitationPending,
  deleteEmployeePending,
  deleteInvitationPending,
}: EmployeesTableViewProps) {
  const { t } = useTranslation();
  const { navigate } = useLocale();

  return (
    <div className="hidden lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <input
                type="checkbox"
                checked={selectedEmployeeIds.size === filteredEmployeesCount && filteredEmployeesCount > 0}
                onChange={onToggleAll}
                className="cursor-pointer"
              />
            </TableHead>
            <TableHead>{t('employees.name')}</TableHead>
            <TableHead>{t('employees.establishment')}</TableHead>
            <TableHead>{t('employees.jobPositions', { defaultValue: 'Métiers' })}</TableHead>
            <TableHead>{t('employees.hourlyRate')}</TableHead>
            <TableHead>{t('employees.invitationDate')}</TableHead>
            <TableHead>{t('employees.status')}</TableHead>
            <TableHead className="w-[150px]">{t('employees.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMembers.map((member) => {
            if (member.type === 'employee') {
              const employee = member.data as Employee;
              const isSelected = selectedEmployeeIds.has(employee.id);
              // ✅ جديد — صورة الموظف الحقيقية (avatar_url) بدل الاعتماد على النص فقط
              const avatarUrl = (employee.user as unknown as { avatar_url?: string | null } | undefined)?.avatar_url || null;
              const employeeInitial = (employee.user.first_name || employee.user.email || '?').charAt(0).toUpperCase();
              return (
                <TableRow
                  key={`emp-${member.id}`}
                  className={`hover:bg-muted/40 transition-colors ${isSelected ? 'bg-accent/30' : ''}`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleEmployee(employee.id)}
                      className="cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={`${employee.user.first_name} ${employee.user.last_name}`} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-xs font-bold text-blue-700">{employeeInitial}</span>
                        )}
                      </div>
                      <span>{employee.user.first_name} {employee.user.last_name}</span>
                      {employee.public_id && (
                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 uppercase tracking-tighter">
                          {employee.public_id}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {employee.establishment?.name || t('employees.notAssigned')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <EmployeeRoleChips
                      ids={employee.job_position_ids}
                      max={2}
                      emptyLabel={t('employees.noJobPositions', { defaultValue: 'Non classé' })}
                    />
                  </TableCell>
                  <TableCell>
                    {employee.verified_hourly_rate ? (
                      <span className="text-sm font-medium">{employee.verified_hourly_rate.toFixed(2)} $</span>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">{t('employees.hourlyRateNotSet')}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {employee.created_at && (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(employee.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip variant={
                      employee.status === 'active' ? 'success' :
                        employee.status === 'not_invited' ? 'warning' : 'secondary'
                    }>
                      {employee.status === 'active' ? t('employees.active') :
                        employee.status === 'not_invited' ? t('employees.notInvited') : t('employees.inactive')}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${employee.id}`)} className="hover:bg-muted">
                        {t('shifts.viewDetails')}
                      </Button>
                      {employee.status === 'not_invited' && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => onInviteClick(employee)}
                          disabled={sendInvitationPending}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Invite
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => onDeleteEmployee(employee.id, `${employee.user.first_name} ${employee.user.last_name}`)}
                        disabled={deleteEmployeePending}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            } else {
              const invitation = member.data as Invitation;
              return (
                <TableRow key={`inv-pending-${member.id}`}>
                  <TableCell />
                  <TableCell className="font-medium">
                    {invitation.first_name && invitation.last_name
                      ? `${invitation.first_name} ${invitation.last_name}` : invitation.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {invitation.establishment?.name || t('employees.notAssigned')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell>
                    {invitation.verified_hourly_rate ? (
                      <span className="text-sm font-medium">{invitation.verified_hourly_rate.toFixed(2)} $</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(invitation.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip variant="secondary">{t('employees.invited')}</Chip>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => onDeleteInvitation(invitation.id, invitation.email)}
                      disabled={deleteInvitationPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            }
          })}
        </TableBody>
      </Table>
    </div>
  );
}