/**
 * Récupération des données du dashboard depuis Supabase
 */

import { supabase } from '@/lib/supabase'
import type { DateRangeResult } from './dateRange'

export interface ShiftData {
  id: string
  status: string | null
  created_at: string | null
  filled_at: string | null
  start_time: string
  end_time: string
  break_duration_minutes: number | null
  published_at: string | null
  establishment_id: string | null
  freelance_hourly_rate: number | null
}

export interface ApplicationData {
  status: string | null
  user_id?: string
  shift_id?: string
  applied_at?: string | null
  reviewed_at?: string | null
  response_time_seconds?: number | null
  no_show?: boolean | null
  user?: {
    first_name: string | null
    last_name: string | null
  }
}

export interface EstablishmentShiftData {
  establishment_id: string
  establishment: {
    name: string
  } | null
}

export interface EmployeeData {
  id: string
  user_id: string
  verified_hourly_rate: number | null
}

export interface ShiftApplicationMapping {
  shift_id: string
  user_id: string
  status: string
}

export interface CriticalShift {
  id: string
  start_time: string
  end_time: string
  status: string
  position_name: string
  establishment_id: string
  establishment_name?: string | null
  required_employees: number
  filled_employees: number
  published_to_freelancers?: boolean | null
  freelance_hourly_rate?: number | null
  shift_freelancer_applications?: { status: string }[]
}

export interface SubscriptionData {
  subscription_plan: string | null
  subscription_interval: string | null
}

export interface DashboardRawData {
  shifts: ShiftData[]
  activeEmployeesCount: number
  ongoingShiftsCount: number
  shiftsByEstablishment: EstablishmentShiftData[]
  establishmentsCount: number
  allApplications: ApplicationData[]
  topEmployeesApplications: ApplicationData[]
  pendingApplicationsCount: number
  responseTimeData: ApplicationData[]
  employees: EmployeeData[]
  shiftApplicationsMappings: ShiftApplicationMapping[]
  freelancerApplications: ApplicationData[]
  criticalShifts: CriticalShift[]
  noShowApplications: ApplicationData[]
  subscription: SubscriptionData | null
}

/**
 * Récupère toutes les données nécessaires au dashboard en parallèle
 *
 * @param companyId - ID de l'entreprise
 * @param dateRange - Plage de dates calculée
 * @param selectedEstablishmentId - ID de l'établissement sélectionné (optionnel)
 * @param todayStart - Début de la journée en ISO
 * @param todayEnd - Fin de la journée en ISO
 * @returns Objet contenant toutes les données brutes du dashboard
 */
