/**
 * Formatage des données pour les graphiques du dashboard
 */

import type { ShiftData, ApplicationData, EstablishmentShiftData, EmployeeData, ShiftApplicationMapping, SubscriptionData } from './fetchShifts'
import type { DateRangeResult } from './dateRange'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@shared/types'
import { logger } from '@/utils/logger'

export interface ShiftTimelineData {
  date: string
  published: number
  filled: number
}

export interface ResponseTimeDistribution {
  label: string
  count: number
}

export interface ShiftsByEstablishment {
  name: string
  count: number
}

export interface HeatmapHourData {
  hour: string
  count: number
}

export interface HeatmapDayData {
  day: string
  hours: HeatmapHourData[]
}

export interface CostsTimelineData {
  date: string
  cost: number
}

export interface CostsComparisonTimelineData {
  date: string
  subscriptionCost: number
  shiftsCost: number
  agencyCost: number
}

export interface CostDistributionData {
  name: string
  value: number
  color: string
}

export interface DashboardCharts {
  shiftsTimeline: ShiftTimelineData[]
  responseTimeDistribution: ResponseTimeDistribution[]
  shiftsByEstablishment: ShiftsByEstablishment[]
  shiftHeatmap: HeatmapDayData[]
  costsTimeline: CostsTimelineData[]
  costsComparisonTimeline: CostsComparisonTimelineData[]
  costDistribution: CostDistributionData[]
}

/**
 * Formate les données de la timeline des shifts (courbe d'évolution)
 *
 * @param shifts - Liste des shifts
 * @param dateRange - Plage de dates calculée
 * @returns Tableau de données pour le graphique timeline
 */
export function formatShiftsTimeline(
  shifts: ShiftData[],
  dateRange: DateRangeResult
): ShiftTimelineData[] {
  const timeline: ShiftTimelineData[] = []

  // 🐛 DEBUG: Log des shifts récupérés
  const todayStr = new Date().toISOString().split('T')[0]
  logger.log('📊 Dashboard - Shifts data:', {
    totalShifts: shifts.length,
    shiftsWithPublishedAt: shifts.filter(s => s.published_at).length,
    rangeStartDate: dateRange.startDate.toISOString(),
    todayDate: todayStr,
    allShifts: shifts.map(s => ({
      id: s.id,
      published_at: s.published_at,
      published_date: s.published_at?.split('T')[0]
    }))
  })

  // ✅ FIX: Inclure aujourd'hui dans la courbe (de J-N à J inclus)
  for (let i = 0; i < dateRange.daysCount; i++) {
    const date = new Date(dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]

    // ✅ FIX: Utiliser published_at au lieu de created_at pour la courbe
    const dayShifts = shifts.filter(s => s.published_at && s.published_at.startsWith(dateStr))
    const dayFilled = dayShifts.filter(s => s.status === 'filled' || s.status === 'completed').length

    // 🐛 DEBUG: Log chaque jour
    if (dayShifts.length > 0) {
      logger.log(`📅 ${dateStr}: ${dayShifts.length} shifts publiés`, dayShifts)
    }

    timeline.push({
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      published: dayShifts.length,
      filled: dayFilled,
    })
  }

  return timeline
}

/**
 * Formate la distribution des temps de réponse des employés
 *
 * @param applications - Applications avec temps de réponse
 * @returns Tableau de données pour le graphique de distribution
 */
export function formatResponseTimeDistribution(
  applications: ApplicationData[]
): ResponseTimeDistribution[] {
  const ranges: ResponseTimeDistribution[] = [
    { label: '< 1min', count: 0 },
    { label: '1-5min', count: 0 },
    { label: '5-15min', count: 0 },
    { label: '15-60min', count: 0 },
    { label: '> 1h', count: 0 },
  ]

  applications.forEach(r => {
    let seconds = r.response_time_seconds

    // Si response_time_seconds n'existe pas, calculer manuellement
    if (!seconds && r.applied_at && r.reviewed_at) {
      const applied = new Date(r.applied_at).getTime()
      const reviewed = new Date(r.reviewed_at).getTime()
      seconds = (reviewed - applied) / 1000
    }

    if (seconds) {
      if (seconds < 60) ranges[0].count++
      else if (seconds < 300) ranges[1].count++
      else if (seconds < 900) ranges[2].count++
      else if (seconds < 3600) ranges[3].count++
      else ranges[4].count++
    }
  })

  return ranges
}

