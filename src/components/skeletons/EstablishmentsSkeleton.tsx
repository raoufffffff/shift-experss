import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Plus, Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function EstablishmentsSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('establishments.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('establishments.subtitle')}</p>
        </div>
        <Button disabled className="w-full sm:w-auto opacity-50">
          <Plus className="w-4 h-4 mr-2" />
          {t('establishments.new')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <p className="text-xs text-gray-600">{t('establishments.total')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <p className="text-xs text-gray-600">{t('establishments.active')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <p className="text-xs text-gray-600">{t('establishments.cities')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Establishments table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('establishments.list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="lg:hidden space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 bg-card border border-border/60 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-48" />
                  </div>
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
                    Nom
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Adresse
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Ville
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Employés
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    <td className="p-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-12" />
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