export async function fetchDashboardData(
  companyId: string,
  dateRange: DateRangeResult,
  selectedEstablishmentId: string | null,
  todayStart: string,
  todayEnd: string
): Promise<DashboardRawData> {
  // Calculer la date/heure dans 24h
  const now = new Date()
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

  // 🚀 OPTIMISATION: Paralléliser toutes les requêtes indépendantes
  const [
    shiftsResult,
    activeEmployeesResult,
    ongoingShiftsResult,
    shiftsByEstabResult,
    establishmentsCountResult,
    employeesResult,
    criticalShiftsResult,
    subscriptionResult
  ] = await Promise.all([
    // Requête shifts — bornée par la date range sélectionnée
    (() => {
      let q = supabase
        .from('shifts')
        .select('id, status, created_at, filled_at, start_time, end_time, break_duration_minutes, published_at, establishment_id, freelance_hourly_rate')
        .eq('company_id', companyId)
        .gte('start_time', dateRange.startDate.toISOString())
        .lte('start_time', dateRange.endDate.toISOString())
        .order('created_at', { ascending: false })
      if (selectedEstablishmentId) q = q.eq('establishment_id', selectedEstablishmentId)
      return q
    })(),

    // Employés actifs
    selectedEstablishmentId
      ? supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true).eq('establishment_id', selectedEstablishmentId)
      : supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),

    // Shifts en cours aujourd'hui
    selectedEstablishmentId
      ? supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'filled').gte('start_time', todayStart).lte('start_time', todayEnd).eq('establishment_id', selectedEstablishmentId)
      : supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'filled').gte('start_time', todayStart).lte('start_time', todayEnd),

    // Distribution par établissement — bornée par la date range
    supabase.from('shifts').select('establishment_id, establishment:establishments(name)').eq('company_id', companyId).gte('start_time', dateRange.startDate.toISOString()).lte('start_time', dateRange.endDate.toISOString()),

    // Calcul des limites d'usage
    supabase.from('establishments').select('*', { count: 'exact', head: true }).eq('company_id', companyId),

    // Récupérer tous les employés de l'entreprise
    supabase.from('employees').select('id, user_id, verified_hourly_rate').eq('company_id', companyId),

    // Shifts critiques
    selectedEstablishmentId
      ? supabase
        .from('shifts')
        .select('id, start_time, end_time, status, position_name, establishment_id, required_employees, filled_employees, published_to_freelancers, freelance_hourly_rate')
        .eq('company_id', companyId)
        .in('status', ['pending', 'partially_filled'])
        .gte('start_time', now.toISOString())
        .lte('start_time', in24Hours)
        .eq('establishment_id', selectedEstablishmentId)
      : supabase
        .from('shifts')
        .select('id, start_time, end_time, status, position_name, establishment_id, required_employees, filled_employees, published_to_freelancers, freelance_hourly_rate')
        .eq('company_id', companyId)
        .in('status', ['pending', 'partially_filled'])
        .gte('start_time', now.toISOString())
        .lte('start_time', in24Hours),

    // Données de subscription
    supabase
      .from('companies')
      .select('subscription_plan, subscription_interval')
      .eq('id', companyId)
      .maybeSingle()
  ])

  const { data: shiftsData } = shiftsResult
  const { count: activeEmployees } = activeEmployeesResult
  const { count: ongoingCount } = ongoingShiftsResult
  const { data: shiftsByEstab } = shiftsByEstabResult
  const { count: establishmentsCount } = establishmentsCountResult
  const { data: employeesData } = employeesResult
  const { data: subscriptionData } = subscriptionResult

  // Filter shifts based on actual filling (employees + accepted freelancers)
  // Note: shift_freelancer_applications is not included in the select above,
  // so only filled_employees (employee app count) is used here.
  const rawCriticalShifts = criticalShiftsResult.data || []
  const filteredCriticalShifts = rawCriticalShifts.filter((shift) => {
    const totalFilled = shift.filled_employees || 0
    return totalFilled < (shift.required_employees || 0)
  })

  // Enrichir les shifts critiques
  let enrichedCriticalShifts: CriticalShift[] = []
  if (filteredCriticalShifts.length > 0) {
    const establishmentIds = [...new Set(filteredCriticalShifts.map((s) => s.establishment_id).filter((id): id is string => id != null))]
    const { data: establishments } = await supabase
      .from('establishments')
      .select('id, name')
      .in('id', establishmentIds)

    const establishmentMap = new Map(establishments?.map(e => [e.id, e.name]) || [])

    enrichedCriticalShifts = filteredCriticalShifts.map((shift) => ({
      ...shift,
      status: shift.status ?? '',
      position_name: shift.position_name ?? '',
      establishment_id: shift.establishment_id ?? '',
      required_employees: shift.required_employees ?? 0,
      filled_employees: shift.filled_employees ?? 0,
      establishment_name: establishmentMap.get(shift.establishment_id ?? '') || null
    }))
  }

  const shifts = (shiftsData || []) as ShiftData[]
  const shiftIds = shifts.map(s => s.id)

  // Si pas de shifts, retourner des données vides
  if (shiftIds.length === 0) {
    return {
      shifts: [],
      activeEmployeesCount: activeEmployees || 0,
      ongoingShiftsCount: ongoingCount || 0,
      shiftsByEstablishment: [],
      establishmentsCount: establishmentsCount || 0,
      allApplications: [],
      topEmployeesApplications: [],
      pendingApplicationsCount: 0,
      responseTimeData: [],
      employees: (employeesData || []) as EmployeeData[],
      shiftApplicationsMappings: [],
      freelancerApplications: [],
      criticalShifts: enrichedCriticalShifts,
      noShowApplications: [],
      subscription: subscriptionData || null
    }
  }

  // 🚀 OPTIMISATION: Paralléliser toutes les requêtes qui dépendent de shiftIds
  const [
    allApplicationsResult,
    topEmployeesDataResult,
    pendingCountResult,
    responseDataResult,
    shiftApplicationsMappingsResult,
    noShowDataResult,
    freelancerApplicationsResult
  ] = await Promise.all([
    // Applications pour calcul du taux d'acceptation
    supabase
      .from('shift_applications')
      .select('status')
      .in('shift_id', shiftIds)
      .neq('status', 'pending'),

    // Top employés avec leurs stats
    supabase
      .from('shift_applications')
      .select(`
        user_id,
        status,
        user:users!shift_applications_user_id_fkey (
          first_name,
          last_name
        )
      `)
      .in('shift_id', shiftIds),

    // Candidatures en attente de validation
    supabase
      .from('shift_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'applied')
      .in('shift_id', shiftIds),

    // Distribution des temps de réponse
    supabase
      .from('shift_applications')
      .select('shift_id, status, applied_at, reviewed_at, response_time_seconds')
      .in('shift_id', shiftIds)
      .neq('status', 'pending'),

    // Mapping shift -> employé accepté
    supabase
      .from('shift_applications')
      .select('shift_id, user_id, status')
      .in('shift_id', shiftIds)
      .eq('status', 'accepted'),

    // Applications avec no-show
    supabase
      .from('shift_applications')
      .select('status, no_show')
      .in('shift_id', shiftIds)
      .eq('status', 'accepted'),

    // Freelancer applications
    supabase
      .from('shift_freelancer_applications')
      .select('shift_id, freelancer_id, status')
      .in('shift_id', shiftIds)
      .eq('status', 'accepted')
  ])

  const { data: allApplications } = allApplicationsResult
  const { data: topEmployeesData } = topEmployeesDataResult
  const { count: pendingCount } = pendingCountResult
  const { data: responseData } = responseDataResult
  const { data: shiftApplicationsMappingsData } = shiftApplicationsMappingsResult
  const { data: noShowData } = noShowDataResult
  const { data: freelancerApplicationsData } = freelancerApplicationsResult

  return {
    shifts,
    activeEmployeesCount: activeEmployees || 0,
    ongoingShiftsCount: ongoingCount || 0,
    shiftsByEstablishment: (shiftsByEstab || []) as EstablishmentShiftData[],
    establishmentsCount: establishmentsCount || 0,
    allApplications: (allApplications || []) as ApplicationData[],
    topEmployeesApplications: (topEmployeesData || []).map(a => ({
      status: a.status,
      user_id: a.user_id,
      user: a.user ? { first_name: a.user.first_name, last_name: a.user.last_name } : undefined,
    })),
    pendingApplicationsCount: pendingCount || 0,
    responseTimeData: (responseData || []) as ApplicationData[],
    employees: (employeesData || []) as EmployeeData[],
    shiftApplicationsMappings: (shiftApplicationsMappingsData || []) as ShiftApplicationMapping[],
    freelancerApplications: (freelancerApplicationsData || []).map(a => ({
      status: a.status,
      shift_id: a.shift_id,
    })),
    criticalShifts: enrichedCriticalShifts,
    noShowApplications: (noShowData || []) as ApplicationData[],
    subscription: subscriptionData || null
  }
}
