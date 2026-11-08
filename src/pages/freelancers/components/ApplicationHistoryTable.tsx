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
import { Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import type { FreelancerApplication } from '../types';

interface ApplicationHistoryTableProps {
  applications: FreelancerApplication[];
  language: string;
  dateFnsLocale: Locale;
  onNavigateToShift: (shiftId: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function ApplicationHistoryTable({
  applications,
  language,
  dateFnsLocale,
  onNavigateToShift,
  t,
}: ApplicationHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('freelancers.applicationHistory')}</CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('freelancers.noApplications')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* <TableHead>{t('shifts.date')}</TableHead> */}
                  <TableHead>{t('shifts.position')}</TableHead>
                  <TableHead>{t('shifts.establishment')}</TableHead>
                  <TableHead>{t('shifts.time')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow
                    key={app.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => app.shift && onNavigateToShift(app.shift.id)}
                  >
                    {/* <TableCell>
                      {app.shift?.start_time
                        ? format(new Date(app.shift.start_time), 'PP', { locale: dateFnsLocale })
                        : '-'}
                    </TableCell> */}
                    <TableCell>{app.shift?.position_name || '-'}</TableCell>
                    <TableCell>{app.shift?.establishments?.name || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {app.shift?.start_time && app.shift?.end_time ? (
                        <>
                          {format(new Date(app.shift.start_time), language === 'en' ? 'h:mm a' : 'HH:mm', { locale: dateFnsLocale })}
                          {' - '}
                          {format(new Date(app.shift.end_time), language === 'en' ? 'h:mm a' : 'HH:mm', { locale: dateFnsLocale })}
                        </>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        variant={
                          app.status === 'accepted'
                            ? 'success'
                            : app.status === 'rejected'
                              ? 'danger'
                              : app.status === 'applied'
                                ? 'default'
                                : 'secondary'
                        }
                      >
                        {t(`shifts.applicationStatus.${app.status}`)}
                      </Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
