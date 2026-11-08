import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useLocale } from '@/hooks/useLocale';
import { ArrowLeft, Edit, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Employee } from '../types';

interface EmployeeDetailHeaderProps {
  employee: Employee;
  onEditStatus: () => void;
}

export function EmployeeDetailHeader({ employee, onEditStatus }: EmployeeDetailHeaderProps) {
  const { navigate } = useLocale();
  const { t } = useTranslation();

  // ✅ جديد — صورة الموظف الحقيقية (avatar_url)، أفاتار كبيرة فـ رأس الصفحة
  const avatarUrl = (employee.user as unknown as { avatar_url?: string | null } | undefined)?.avatar_url || null;
  const employeeInitial = (employee.user.first_name || employee.user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" onClick={() => navigate('/employees')}>
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="w-14 h-14 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${employee.user.first_name} ${employee.user.last_name}`} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-xl font-bold text-blue-700">{employeeInitial}</span>
        )}
      </div>
      <div className="flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {employee.user.first_name} {employee.user.last_name}
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">{employee.user.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/messages?userId=${employee.user_id}&type=employee`)}
          className="h-8 gap-2 border-primary/20 text-primary hover:bg-primary/5 mr-2"
        >
          <MessageSquare className="w-4 h-4" />
          {t('chat.sendMessage', 'Message')}
        </Button>
        <Chip
          variant={
            employee.status === 'active' ? 'success' :
              employee.status === 'not_invited' ? 'warning' :
                'secondary'
          }
        >
          {employee.status === 'active' ? t('employees.active') :
            employee.status === 'not_invited' ? t('employees.notInvited') :
              t('employees.inactive')}
        </Chip>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditStatus}
          className="h-6 w-6 p-0"
        >
          <Edit className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}