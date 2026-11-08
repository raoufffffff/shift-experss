import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Users, Building2, Trash2 } from 'lucide-react'
import type { TeamMember } from '../types'

interface TeamMembersSectionProps {
  teamMembers: TeamMember[]
  onRemoveMember: (memberId: string) => void
}

export function TeamMembersSection({ teamMembers, onRemoveMember }: TeamMembersSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-border bg-card">
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('team.teamMembers.title', { count: teamMembers.length })}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('team.teamMembers.description')}
          </p>
        </div>
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('team.teamMembers.noMembers')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {member.first_name && member.last_name
                        ? `${member.first_name} ${member.last_name}`
                        : member.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize">
                        {member.role === 'admin' ? t('team.roles.admin') : t('team.roles.manager')}
                      </Badge>
                      {member.establishment ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {member.establishment.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('team.teamMembers.allEstablishments')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {member.role !== 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(t('team.teamMembers.confirmRemove'))) {
                        onRemoveMember(member.id)
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
