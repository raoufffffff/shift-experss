/**
 * Utilities pour le dashboard
 * Centralise toutes les fonctions de calcul et de formatage des données du dashboard
 */

// Date range calculations
export {
  calculateDateRange,
  getTodayBounds,
  type DateRange,
  type DateRangeResult
} from './dateRange'

// Data fetching
export {
  fetchDashboardData,
  type ShiftData,
  type ApplicationData,
  type EstablishmentShiftData,
  type DashboardRawData
} from './fetchShifts'

// KPI calculations
export {
  calculateFillRate,
  calculateAvgFillTime,
  calculateEstimatedValue,
  calculateAvgAcceptanceRate,
  calculateTopEmployees,
  calculateTotalShiftsCost,
  calculateAverageCostPerShift,
  calculateCostByEstablishment,
  calculateAvgShiftDuration,
  calculateNoShowRate,
  calculateAllKPIs,
  type TopEmployee,
  type EstablishmentCost,
  type DashboardKPIs
} from './calculateKPIs'

// Chart formatting
export {
  formatShiftsTimeline,
  formatResponseTimeDistribution,
  formatShiftsByEstablishment,
  formatCostsTimeline,
  formatAllCharts,
  type ShiftTimelineData,
  type ResponseTimeDistribution,
  type ShiftsByEstablishment,
  type CostsTimelineData,
  type DashboardCharts
} from './formatCharts'
