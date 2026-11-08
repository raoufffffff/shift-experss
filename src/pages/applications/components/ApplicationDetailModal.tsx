import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
    Calendar,
    Briefcase,
    UserCheck,
    UserX,
    Mail,
    Phone,
    MapPin as MapPinIcon,
    Banknote,
    Coffee,
    Info,
    ShieldCheck,
    Send,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { formatTimeUTC } from '@/utils/formatTime'
import type { Locale } from 'date-fns'
import type { Application, ConfirmDialogState } from '../types'
import { getStatusBadge } from './ApplicationCard'

interface ApplicationDetailModalProps {
    selectedApplication: Application | null
    onClose: () => void
    onAccept: (app: Application) => void
    onReject: (app: Application) => void
    onRequestAttestation?: (app: Application) => void
    isMutating: boolean
    getDateFnsLocale: () => Locale
    language: string
    confirmDialog: ConfirmDialogState | null
    onConfirm: () => void
    onCancelConfirm: () => void
}

export function ApplicationDetailModal({
    selectedApplication,
    onClose,
    onAccept,
    onReject,
    onRequestAttestation,
    isMutating,
    getDateFnsLocale,
    language,
    confirmDialog,
    onConfirm,
    onCancelConfirm,
}: ApplicationDetailModalProps) {
    const { t } = useTranslation()

    // Employé à qui on a proposé une offre : on attend sa réponse (pas de boutons côté employeur)
    const isWaitingForEmployee =
        selectedApplication?.type === 'employee' && selectedApplication?.status === 'pending'

    return (
        <>
            {/* Application Detail Modal */}
            <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    {selectedApplication && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white uppercase shrink-0 ring-4 ring-background shadow-lg",
                                        selectedApplication.type === 'employee' ? "bg-blue-500" : "bg-purple-500"
                                    )}>
                                        {selectedApplication.type === 'freelancer' && selectedApplication.freelancer?.profile_photo_url ? (
                                            <img src={selectedApplication.freelancer.profile_photo_url} alt="" loading="lazy" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            (selectedApplication.type === 'employee'
                                                ? `${selectedApplication.user?.first_name || ''} ${selectedApplication.user?.last_name || ''}`
                                                : selectedApplication.freelancer?.full_name || ''
                                            ).substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <DialogTitle className="text-2xl font-bold">
                                            {selectedApplication.type === 'employee'
                                                ? `${selectedApplication.user?.first_name || ''} ${selectedApplication.user?.last_name || ''}`
                                                : selectedApplication.freelancer?.full_name || ''
                                            }
                                        </DialogTitle>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant={selectedApplication.type === 'employee' ? 'default' : 'secondary'} className={cn(
                                                "uppercase text-[10px] font-bold tracking-wider",
                                                selectedApplication.type === 'employee'
                                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                                    : "bg-rose-100 text-rose-700 hover:bg-rose-100"
                                            )}>
                                                {selectedApplication.type === 'employee' ? t('common.employee') : t('common.freelancer')}
                                            </Badge>
                                            {selectedApplication.type === 'freelancer' && selectedApplication.compatibility_score != null && (
                                                <Badge variant="outline" className={cn(
                                                    "flex gap-1 items-center",
                                                    selectedApplication.compatibility_score >= 60
                                                        ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                                                        : "text-muted-foreground border-border bg-muted/50"
                                                )}>
                                                    {selectedApplication.compatibility_score >= 60 ? `${selectedApplication.compatibility_score}%` : '<60%'} {t('applications.compatibility', { defaultValue: 'Compatibilit\u00e9' })}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end gap-2">
                                        {getStatusBadge(selectedApplication.status, t, selectedApplication.type)}
                                        {(selectedApplication.status === 'pending' || selectedApplication.status === 'applied') && selectedApplication.type === 'freelancer' && onRequestAttestation && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 text-xs"
                                                onClick={() => onRequestAttestation(selectedApplication)}
                                                disabled={isMutating}
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                                {t('applications.actions.requestAttestation', { defaultValue: 'Attestation de vigilance' })}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
                                <div className="space-y-5">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                            <Info className="w-3.5 h-3.5" />
                                            {t('common.details')}
                                        </h4>
                                        <div className="space-y-3">
                                          {selectedApplication.type === 'employee' &&  
                                          <div className="flex items-center gap-3 text-sm">
                                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-muted-foreground leading-none mb-1">{t('common.email')}</p>
                                                    <p className="font-medium truncate"> {  selectedApplication.user?.email  }</p>
                                                </div>
                                            </div>
                                            }
                                            {selectedApplication.type === 'freelancer' && selectedApplication.status === 'accepted' && selectedApplication.freelancer?.phone && (
                                                <>
                                                 <div className="flex items-center gap-3 text-sm">
                                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-muted-foreground leading-none mb-1">{t('common.email')}</p>
                                                    <p className="font-medium truncate"> {  selectedApplication.freelancer.email }</p>
                                                </div>
                                            </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground leading-none mb-1">{t('common.phone', { defaultValue: 'Téléphone' })}</p>
                                                        <p className="font-medium">{selectedApplication.freelancer.phone}</p>
                                                    </div>
                                                </div>
                                                </>
                                            )}
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-muted-foreground leading-none mb-1">{t('applications.status.applied')}</p>
                                                    <p className="font-medium">
                                                        {format(new Date(selectedApplication.applied_at || selectedApplication.created_at || ''), 'Pp', { locale: getDateFnsLocale() })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                            <Briefcase className="w-3.5 h-3.5" />
                                            Mission
                                        </h4>
                                        <Card className="bg-muted/30 border-none shadow-none">
                                            <CardContent className="p-4">
                                                <h5 className="font-semibold text-sm">{selectedApplication.shift?.position_name}</h5>
                                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                    <MapPinIcon className="w-3 h-3" />
                                                    {selectedApplication.shift?.establishments?.name}
                                                </p>
                                                <div className="mt-2 pt-2 border-t border-muted-foreground/10 text-[10px] text-muted-foreground flex justify-between items-center">
                                                    <span>{format(new Date(selectedApplication.shift?.start_time || ''), 'EEE dd MMM', { locale: getDateFnsLocale() })}</span>
                                                    <div className="flex gap-3">
                                                        <span className="flex items-center gap-1.5">
                                                            {formatTimeUTC(selectedApplication.shift?.start_time || '')} - {formatTimeUTC(selectedApplication.shift?.end_time || '')}
                                                        </span>
                                                        {(() => {
                                                            const hourlyRate = selectedApplication.type === 'employee'
                                                                ? selectedApplication.user?.employee?.verified_hourly_rate
                                                                : selectedApplication.shift?.freelance_hourly_rate;

                                                            if (!hourlyRate) return null;

                                                            return (
                                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                                    <Banknote className="w-3 h-3" />
                                                                    {(() => {
                                                                        const start = new Date(selectedApplication.shift?.start_time ?? '');
                                                                        const end = new Date(selectedApplication.shift?.end_time ?? '');
                                                                        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                                                        const total = Math.max(0, duration) * hourlyRate;
                                                                        return new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(total);
                                                                    })()}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="flex items-center justify-between sm:justify-between w-full border-t pt-4">
                                <Button variant="ghost" onClick={onClose}>
                                    {t('common.close')}
                                </Button>

                                {/* Employé avec offre en attente : pas de boutons, juste un message d'attente */}
                                {isWaitingForEmployee && (
                                    <span className="flex items-center gap-2 text-sm font-medium text-sky-600 dark:text-sky-400">
                                        <Send className="w-4 h-4" />
                                        {t('applications.status.waiting_for_employee', { defaultValue: "En attente de la réponse de l'employé" })}
                                    </span>
                                )}

                                {selectedApplication.status === 'applied' && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => {
                                                onReject(selectedApplication)
                                                onClose()
                                            }}
                                            disabled={isMutating}
                                        >
                                            <UserX className="w-4 h-4 mr-2" />
                                            {t('applications.actions.reject')}
                                        </Button>
                                        <Button
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => {
                                                onAccept(selectedApplication)
                                                onClose()
                                            }}
                                            disabled={isMutating}
                                        >
                                            <UserCheck className="w-4 h-4 mr-2" />
                                            {t('applications.actions.accept')}
                                        </Button>
                                    </div>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Confirmation dialog for accept/reject (supports bulk for multi-day events) */}
            <Dialog open={!!confirmDialog} onOpenChange={() => onCancelConfirm()}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {(() => {
                                const count = confirmDialog?.apps.length ?? 0
                                if (count > 1) {
                                    return confirmDialog?.action === 'accept'
                                        ? t('shifts.confirmAcceptAllTitle', { count, defaultValue: `Accepter les ${count} candidatures` })
                                        : t('shifts.confirmRejectAllTitle', { count, defaultValue: `Refuser les ${count} candidatures` })
                                }
                                return confirmDialog?.action === 'accept'
                                    ? t('shifts.confirmAcceptTitle', { defaultValue: 'Accepter la candidature' })
                                    : t('shifts.confirmRejectTitle', { defaultValue: 'Refuser la candidature' })
                            })()}
                        </DialogTitle>
                        <DialogDescription>
                            {(() => {
                                const count = confirmDialog?.apps.length ?? 0
                                const isFreelancer = confirmDialog?.apps[0]?.type === 'freelancer'
                                if (count > 1) {
                                    return confirmDialog?.action === 'accept'
                                        ? t('shifts.confirmAcceptAllDesc', {
                                            count,
                                            defaultValue: `\u00cates-vous s\u00fbr de vouloir accepter ce candidat pour les ${count} jours de l'\u00e9v\u00e9nement ?${isFreelancer ? ' Un email de confirmation sera envoy\u00e9 pour chaque jour.' : ''}`,
                                          })
                                        : t('shifts.confirmRejectAllDesc', {
                                            count,
                                            defaultValue: `\u00cates-vous s\u00fbr de vouloir refuser ce candidat pour les ${count} jours de l'\u00e9v\u00e9nement ?`,
                                          })
                                }
                                return confirmDialog?.action === 'accept'
                                    ? t('shifts.confirmAcceptDesc', {
                                        defaultValue: `\u00cates-vous s\u00fbr de vouloir accepter cette candidature ?${isFreelancer ? ' Un email de confirmation sera envoy\u00e9.' : ''}`,
                                      })
                                    : t('shifts.confirmRejectDesc', {
                                        defaultValue: '\u00cates-vous s\u00fbr de vouloir refuser cette candidature ?',
                                      })
                            })()}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={onCancelConfirm}>
                            {t('common.cancel', { defaultValue: 'Annuler' })}
                        </Button>
                        <Button
                            variant={confirmDialog?.action === 'accept' ? 'default' : 'destructive'}
                            className={confirmDialog?.action === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            onClick={onConfirm}
                            disabled={isMutating}
                        >
                            {confirmDialog?.action === 'accept'
                                ? t('applications.actions.accept', { defaultValue: 'Accepter' })
                                : t('applications.actions.reject', { defaultValue: 'Refuser' })
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}