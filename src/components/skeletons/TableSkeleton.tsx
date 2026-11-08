import { Skeleton } from '@/components/ui/Skeleton'
import { Card, CardContent } from '@/components/ui/Card'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
}

export function TableSkeleton({ rows = 5, columns = 4, showHeader = true }: TableSkeletonProps) {
  return (
    <Card className="card-shadow border border-border/60">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            {showHeader && (
              <thead className="border-b border-border/40 bg-muted/20">
                <tr>
                  {Array.from({ length: columns }).map((_, i) => (
                    <th key={i} className="p-4 text-left">
                      <Skeleton className="h-4 w-24" />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border/40 last:border-0">
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <td key={colIndex} className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
