import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Calendar, Clock, MapPin, Briefcase, Users, DollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ShiftDetailSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6 px-4 md:px-6">
      {/* Back button */}
      <Button variant="ghost" disabled className="hover:bg-muted opacity-50">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back')}
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Shift info - Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main shift card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/40 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Info grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">{t('shifts.shiftDate')}</p>
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">{t('shifts.hours')}</p>
                    <Skeleton className="h-5 w-24 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">{t('shifts.location')}</p>
                    <Skeleton className="h-5 w-40" />
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">{t('shifts.position')}</p>
                    <Skeleton className="h-5 w-28" />
                  </div>
                </div>
              </div>

              {/* Description */}
              {t('shifts.description') && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{t('shifts.description')}</p>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Applications table */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold tracking-tight">
                  {t('shifts.applications')}
                </CardTitle>
                <Skeleton className="h-9 w-32" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border/40 bg-muted/20">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        {t('common.employee')}
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        {t('common.status')}
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        {t('shifts.application')}
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="p-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-6 w-20" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats sidebar - Right column */}
        <div className="space-y-6">
          {/* Stats card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-medium">{t('shifts.stats')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('shifts.slotsRequired')}</span>
                </div>
                <Skeleton className="h-5 w-12" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('shifts.slotsFilled')}</span>
                </div>
                <Skeleton className="h-5 w-12" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('shifts.hourlyRate')}</span>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('shifts.totalCost')}</span>
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            </CardContent>
          </Card>

          {/* Actions card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/40 bg-muted/20">
              <CardTitle className="text-sm font-medium">{t('shifts.actions')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Button variant="outline" disabled className="w-full opacity-50">
                <Skeleton className="h-4 w-24" />
              </Button>
              <Button variant="outline" disabled className="w-full opacity-50">
                <Skeleton className="h-4 w-24" />
              </Button>
              <Button variant="outline" disabled className="w-full opacity-50">
                <Skeleton className="h-4 w-24" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
