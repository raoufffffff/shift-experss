import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
    Clock,
    CheckCircle2,
    XCircle,
    Calendar,
    MapPin,
    Briefcase,
    UserCheck,
    UserX,
    Banknote,
    Coffee,
    Star,
    Monitor,
    ShieldCheck,
    Send,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import { formatTimeUTC } from '@/utils/formatTime'
import type { Application } from '../types'

interface ApplicationCardProps {
    app: Application
    onSelect: (app: Application) => void
    onAccept: (app: Application) => void
    onReject: (app: Application) => void
    onRequestAttestation?: (app: Application) => void
    onViewProfile?: (freelancerId: string) => void
    isMutating: boolean
    getDateFnsLocale: () => Locale
    language: string
}

function getStatusBadge(
    status: string,
    t: (key: string, opts?: Record<string, string>) => string,
    type?: string
) {
    // Employé avec une offre en attente : on attend SA réponse, on n'agit pas nous-mêmes
    if (type === 'employee' && status === 'pending') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                <Send className="w-3 h-3" />
                {t('applications.status.waiting_for_employee', { defaultValue: "En attente de la réponse de l'employé" })}
            </span>
        )
    }

    switch (status) {
        case 'pending':
        case 'applied':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Clock className="w-3 h-3" />
                    {t('applications.status.pending')}
                </span>
            )
        case 'accepted':
        case 'confirmed':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('applications.status.accepted')}
                </span>
            )
        case 'rejected':
        case 'declined':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="w-3 h-3" />
                    {t('applications.status.rejected')}
                </span>
            )
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    {status}
                </span>
            )
    }
}

export { getStatusBadge }

function RatingDisplay({ average, count, t }: { average: number | null; count: number; t: (key: string, opts?: Record<string, string>) => string }) {
    if (average === null || count === 0) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3.5 h-3.5 text-muted-foreground/40" />
                {t('applications.noReviews', { defaultValue: 'Aucun avis' })}
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-foreground">{average}</span>
            <span className="text-muted-foreground">({count})</span>
        </span>
    )
}

function computeTotal(app: Application, language: string) {
    const hourlyRate = app.type === 'employee'
        ? app.user?.employee?.verified_hourly_rate
        : app.shift?.freelance_hourly_rate

    if (!hourlyRate || !app.shift?.start_time || !app.shift?.end_time) return null

    const start = new Date(app.shift.start_time)
    const end = new Date(app.shift.end_time)
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const total = Math.max(0, duration) * hourlyRate

    return {
        hourlyRate,
        total,
        formatted: new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(total),
        rateFormatted: new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(hourlyRate),
    }
}

