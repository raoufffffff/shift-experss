import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { UserPlus, Mail, ArrowUpDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function EmployeesSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('employees.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('employees.subtitle')}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button disabled className="flex-1 sm:flex-none opacity-50">
            <UserPlus className="w-4 h-4 mr-2" />
            {t('employees.invite')}
          </Button>
          <Button variant="outline" disabled className="flex-1 sm:flex-none opacity-50">
            <Mail className="w-4 h-4 mr-2" />
            {t('employees.generateInvitation')}
          </Button>
        </div>
      </div>

      {/* Shift Readiness Score */}
      <div className="relative">
        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
                <div className="mt-4">
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
              <button
                disabled
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors group opacity-50"
              >
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <p className="text-xs text-gray-600">{t('employees.activeEmployees')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <p className="text-xs text-gray-600">{t('employees.pendingInvitations')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <p className="text-xs text-gray-600">{t('employees.totalTeam')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Employees table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('employees.teamMembers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Sort selector */}
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Skeleton className="h-10 w-48" />
          </div>

          {/* Mobile card view */}
          <div className="lg:hidden space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 bg-card border border-border/60 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-24" />
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
                    {t('common.name')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('common.email')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('navigation.establishments')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('common.status')}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    {t('common.actions')}
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
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-8 w-16" />
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
