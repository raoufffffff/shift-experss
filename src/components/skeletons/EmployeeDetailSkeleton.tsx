import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Mail, Building2, Calendar, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function EmployeeDetailSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6 px-4 md:px-6">
      {/* Back button */}
      <Button variant="ghost" disabled className="hover:bg-muted opacity-50">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back')}
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Button variant="outline" disabled className="opacity-50">
            {t('employees.editEmployee')}
          </Button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{t('employees.email')}</p>
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{t('employees.establishment')}</p>
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{t('employees.joinedDate')}</p>
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-12 mb-2" />
                <p className="text-xs text-muted-foreground">{t('employees.stats.shiftsInvited')}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-12 mb-2" />
                <p className="text-xs text-muted-foreground">{t('employees.stats.shiftsAccepted')}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-12 mb-2" />
                <p className="text-xs text-muted-foreground">{t('employees.stats.shiftsCompleted')}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-16 mb-2" />
                <p className="text-xs text-muted-foreground">{t('employees.stats.avgResponseTime')}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift history table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('employees.shiftHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="lg:hidden space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 bg-card border border-border/60 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 mt-2" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border/40 bg-muted/20">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('shifts.position')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('navigation.establishments')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('common.date')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('common.hours')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('common.status')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('shifts.shiftStatus')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    <td className="p-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-20" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