/**
 * Formate la distribution des shifts par établissement
 *
 * @param shiftsData - Shifts avec infos établissement
 * @param t - Fonction de traduction i18n (pour "Non défini")
 * @returns Tableau de données pour le graphique par établissement
 */
export function formatShiftsByEstablishment(
  shiftsData: EstablishmentShiftData[],
  t: (key: string) => string
): ShiftsByEstablishment[] {
  const estabCounts = new Map<string, { name: string; count: number }>()

  shiftsData.forEach((shift) => {
    const name = shift.establishment?.name || t('dashboard.undefined')
    if (!estabCounts.has(name)) {
      estabCounts.set(name, { name, count: 0 })
    }
    const entry = estabCounts.get(name)
    if (entry) entry.count++
  })

  return Array.from(estabCounts.values())
    .sort((a, b) => b.count - a.count)
}

/**
 * Formate les données du heatmap des shifts par jour/heure
 *
 * @param shifts - Liste des shifts avec start_time
 * @param t - Fonction de traduction i18n
 * @returns Tableau de données pour le heatmap jour/heure
 */
export function formatShiftHeatmap(
  shifts: ShiftData[],
  t: (key: string) => string
): HeatmapDayData[] {
  // Initialiser les compteurs pour chaque jour et tranche horaire
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const hourRanges = ['6h', '9h', '12h', '15h', '18h', '21h']

  const heatmapData: HeatmapDayData[] = daysOfWeek.map(day => ({
    day: t(`dashboard.${day}`),
    hours: hourRanges.map(hour => ({ hour, count: 0 }))
  }))

  // Compter les shifts par jour et heure
  shifts.forEach(shift => {
    if (!shift.start_time) return

    const shiftDate = new Date(shift.start_time)
    const dayIndex = shiftDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    const hour = shiftDate.getHours()

    // Déterminer la tranche horaire
    let hourIndex = -1
    if (hour >= 6 && hour < 9) hourIndex = 0  // 6h-9h
    else if (hour >= 9 && hour < 12) hourIndex = 1  // 9h-12h
    else if (hour >= 12 && hour < 15) hourIndex = 2  // 12h-15h
    else if (hour >= 15 && hour < 18) hourIndex = 3  // 15h-18h
    else if (hour >= 18 && hour < 21) hourIndex = 4  // 18h-21h
    else if (hour >= 21 || hour < 6) hourIndex = 5  // 21h-6h

    if (hourIndex !== -1) {
      heatmapData[dayIndex].hours[hourIndex].count++
    }
  })

  return heatmapData
}

/**
 * Formate les données de la timeline des coûts (évolution jour par jour)
 *
 * @param shifts - Liste des shifts
 * @param dateRange - Plage de dates calculée
 * @param employees - Liste des employés avec verified_hourly_rate
 * @param shiftApplicationsMappings - Mapping shift_id -> user_id pour les employés acceptés
 * @returns Tableau de données pour le graphique timeline des coûts
 */
export function formatCostsTimeline(
  shifts: ShiftData[],
  dateRange: DateRangeResult,
  employees: EmployeeData[],
  shiftApplicationsMappings: ShiftApplicationMapping[]
): CostsTimelineData[] {
  const timeline: CostsTimelineData[] = []

  // Créer une map user_id -> verified_hourly_rate
  const employeeRatesMap = new Map<string, number>()
  employees.forEach(emp => {
    if (emp.verified_hourly_rate !== null) {
      employeeRatesMap.set(emp.user_id, emp.verified_hourly_rate)
    }
  })

  // Créer une map shift_id -> user_id pour les employés acceptés
  const shiftToEmployeeMap = new Map<string, string>()
  shiftApplicationsMappings.forEach(mapping => {
    shiftToEmployeeMap.set(mapping.shift_id, mapping.user_id)
  })

  // Pour chaque jour, calculer le coût total
  for (let i = 0; i < dateRange.daysCount; i++) {
    const date = new Date(dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]

    // Filtrer les shifts complétés/remplis ce jour-là (par start_time)
    const dayShifts = shifts.filter(s => {
      if (s.status !== 'completed' && s.status !== 'filled') return false
      return s.start_time && s.start_time.startsWith(dateStr)
    })

    // Calculer le coût total du jour
    let dayCost = 0
    dayShifts.forEach(shift => {
      const userId = shiftToEmployeeMap.get(shift.id)
      if (!userId) return

      const hourlyRate = employeeRatesMap.get(userId)
      if (!hourlyRate) return

      // Calculer la durée effective du shift (pause déduite)
      const start = new Date(shift.start_time).getTime()
      const end = new Date(shift.end_time).getTime()
      const durationHours = (end - start) / (1000 * 60 * 60)
      const breakHours = (shift.break_duration_minutes || 0) / 60
      const effectiveDuration = durationHours - breakHours

      dayCost += effectiveDuration * hourlyRate
    })

    timeline.push({
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      cost: Math.round(dayCost)
    })
  }

  return timeline
}

