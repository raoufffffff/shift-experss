import { Button } from '@/components/ui/Button';
import { EmployeeRoleChips } from './EmployeeRoleChips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ReliabilityGauge } from '@/components/employees/ReliabilityGauge';
import {
  Mail,
  Building2,
  Calendar,
  Edit,
  DollarSign,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, type Locale } from 'date-fns';
import type { Employee, EmployeeDetailStats } from '../types';

interface EmployeeInfoCardProps {
  employee: Employee;
  stats: EmployeeDetailStats;
  dateFnsLocale: Locale;
  onEditEstablishment: () => void;
  onEditHourlyRate: () => void;
  onEditJobPositions: () => void;
}

export function EmployeeInfoCard({
  employee,
  stats,
  dateFnsLocale,
  onEditEstablishment,
  onEditHourlyRate,
  onEditJobPositions,
}: EmployeeInfoCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('employees.information')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[1fr,auto]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">{t('employees.email')}</p>
                <p className="font-medium">{employee.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">{t('employees.joinedOn')}</p>
                <p className="font-medium">
                  {employee.created_at
                    ? format(new Date(employee.created_at), 'PPP', { locale: dateFnsLocale })
                    : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">{t('employees.establishment')}</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{employee.establishment?.name || t('employees.notAssigned')}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEditEstablishment}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">{t('employees.hourlyRate')}</p>
                <div className="flex items-center gap-2">
                  {employee.verified_hourly_rate ? (
                    <p className="font-medium">${employee.verified_hourly_rate.toFixed(2)}</p>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{t('employees.hourlyRateNotSet')}</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEditHourlyRate}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            {/* Métiers attribués par l'employeur */}
            <div className="flex items-start gap-3 md:col-span-2">
              <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">{t('employees.jobPositions', { defaultValue: 'Métiers' })}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <EmployeeRoleChips
                    ids={employee.job_position_ids}
                    emptyLabel={t('employees.noJobPositions', { defaultValue: 'Aucun métier attribué' })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEditJobPositions}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Reliability Gauge */}
          <div className="flex items-center justify-center md:border-l md:pl-6">
            <ReliabilityGauge score={stats.reliabilityScore} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}