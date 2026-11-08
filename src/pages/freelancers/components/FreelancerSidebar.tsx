import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import type { Freelancer } from '../types';

interface FreelancerSidebarProps {
  freelancer: Freelancer;
  canViewContactInfo: boolean;
  hideContactInfo?: boolean;
  totalApplications: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
  completedShiftsCount: number;
  upcomingShiftsCount: number;
  dateFnsLocale: Locale;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function FreelancerSidebar({
  freelancer,
  canViewContactInfo,
  hideContactInfo,
  totalApplications,
  acceptedCount,
  rejectedCount,
  pendingCount,
  completedShiftsCount,
  upcomingShiftsCount,
  dateFnsLocale,
  t,
}: FreelancerSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Contact Info — hidden in candidature context */}
      {!hideContactInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              {t('freelancers.contact')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{t('common.email')}</p>
                {canViewContactInfo ? (
                  <p className="font-medium truncate">{freelancer.email}</p>
                ) : (
                  <div className="flex items-center gap-2 opacity-60 cursor-help" title={t('freelancers.contactVisibleOnlyInShift', { defaultValue: "Visible uniquement lors d'un shift actif" })}>
                    <span className="font-medium text-muted-foreground">[{t('common.private', { defaultValue: 'Priv\u00e9' })}]</span>
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            {freelancer.phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{t('common.phone')}</p>
                  {canViewContactInfo ? (
                    <p className="font-medium">{freelancer.phone}</p>
                  ) : (
                    <div className="flex items-center gap-2 opacity-60 cursor-help" title={t('freelancers.contactVisibleOnlyInShift', { defaultValue: "Visible uniquement lors d'un shift actif" })}>
                      <span className="font-medium text-muted-foreground">[{t('common.private', { defaultValue: 'Priv\u00e9' })}]</span>
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )}
            {freelancer.city && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{t('common.city')}</p>
                  <p className="font-medium">{freelancer.city}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{t('freelancers.memberSince')}</p>
                <p className="font-medium">
                  {format(new Date(freelancer.created_at), 'PP', { locale: dateFnsLocale })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            {t('freelancers.statisticsWithCompany')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold">{totalApplications}</div>
              <p className="text-xs text-muted-foreground">{t('freelancers.totalApplications')}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
              <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
              <p className="text-xs text-muted-foreground">{t('freelancers.accepted')}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <p className="text-xs text-muted-foreground">{t('freelancers.rejected')}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">{t('freelancers.pending')}</p>
            </div>
          </div>

          <div className="border-t pt-3 mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm">{t('freelancers.completedShifts')}</span>
              </div>
              <span className="font-bold">{completedShiftsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm">{t('freelancers.upcomingShifts')}</span>
              </div>
              <span className="font-bold">{upcomingShiftsCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
