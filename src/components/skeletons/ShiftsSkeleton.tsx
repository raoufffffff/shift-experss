import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Plus, List, CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ShiftsSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Header with date filters */}
      <div className="pb-4 border-b border-border/50">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t('shifts.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {t('shifts.subtitle')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            {/* Date filter buttons skeleton */}
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1.5 border border-border/60 flex-1 sm:flex-none overflow-x-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-9 w-20 flex-shrink-0" />
              ))}
            </div>

            {/* New shift button skeleton */}
            <Button disabled className="shadow-sm w-full sm:w-auto sm:ml-auto opacity-50">
              <Plus className="w-4 h-4 mr-2" />
              {t('shifts.newShift')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-semibold tracking-tight">
              <Skeleton className="h-6 w-32" />
            </CardTitle>

            <div className="flex items-center gap-3">
              {/* View mode switch */}
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/60">
                <button
                  className="p-2 rounded-md bg-background text-foreground shadow-sm"
                  disabled
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded-md text-muted-foreground"
                  disabled
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
              </div>

              {/* Status filter skeleton */}
              <Skeleton className="h-10 w-[200px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile card view skeleton */}
          <div className="lg:hidden space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 bg-card border border-border/60 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>

          {/* Desktop table view skeleton */}
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
                    {t('shifts.dateAndTime')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('common.status')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('shifts.slots')}
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
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load more button skeleton */}
          <div className="p-4 border-t border-border/40 bg-muted/10 text-center lg:block hidden">
            <Button variant="outline" disabled className="opacity-50">
              <Skeleton className="h-4 w-24" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
