/**
 * Calculs des KPIs (Key Performance Indicators) pour le dashboard
 */

import { calculateShiftNetHours } from '@shared/utils'
import type { ShiftData, ApplicationData, EmployeeData, ShiftApplicationMapping } from './fetchShifts'
import { calculateUsage, type UsageLimits } from '@shared/subscription-limits'
import type { SubscriptionPlan } from '@shared/types'

export interface TopEmployee {
  id: string
  name: string
  acceptanceRate: number
  totalShifts: number
}

export interface EstablishmentCost {
  establishment_id: string
  establishment_name: string
  totalCost: number
  shiftsCount: number
}

export interface DashboardKPIs {
  // Vue globale
  totalShifts: number
  fillRate: number
  avgFillTimeMinutes: number
  estimatedValue: number

  // Coûts
  totalShiftsCost: number
  averageCostPerShift: number
  employeeCosts: number
  freelancerCosts: number
  costByEstablishment: EstablishmentCost[]

  // Performance & Qualité
  avgShiftDurationHours: number
  noShowRate: number

  // Équipe
  activeEmployees: number
  avgAcceptanceRate: number
  topEmployees: TopEmployee[]
  avgFirstResponseTimeMinutes: number // Temps moyen jusqu'à la première candidature

  // Temps réel
  pendingShifts: number
  ongoingShiftsToday: number

  // Usage (limites d'abonnement)
  usage: UsageLimits
}

/**
 * Calcule le taux de remplissage des shifts
 *
 * @param shifts - Liste des shifts
 * @returns Taux de remplissage en pourcentage (0-100)
 */
export function calculateFillRate(shifts: ShiftData[]): number {
  if (shifts.length === 0) return 0

  const filledShifts = shifts.filter(s => s.status === 'filled' || s.status === 'completed')
  return Math.round((filledShifts.length / shifts.length) * 100)
}

/**
 * Calcule le temps moyen de remplissage des shifts (en minutes)
 *
 * @param shifts - Liste des shifts
 * @returns Temps moyen en minutes
 */
export function calculateAvgFillTime(shifts: ShiftData[]): number {
  const filledShifts = shifts.filter(s => s.status === 'filled' || s.status === 'completed')

  const fillTimes = filledShifts
    .filter(s => s.filled_at && s.published_at)
    .map(s => {
      const published = new Date(s.published_at!).getTime()
      const filled = new Date(s.filled_at!).getTime()
      return (filled - published) / (1000 * 60) // en minutes
    })

  return fillTimes.length > 0
    ? fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length
    : 0
}

/**
 * Calcule la valeur économique des shifts complétés (pertes évitées)
 * Estimation : 60$/h de perte évitée en moyenne
 * Seuls les shifts "completed" sont comptabilisés
 *
 * @param shifts - Liste des shifts
 * @returns Valeur estimée en dollars
 */
export function calculateEstimatedValue(shifts: ShiftData[]): number {
  const completedShifts = shifts.filter(s => s.status === 'completed')

  const totalHoursCombled = completedShifts.reduce((total, shift) => {
    return total + calculateShiftNetHours(shift.start_time, shift.end_time, shift.break_duration_minutes)
  }, 0)

  return Math.round(totalHoursCombled * 60)
}

/**
 * Calcule le taux d'acceptation moyen des employés
 *
 * @param applications - Liste des applications
 * @returns Taux d'acceptation en pourcentage (0-100)
 */
export function calculateAvgAcceptanceRate(applications: ApplicationData[]): number {
  const acceptedCount = applications.filter(a => a.status === 'applied' || a.status === 'accepted').length
  const totalResponses = applications.length

  return totalResponses > 0 ? Math.round((acceptedCount / totalResponses) * 100) : 0
}

/**
 * Calcule le temps moyen de la première candidature reçue pour chaque shift
 * (temps entre publication du shift et la première candidature reçue)
 *
 * @param shifts - Liste des shifts avec published_at
 * @param applications - Applications avec shift_id et applied_at
 * @returns Temps moyen en minutes
 */
