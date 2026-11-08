import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Download, DollarSign, Clock, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PayrollSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('payroll.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('payroll.subtitle')}</p>
        </div>
        <Button disabled className="w-full sm:w-auto opacity-50">
          <Download className="w-4 h-4 mr-2" />
          {t('payroll.export')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-full sm:w-48" />
            <Skeleton className="h-10 w-full sm:w-48" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main content - Payroll table */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{t('payroll.summary')}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile card view */}
              <div className="lg:hidden space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 bg-card border border-border/60 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('payroll.hours')}</p>
                        <Skeleton className="h-5 w-12 mt-1" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('payroll.amount')}</p>
                        <Skeleton className="h-5 w-16 mt-1" />
                      </div>
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
                        Employé
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Poste
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Heures
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Taux
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Montant
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
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-12" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-medium">{t('payroll.stats')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('payroll.totalAmount')}</span>
                </div>
                <Skeleton className="h-5 w-20" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('payroll.totalHours')}</span>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('payroll.employees')}</span>
                </div>
                <Skeleton className="h-5 w-12" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('payroll.avgRate')}</span>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
