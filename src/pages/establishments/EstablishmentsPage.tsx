import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { CreateEstablishmentDialog } from '@/components/establishments/CreateEstablishmentDialog'
import { EditEstablishmentDialog } from '@/components/establishments/EditEstablishmentDialog'
import { Plus, Trash2, Pencil, Building2, Crown, Power, CheckCircle, XCircle, Link2, Copy, Users, CalendarDays, MapPin, Briefcase, BadgeDollarSign, Zap, UserCheck  } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { canCreateEstablishment } from '@shared/subscription-limits'
import type { Establishment } from '@shared/types'
import { useTranslation } from 'react-i18next'
import { RestrictedAccess } from '@/components/access/RestrictedAccess'
import { logger } from '@/utils/logger'
import { handleSupabaseError } from '@/lib/error-handler'
import { calculateUsage } from '@shared/subscription-limits'
import { UpgradeBanner } from '@/components/subscription/UpgradeBanner'
import { EstablishmentsSkeleton } from '@/components/skeletons/EstablishmentsSkeleton'
import { useNavigate, useParams } from 'react-router-dom'

export function EstablishmentsPage() {
  const { t, i18n } = useTranslation()
  const { company, user } = useAuthStore()
const navigate = useNavigate()
const params = useParams<{ locale: string }>()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null)

  // Fetch plan usage for badge
  const { data: usage } = useQuery({
    queryKey: ['plan-usage', company?.id],
    queryFn: async () => {
      if (!company?.id) return null

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Les 3 comptages sont indépendants — on les lance en parallèle au lieu
      // de les attendre l'un après l'autre (3 allers-retours réseau séquentiels
      // ralentissaient inutilement le chargement de la page).
      const [
        { count: establishmentsCount },
        { count: shiftsCount },
        { count: employeesCount },
      ] = await Promise.all([
        supabase
          .from('establishments')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'active'),
        supabase
          .from('shifts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .gte('created_at', monthStart),
        supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id),
      ])

      return calculateUsage(
        establishmentsCount || 0,
        shiftsCount || 0,
        employeesCount || 0,
        company.subscription_plan || 'free'
      )
    },
    enabled: !!company?.id,
  })

  // Realtime subscription pour auto-update
  useEffect(() => {
    if (!company?.id) return

    logger.log('🔴 Subscribing to establishments realtime updates for company:', company.id)

    const channel = supabase
      .channel(`establishments_${company.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'establishments',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          logger.log('🔄 Establishment changed:', payload)
          // Invalider le cache pour forcer un refetch
          queryClient.invalidateQueries({ queryKey: ['establishments', company.id] })
        }
      )
      .subscribe()

    return () => {
      logger.log('🔴 Unsubscribing from establishments realtime')
      supabase.removeChannel(channel)
    }
  }, [company?.id, queryClient])

  // Fetch establishments
  const { data: establishments, isLoading } = useQuery({
    queryKey: ['establishments', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('establishments')
        // ✅ جديد — auto_accept_applications مضاف حتى يظهر البادج في القائمة
        // بدون انتظار فتح نافذة التعديل
        .select('id, name, status, created_at, company_id, address, city, postal_code, latitude, longitude, logo_url, auto_accept_applications')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'EstablishmentsPage',


          operation: 'query'


        });


        throw new Error(message);


      }
      if (data) {
        console.log('🏢 Fetched establishments details:', data)
      }
      return data as Establishment[]
    },
    enabled: !!company?.id,
    staleTime: 0, // Toujours considérer les données comme stale pour refetch après invalidation
    refetchOnWindowFocus: true, // Refetch quand l'utilisateur revient sur l'onglet
  })

  // Fetch active invitations for all establishments
  // Note: This will fail until API types are regenerated, but we'll keep the frontend ready
  const { data: establishmentInvitations = {} } = useQuery({
    queryKey: ['establishment-invitations', company?.id],
    queryFn: async () => {
      if (!company?.id || !establishments || establishments.length === 0) return {}

      try {
        // Fetch all active invitations for all establishments in one query
        const { data, error } = await supabase
          .from('establishment_invitations')
          .select('id, token, establishment_id')
          .eq('is_active', true)
          .in('establishment_id', establishments.map(e => e.id))

        if (error) {
          logger.log('⚠️ Failed to fetch invitations (probably types not regenerated yet):', error)
          return {}
        }

        // Convert array to object keyed by establishment_id for easy lookup
        const invitationsMap: Record<string, { id: string; token: string }> = {}
        data?.forEach(inv => {
          invitationsMap[inv.establishment_id] = {
            id: inv.id,
            token: inv.token,
          }
        })

        return invitationsMap
      } catch (err) {
        logger.log('⚠️ Error fetching invitations:', err)
        return {}
      }
    },
    enabled: !!company?.id && !!establishments && establishments.length > 0,
    staleTime: 30000,
  })

  // Fetch stats per establishment (employee count + shift count this month)
  const { data: establishmentStats = {} } = useQuery({
    queryKey: ['establishment-stats', company?.id, establishments?.map(e => e.id).join(',')],
    queryFn: async () => {
      if (!company?.id || !establishments || establishments.length === 0) return {}

      const establishmentIds = establishments.map(e => e.id)
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [employeesRes, shiftsRes] = await Promise.all([
        supabase
          .from('employees')
          .select('establishment_id')
          .eq('company_id', company.id)
          .in('establishment_id', establishmentIds),
        supabase
          .from('shifts')
          .select('establishment_id')
          .eq('company_id', company.id)
          .in('establishment_id', establishmentIds)
          .gte('created_at', monthStart),
      ])

      const stats: Record<string, { employeeCount: number; shiftCount: number }> = {}
      establishmentIds.forEach(id => {
        stats[id] = { employeeCount: 0, shiftCount: 0 }
      })

      employeesRes.data?.forEach(e => {
        if (e.establishment_id && stats[e.establishment_id]) {
          stats[e.establishment_id].employeeCount++
        }
      })

      shiftsRes.data?.forEach(s => {
        if (s.establishment_id && stats[s.establishment_id]) {
          stats[s.establishment_id].shiftCount++
        }
      })

      return stats
    },
    enabled: !!company?.id && !!establishments && establishments.length > 0,
    staleTime: 30000,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('establishments')
        .delete()
        .eq('id', id)

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'EstablishmentsPage',


          operation: 'query'


        });


        throw new Error(message);


      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishments'] })
      toast.success(t('establishments.deleteSuccess'))
    },
    onError: () => {
      toast.error(t('establishments.deleteError'))
    },
  })

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('establishments')
        .update({ status: 'active' })
        .eq('id', id)

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'EstablishmentsPage',


          operation: 'query'


        });


        throw new Error(message);


      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishments'] })
      toast.success(t('establishments.reactivateSuccess'))
    },
    onError: () => {
      toast.error(t('establishments.reactivateError'))
    },
  })

  // Memoized active establishments count pour éviter les recalculs inutiles
  const activeEstablishmentsCount = useMemo(() =>
    establishments?.filter(e => e.status === 'active').length || 0
    , [establishments]);

  // Vérifier les limites d'établissement
  const limitCheck = useMemo(() =>
    company ? canCreateEstablishment(activeEstablishmentsCount, company.subscription_plan || 'free') : null
    , [activeEstablishmentsCount, company]);

  const canCreate = limitCheck?.allowed ?? true
  const canReactivate = limitCheck?.allowed ?? true

  // Memoized handlers pour éviter les re-renders inutiles
  const handleReactivate = useCallback((id: string, name: string) => {
    if (!canReactivate && limitCheck?.message) {
      toast.error(limitCheck.message, {
        duration: 5000,
        action: {
          label: t('subscription.viewPlans'),
          onClick: () => window.location.href = '/subscription'
        }
      })
      return
    }

    if (confirm(t('establishments.confirmReactivate', { name }))) {
      reactivateMutation.mutate(id)
    }
  }, [canReactivate, limitCheck?.message, t, reactivateMutation]);

  const handleDelete = useCallback((id: string, name: string) => {
    if (confirm(t('establishments.confirmDelete', { name }))) {
      deleteMutation.mutate(id)
    }
  }, [t, deleteMutation]);

  const handleEdit = useCallback((establishment: Establishment) => {
    setSelectedEstablishment(establishment)
    setEditDialogOpen(true)
  }, []);

  const handleCreateClick = useCallback(() => {
    if (!canCreate && limitCheck?.message) {
      toast.error(limitCheck.message, {
        duration: 5000,
        action: {
          label: t('subscription.viewPlans'),
          onClick: () => window.location.href = '/subscription'
        }
      })
      return
    }
    setCreateDialogOpen(true)
  }, [canCreate, limitCheck?.message, t]);

  const getStatusBadge = useCallback((status: 'active' | 'standby') => {
    if (status === 'active') {
      return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> {t('establishments.active')}</Badge>
    }
    return <Badge variant="secondary" className="gap-1"><XCircle className="w-3 h-3" /> {t('establishments.standby')}</Badge>
  }, [t]);

  // ✅ جديد — بادج مضغوط يعرض وضع قبول الترشيحات (تلقائي/يدوي) لهذه المؤسسة
  const getApplicationModeBadge = useCallback((autoAccept: boolean | null | undefined) => {
    if (autoAccept) {
      return (
        <span
          title={t('establishments.applicationMode.automaticDesc', { defaultValue: 'Le premier candidat est accepté automatiquement.' })}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
        >
          <Zap className="w-2.5 h-2.5" strokeWidth={2.5} />
          {t('establishments.applicationMode.automatic', { defaultValue: 'Automatique' })}
        </span>
      )
    }
    return (
      <span
        title={t('establishments.applicationMode.manualDesc', { defaultValue: 'Vous validez vous-même chaque candidat.' })}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
      >
        <UserCheck className="w-2.5 h-2.5" strokeWidth={2.5} />
        {t('establishments.applicationMode.manual', { defaultValue: 'Manuelle' })}
      </span>
    )
  }, [t]);

  const copyInvitationLink = useCallback((token: string) => {
    const url = `${window.location.origin}/invite/general/${token}`
    navigator.clipboard.writeText(url)
    toast.success(t('employees.invitationLinkCopied'))
  }, [t]);

  const getInitialColor = useCallback((name: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }, [])

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }, [i18n.language])

  // Check if user is admin (only admins can manage establishments)
  if (user?.role !== 'admin') {
    return <RestrictedAccess />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{t('establishments.title')}</h1>
            {usage?.establishments && (() => {
              const percentage = usage.establishments.isUnlimited
                ? 0
                : (usage.establishments.current / usage.establishments.max) * 100
              const colorClass = usage.establishments.isUnlimited
                ? 'border border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-600'
                : percentage >= 90
                  ? 'border border-red-500 text-red-600 bg-red-50/50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-600'
                  : percentage >= 70
                    ? 'border border-orange-500 text-orange-600 bg-orange-50/50 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-600'
                    : 'border border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-600'

              return (
                <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight ${colorClass}`}>
                  {usage.establishments.isUnlimited
                    ? `${usage.establishments.current}/∞ ${t('common.used')}`
                    : `${usage.establishments.current}/${usage.establishments.max} ${t('common.used')}`
                  }
                </span>
              )
            })()}
          </div>
          <p className="text-muted-foreground">
            {t('establishments.subtitle')}
          </p>
        </div>
        <Button
          onClick={handleCreateClick}
          disabled={!canCreate}
          className={!canCreate ? 'relative' : ''}
        >
          {!canCreate && <Crown className="w-4 h-4 mr-2" />}
          {canCreate && <Plus className="w-4 h-4 mr-2" />}
          {t('establishments.add')}
        </Button>
      </div>

      {/* Upgrade banner when limit is reached */}
      {usage?.establishments && !usage.establishments.canCreate && !usage.establishments.isUnlimited && (
        <UpgradeBanner
          limitType="establishments"
          current={usage.establishments.current}
          max={usage.establishments.max}
        />
      )}

      {/* Establishments List */}
      {isLoading ? (
        <EstablishmentsSkeleton />
      ) : !establishments || establishments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              {t('establishments.noEstablishments')}
            </p>
            <Button onClick={handleCreateClick} disabled={!canCreate}>
              {!canCreate && <Crown className="w-4 h-4 mr-2" />}
              {canCreate && <Plus className="w-4 h-4 mr-2" />}
              {t('establishments.add')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {establishments.map((establishment) => {
            const invitation = establishmentInvitations[establishment.id]
            const address = [establishment.address, establishment.postal_code, establishment.city].filter(Boolean).join(', ')
            const stats = establishmentStats[establishment.id]
            const isStandby = establishment.status === 'standby'

            return (
              <div
                key={establishment.id}
                className={`rounded-xl border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-border ${isStandby ? 'opacity-60' : ''}`}
              >
                {/* Top row: Logo + Info + Actions */}
                <div className="flex items-start gap-4">
                  {/* Logo / Initial */}
                  {establishment.logo_url ? (
                    <div className="w-11 h-11 rounded-lg overflow-hidden border border-border/50 shrink-0">
                      <img src={establishment.logo_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-11 h-11 rounded-lg ${getInitialColor(establishment.name)} flex items-center justify-center shrink-0`}>
                      <span className="text-white font-bold text-lg">{establishment.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{establishment.name}</h3>
                      {getStatusBadge(establishment.status)}
                      {/* ✅ جديد — بادج وضع قبول الترشيحات */}
                      {getApplicationModeBadge((establishment as any).auto_accept_applications)}
                    </div>

                    {address && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{address}</span>
                      </div>
                    )}

                    {invitation && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <button
                          onClick={() => copyInvitationLink(invitation.token)}
                          className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 transition-colors"
                          title={t('establishments.invitationLink')}
                        >
                          {t('establishments.invitationLink')}
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isStandby && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReactivate(establishment.id, establishment.name)}
                        disabled={reactivateMutation.isPending || !canReactivate}
                        title={!canReactivate ? t('establishments.limitReached') : t('establishments.reactivate')}
                      >
                        <Power className={`w-4 h-4 ${!canReactivate ? 'text-muted-foreground' : 'text-green-600'}`} />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(establishment)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(establishment.id, establishment.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>

                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{stats?.employeeCount ?? 0} {t('establishments.employees', { defaultValue: 'employés' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{stats?.shiftCount ?? 0} {t('establishments.shiftsThisMonth', { defaultValue: 'shifts ce mois' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{t('establishments.createdOn', { defaultValue: 'Créé le' })} {formatDate(establishment.created_at)}</span>
                  </div>
                   <button
onClick={() => navigate(`/${params.locale}/establishments/rates/${establishment.id}`)}    className="flex items-center gap-1.5 hover:text-blue-500 transition-colors ml-auto"
>
    <BadgeDollarSign className="w-3.5 h-3.5" />
    <span>{t('establishments.manageRates', { defaultValue: 'Tarification' })}</span>
</button>
                </div>

              </div>
            )
          })}
        </div>
      )}

      <CreateEstablishmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditEstablishmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        establishment={selectedEstablishment}
      />
    </div>
  )
}