export function ApplicationCard({
    app,
    onSelect,
    onAccept,
    onReject,
    onRequestAttestation,
    onViewProfile,
    isMutating,
    getDateFnsLocale,
    language,
}: ApplicationCardProps) {
    const { t } = useTranslation()

    const name = app.type === 'employee'
        ? `${app.user?.first_name || ''} ${app.user?.last_name || ''}`
        : (app.type == "freelancer" && app.status === 'applied') ? app.freelancer?.first_name : app.freelancer?.full_name || `${app.freelancer?.first_name || ''} ${app.freelancer?.last_name || ''}`

    const photoUrl = app.type === 'freelancer'
        ? app.freelancer?.profile_photo_url
        : null

    const city = app.type === 'freelancer' ? app.freelancer?.city : null
    const pms = app.type === 'freelancer' ? app.freelancer?.freelancer_pms : null
    const rating = app.freelancer_rating
    const quote = computeTotal(app, language)
    // const isPending = app.status === 'pending' || app.status === 'applied'
    const isPending = (app.type == "freelancer" && app.status === 'pending') ? true : app.status === 'applied'

    // Employé à qui on a proposé une offre : on attend sa réponse (pas de boutons côté employeur)
    const isWaitingForEmployee = app.type === 'employee' && app.status === 'pending'

    const MAX_PMS = 3
    const visiblePms = pms?.slice(0, MAX_PMS) || []
    const extraPmsCount = (pms?.length || 0) - MAX_PMS
    return (
        <Card
            className="border-border/60 hover:border-primary/30 transition-all cursor-pointer hover:shadow-md group"
            onClick={() => onSelect(app)}
        >
            
            <CardContent className="p-0">
                {/* Mobile Layout */}
                <div className="lg:hidden p-4 space-y-3">
                    {/* Header: Photo + Name + Rating */}
                    <div className="flex items-start gap-3">
                        <div className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all",
                            app.type === 'employee' ? "bg-blue-500" : "bg-purple-500"
                        )}>
                            {photoUrl ? (
                                <img src={photoUrl} alt={name} loading="lazy" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                name.substring(0, 2).toUpperCase()
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3
                                    className={cn(
                                        "text-sm font-semibold text-foreground truncate transition-colors",
                                        app.type === 'freelancer' && onViewProfile
                                            ? "hover:text-primary hover:underline cursor-pointer"
                                            : "group-hover:text-primary"
                                    )}
                                    onClick={(e) => {
                                        if (app.type === 'freelancer' && onViewProfile && app.freelancer_id) {
                                            e.stopPropagation()
                                            onViewProfile(app.freelancer_id)
                                        }
                                    }}
                                >
                                    {name}
                                </h3>
                                <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                                    app.type === 'employee'
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                )}>
                                    {app.type === 'employee' ? t('common.employee') : t('common.freelancer')}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {app.type === 'freelancer' && (
                                    <RatingDisplay average={rating?.average ?? null} count={rating?.count ?? 0} t={t} />
                                )}
                                {app.type === 'freelancer' && app.compatibility_score != null && (
                                    <span className={cn(
                                        "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                                        app.compatibility_score >= 60
                                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                                            : "text-muted-foreground bg-muted/50"
                                    )}>
                                        {app.compatibility_score >= 60 ? `${app.compatibility_score}%` : '<60%'} {t('applications.compatibility', { defaultValue: 'compatibilit\u00e9' })}
                                    </span>
                                )}
                                {city && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        {city}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="shrink-0">
                            {getStatusBadge(app.status, t, app.type)}
                        </div>
                    </div>

                    {/* PMS badges */}
                    {visiblePms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {visiblePms.map((p) => (
                                <span key={p.id} className={`text-[10px] border px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                                    p.pms.type === 'pms'
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                }`}>
                                    <Monitor className="w-2.5 h-2.5" />
                                    <span className="font-semibold">{p.pms.type?.toUpperCase()}</span>
                                    {p.pms.name}
                                </span>
                            ))}
                            {extraPmsCount > 0 && (
                                <span className="text-[10px] text-muted-foreground">+{extraPmsCount}</span>
                            )}
                        </div>
                    )}

                    {/* Shift info */}
                    <div className="pt-2 border-t border-border/40 space-y-1.5">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-primary/60" />
                                {app.shift?.position_name || '-'}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-primary/60" />
                                {app.shift?.establishments?.name || '-'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            {app.shift?.start_time && (
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-primary/60" />
                                    {format(new Date(app.shift.start_time), 'dd MMM yyyy', { locale: getDateFnsLocale() })}
                                </span>
                            )}
                            {app.shift?.start_time && app.shift?.end_time && (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-primary/60" />
                                    {formatTimeUTC(app.shift.start_time)} - {formatTimeUTC(app.shift.end_time)}
                                </span>
                            )}
                            {quote && (
                                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                    <Banknote className="w-3.5 h-3.5" />
                                    {quote.formatted}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {isPending && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                                    onClick={() => onAccept(app)}
                                    disabled={isMutating}
                                >
                                    <UserCheck className="w-4 h-4 mr-1.5" />
                                    {t('applications.actions.accept')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-800 dark:hover:bg-red-900/20"
                                    onClick={() => onReject(app)}
                                    disabled={isMutating}
                                >
                                    <UserX className="w-4 h-4 mr-1.5" />
                                    {t('applications.actions.reject')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Employé : offre envoyée, on attend sa réponse */}
                    {isWaitingForEmployee && (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-border/40 text-xs font-medium text-sky-600 dark:text-sky-400">
                            <Send className="w-3.5 h-3.5" />
                            {t('applications.status.waiting_for_employee', { defaultValue: "En attente de la réponse de l'employé" })}
                        </div>
                    )}
                </div>

                {/* Desktop Layout */}
                <div className="hidden lg:block">
                    <div className="flex gap-4 p-4">
                        {/* Left: main info */}
                        <div className="flex-1 min-w-0 space-y-2">
                            {/* Row 1: Status + Type badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {getStatusBadge(app.status, t, app.type)}
                                <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                                    app.type === 'employee'
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                )}>
                                    {app.type === 'employee' ? t('common.employee') : t('common.freelancer')}
                                </span>
                                {quote && (
                                    <span className="ml-auto text-base font-bold text-primary">
                                        {quote.rateFormatted}<span className="text-xs font-normal text-muted-foreground">/h</span>
                                    </span>
                                )}
                            </div>

                            {/* Row 2: Photo + Name */}
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all",
                                    app.type === 'employee' ? "bg-blue-500" : "bg-purple-500"
                                )}>
                                    {photoUrl ? (
                                        <img src={photoUrl} alt={name} loading="lazy" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        name.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3
                                        className={cn(
                                            "text-base font-semibold text-foreground truncate transition-colors",
                                            app.type === 'freelancer' && onViewProfile
                                                ? "hover:text-primary hover:underline cursor-pointer"
                                                : "group-hover:text-primary"
                                        )}
                                        onClick={(e) => {
                                            if (app.type === 'freelancer' && onViewProfile && app.freelancer_id) {
                                                e.stopPropagation()
                                                onViewProfile(app.freelancer_id)
                                            }
                                        }}
                                    >
                                        {name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {app.type === 'freelancer' && (
                                            <RatingDisplay average={rating?.average ?? null} count={rating?.count ?? 0} t={t} />
                                        )}
                                        {city && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin className="w-3 h-3" />
                                                {city}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Shift position + establishment */}
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Briefcase className="w-3.5 h-3.5 mr-1.5 text-primary/60" />
                                <span className="font-medium text-foreground">{app.shift?.position_name || '-'}</span>
                                <span className="mx-2 text-border">|</span>
                                <MapPin className="w-3.5 h-3.5 mr-1.5 text-primary/60" />
                                {app.shift?.establishments?.name || '-'}
                            </div>

                            {/* Row 3b: PMS badges */}
                            {visiblePms.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                                    {visiblePms.map((p) => (
                                        <span key={p.id} className={`text-[11px] border px-2 py-0.5 rounded-full ${
                                            p.pms.type === 'pms'
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                        }`}>
                                            <span className="font-semibold">{p.pms.type?.toUpperCase()}</span> {p.pms.name}
                                        </span>
                                    ))}
                                    {extraPmsCount > 0 && (
                                        <span className="text-[10px] text-muted-foreground">+{extraPmsCount}</span>
                                    )}
                                </div>
                            )}

                            {/* Row 4: Date + Time + Cost */}
                            <div className="flex items-center gap-4 text-sm flex-wrap">
                                {app.shift?.start_time && (
                                    <div className="flex items-center text-foreground">
                                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                        {format(new Date(app.shift.start_time), 'dd MMM yyyy', { locale: getDateFnsLocale() })}
                                    </div>
                                )}
                                {app.shift?.start_time && app.shift?.end_time && (
                                    <div className="flex items-center text-muted-foreground">
                                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                                        {formatTimeUTC(app.shift.start_time)} - {formatTimeUTC(app.shift.end_time)}
                                    </div>
                                )}
                                {quote && (
                                    <div className="flex items-center font-medium text-emerald-600 dark:text-emerald-400">
                                        <Banknote className="w-3.5 h-3.5 mr-1.5" />
                                        {quote.formatted}
                                    </div>
                                )}
                            </div>

                            {/* Row 5: Actions */}
                            <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                {isPending && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                                            onClick={() => onAccept(app)}
                                            disabled={isMutating}
                                        >
                                            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                                            {t('applications.actions.accept')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-800 dark:hover:bg-red-900/20"
                                            onClick={() => onReject(app)}
                                            disabled={isMutating}
                                        >
                                            <UserX className="w-3.5 h-3.5 mr-1.5" />
                                            {t('applications.actions.reject')}
                                        </Button>
                                    </>
                                )}

                                {/* Employé : offre envoyée, on attend sa réponse */}
                                {isWaitingForEmployee && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">
                                        <Send className="w-3.5 h-3.5" />
                                        {t('applications.status.waiting_for_employee', { defaultValue: "En attente de la réponse de l'employé" })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Compatibility panel */}
                        {app.type === 'freelancer' && app.compatibility_score != null && (
                            <div className={cn(
                                "w-40 flex-shrink-0 rounded-lg border p-4 flex flex-col items-center justify-center",
                                app.compatibility_score >= 60
                                    ? "border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50/50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/20"
                                    : "border-border/40 bg-muted/30"
                            )}>
                                <p className={cn(
                                    "text-3xl font-bold",
                                    app.compatibility_score >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                )}>
                                    {app.compatibility_score >= 60 ? `${app.compatibility_score}%` : '<60%'}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mt-1">
                                    {t('applications.compatibility', { defaultValue: 'Compatibilit\u00e9' })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}