/**
 * Formate les données de comparaison des coûts (Shift Express vs Agence)
 *
 * @param shifts - Liste des shifts
 * @param dateRange - Plage de dates calculée
 * @param employees - Liste des employés avec verified_hourly_rate
 * @param shiftApplicationsMappings - Mapping shift_id -> user_id pour les employés acceptés
 * @param subscription - Données de l'abonnement (plan et interval)
 * @returns Tableau de données pour le graphique à aires empilées
 */
export function formatCostsComparisonTimeline(
  shifts: ShiftData[],
  dateRange: DateRangeResult,
  employees: EmployeeData[],
  shiftApplicationsMappings: ShiftApplicationMapping[],
  subscription: SubscriptionData | null
): CostsComparisonTimelineData[] {
  const timeline: CostsComparisonTimelineData[] = []

  // Calculer le coût quotidien de l'abonnement (pro-rata)
  let dailySubscriptionCost = 0
  if (subscription?.subscription_plan && subscription.subscription_plan !== 'free') {
    const plan = SUBSCRIPTION_PLANS[subscription.subscription_plan as SubscriptionPlan]
    if (plan) {
      const isYearly = subscription.subscription_interval === 'year'
      const totalCost = isYearly ? plan.price_yearly : plan.price_monthly
      // Calculer le coût quotidien
      dailySubscriptionCost = isYearly ? totalCost / 365 : totalCost / 30
    }
  }

  // Créer une map user_id -> verified_hourly_rate
  const employeeRatesMap = new Map<string, number>()
  employees.forEach(emp => {
    if (emp.verified_hourly_rate !== null) {
      employeeRatesMap.set(emp.user_id, emp.verified_hourly_rate)
    }
  })

  // Créer une map shift_id -> user_id pour les employés acceptés
  const shiftToEmployeeMap = new Map<string, string>()
  shiftApplicationsMappings.forEach(mapping => {
    shiftToEmployeeMap.set(mapping.shift_id, mapping.user_id)
  })

  // Pour chaque jour, calculer les 3 coûts
  for (let i = 0; i < dateRange.daysCount; i++) {
    const date = new Date(dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]

    // Filtrer les shifts complétés/remplis ce jour-là (par start_time)
    const dayShifts = shifts.filter(s => {
      if (s.status !== 'completed' && s.status !== 'filled') return false
      return s.start_time && s.start_time.startsWith(dateStr)
    })

    let dayShiftsCost = 0
    let dayAgencyCost = 0

    dayShifts.forEach(shift => {
      const userId = shiftToEmployeeMap.get(shift.id)

      // Calculer la durée effective du shift (pause déduite)
      const start = new Date(shift.start_time).getTime()
      const end = new Date(shift.end_time).getTime()
      const durationHours = (end - start) / (1000 * 60 * 60)
      const breakHours = (shift.break_duration_minutes || 0) / 60
      const effectiveDuration = durationHours - breakHours

      // Coût avec agence de staffing (42$/h)
      dayAgencyCost += effectiveDuration * 42

      // Coût réel avec Shift Express (si on a le taux de l'employé)
      if (userId) {
        const hourlyRate = employeeRatesMap.get(userId)
        if (hourlyRate) {
          dayShiftsCost += effectiveDuration * hourlyRate
        }
      }
    })

    timeline.push({
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      subscriptionCost: Math.round(dailySubscriptionCost),
      shiftsCost: Math.round(dayShiftsCost),
      agencyCost: Math.round(dayAgencyCost)
    })
  }

  return timeline
}

/**
 * Formate la répartition des coûts (Employés vs Freelances)
 *
 * @param employeeCosts - Coût total des employés
 * @param freelancerCosts - Coût total des freelances
 * @param t - Fonction de traduction i18n
 * @returns Données pour le graphique en camembert
 */
