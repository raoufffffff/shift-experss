import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Download, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function DashboardSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Header avec filtre de date */}
      <div className="pb-4 border-b border-border/50">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {t('dashboard.subtitle')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <Skeleton className="h-11 w-full sm:w-[500px]" />
            <div className="flex gap-3 sm:ml-auto">
              <Button variant="outline" disabled className="shadow-sm w-full sm:w-auto opacity-50">
                <Download className="w-4 h-4 mr-2" />
                {t('dashboard.export')}
              </Button>
              <Button disabled className="shadow-sm w-full sm:w-auto opacity-50">
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.publishShift')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* 6 KPIs compacts sur une ligne */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="border border-border/60">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphique + Activité Récente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique (2/3) */}
        <div className="lg:col-span-2">
          <Card className="border border-border/60">
            <CardHeader className="border-b border-border/40 bg-muted/20">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="p-5">
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Activité Récente (1/3) */}
        <div className="lg:col-span-1">
          <Card className="border border-border/60 h-full">
            <CardContent className="p-5">
              <Skeleton className="h-5 w-32 mb-6" />
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Métriques de réactivité */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Card className="border border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analyse financière */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <Card key={i} className="border border-border/60">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-9 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Analyse équipe */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>

      {/* Analyses avancées */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-44" />
        <Card className="border border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="p-5">
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