export function calculateAvgFirstResponseTime(
  shifts: ShiftData[],
  applications: ApplicationData[]
): number {
  // Créer un map shift_id -> published_at
  const shiftsMap = new Map<string, string>()
  shifts.forEach((shift) => {
    if (shift.published_at) {
      shiftsMap.set(shift.id, shift.published_at)
    }
  })

  // Grouper les applications par shift_id et trouver la première pour chaque shift
  const firstApplicationByShift = new Map<string, string>()

  applications.forEach((app) => {
    if (!app.shift_id || !app.applied_at) return

    const currentFirst = firstApplicationByShift.get(app.shift_id)
    if (!currentFirst || new Date(app.applied_at) < new Date(currentFirst)) {
      firstApplicationByShift.set(app.shift_id, app.applied_at)
    }
  })

  // Calculer le temps de réponse pour chaque shift qui a au moins une candidature
  const responseTimes: number[] = []

  firstApplicationByShift.forEach((firstAppliedAt, shiftId) => {
    const publishedAt = shiftsMap.get(shiftId)
    if (publishedAt) {
      const published = new Date(publishedAt).getTime()
      const applied = new Date(firstAppliedAt).getTime()
      const timeInMinutes = (applied - published) / (1000 * 60)

      if (timeInMinutes >= 0) { // Ignorer les valeurs négatives (erreurs de données)
        responseTimes.push(timeInMinutes)
      }
    }
  })

  if (responseTimes.length === 0) return 0

  const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
  return Math.round(average)
}

/**
 * Calcule les statistiques des top 5 employés
 *
 * @param applications - Liste de TOUTES les applications (y compris pending) pour compter le total d'invitations
 * @param employees - Liste des employés avec leur id et user_id pour le mapping
 * @returns Top 5 employés triés par taux d'acceptation
 */
export function calculateTopEmployees(
  applications: ApplicationData[],
  employees: Array<{ id: string; user_id: string }>
): TopEmployee[] {
  // Créer un map user_id -> employee_id pour la jointure côté client
  const userToEmployeeMap = new Map<string, string>()
  employees.forEach((emp) => {
    userToEmployeeMap.set(emp.user_id, emp.id)
  })

  const employeeStats = new Map<string, { name: string; accepted: number; total: number }>()

  applications.forEach((app) => {
    // Récupérer l'employee_id à partir du user_id via le mapping
    const employeeId = app.user_id ? userToEmployeeMap.get(app.user_id) : undefined
    if (!employeeId) return

    const name = app.user ? `${app.user.first_name || ''} ${app.user.last_name || ''}`.trim() : 'Employé'

    if (!employeeStats.has(employeeId)) {
      employeeStats.set(employeeId, { name, accepted: 0, total: 0 })
    }

    const stats = employeeStats.get(employeeId)!
    stats.total++ // Compte le nombre total d'invitations (incluant pending)
    if (app.status === 'applied' || app.status === 'accepted') {
      stats.accepted++
    }
  })

  return Array.from(employeeStats.entries())
    .map(([id, stats]) => ({
      id,
      name: stats.name,
      acceptanceRate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0,
      totalShifts: stats.total,
    }))
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
    .slice(0, 5)
}

/**
 * Calcule la durée moyenne des shifts (pause déduite)
 *
 * @param shifts - Liste des shifts
 * @returns Durée moyenne en heures
 */
export function calculateAvgShiftDuration(shifts: ShiftData[]): number {
  if (shifts.length === 0) return 0

  const durations = shifts.map(shift => {
    return calculateShiftNetHours(shift.start_time, shift.end_time, shift.break_duration_minutes)
  })

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
  return Math.round(avgDuration * 10) / 10 // Arrondi à 1 décimale
}

/**
 * Calcule le taux de no-show
 *
 * @param applications - Liste des applications avec no_show flag
 * @returns Taux de no-show en pourcentage (0-100)
 */
export function calculateNoShowRate(applications: ApplicationData[]): number {
  // Filtrer seulement les applications acceptées (employés qui devaient venir)
  const acceptedApplications = applications.filter(a => a.status === 'accepted')

  if (acceptedApplications.length === 0) return 0

  const noShowCount = acceptedApplications.filter(a => a.no_show === true).length
  return Math.round((noShowCount / acceptedApplications.length) * 100)
}

/**
 * Calcule le coût total des shifts (basé sur les shifts complétés et remplis)
 *
 * @param shifts - Liste des shifts
 * @param employees - Liste des employés avec verified_hourly_rate
 * @param shiftApplicationsMappings - Mapping shift_id -> user_id pour les employés acceptés
 * @returns Coût total en dollars
 */
export function calculateTotalShiftsCost(
  shifts: ShiftData[],
  employees: EmployeeData[],
  shiftApplicationsMappings: ShiftApplicationMapping[]
): number {
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

  // Calculer le coût total
  let totalCost = 0

  shifts.forEach(shift => {
    // Ne compter que les shifts complétés ou remplis
    if (shift.status !== 'completed' && shift.status !== 'filled') return

    const userId = shiftToEmployeeMap.get(shift.id)
    if (!userId) return

    const hourlyRate = employeeRatesMap.get(userId)
    if (!hourlyRate) return

    const effectiveDuration = calculateShiftNetHours(shift.start_time, shift.end_time, shift.break_duration_minutes)

    totalCost += effectiveDuration * hourlyRate
  })

  return Math.round(totalCost)
}

