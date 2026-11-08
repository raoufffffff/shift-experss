import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
    CheckCircle2,
    Star,
    Calendar,
    MapPin,
    Briefcase,
    ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import type { PendingReviewsTabProps } from '../types'

export function PendingReviewsTab({
    applications,
    onEvaluate,
    t,
    dateFnsLocale
}: PendingReviewsTabProps) {
    if (applications.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-16">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{t('reviews.allEvaluated')}</h3>
                        <p className="text-muted-foreground">{t('reviews.noMissionsPending')}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">{t('reviews.pendingTitle')}</h2>
                <p className="text-muted-foreground">{t('reviews.pendingSubtitle')}</p>
            </div>

            <div className="flex flex-col gap-3">
                {applications.map((app) => (
                    <Card key={app.id} className="hover:shadow-md transition-shadow border-border/60">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    {/* Freelancer Avatar */}
                                    {app.freelancer?.profile_photo_url ? (
                                        <img
                                            src={app.freelancer.profile_photo_url}
                                            alt=""
                                            className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200"
                                            loading="lazy"
                                            width={48}
                                            height={48}
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-800">
                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                                {app.freelancer?.first_name?.charAt(0)}
                                                {app.freelancer?.last_name?.charAt(0)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                            <Link
                                                to={`/freelancers/${app.freelancer_id}`}
                                                className="font-semibold hover:text-primary transition-colors flex items-center gap-1"
                                            >
                                                {app.freelancer?.first_name} {app.freelancer?.last_name}
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Briefcase className="w-3 h-3" />
                                                <span>{app.shift?.position_name}</span>
                                            </div>
                                        </div>

                                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                {app.shift?.start_time && format(new Date(app.shift.start_time), 'PPP', { locale: dateFnsLocale })}
                                            </div>
                                            {app.shift?.establishments?.name && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3 h-3" />
                                                    {app.shift.establishments.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        className="w-full md:w-auto"
                                        onClick={() => onEvaluate(app)}
                                    >
                                        <Star className="w-4 h-4 mr-2" />
                                        {t('reviews.evaluateNow')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
