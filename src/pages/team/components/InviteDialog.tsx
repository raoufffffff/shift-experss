import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import type { Establishment } from '../types'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  onEmailChange: (email: string) => void
  selectedEstablishment: string
  onEstablishmentChange: (establishment: string) => void
  establishments: Establishment[]
  onSend: () => void
  isSending: boolean
  names: {
     first_name: string,
      last_name: string,
  }
  setNames: (updater: (prev: { first_name: string; last_name: string }) => { first_name: string; last_name: string }) => void
}

export function InviteDialog({
  names, 
  setNames,
  open,
  onOpenChange,
  email,
  onEmailChange,
  selectedEstablishment, 
  onEstablishmentChange,
  establishments,
  onSend,
  isSending,
}: InviteDialogProps) {
  const { t } = useTranslation()
 
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('team.inviteDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('team.inviteDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('team.inviteDialog.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder={t('team.inviteDialog.emailPlaceholder')}
            />
          </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                           label={t('employees.firstName')}
                           placeholder={t('employees.firstNamePlaceholder')}
                          value={names.first_name}
                          onChange={(e) => setNames((p) => ({ ...p, first_name: e.target.value }))}
                            required
                         />
                         <Input
                           label={t('employees.lastName')}
                           placeholder={t('employees.lastNamePlaceholder')}
                            value={names.last_name}
                            onChange={(e) => setNames((p) => ({ ...p, last_name: e.target.value }))}
 
                           required
                         />
                       </div>
          <div className="space-y-2">
            <Label htmlFor="establishment">{t('team.inviteDialog.establishmentLabel')}</Label>
            <select
              id="establishment"
              value={selectedEstablishment}
              onChange={(e) => onEstablishmentChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('team.inviteDialog.selectEstablishment')}</option>
              {establishments.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {t('team.inviteDialog.establishmentNote')}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('team.inviteDialog.cancel')}
          </Button>
          <Button
            onClick={onSend}
            disabled={isSending || !email.trim() || selectedEstablishment === 'all'}
          >
            {isSending ? t('team.inviteDialog.sending') : t('team.inviteDialog.send')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
