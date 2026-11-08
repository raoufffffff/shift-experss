import { Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { useTranslation } from 'react-i18next'

interface RestrictedAccessProps {
  title?: string
  description?: string
}

export function RestrictedAccess({ title, description }: RestrictedAccessProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-center h-96">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">
            {title || t('team.accessRestricted.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description || t('team.accessRestricted.description')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
