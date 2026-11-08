// src/components/shifts/ExtendShiftDialog.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Clock, Loader2 } from 'lucide-react'

interface ExtendShiftDialogProps {
  shift: {
    id: string
    end_time: string
    event_id?: string | null
    is_extended?: boolean | null
    company_id: string
    establishment_id: string
    position_name?: string | null
    job_position_id?: string | null
    freelance_hourly_rate?: number | null
    break_duration_minutes: number
    required_employees: number
    description?: string | null
    targets_employees?: boolean | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExtendShiftDialog({ shift, open, onOpenChange }: ExtendShiftDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [hours, setHours] = useState(1)

  const extendMutation = useMutation({
    mutationFn: async () => {
      const newStartTime = shift.end_time
      const newEndTime = new Date(
        new Date(shift.end_time).getTime() + hours * 60 * 60 * 1000
      ).toISOString()

      // 1. Déterminer l'event_id
 
      
        const { error: updateError } = await supabase
          .from('shifts')
          .update({ is_extended: true})
          .eq('id', shift.id)

        if (updateError) throw updateError
      

      // 2. Créer le nouveau shift
      const { data: newShift, error: insertError } = await supabase
        .from('shifts')
        .insert({
          company_id: shift.company_id,
          establishment_id: shift.establishment_id,
          start_time: newStartTime,
          end_time: newEndTime,
           position_name: shift.position_name,
          job_position_id: shift.job_position_id,
          freelance_hourly_rate: shift.freelance_hourly_rate,
          break_duration_minutes: 0,
          required_employees: shift.required_employees,
          description: shift.description,
          targets_employees: shift.targets_employees,
          status: 'completed',
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // 3. Récupérer les employés acceptés
      const { data: acceptedEmployees } = await supabase
        .from('shift_applications')
        .select('user_id, reviewed_by')
        .eq('shift_id', shift.id)
        .eq('status', 'accepted')

      // 4. Récupérer les freelancers acceptés
      const { data: acceptedFreelancers } = await supabase
        .from('shift_freelancer_applications')
        .select('freelancer_id')
        .eq('shift_id', shift.id)
        .eq('status', 'accepted')

      // 5. Insérer les employés dans le nouveau shift
 if (acceptedEmployees?.length) {
  const { error } = await supabase
    .from('shift_applications')
    .insert(
      acceptedEmployees.map((emp) => ({
        shift_id: newShift.id,
        user_id: emp.user_id,
        status: 'accepted' as never,
        applied_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: emp.reviewed_by,
      })) as never[]
    )
  if (error) throw error
}

// 6. Insérer les freelancers dans le nouveau shift
 if (acceptedFreelancers?.length) {
  const { error } = await supabase
    .from('shift_freelancer_applications')
    .upsert(
      acceptedFreelancers.map((free) => ({
        shift_id: newShift.id,
        freelancer_id: free.freelancer_id,
        status: 'accepted' as never,
        applied_at: new Date().toISOString(),
        responded_at: new Date().toISOString(),
      })) as never[],
      { onConflict: 'shift_id,freelancer_id' }
    )
  if (error) throw error
}
    },
    onSuccess: () => {
      toast.success(
        t('shifts.extend.success', { defaultValue: 'Shift prolongé avec succès' })
      )
      queryClient.invalidateQueries({ queryKey: ['shift', shift.id] })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            {t('shifts.extend.title', { defaultValue: 'Prolonger le shift' })}
          </DialogTitle>
          <DialogDescription>
            {t('shifts.extend.description', {
              defaultValue: 'Créez un shift de prolongation à partir de la fin du shift actuel.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Fin actuelle */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
            <span className="text-muted-foreground">
              {t('shifts.extend.currentEnd', { defaultValue: 'Fin actuelle :' })}
            </span>
            <span className="font-semibold ml-2">
              {new Date(shift.end_time).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Slider */}
          <div className="space-y-3">
            <Label>
              {t('shifts.extend.hoursLabel', { defaultValue: 'Durée de la prolongation' })}
            </Label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full h-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1h</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                +{hours}h
              </span>
              <span>5h</span>
            </div>
          </div>

          {/* Résumé */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('shifts.extend.newStart', { defaultValue: 'Nouveau début :' })}
              </span>
              <span className="font-semibold">
                {new Date(shift.end_time).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('shifts.extend.newEnd', { defaultValue: 'Nouvelle fin :' })}
              </span>
              <span className="font-semibold">
                {new Date(
                  new Date(shift.end_time).getTime() + hours * 60 * 60 * 1000
                ).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={extendMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => extendMutation.mutate()}
            disabled={extendMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {extendMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.processing', { defaultValue: 'Traitement...' })}
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                {t('shifts.extend.confirm', { defaultValue: 'Prolonger' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}