/**
 * Calcule le coût total des shifts pour les freelances
 *
 * @param shifts - Liste des shifts avec freelance_hourly_rate
 * @param freelancerApplications - Mapping shift_id -> freelancer_id pour les freelances acceptés
 * @returns Coût total en dollars
 */
export function calculateTotalFreelancerShiftsCost(
  shifts: ShiftData[],
  freelancerApplications: ApplicationData[]
): number {
  // Créer une map shift_id -> status pour les freelances acceptés
  // Note: freelancerApplications a été casté mais contient shift_id
  const shiftToFreelancerMap = new Map<string, boolean>()
  freelancerApplications.forEach(app => {
    if (app.shift_id && app.status === 'accepted') {
      shiftToFreelancerMap.set(app.shift_id, true)
    }
  })

  let totalCost = 0

  shifts.forEach(shift => {
    // Ne compter que les shifts complétés ou remplis
    if (shift.status !== 'completed' && shift.status !== 'filled') return

    // Vérifier si un freelance a été accepté pour ce shift
    if (!shiftToFreelancerMap.has(shift.id)) return

    const hourlyRate = shift.freelance_hourly_rate
    if (!hourlyRate) return

    const effectiveDuration = calculateShiftNetHours(shift.start_time, shift.end_time, shift.break_duration_minutes)

    totalCost += effectiveDuration * hourlyRate
  })

  return Math.round(totalCost)
}

/**
 * Calcule le coût moyen par shift
 *
 * @param shifts - Liste des shifts
 * @param employees - Liste des employés avec verified_hourly_rate
 * @param shiftApplicationsMappings - Mapping shift_id -> user_id pour les employés acceptés
 * @returns Coût moyen en dollars
 */
export function calculateAverageCostPerShift(
  shifts: ShiftData[],
  employees: EmployeeData[],
  shiftApplicationsMappings: ShiftApplicationMapping[]
): number {
  const totalCost = calculateTotalShiftsCost(shifts, employees, shiftApplicationsMappings)
  const shiftsWithCost = shifts.filter(s =>
    (s.status === 'completed' || s.status === 'filled') &&
    shiftApplicationsMappings.some(m => m.shift_id === s.id)
  ).length

  return shiftsWithCost > 0 ? Math.round(totalCost / shiftsWithCost) : 0
}

/**
 * Calcule le coût par établissement
 *
 * @param shifts - Liste des shifts avec establishment_id
 * @param employees - Liste des employés avec verified_hourly_rate
 * @param shiftApplicationsMappings - Mapping shift_id -> user_id pour les employés acceptés
 * @param establishments - Données des établissements avec nom
 * @returns Tableau des coûts par établissement
 */
