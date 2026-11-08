import { useTranslation } from 'react-i18next'

interface ReliabilityGaugeProps {
  score: number // 0-100
}

export function ReliabilityGauge({ score }: ReliabilityGaugeProps) {
  const { t } = useTranslation()

  // Clamper le score entre 0 et 100
  const clampedScore = Math.max(0, Math.min(100, score))

  // Calculer l'angle pour le point indicateur (180° = demi-cercle)
  const angle = (clampedScore / 100) * 180

  // Calculer la position du point sur l'arc (rayon de 80px)
  const radius = 80
  const angleRad = ((180 - angle) * Math.PI) / 180
  const pointX = 100 + radius * Math.cos(angleRad)
  const pointY = 100 - radius * Math.sin(angleRad)

  // Déterminer la couleur et le label selon le score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return t('employees.reliability.excellent')
    if (score >= 60) return t('employees.reliability.good')
    if (score >= 40) return t('employees.reliability.average')
    return t('employees.reliability.poor')
  }

  return (
    <div className="flex flex-col items-center">
      {/* Titre */}
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
        {t('employees.reliability.label')}
      </h3>

      {/* SVG Gauge */}
      <svg width="200" height="120" viewBox="0 0 200 120" className="overflow-visible">
        <defs>
          {/* Dégradé de couleur pour l'arc */}
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="33%" stopColor="#f59e0b" />
            <stop offset="66%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Arc de fond (gris clair) */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Arc coloré avec dégradé */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Point indicateur */}
        <circle
          cx={pointX}
          cy={pointY}
          r="8"
          fill="hsl(var(--foreground))"
          className="drop-shadow-md"
        />
      </svg>

      {/* Score et label */}
      <div className="text-center -mt-16">
        <div className={`text-4xl font-bold ${getScoreColor(clampedScore)}`}>
          {clampedScore}
        </div>
      </div>
      <div className="text-center mt-4">
        <div className="text-sm text-muted-foreground font-medium">
          {getScoreLabel(clampedScore)}
        </div>
      </div>
    </div>
  )
}