export function formatCostDistribution(
  employeeCosts: number,
  freelancerCosts: number,
  t: (key: string) => string
): CostDistributionData[] {
  return [
    {
      name: t('dashboard.employeeCosts'),
      value: employeeCosts,
      color: '#10b981' // emerald-500
    },
    {
      name: t('dashboard.freelancerCosts'),
      value: freelancerCosts,
      color: '#3b82f6' // blue-500
    }
  ].filter(item => item.value > 0)
}

/**
 * Formate toutes les données des graphiques du dashboard
 *
 * @param shifts - Liste des shifts
 * @param dateRange - Plage de dates calculée
 * @param responseTimeData - Applications avec temps de réponse
 * @param shiftsByEstablishmentData - Shifts avec infos établissement
 * @param employees - Liste des employés avec verified_hourly_rate
 * @param shiftApplicationsMappings - Mapping shift_id -> user_id pour calculs de coûts
 * @param subscription - Données de l'abonnement (plan et interval)
 * @param t - Fonction de traduction i18n
 * @returns Objet contenant toutes les données formatées pour les graphiques
 */
export function formatAllCharts(
  shifts: ShiftData[],
  dateRange: DateRangeResult,
  responseTimeData: ApplicationData[],
  shiftsByEstablishmentData: EstablishmentShiftData[],
  employees: EmployeeData[],
  shiftApplicationsMappings: ShiftApplicationMapping[],
  freelancerApplications: ApplicationData[],
  subscription: SubscriptionData | null,
  t: (key: string) => string
): DashboardCharts {
  return {
    shiftsTimeline: formatShiftsTimeline(shifts, dateRange),
    responseTimeDistribution: formatResponseTimeDistribution(responseTimeData),
    shiftsByEstablishment: formatShiftsByEstablishment(shiftsByEstablishmentData, t),
    shiftHeatmap: formatShiftHeatmap(shifts, t),
    costsTimeline: formatCostsTimeline(shifts, dateRange, employees, shiftApplicationsMappings),
    costsComparisonTimeline: formatCostsComparisonTimeline(shifts, dateRange, employees, shiftApplicationsMappings, subscription),
    costDistribution: formatCostDistribution(
      calculateTotalCosts(shifts, employees, shiftApplicationsMappings, 'employee'),
      calculateTotalCosts(shifts, [], [], 'freelancer', freelancerApplications),
      t
    )
  }
}

/**
 * Helper local pour calculer les coûts dans formatAllCharts sans importer calculateKPIs (éviter cycle)
 */
function calculateTotalCosts(
  shifts: ShiftData[],
  employees: EmployeeData[],
  shiftApplicationsMappings: ShiftApplicationMapping[],
  type: 'employee' | 'freelancer',
  freelancerApplications?: ApplicationData[]
): number {
  let total = 0
  const employeeRatesMap = new Map<string, number>()
  employees.forEach(emp => {
    if (emp.verified_hourly_rate !== null) {
      employeeRatesMap.set(emp.user_id, emp.verified_hourly_rate)
    }
  })

  const shiftToEmployeeMap = new Map<string, string>()
  shiftApplicationsMappings.forEach(mapping => {
    shiftToEmployeeMap.set(mapping.shift_id, mapping.user_id)
  })

  const shiftToFreelancerMap = new Map<string, boolean>()
  if (freelancerApplications) {
    freelancerApplications.forEach(app => {
      if (app.shift_id && app.status === 'accepted') {
        shiftToFreelancerMap.set(app.shift_id, true)
      }
    })
  }

  shifts.forEach(shift => {
    if (shift.status !== 'completed' && shift.status !== 'filled') return

    let hourlyRate = 0
    if (type === 'employee') {
      const userId = shiftToEmployeeMap.get(shift.id)
      if (userId) hourlyRate = employeeRatesMap.get(userId) || 0
    } else {
      if (shiftToFreelancerMap.has(shift.id)) {
        hourlyRate = shift.freelance_hourly_rate || 0
      }
    }

    if (hourlyRate === 0) return

    const start = new Date(shift.start_time).getTime()
    const end = new Date(shift.end_time).getTime()
    const durationHours = (end - start) / (1000 * 60 * 60)
    const breakHours = (shift.break_duration_minutes || 0) / 60
    total += (durationHours - breakHours) * hourlyRate
  })

  return Math.round(total)
}
