import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Briefcase, Building2, Clock, Mail, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { EmployeeRoleChips } from './EmployeeRoleChips';
import type { Employee, Invitation, SortedMember } from '../types';

interface EmployeeCardViewProps {
  sortedMembers: SortedMember[];
  onInviteClick: (employee: Employee) => void;
  onDeleteEmployee: (id: string, name: string) => void;
  onDeleteInvitation: (id: string, email: string) => void;
  sendInvitationPending: boolean;
  deleteEmployeePending: boolean;
  deleteInvitationPending: boolean;
}

export function EmployeeCardView({
  sortedMembers,
  onInviteClick,
  onDeleteEmployee,
  onDeleteInvitation,
  sendInvitationPending,
  deleteEmployeePending,
  deleteInvitationPending,
}: EmployeeCardViewProps) {
  const { t } = useTranslation();
  const { navigate } = useLocale();

  return (
    <div className="lg:hidden space-y-3">
      {sortedMembers.map((member) => {
        if (member.type === 'employee') {
          const employee = member.data as Employee;
          // ✅ جديد — صورة الموظف الحقيقية (avatar_url) بدل الاعتماد على النص فقط
          const avatarUrl = (employee.user as unknown as { avatar_url?: string | null } | undefined)?.avatar_url || null;
          const employeeInitial = (employee.user.first_name || employee.user.email || '?').charAt(0).toUpperCase();
          return (
            <div key={`emp-${member.id}`} className="p-4 bg-card border border-border/60 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={`${employee.user.first_name} ${employee.user.last_name || ''}`} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-sm font-bold text-blue-700">{employeeInitial}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      {employee.user.first_name} {employee.user.last_name || ''}
                      {employee.public_id && (
                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 uppercase tracking-tighter">
                          {employee.public_id}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{employee.user.email}</span>
                  </div>
                </div>
                <Chip variant={
                  employee.status === 'active' ? 'success' :
                    employee.status === 'not_invited' ? 'warning' : 'secondary'
                }>
                  {employee.status === 'active' ? t('employees.active') :
                    employee.status === 'not_invited' ? t('employees.notInvited') : t('employees.inactive')}
                </Chip>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {employee.establishment?.name || t('employees.notAssigned')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <EmployeeRoleChips
                    ids={employee.job_position_ids}
                    max={3}
                    emptyLabel={t('employees.noJobPositions', { defaultValue: 'Non classé' })}
                  />
                </div>

                {employee.created_at && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(employee.created_at).toLocaleDateString('fr-FR')}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/employees/${employee.id}`)} className="flex-1">
                    {t('shifts.viewDetails')}
                  </Button>
                  {employee.status === 'not_invited' && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => onInviteClick(employee)}
                      disabled={sendInvitationPending}
                      className="flex-1 text-blue-600 hover:text-blue-700"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {t('employees.sendInvite')}
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => onDeleteEmployee(employee.id, `${employee.user.first_name} ${employee.user.last_name}`)}
                    disabled={deleteEmployeePending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        } else {
          const invitation = member.data as Invitation;
          return (
            <div key={`inv-pending-${member.id}`} className="p-4 bg-card border border-border/60 rounded-lg opacity-75">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {invitation.first_name && invitation.last_name
                      ? `${invitation.first_name} ${invitation.last_name}` : invitation.email}
                  </h3>
                  <p className="text-sm text-muted-foreground">{invitation.email}</p>
                </div>
                <Chip variant="secondary">{t('employees.invited')}</Chip>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {invitation.establishment?.name || t('employees.notAssigned')}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(invitation.created_at).toLocaleDateString('fr-FR')}
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => onDeleteInvitation(invitation.id, invitation.email)}
                  disabled={deleteInvitationPending}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('employees.cancelInvitation')}
                </Button>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
}