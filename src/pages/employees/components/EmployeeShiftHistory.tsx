import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Clock, XCircle, Undo2, ExternalLink, MessageSquareQuote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { format, type Locale } from 'date-fns';
import type { EmployeeDetailStats } from '../types';

interface EmployeeShiftHistoryProps {
  stats: EmployeeDetailStats;
  dateFnsLocale: Locale;
}

// Format response time
function formatResponseTime(minutes: number): string {
  if (minutes < 1) return '< 1min';
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}min`;
}

// ✅ statut de la CANDIDATURE (applied/accepted/rejected/withdrawn), distinct
// du statut du SHIFT lui-même (pending/filled/completed/...) affiché plus loin
function applicationStatusChip(status: string, t: (k: string, o?: Record<string, unknown>) => string) {
  switch (status) {
    case 'accepted':
      return <Chip variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />{t('shifts.accepted', { defaultValue: 'Acceptée' })}</Chip>;
    case 'rejected':
      return <Chip variant="danger"><XCircle className="w-3 h-3 mr-1" />{t('shifts.applicationStatus.rejected', { defaultValue: 'Refusée' })}</Chip>;
    case 'withdrawn':
      return <Chip variant="default"><Undo2 className="w-3 h-3 mr-1" />{t('shifts.applicationStatus.withdrawn', { defaultValue: 'Retirée' })}</Chip>;
    case 'applied':
    case 'pending':
      return <Chip variant="warning"><Clock className="w-3 h-3 mr-1" />{t('shifts.candidate', { defaultValue: 'En attente' })}</Chip>;
    default:
      return <Chip variant="secondary">{status}</Chip>;
  }
}

export function EmployeeShiftHistory({ stats, dateFnsLocale }: EmployeeShiftHistoryProps) {
  const { t, i18n } = useTranslation();
  const { navigate } = useLocale();

  const {
    totalInvited,
    acceptedShifts,
    rejectedShifts,
    pendingShifts,
    withdrawnShifts,
    completedShifts,
    upcomingShifts,
    averageResponseTime,
    allApplications,
  } = stats;

  return (
    <>
      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('employees.statistics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-gray-600">{t('employees.totalInvited')}</div>
              <div className="text-2xl font-bold">{totalInvited}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-gray-600">{t('employees.acceptedCount')}</div>
              <div className="text-2xl font-bold text-green-600">{acceptedShifts.length}</div>
              <div className="text-xs text-gray-500">
                {totalInvited > 0 ? Math.round((acceptedShifts.length / totalInvited) * 100) : 0}%
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-gray-600">{t('employees.rejectedCount')}</div>
              <div className="text-2xl font-bold text-red-600">{rejectedShifts.length}</div>
              <div className="text-xs text-gray-500">
                {totalInvited > 0 ? Math.round((rejectedShifts.length / totalInvited) * 100) : 0}%
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-gray-600">{t('employees.pendingCount')}</div>
              <div className="text-2xl font-bold text-gray-600">{pendingShifts.length}</div>
              <div className="text-xs text-gray-500">
                {totalInvited > 0 ? Math.round((pendingShifts.length / totalInvited) * 100) : 0}%
              </div>
            </div>
            {/* ✅ جديد — عدد الانسحابات، غير معروض سابقاً */}
            <div className="flex flex-col gap-1">
              <div className="text-sm text-gray-600">{t('employees.withdrawnCount', { defaultValue: 'Désistements' })}</div>
              <div className="text-2xl font-bold text-amber-600">{withdrawnShifts.length}</div>
              <div className="text-xs text-gray-500">
                {totalInvited > 0 ? Math.round((withdrawnShifts.length / totalInvited) * 100) : 0}%
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-gray-600">{t('employees.avgResponseTime')}</div>
              <div className="text-2xl font-bold text-blue-600">
                {averageResponseTime > 0 ? formatResponseTime(averageResponseTime) : '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedShifts.length}</div>
                <p className="text-xs text-gray-600">{t('employees.completedShifts')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{upcomingShifts.length}</div>
                <p className="text-xs text-gray-600">{t('employees.upcomingShifts')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Historique complet — TOUTES les candidatures (applied/accepted/rejected/withdrawn),
          pas seulement les acceptées comme avant. Chaque ligne mène vers /shifts/{id}. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('employees.shiftHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {allApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('employees.noShiftHistory', { defaultValue: 'Aucun historique de shift' })}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('shifts.date')}</TableHead>
                    <TableHead>{t('shifts.position')}</TableHead>
                    <TableHead>{t('shifts.establishment')}</TableHead>
                    <TableHead>{t('shifts.time')}</TableHead>
                    <TableHead>{t('employees.applicationStatus', { defaultValue: 'Candidature' })}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allApplications.map((app) => {
                    const withdrawalReason = (app as unknown as { withdrawal_reason?: string | null }).withdrawal_reason || null;
                    return (
                      <>
                        <TableRow
                          key={app.id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => navigate(`/shifts/${app.shifts.id}`)}
                        >
                          <TableCell>
                            {format(new Date(app.shifts.start_time), 'PP', { locale: dateFnsLocale })}
                          </TableCell>
                          <TableCell>{app.shifts.position_name || app.shifts.positions?.title || t('shifts.noPosition')}</TableCell>
                          <TableCell>{app.shifts.establishments?.name || '-'}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(app.shifts.start_time), i18n.language === 'en' ? 'h:mm a' : 'HH:mm', { locale: dateFnsLocale })}
                            {' - '}
                            {format(new Date(app.shifts.end_time), i18n.language === 'en' ? 'h:mm a' : 'HH:mm', { locale: dateFnsLocale })}
                          </TableCell>
                          <TableCell>
                            {applicationStatusChip(app.status, t)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              variant={
                                app.shifts.status === 'completed'
                                  ? 'success'
                                  : app.shifts.status === 'pending' || app.shifts.status === 'filled'
                                    ? 'secondary'
                                    : 'default'
                              }
                            >
                              {t(`shifts.status.${app.shifts.status}`) || app.shifts.status}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); navigate(`/shifts/${app.shifts.id}`); }}
                              className="h-7 w-7 p-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {/* ✅ Motif du désistement — ligne dépliée sous la candidature retirée */}
                        {app.status === 'withdrawn' && withdrawalReason && (
                          <TableRow key={`${app.id}-reason`} className="bg-amber-50/50 dark:bg-amber-950/10">
                            <TableCell colSpan={7} className="py-2">
                              <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 pl-1">
                                <MessageSquareQuote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span>
                                  <span className="font-semibold">{t('shifts.employeeStats.withdrawalReasonLabel', { defaultValue: 'Motif du désistement' })} : </span>
                                  {withdrawalReason}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}