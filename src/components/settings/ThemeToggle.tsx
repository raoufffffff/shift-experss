import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/Button'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('settings.appearance.title')}</CardTitle>
        <CardDescription className="text-sm">
          {t('settings.appearance.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Label>{t('settings.appearance.theme')}</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={resolvedTheme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Sun className="w-5 h-5" />
              <span className="text-sm">{t('settings.appearance.light')}</span>
            </Button>

            <Button
              variant={resolvedTheme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Moon className="w-5 h-5" />
              <span className="text-sm">{t('settings.appearance.dark')}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
