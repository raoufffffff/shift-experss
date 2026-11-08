import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useEstablishmentStore } from '@/stores/establishmentStore'
import { Building2, Calendar, Users, Crown, TrendingUp } from 'lucide-react'
import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { calculateUsage, formatLimitDisplay, getRemainingCount, getBillingPeriod } from '@shared/subscription-limits'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { logger } from '@/utils/logger'

export function PlanUsageWidget() {
  const { t } = useTranslation()
  const { company, user } = useAuthStore()
  const { selectedEstablishmentId } = useEstablishmentStore()
  const queryClient = useQueryClient()

  const { data: usage } = useQuery({
    queryKey: ['plan-usage', company?.id, selectedEstablishmentId],
    queryFn: async () => {
      if (!company?.id) return null

      // Count active establishments
      const { count: establishmentsCount } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'active')

      // Count only employee-targeted shifts in current billing period (freelancer-only shifts are unlimited)
      const billingPeriod = getBillingPeriod(company)
      let shiftsQuery = supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('targets_employees', true)
        .gte('created_at', billingPeriod.start)
        .lte('created_at', billingPeriod.end)

      if (selectedEstablishmentId && selectedEstablishmentId !== 'null') {
        shiftsQuery = shiftsQuery.eq('establishment_id', selectedEstablishmentId)
      }

      const { count: shiftsCount } = await shiftsQuery

      // Count employees - with establishment filter
      let employeesQuery = supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)

      if (selectedEstablishmentId && selectedEstablishmentId !== 'null') {
        employeesQuery = employeesQuery.eq('establishment_id', selectedEstablishmentId)
      }

      const { count: employeesCount } = await employeesQuery

      return calculateUsage(
        establishmentsCount || 0,
        shiftsCount || 0,
        employeesCount || 0,
        company.subscription_plan || 'free'
      )
    },
    enabled: !!company?.id,
  })

  // Setup realtime subscriptions for instant updates
  useEffect(() => {
    if (!company?.id) return

    logger.log('🔴 Setting up REALTIME for plan usage widget')

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['plan-usage', company.id] })

    // Single consolidated channel with multiple listeners instead of 4 separate channels
    const channel = supabase
      .channel(`plan_usage_${company.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'establishments', filter: `company_id=eq.${company.id}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `company_id=eq.${company.id}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees', filter: `company_id=eq.${company.id}` }, invalidate)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'companies', filter: `id=eq.${company.id}` }, invalidate)
      .subscribe()

    return () => {
      logger.log('🔴 Cleaning up REALTIME for plan usage widget')
      supabase.removeChannel(channel)
    }
  }, [company?.id, queryClient])

  if (!usage) return null

  const isManager = user?.role === 'manager'

  const items = [
    {
      icon: Building2,
      label: t('planUsage.establishments'),
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      ...usage.establishments,
      hideForManager: true, // Hide for managers
    },
    {
      icon: Calendar,
      label: t('planUsage.employeeShiftsPerMonth', { defaultValue: 'Shifts employés' }),
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      ...usage.shifts,
      hideForManager: false,
    },
    {
      icon: Users,
      label: t('planUsage.employees'),
      color: 'text-green-600',
      bgColor: 'bg-green-500/5',
      ...usage.employees,
      hideForManager: false,
    },
  ].filter(item => !item.hideForManager || !isManager)

  const hasLimitReached = !usage.establishments.canCreate || !usage.shifts.canCreate || !usage.employees.canCreate

  return (
    <div className="mx-4 mb-3 rounded-xl border border-border/20 bg-gradient-to-br from-white via-primary/[0.02] to-primary/5 shadow-sm overflow-hidden backdrop-blur-sm">
      {/* Minimal header with status indicator */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary animate-ping opacity-40"></div>
          </div>
          <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-widest">
            {t('planUsage.title')}
          </span>
        </div>
        {hasLimitReached && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-100 to-red-100">
            <Crown className="w-2.5 h-2.5 text-orange-600" />
          </div>
        )}
      </div>

      {/* Circular/Radial style usage cards */}
      <div className="px-3 pb-3 grid grid-cols-3 gap-2">
        {items.map((item, index) => {
          const Icon = item.icon
          const percentage = item.isUnlimited ? 100 : (item.current / item.max) * 100
          const isNearLimit = percentage >= 80 && !item.isUnlimited
          const isAtLimit = !item.canCreate
          const circumference = 2 * Math.PI * 16 // radius of 16
          const strokeDashoffset = circumference - (percentage / 100) * circumference

          return (
            <Link
              key={item.label}
              to="/subscription"
              className="group relative flex flex-col items-center p-2 rounded-lg bg-white/50 hover:bg-white/80 border border-border/20 hover:border-primary/30 transition-all duration-300 hover:shadow-md"
            >
              {/* Circular progress */}
              <div className="relative w-10 h-10 mb-1.5">
                <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    className="stroke-muted/20"
                    strokeWidth="2.5"
                  />
                  {/* Progress circle */}
                  {!item.isUnlimited && (
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className={`transition-all duration-700 ease-out ${isAtLimit
                        ? 'stroke-red-500'
                        : isNearLimit
                          ? 'stroke-orange-500'
                          : 'stroke-primary'
                        }`}
                      strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                {/* Icon in center */}
                <div className={`absolute inset-0 flex items-center justify-center rounded-full ${item.bgColor}`}>
                  <Icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition-transform`} />
                </div>
              </div>

              {/* Value */}
              <div className="text-center">
                <div className={`text-xs font-bold leading-none mb-0.5 tabular-nums ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-foreground'
                  }`}>
                  {item.current}
                  {!item.isUnlimited && (
                    <span className="text-[9px] text-muted-foreground font-medium">/{item.max}</span>
                  )}
                  {item.isUnlimited && (
                    <span className="text-green-600 ml-0.5">∞</span>
                  )}
                </div>
                {/* Label */}
                <div className="text-[8px] text-muted-foreground font-medium leading-tight truncate max-w-full">
                  {item.label}
                </div>
              </div>

              {/* Hover indicator */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <TrendingUp className="w-2.5 h-2.5 text-primary" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Stylish upgrade CTA for admins */}
      {company?.subscription_plan && user?.role === 'admin' && (
        <div className="px-3 pb-2.5 pt-1 border-t border-border/10">
          <Link
            to="/subscription"
            className="group relative flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 hover:from-amber-100 hover:via-orange-100 hover:to-yellow-100 border border-amber-200/50 hover:border-amber-300/70 transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden"
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-orange-400/10 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Sparkle effect top */}
            <div className="absolute top-0 right-1/4 w-1 h-1 bg-amber-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
            <div className="absolute top-1 right-1/3 w-0.5 h-0.5 bg-orange-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDelay: '0.2s' }}></div>

            {/* Crown icon with glow */}
            <div className="relative">
              <div className="absolute inset-0 blur-md bg-amber-400/50 rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Crown className="w-3.5 h-3.5 text-amber-600 relative z-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300" />
            </div>

            {/* Text */}
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider relative z-10 group-hover:text-amber-950 transition-colors">
              {t('planUsage.upgrade')}
            </span>

            {/* Arrow icon */}
            <TrendingUp className="w-3 h-3 text-amber-600 relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
          </Link>
        </div>
      )}
    </div>
  )
}
