/**
 * Calcul des plages de dates pour le dashboard
 */

export type DateRange = 'today' | '7d' | '30d' | '90d' | 'custom'

export interface DateRangeResult {
  startDate: Date
  endDate: Date
  daysCount: number
}

/**
 * Calcule la plage de dates en fonction du type de range sélectionné
 *
 * @param dateRange - Type de plage de dates ('today', '7d', '30d', '90d', 'custom')
 * @param customStartDate - Date de début personnalisée (requis si dateRange === 'custom')
 * @param customEndDate - Date de fin personnalisée (requis si dateRange === 'custom')
 * @returns Objet contenant startDate, endDate et daysCount
 *
 * @example
 * // Pour les 30 derniers jours
 * const range = calculateDateRange('30d')
 * // range = { startDate: Date(J-29), endDate: Date(now), daysCount: 30 }
 *
 * // Pour une plage personnalisée
 * const range = calculateDateRange('custom', new Date('2024-01-01'), new Date('2024-01-31'))
 * // range = { startDate: Date('2024-01-01'), endDate: Date('2024-01-31'), daysCount: 31 }
 */
export function calculateDateRange(
  dateRange: DateRange,
  customStartDate?: Date | null,
  customEndDate?: Date | null
): DateRangeResult {
  const now = new Date()
  let startDate: Date
  let endDate: Date
  let daysCount: number

  if (dateRange === 'custom' && customStartDate && customEndDate) {
    startDate = customStartDate
    endDate = customEndDate
    daysCount = Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
  } else if (dateRange === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    endDate = now
    daysCount = 1
  } else {
    // ✅ FIX: Pour avoir N jours incluant aujourd'hui, on part de J-(N-1)
    // Ex: pour 30 jours, on va de J-29 à J (30 jours au total)
    daysCount = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    startDate = new Date(now.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000)
    endDate = now
  }

  return {
    startDate,
    endDate,
    daysCount
  }
}

/**
 * Calcule les bornes de la journée en cours (00:00:00 à 23:59:59)
 * Utilisé pour les requêtes de shifts "aujourd'hui"
 *
 * @returns Objet contenant les timestamps ISO de début et fin de journée
 *
 * @example
 * const { todayStart, todayEnd } = getTodayBounds()
 * // todayStart = '2024-01-15T00:00:00.000Z'
 * // todayEnd = '2024-01-15T23:59:59.000Z'
 */
export function getTodayBounds(): { todayStart: string; todayEnd: string } {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

  return {
    todayStart,
    todayEnd
  }
}
