import { cn } from '@/lib/cn'
import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
    Star,
    Briefcase,
    MessageSquare,
    Edit3,
    ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import type { GivenReviewsTabProps } from '../types'

export function GivenReviewsTab({
    reviews,
    onEdit,
    t,
    dateFnsLocale
}: GivenReviewsTabProps) {
    if (reviews.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-16">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <MessageSquare className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{t('reviews.noReviewsGiven')}</h3>
                        <p className="text-muted-foreground">{t('reviews.startEvaluating')}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">{t('reviews.givenTitle')}</h2>
                <p className="text-muted-foreground">{t('reviews.givenSubtitle')}</p>
            </div>

            <div className="flex flex-col gap-3">
                {reviews.map((review) => (
                    <Card key={review.id} className="hover:shadow-md transition-shadow border-border/60">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    {/* Freelancer Avatar */}
                                    {review.freelancer?.profile_photo_url ? (
                                        <img
                                            src={review.freelancer.profile_photo_url}
                                            alt=""
                                            className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200"
                                            loading="lazy"
                                            width={48}
                                            height={48}
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-800">
                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                                {review.freelancer?.first_name?.charAt(0)}
                                                {review.freelancer?.last_name?.charAt(0)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                            <Link
                                                to={`/freelancers/${review.freelancer_id}`}
                                                className="font-semibold hover:text-primary transition-colors flex items-center gap-1"
                                            >
                                                {review.freelancer?.first_name} {review.freelancer?.last_name}
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                            {review.shift?.position_name && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Briefcase className="w-3 h-3" />
                                                    <span>{review.shift.position_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Rating and Meta */}
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            "w-3.5 h-3.5",
                                                            star <= review.rating
                                                                ? "fill-amber-400 text-amber-400"
                                                                : "text-gray-300 dark:text-gray-600"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(review.created_at), 'PP', { locale: dateFnsLocale })}
                                            </span>
                                        </div>

                                        {/* Comment */}
                                        {review.comment && (
                                            <p className="mt-2 text-sm text-foreground/80 line-clamp-2 md:line-clamp-1 max-w-2xl italic">
                                                "{review.comment}"
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full md:w-auto"
                                        onClick={() => onEdit(review)}
                                    >
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        {t('reviews.editReview')}
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
