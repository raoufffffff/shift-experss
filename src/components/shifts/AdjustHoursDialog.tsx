import { useState, useEffect } from 'react'
import { calculateShiftNetHours, formatShiftHours } from '@shared/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'
import { Clock, Loader2, AlertCircle } from 'lucide-react'
import { logger } from '@/utils/logger'
import { useTranslation } from 'react-i18next'

interface Shift {
  id: string
  start_time: string
  end_time: string
  break_duration_minutes: number
  actual_start_time?: string | null
  actual_end_time?: string | null
  actual_break_duration_minutes?: number | null
  adjustment_reason?: string | null
}

interface AdjustHoursDialogProps {
  shift: Shift
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdjustHoursDialog({ shift, open, onOpenChange }: AdjustHoursDialogProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  // Convert timestamp to datetime-local format (YYYY-MM-DDTHH:mm)
  const toDatetimeLocal = (timestamp: string): string => {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Initialize form with adjusted hours if they exist, otherwise use theoretical hours
  const [actualStartTime, setActualStartTime] = useState<string>(
    shift.actual_start_time ? toDatetimeLocal(shift.actual_start_time) : toDatetimeLocal(shift.start_time)
  )
  const [actualEndTime, setActualEndTime] = useState<string>(
    shift.actual_end_time ? toDatetimeLocal(shift.actual_end_time) : toDatetimeLocal(shift.end_time)
  )
  const [actualBreakDuration, setActualBreakDuration] = useState<number>(
    shift.actual_break_duration_minutes ?? shift.break_duration_minutes
  )
  const [reason, setReason] = useState<string>(shift.adjustment_reason || '')

  // Reset form when dialog opens or shift changes
  useEffect(() => {
    if (open) {
      // Priorité aux horaires ajustés, sinon horaires théoriques
      setActualStartTime(
        shift.actual_start_time ? toDatetimeLocal(shift.actual_start_time) : toDatetimeLocal(shift.start_time)
      )
      setActualEndTime(
        shift.actual_end_time ? toDatetimeLocal(shift.actual_end_time) : toDatetimeLocal(shift.end_time)
      )
      setActualBreakDuration(shift.actual_break_duration_minutes ?? shift.break_duration_minutes)
      setReason(shift.adjustment_reason || '')
    }
  }, [open, shift])


  // Calculate theoretical and actual durations
  const theoreticalDuration = calculateShiftNetHours(shift.start_time, shift.end_time, shift.break_duration_minutes)
  const actualDuration = calculateShiftNetHours(
    actualStartTime || shift.start_time,
    actualEndTime || shift.end_time,
    actualBreakDuration
  )
  const diffMinutes = Math.round((actualDuration - theoreticalDuration) * 60)

  const adjustHoursMutation = useMutation({
    mutationFn: async () => {
      if (!actualStartTime || !actualEndTime) {
        throw new Error(t('common.required'))
      }

      if (new Date(actualEndTime) <= new Date(actualStartTime)) {
        throw new Error(t('adjustHoursDialog.endAfterStart'))
      }

      if (actualBreakDuration < 0) {
        throw new Error(t('errors.validationError'))
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t('errors.unauthorized'))

      // Convert datetime-local strings to ISO strings (local → UTC via toISOString)
      const actualStartUTC = new Date(actualStartTime).toISOString()
      const actualEndUTC = new Date(actualEndTime).toISOString()

      // Update shift with actual hours
      const { error: updateError } = await supabase
        .from('shifts')
        .update({
          actual_start_time: actualStartUTC,
          actual_end_time: actualEndUTC,
          actual_break_duration_minutes: actualBreakDuration,
          hours_adjusted_by: user.id,
          hours_adjusted_at: new Date().toISOString(),
          adjustment_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shift.id)

      if (updateError) throw updateError

      // Send notification email to employee
      logger.log('Sending hours adjustment notification for shift:', shift.id)
      const { data: emailResult, error: notificationError } = await supabase.functions.invoke('send-hours-adjustment-notification', {
        body: { shift_id: shift.id },
      })

      if (notificationError) {
        logger.error('Error sending notification:', notificationError)
        toast.warning(t('adjustHoursDialog.success'), {
          description: t('adjustHoursDialog.contactEmployeeDirectly')
        })
      } else {
        logger.log('Email sent successfully:', emailResult)
      }
    },
    onSuccess: () => {
      toast.success(t('adjustHoursDialog.success'), {
        description: t('adjustHoursDialog.successNotification'),
      })
      queryClient.invalidateQueries({ queryKey: ['shift', shift.id] })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(t('adjustHoursDialog.error'), {
        description: error instanceof Error ? error.message : t('errors.genericError'),
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    adjustHoursMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            {t('adjustHoursDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('adjustHoursDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Theoretical hours (read-only) */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('adjustHoursDialog.theoreticalHours')}</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('adjustHoursDialog.startLabel')}:</span>
                <p className="font-medium text-foreground">
                  {new Date(shift.start_time).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('adjustHoursDialog.endLabel')}:</span>
                <p className="font-medium text-foreground">
                  {new Date(shift.end_time).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border">
              <span className="text-muted-foreground text-sm">{t('adjustHoursDialog.durationLabel')}:</span>
              <p className="font-semibold text-foreground">{formatShiftHours(theoreticalDuration)}</p>
            </div>
          </div>

          {/* Actual hours (editable) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">{t('adjustHoursDialog.actualHours')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actual-start-time">{t('adjustHoursDialog.actualStart')} *</Label>
                <Input
                  id="actual-start-time"
                  type="datetime-local"
                  value={actualStartTime}
                  onChange={(e) => setActualStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual-end-time">{t('adjustHoursDialog.actualEnd')} *</Label>
                <Input
                  id="actual-end-time"
                  type="datetime-local"
                  value={actualEndTime}
                  onChange={(e) => setActualEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Break hidden */}

            <div className="space-y-2">
              <Label htmlFor="reason">{t('adjustHoursDialog.reason')}</Label>
              <Textarea
                id="reason"
                placeholder={t('adjustHoursDialog.reasonPlaceholder')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Duration comparison */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h3 className="text-sm font-semibold text-orange-900 mb-3">{t('adjustHoursDialog.summary')}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-orange-700">{t('adjustHoursDialog.theoreticalDuration')}:</span>
                <p className="font-semibold text-orange-900">{formatShiftHours(theoreticalDuration)}</p>
              </div>
              <div>
                <span className="text-orange-700">{t('adjustHoursDialog.actualDuration')}:</span>
                <p className="font-semibold text-orange-900">{formatShiftHours(actualDuration)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-orange-300">
              <span className="text-orange-700 text-sm">{t('adjustHoursDialog.difference')}:</span>
              <p className="font-bold text-lg text-orange-900">
                {diffMinutes > 0 ? `+${diffMinutes} min` : diffMinutes < 0 ? `${diffMinutes} min` : t('adjustHoursDialog.noDifference')}
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">{t('adjustHoursDialog.warning')}</p>
              <p className="text-blue-700">
                {t('adjustHoursDialog.warningDescription')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={adjustHoursMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={adjustHoursMutation.isPending} className="bg-orange-600 hover:bg-orange-700">
              {adjustHoursMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('adjustHoursDialog.adjusting')}
                </>
              ) : (
                t('adjustHoursDialog.adjust')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
