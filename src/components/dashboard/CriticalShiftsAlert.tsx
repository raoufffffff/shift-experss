import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Bell, Zap, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { useLocale } from '@/hooks/useLocale'
import { format, Locale } from 'date-fns'
import { fr, enUS, es, it, zhCN } from 'date-fns/locale'
import { formatTimeUTC } from '@/utils/formatTime'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import type { CriticalShift } from '@/utils/dashboard/fetchShifts'

export type { CriticalShift }

interface CriticalShiftsAlertProps {
  shifts: CriticalShift[]
  companyId: string
  onBoostShift?: (shift: CriticalShift) => void
}

export function CriticalShiftsAlert({ shifts, companyId, onBoostShift }: CriticalShiftsAlertProps) {
  const { t, i18n } = useTranslation()
  const { navigate } = useLocale()
  const [isSending, setIsSending] = useState(false)
  const [cooldownModal, setCooldownModal] = useState<{ open: boolean; minutes: number }>({ open: false, minutes: 0 })

  if (shifts.length === 0) {
    return null
  }

  const getDateLocale = (): Locale => {
    const localeMap: Record<string, Locale> = { 'fr': fr, 'en': enUS, 'es': es, 'it': it, 'zh': zhCN }
    return localeMap[i18n.language] || enUS
  }

  const extractDate = (datetime: string): Date => {
    const [datePart] = datetime.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const formatShiftDateTime = (datetime: string): string => {
    const date = format(extractDate(datetime), 'dd MMMM yyyy', { locale: getDateLocale() })
    const time = formatTimeUTC(datetime, i18n.language === 'en')
    const connector = i18n.language === 'en' ? 'at' : i18n.language === 'es' ? 'a las' : i18n.language === 'it' ? 'alle' : 'à'
    return `${date} ${connector} ${time}`
  }

  const handleSendReminders = async () => {
    setIsSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-batch-reminder', {
        body: {
          shift_ids: shifts.map(s => s.id),
          company_id: companyId,
        },
      })

      if (error) {
        // Rate limit returns as error with 429 status
        try {
          const errorBody = JSON.parse((error as any)?.context?.responseText || '{}')
          if (errorBody?.error === 'rate_limited') {
            const minutes = Math.ceil((errorBody.retryAfterSeconds || 0) / 60)
            setCooldownModal({ open: true, minutes })
            return
          }
        } catch { /* not rate limited */ }
        throw error
      }

      if (data?.error === 'rate_limited') {
        const retrySeconds = data.retryAfterSeconds || 0
        const minutes = Math.ceil(retrySeconds / 60)
        setCooldownModal({ open: true, minutes })
        return
      }

      if (data?.sent > 0) {
        const parts = []
        if (data.employees_notified > 0) parts.push(`${data.employees_notified} employé(s)`)
        if (data.freelancers_notified > 0) parts.push(`${data.freelancers_notified} freelance(s)`)
        toast.success(`Rappels envoyés à ${parts.join(' et ')}`)
      } else {
        toast.info(t('dashboard.noOneToRemind', { defaultValue: 'Aucun destinataire éligible pour le rappel' }))
      }
    } catch (error) {
      logger.error('Error sending batch reminders:', error)
      toast.error(t('dashboard.remindersError'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <div className="card-shadow border-2 border-red-500/20 rounded-lg overflow-hidden bg-red-50 dark:bg-red-950/20">
        <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-base font-semibold text-red-900 dark:text-red-100">
                {t('dashboard.criticalShifts')}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {t('dashboard.criticalShiftsDesc', { count: shifts.length })}
              </p>
            </div>
          </div>
          <button
            onClick={handleSendReminders}
            disabled={isSending}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            {t('dashboard.sendReminders')}
          </button>
        </div>
        <div className="p-4 space-y-2">
          {shifts.map(shift => (
            <div
              key={shift.id}
              className="p-3 bg-white dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800/50 flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {shift.position_name || t('dashboard.unknownPosition')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {shift.establishment_name || t('dashboard.unknownEstablishment')} • {formatShiftDateTime(shift.start_time)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {shift.published_to_freelancers && onBoostShift && (
                  <button
                    onClick={() => onBoostShift(shift)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-sm font-medium"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    {t('dashboard.boostShift')}
                  </button>
                )}
                <button
                  onClick={() => navigate(`/shifts/${shift.id}`)}
                  className="text-sm text-primary hover:underline"
                >
                  {t('dashboard.viewShift')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cooldown Modal */}
      <Dialog open={cooldownModal.open} onOpenChange={(open) => setCooldownModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              {t('dashboard.cooldownTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2 text-base leading-relaxed">
              {t('dashboard.cooldownMessage', { minutes: cooldownModal.minutes })}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {i18n.language === 'fr'
                ? 'Cette limite protège vos employés/freelances du spam de notifications. Vos rappels précédents ont bien été envoyés.'
                : 'This limit protects your employees/freelancers from notification spam. Your previous reminders were sent successfully.'}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCooldownModal({ open: false, minutes: 0 })}>
              {t('dashboard.cooldownOk')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
