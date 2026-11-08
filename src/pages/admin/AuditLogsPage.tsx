import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
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
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, AlertTriangle, FileText, Users, Mail, Trash2, Download } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { format } from 'date-fns';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';

interface AuditLog {
  id: string;
  user_email: string;
  user_role: string;
  action_type: string;
  resource_type: string;
  status: 'success' | 'partial_success' | 'failure';
  created_at: string;
  details: {
    total_rows?: number;
    successful_imports?: number;
    failed_imports?: number;
    duration_ms?: number;
    errors?: unknown[];
    [key: string]: unknown;
  };
  metadata: {
    ip_address?: string;
    user_agent?: string;
    [key: string]: unknown;
  };
}

const localeMap = {
  fr,
  en: enUS,
  es,
  it,
  zh: zhCN,
};

export function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const { company } = useAuthStore();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['business-audit-logs', company?.id, filterAction, filterStatus],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase.from('business_audit_logs')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterAction !== 'all') {
        query = query.eq('action_type', filterAction);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
    enabled: !!company?.id,
  });

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('import')) return <FileText className="w-4 h-4" />;
    if (actionType.includes('delete')) return <Trash2 className="w-4 h-4" />;
    if (actionType.includes('invitation')) return <Mail className="w-4 h-4" />;
    if (actionType.includes('employee')) return <Users className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'partial_success':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'failure':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'partial_success':
        return 'warning';
      case 'failure':
        return 'danger';
      default:
        return 'default';
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const locale = localeMap[i18n.language as keyof typeof localeMap] || enUS;
    return format(new Date(dateString), 'PPp', { locale });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Action', 'Status', 'Details'];
    const rows = logs.map(log => [
      formatDate(log.created_at),
      log.user_email,
      formatActionType(log.action_type),
      log.status,
      JSON.stringify(log.details),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 md:px-6">
        <div className="h-8 bg-gray-200 animate-pulse rounded w-1/4"></div>
        <div className="h-96 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('auditLogs.title')}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('auditLogs.subtitle')}
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          {t('auditLogs.export')}
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('auditLogs.filterAction')}
              </label>
              <Select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="all">{t('common.all')}</option>
                <option value="csv_import_employees">{t('auditLogs.actions.csvImport')}</option>
                <option value="employee_delete">{t('auditLogs.actions.employeeDelete')}</option>
                <option value="invitation_sent">{t('auditLogs.actions.invitationSent')}</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('auditLogs.filterStatus')}
              </label>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">{t('common.all')}</option>
                <option value="success">{t('auditLogs.status.success')}</option>
                <option value="partial_success">{t('auditLogs.status.partialSuccess')}</option>
                <option value="failure">{t('auditLogs.status.failure')}</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('auditLogs.recentActivity')} ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('auditLogs.noLogs')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('auditLogs.date')}</TableHead>
                    <TableHead>{t('auditLogs.user')}</TableHead>
                    <TableHead>{t('auditLogs.action')}</TableHead>
                    <TableHead>{t('auditLogs.status')}</TableHead>
                    <TableHead>{t('auditLogs.details')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.user_email}</span>
                          <span className="text-xs text-gray-500 capitalize">{log.user_role}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action_type)}
                          <span className="text-sm">{formatActionType(log.action_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <Chip variant={getStatusVariant(log.status)}>
                            {t(`auditLogs.status.${log.status}`)}
                          </Chip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.action_type === 'csv_import_employees' && (
                            <div className="space-y-1">
                              <div>
                                ✅ {log.details.successful_imports || 0}/{log.details.total_rows || 0} {t('auditLogs.imported')}
                              </div>
                              {(log.details.failed_imports ?? 0) > 0 && (
                                <div className="text-red-600">
                                  ❌ {log.details.failed_imports} {t('auditLogs.failed')}
                                </div>
                              )}
                              {log.details.duration_ms && (
                                <div className="text-gray-500 text-xs">
                                  ⏱️ {(log.details.duration_ms / 1000).toFixed(2)}s
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
