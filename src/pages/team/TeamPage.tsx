import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { toast } from 'sonner'
import {
  UserPlus,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Info,
} from 'lucide-react'
import { RestrictedAccess } from '@/components/access/RestrictedAccess'
import { TeamSkeleton } from '@/components/skeletons/TeamSkeleton'
import { useTeamData } from './hooks/useTeamData'
import { useSendInvitation, useCancelInvitation, useRemoveMember } from './hooks/useTeamMutations'
import { TeamMembersSection } from './components/TeamMembersSection'
import { PendingInvitationsSection } from './components/PendingInvitationsSection'
import { InviteDialog } from './components/InviteDialog'

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

export function TeamPage() {
  const { t } = useTranslation()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('manager')
  const [names, setNamesState] = useState({
    first_name: "",
    last_name: "",
  })

  const {
    user,
    company,
    teamMembers,
    loadingMembers,
    invitations,
    pendingInvitations,
    loadingInvitations,
    establishments,
  } = useTeamData()

  const sendInvitationMutation = useSendInvitation({
    email,
    selectedEstablishment,
    selectedRole,
    establishments, 
    names,
    onSuccess: () => {
      setEmail('')
      setSelectedEstablishment('all')
      setInviteDialogOpen(false)
    },
  })

  const cancelInvitationMutation = useCancelInvitation()
  const removeMemberMutation = useRemoveMember()

  // Check if company and user exist
  if (!company || !user) {
    return <TeamSkeleton />
  }

  // Check if user is admin (only admins can manage team)
  const isAdmin = user.role === 'admin'

  if (!isAdmin) {
    return <RestrictedAccess />
  }

  if (loadingMembers || loadingInvitations) {
    return <TeamSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('team.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('team.subtitle')}
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          {t('team.inviteManager')}
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/30 dark:border-purple-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-purple-900 dark:text-purple-300 space-y-1">
              <p className="font-medium">{t('team.infoCard.title')}</p>
              <p className="text-purple-700 dark:text-purple-400">{t('team.infoCard.description')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TeamMembersSection
          teamMembers={teamMembers}
          onRemoveMember={(memberId) => removeMemberMutation.mutate(memberId)}
        />
        <PendingInvitationsSection
          pendingInvitations={pendingInvitations}
          onCancelInvitation={(invitationId) => cancelInvitationMutation.mutate(invitationId)}
        />
      </div>

      {/* All Invitations History */}
      {invitations.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-border bg-card">
          <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary" />
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold">{t('team.history.title')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('team.history.description')}
              </p>
            </div>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{invitation.email}</p>
                      {getStatusBadge(invitation.status, t)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {invitation.role}
                      </Badge>
                      {invitation.establishment ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {invitation.establishment.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('team.teamMembers.allEstablishments')}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        • {t('team.history.sentOn', { date: new Date(invitation.created_at).toLocaleDateString() })}
                      </span>
                    </div>
                  </div>
                  {invitation.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyInvitationLink(invitation.token, t)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        email={email}
        names={names}
        setNames={setNamesState}
        onEmailChange={setEmail}
        selectedEstablishment={selectedEstablishment}
        onEstablishmentChange={setSelectedEstablishment}
        establishments={establishments}
        onSend={() => sendInvitationMutation.mutate()}
        isSending={sendInvitationMutation.isPending}
      />
    </div>
  )
}
