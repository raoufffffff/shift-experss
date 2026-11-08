import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea' // adjust import to your actual component
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface DisputePaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  applicationId: string | null
  // Shown in the dialog so the company can confirm which payment
  // they're about to dispute before submitting.
  workerName?: string
  amount?: number
  // CHANGE (event grouping): optional hint from the caller (PayrollView
  // already knows payment_group_id per row) so the warning copy below
  // can be shown BEFORE submission, not just in the success toast
  // after. Purely informational — the actual eligibility re-check and
  // blocking behavior happen server-side regardless of this prop.
  isPartOfEventGroup?: boolean
}

// Raises an in-app dispute on a shift_freelancer_applications row —
// see migration 003_company_dispute.sql. Setting company_disputed_at
// is what actually blocks process-freelancer-transfers from picking
// up this row (checked in both its SQL query and its defense-in-depth
// JS filter). No refund, reversal, or other financial action happens
// here — this only stops the pending transfer and queues the row for
// an admin to review and decide the outcome manually.
//
// CHANGE (event grouping — consecutive shifts sharing event_id):
// process-freelancer-transfers now blocks the transfer for the WHOLE
// payment group if ANY single member has company_disputed_at set —
// grouped shifts are paid out as one combined transfer, so there's no
// meaningful way to hold back only the disputed day's share. This
// dialog still only ever writes company_disputed_at onto the ONE
// application the company clicked dispute on (unchanged) — the
// group-wide effect happens automatically downstream, in the transfer
// cron's eligibility check, not here. We just fetch payment_group_id
// so the confirmation copy can warn the company about that
// consequence up front, rather than surprising them later.
export function DisputePaymentDialog({
  isOpen,
  onClose,
  applicationId,
  workerName,
  amount,
  isPartOfEventGroup,
}: DisputePaymentDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  // Populated by the eligibility re-check inside the mutation below —
  // we don't know whether this application belongs to a group until
  // then, so this starts null and is only ever used for display in a
  // toast/description AFTER a successful dispute, not to gate the
  // action itself (the actual blocking happens server-side in
  // process-freelancer-transfers regardless of what the UI shows).
  const [groupSize, setGroupSize] = useState<number | null>(null)

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (!applicationId) throw new Error('No application selected')
      if (!reason.trim()) throw new Error('Reason is required')

      // Server-side re-check of eligibility, independent of whatever
      // the UI already filtered on (isDisputeEligible in PayrollView).
      // A client-side check alone only controls what's shown — it does
      // not stop a direct request. This mirrors process-freelancer-transfers'
      // own eligibility window exactly (shift.status === 'completed'
      // AND within 48h of shift.end_time), so a dispute can never be
      // raised on a mission that hasn't happened yet or one whose
      // transfer has very likely already gone out.
      const { data: application, error: fetchError } = await supabase
        .from('shift_freelancer_applications')
        .select('id, payment_status, company_disputed_at, payment_group_id, shift:shifts!inner(status, end_time)')
        .eq('id', applicationId)
        .single()

      if (fetchError || !application) throw new Error('Application not found')

      const shift = (application as any).shift as { status: string; end_time: string } | null
      if (!shift || shift.status !== 'completed') {
        throw new Error('Cette mission n\'est pas encore terminée.')
      }
      const hoursSinceEnd = (Date.now() - new Date(shift.end_time).getTime()) / (1000 * 60 * 60)
      if (hoursSinceEnd < 0 || hoursSinceEnd >= 48) {
        throw new Error('Le délai de contestation (48h) est dépassé.')
      }

      // CHANGE (event grouping): if this application belongs to a
      // payment group, count how many shifts it covers so we can warn
      // the company that disputing this one shift holds up the whole
      // group's transfer, not just this shift's share.
      const paymentGroupId = (application as any).payment_group_id as string | null
      if (paymentGroupId) {
        const { count } = await supabase
          .from('shift_freelancer_applications')
          .select('id', { count: 'exact', head: true })
          .eq('payment_group_id', paymentGroupId)
        setGroupSize(count ?? null)
      }

      const { error } = await supabase
        .from('shift_freelancer_applications')
        .update({
          company_disputed_at: new Date().toISOString(),
          company_dispute_reason: reason.trim(),
        })
        .eq('id', applicationId)
        // Guard: only dispute a row that hasn't already been disputed
        // or already transferred — a transfer that already went out
        // can't be stopped by this in-app flag (that scenario needs
        // the Stripe-level dispute/refund path instead, handled by
        // stripe-webhook's charge.dispute.created case).
        .is('company_disputed_at', null)
        .neq('payment_status', 'transferred')
        .select('id')
        .maybeSingle()

      if (error) throw error

      return { groupSize: paymentGroupId ? (groupSize ?? undefined) : undefined }
    },
    onSuccess: (data) => {
      // Refresh whatever queries the payroll view uses so the disputed
      // row's status updates without a manual page reload.
      queryClient.invalidateQueries({ queryKey: ['payroll-freelancers'] })
      queryClient.invalidateQueries({ queryKey: ['company-payments-v2'] })

      // CHANGE (event grouping): if this shift was part of a group,
      // make the group-wide consequence explicit in the confirmation
      // toast instead of only confirming the single shift.
      const groupSizeResult = data?.groupSize
      toast.success(
        groupSizeResult && groupSizeResult > 1
          ? t('payroll.dispute.successGroup', {
              defaultValue:
                'Contestation enregistrée — le versement des {{count}} missions liées à cet événement est suspendu le temps que notre équipe examine votre contestation.',
              count: groupSizeResult,
            })
          : t('payroll.dispute.success', {
              defaultValue: 'Contestation enregistrée — notre équipe va examiner ce paiement.',
            }),
      )
      setReason('')
      setGroupSize(null)
      onClose()
    },
    onError: (error: unknown) => {
      toast.error(
        t('payroll.dispute.error', { defaultValue: 'Erreur lors de la contestation' }),
        { description: error instanceof Error ? error.message : undefined },
      )
    },
  })

  const handleClose = () => {
    if (disputeMutation.isPending) return // don't allow closing mid-submit
    setReason('')
    setGroupSize(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            {t('payroll.dispute.title', { defaultValue: 'Contester ce paiement' })}
          </DialogTitle>
          <DialogDescription>
            {t('payroll.dispute.description', {
              defaultValue:
                "Le versement au freelance sera suspendu le temps que notre équipe examine votre contestation. Aucun montant ne sera débité ou remboursé automatiquement — un membre de notre équipe vous recontactera pour la suite.",
            })}
          </DialogDescription>
        </DialogHeader>

        {(workerName || amount != null) && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            {workerName && <p className="font-medium">{workerName}</p>}
            {amount != null && (
              <p className="text-muted-foreground">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)}
              </p>
            )}
          </div>
        )}

        {/* CHANGE (event grouping): warn upfront, before submission,
            that this shift is part of a multi-day mission paid as one
            group — disputing it holds up the WHOLE group's transfer,
            not just this shift's share. */}
        {isPartOfEventGroup && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {t('payroll.dispute.groupWarning', {
              defaultValue:
                "Cette mission fait partie d'un événement à plusieurs jours réglé en une seule fois. Contester ce jour suspendra le versement de l'événement entier, pas seulement de ce jour.",
            })}
          </div>
        )}

        <div className="space-y-2 py-2">
          <label htmlFor="dispute-reason" className="text-sm font-medium">
            {t('payroll.dispute.reasonLabel', { defaultValue: 'Motif de la contestation' })}
          </label>
          <Textarea
            id="dispute-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('payroll.dispute.reasonPlaceholder', {
              defaultValue: "Ex : le freelance n'était pas présent, mission non conforme...",
            })}
            rows={4}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={disputeMutation.isPending}>
            {t('common.cancel', { defaultValue: 'Annuler' })}
          </Button>
          <Button
            variant="destructive"
            onClick={() => disputeMutation.mutate()}
            disabled={disputeMutation.isPending || !reason.trim()}
          >
            {disputeMutation.isPending
              ? t('payroll.dispute.submitting', { defaultValue: 'Envoi...' })
              : t('payroll.dispute.submit', { defaultValue: 'Confirmer la contestation' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}