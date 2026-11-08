import { memo } from 'react'
import { TFunction } from 'i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Trophy, Medal, Award } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Employee {
  id: string
  name: string
  acceptanceRate: number
  totalShifts: number
}

interface TopEmployeesCardProps {
  employees: Employee[]
  title: string
  t: TFunction
  onEmployeeClick?: (employeeId: string) => void
}

const EmployeeRow = memo(({ employee, index, t, onClick }: {
  employee: Employee
  index: number
  t: TFunction
  onClick?: (id: string) => void
}) => {
  const medals = [
    { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { icon: Medal, color: 'text-muted-foreground', bg: 'bg-muted-foreground/10', border: 'border-muted-foreground/20' },
    { icon: Award, color: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/20' },
  ]

  const medal = medals[index]
  const MedalIcon = medal?.icon

  return (
    <div
      onClick={() => onClick?.(employee.id)}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border border-border/40 transition-all',
        onClick && 'cursor-pointer hover:bg-muted/50 hover:border-primary/40 hover:shadow-sm'
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {MedalIcon ? (
          <div className={cn(
            'w-9 h-9 flex items-center justify-center rounded-full border',
            medal.bg,
            medal.border
          )}>
            <MedalIcon className={cn('w-5 h-5', medal.color)} />
          </div>
        ) : (
          <div className="w-9 h-9 flex items-center justify-center bg-muted/50 text-muted-foreground font-bold rounded-full text-sm border border-border/40">
            {index + 1}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{employee.name}</p>
          <p className="text-xs text-muted-foreground">{employee.totalShifts} {t('dashboard.invitations')}</p>
        </div>
      </div>
      <div className="text-right ml-3">
        <p className="text-xl font-bold text-green-600 dark:text-green-400">{employee.acceptanceRate}%</p>
        <p className="text-xs text-muted-foreground">{t('dashboard.acceptance')}</p>
      </div>
    </div>
  )
})

EmployeeRow.displayName = 'EmployeeRow'

export const TopEmployeesCard = memo(function TopEmployeesCard({
  employees,
  title,
  t,
  onEmployeeClick
}: TopEmployeesCardProps) {
  if (employees.length === 0) return null

  return (
    <Card className="card-shadow border border-border/60">
      <CardHeader className="border-b border-border/40 bg-muted/20">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-3">
          {employees.map((emp, index) => (
            <EmployeeRow
              key={emp.id}
              employee={emp}
              index={index}
              t={t}
              onClick={onEmployeeClick}
            />
          ))}
        </div>
        {onEmployeeClick && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            {t('dashboard.clickEmployeeProfile')}
          </p>
        )}
      </CardContent>
    </Card>
  )
})
