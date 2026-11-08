import { TFunction } from 'i18next'

interface DashboardData {
  totalShifts: number
  fillRate: number
  avgFillTimeMinutes: number
  avgAcceptanceRate: number
  activeEmployees: number
  responseTimeDistribution: Array<{
    label: string
    count: number
  }>
}

export function generateInsights(data: DashboardData, t: TFunction): string[] {
  const insights: string[] = []

  // Ne pas afficher d'insights s'il n'y a pas de données
  if (data.totalShifts === 0) {
    return insights
  }

  // Insight sur le taux de remplissage
  if (data.fillRate >= 90) {
    insights.push(t('dashboard.insights.excellentFillRate', { rate: data.fillRate }))
  } else if (data.fillRate < 70) {
    insights.push(t('dashboard.insights.lowFillRate', { rate: data.fillRate }))
  }

  // Insight sur le temps de remplissage (seulement si on a des données significatives)
  if (data.avgFillTimeMinutes > 0 && data.avgFillTimeMinutes < 30) {
    insights.push(t('dashboard.insights.fastFillTime'))
  } else if (data.avgFillTimeMinutes > 120) {
    insights.push(t('dashboard.insights.slowFillTime'))
  }

  // Insight sur la réactivité
  const totalResponses = data.responseTimeDistribution.reduce((acc, item) => acc + item.count, 0)
  const fastResponses = data.responseTimeDistribution
    .filter(item => item.label.includes('5min') || item.label.includes('15min'))
    .reduce((acc, item) => acc + item.count, 0)

  if (totalResponses > 0) {
    const fastResponseRate = Math.round((fastResponses / totalResponses) * 100)
    if (fastResponseRate >= 70) {
      insights.push(t('dashboard.insights.highReactivity', { rate: fastResponseRate }))
    }
  }

  // Insight sur l'équipe
  if (data.activeEmployees < 5) {
    insights.push(t('dashboard.insights.smallTeam'))
  }

  // Insight sur le taux d'acceptation
  if (data.avgAcceptanceRate >= 80) {
    insights.push(t('dashboard.insights.highEngagement'))
  } else if (data.avgAcceptanceRate < 50) {
    insights.push(t('dashboard.insights.lowEngagement'))
  }

  // Limiter à 2 insights pour ne pas surcharger
  return insights.slice(0, 2)
}