export function calculateCostByEstablishment(
  shifts: ShiftData[],
  employees: EmployeeData[],
  shiftApplicationsMappings: ShiftApplicationMapping[],
  establishments: Array<{ establishment_id: string; establishment: { name: string } | null }>,
  freelancerApplications: ApplicationData[]
): EstablishmentCost[] {
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

  // Créer une map shift_id -> status pour les freelances
  const shiftToFreelancerMap = new Map<string, boolean>()
  freelancerApplications.forEach(app => {
    if (app.shift_id && app.status === 'accepted') {
      shiftToFreelancerMap.set(app.shift_id, true)
    }
  })

  // Créer une map establishment_id -> nom
  const establishmentNamesMap = new Map<string, string>()
  establishments.forEach(estab => {
    if (estab.establishment) {
      establishmentNamesMap.set(estab.establishment_id, estab.establishment.name)
    }
  })

  // Grouper par établissement
  const costByEstab = new Map<string, { cost: number; count: number }>()

  shifts.forEach(shift => {
    // Ne compter que les shifts complétés ou remplis
    if (shift.status !== 'completed' && shift.status !== 'filled') return
    if (!shift.establishment_id) return

    const userId = shiftToEmployeeMap.get(shift.id)
    const isFreelancing = shiftToFreelancerMap.has(shift.id)

    if (!userId && !isFreelancing) return

    let hourlyRate = 0
    if (userId) {
      hourlyRate = employeeRatesMap.get(userId) || 0
    } else if (isFreelancing) {
      hourlyRate = shift.freelance_hourly_rate || 0
    }

    if (hourlyRate === 0) return

    const effectiveDuration = calculateShiftNetHours(shift.start_time, shift.end_time, shift.break_duration_minutes)

    const shiftCost = effectiveDuration * hourlyRate

    if (!costByEstab.has(shift.establishment_id)) {
      costByEstab.set(shift.establishment_id, { cost: 0, count: 0 })
    }

    const stats = costByEstab.get(shift.establishment_id)!
    stats.cost += shiftCost
    stats.count++
  })

  // Convertir en tableau et trier par coût décroissant
  return Array.from(costByEstab.entries())
    .map(([establishment_id, stats]) => ({
      establishment_id,
      establishment_name: establishmentNamesMap.get(establishment_id) || 'Unknown',
      totalCost: Math.round(stats.cost),
      shiftsCount: stats.count
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
}

/**
 * Calcule tous les KPIs du dashboard
 *
 * @param shifts - Liste des shifts
 * @param allApplications - Applications pour le taux d'acceptation
 * @param topEmployeesApplications - Applications avec infos employés pour le top 5
 * @param activeEmployeesCount - Nombre d'employés actifs
 * @param pendingApplicationsCount - Nombre de candidatures en attente
 * @param ongoingShiftsCount - Nombre de shifts en cours aujourd'hui
 * @param establishmentsCount - Nombre d'établissements
 * @param subscriptionPlan - Plan d'abonnement de l'entreprise
 * @param employees - Liste des employés avec leur id et user_id pour le mapping
 * @param responseTimeData - Applications avec shift_id et applied_at pour calculer le temps de première réponse
 * @param shiftApplicationsMappings - Mapping shift_id -> user_id pour calculs de coûts
 * @param establishments - Données des établissements pour les noms
 * @returns Objet contenant tous les KPIs calculés
 */
export function calculateAllKPIs(
  shifts: ShiftData[],
  allApplications: ApplicationData[],
  topEmployeesApplications: ApplicationData[],
  activeEmployeesCount: number,
  pendingApplicationsCount: number,
  ongoingShiftsCount: number,
  establishmentsCount: number,
  subscriptionPlan: SubscriptionPlan,
  employees: EmployeeData[],
  responseTimeData: ApplicationData[],
  shiftApplicationsMappings: ShiftApplicationMapping[],
  freelancerApplications: ApplicationData[],
  establishments: Array<{ establishment_id: string; establishment: { name: string } | null }>,
  noShowApplications: ApplicationData[]
): DashboardKPIs {
  const totalShifts = shifts.length
  const fillRate = calculateFillRate(shifts)
  const avgFillTimeMinutes = calculateAvgFillTime(shifts)
  const estimatedValue = calculateEstimatedValue(shifts)
  const avgAcceptanceRate = calculateAvgAcceptanceRate(allApplications)
  const topEmployees = calculateTopEmployees(topEmployeesApplications, employees)
  const avgFirstResponseTimeMinutes = calculateAvgFirstResponseTime(shifts, responseTimeData)

  // Calculs des coûts
  const employeeCosts = calculateTotalShiftsCost(shifts, employees, shiftApplicationsMappings)
  const freelancerCosts = calculateTotalFreelancerShiftsCost(shifts, freelancerApplications)
  const totalShiftsCost = employeeCosts + freelancerCosts
  const completedOrFilledShifts = shifts.filter(s => s.status === 'completed' || s.status === 'filled')
  const averageCostPerShift = completedOrFilledShifts.length > 0 ? Math.round(totalShiftsCost / completedOrFilledShifts.length) : 0
  const costByEstablishment = calculateCostByEstablishment(shifts, employees, shiftApplicationsMappings, establishments, freelancerApplications)

  // Calculs de performance et qualité
  const avgShiftDurationHours = calculateAvgShiftDuration(shifts)
  const noShowRate = calculateNoShowRate(noShowApplications)

  const usage = calculateUsage(
    establishmentsCount,
    totalShifts,
    activeEmployeesCount,
    subscriptionPlan
  )

  return {
    totalShifts,
    fillRate,
    avgFillTimeMinutes,
    estimatedValue,
    totalShiftsCost,
    averageCostPerShift,
    employeeCosts,
    freelancerCosts,
    costByEstablishment,
    avgShiftDurationHours,
    noShowRate,
    activeEmployees: activeEmployeesCount,
    avgAcceptanceRate,
    topEmployees,
    avgFirstResponseTimeMinutes,
    pendingShifts: pendingApplicationsCount,
    ongoingShiftsToday: ongoingShiftsCount,
    usage
  }
}
