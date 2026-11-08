import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { UserPlus, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function TeamSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('team.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('team.subtitle')}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button disabled className="flex-1 sm:flex-none opacity-50">
            <UserPlus className="w-4 h-4 mr-2" />
            {t('team.inviteMember')}
          </Button>
          <Button variant="outline" disabled className="flex-1 sm:flex-none opacity-50">
            <Mail className="w-4 h-4 mr-2" />
            {t('team.generateInvitation')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team members */}
        <Card>
          <CardHeader>
            <CardTitle>{t('team.members')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 bg-card border border-border/60 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending invitations */}
        <Card>
          <CardHeader>
            <CardTitle>{t('team.pendingInvitations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-card border border-border/60 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
