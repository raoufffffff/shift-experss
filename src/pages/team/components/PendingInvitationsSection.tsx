import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Mail,
  Building2,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Invitation } from '../types'

interface PendingInvitationsSectionProps {
  pendingInvitations: Invitation[]
  onCancelInvitation: (invitationId: string) => void
}

function getStatusBadge(status: string, t: (key: string) => string) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> {t('team.invitationStatus.pending')}</Badge>
    case 'accepted':
      return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> {t('team.invitationStatus.accepted')}</Badge>
    case 'expired':
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> {t('team.invitationStatus.expired')}</Badge>
    case 'cancelled':
      return <Badge variant="outline" className="gap-1"><XCircle className="w-3 h-3" /> {t('team.invitationStatus.cancelled')}</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function copyInvitationLink(token: string, t: (key: string) => string) {
  const link = `${window.location.origin}/invite/${token}`
  navigator.clipboard.writeText(link)
  toast.success(t('team.success.linkCopied'))
}

export function PendingInvitationsSection({
  pendingInvitations,
  onCancelInvitation,
}: PendingInvitationsSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-border bg-card">
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {t('team.invitations.title', { count: pendingInvitations.length })}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('team.invitations.description')}
          </p>
        </div>
        {pendingInvitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('team.invitations.noPending')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{invitation.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(invitation.status, t)}
                    <Badge variant="outline" className="text-xs capitalize">
                      {invitation.role}
                    </Badge>
                    {invitation.establishment && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {invitation.establishment.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('team.invitations.expiresOn', { date: new Date(invitation.expires_at).toLocaleDateString() })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyInvitationLink(invitation.token, t)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(t('team.invitations.confirmCancel'))) {
                        onCancelInvitation(invitation.id)
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
