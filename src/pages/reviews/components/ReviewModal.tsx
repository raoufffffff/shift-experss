import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'
import {
    Star,
    Loader2,
    MessageSquare,
    CalendarDays,
    Clock,
    Building2,
    Sparkles,
} from 'lucide-react'
import type { ReviewModalProps } from '../types'

const MAX_COMMENT_LENGTH = 500

// ✅ Libellés affichés sous les étoiles selon la note survolée/sélectionnée
const RATING_LABELS: Record<number, string> = {
    1: 'Décevant',
    2: 'Peu satisfaisant',
    3: 'Correct',
    4: 'Très bien',
    5: 'Excellent',
}

function formatShiftDate(dateStr?: string | null): string | null {
    if (!dateStr) return null
    try {
        return new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date(dateStr))
    } catch {
        return null
    }
}

function formatShiftTime(dateStr?: string | null): string | null {
    if (!dateStr) return null
    try {
        return new Intl.DateTimeFormat('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateStr))
    } catch {
        return null
    }
}

export function ReviewModal({
    isOpen,
    onOpenChange,
    selectedApplication,
    selectedReview,
    reviewRating,
    setReviewRating,
    reviewComment,
    setReviewComment,
    hoverRating,
    setHoverRating,
    onSubmit,
    onClose,
    isPending,
    t,
}: ReviewModalProps) {
    const freelancer = selectedApplication?.freelancer || selectedReview?.freelancer
    const shift = selectedApplication?.shift || selectedReview?.shift
    const establishmentName = (shift as { establishments?: { name?: string } | null })?.establishments?.name

    const displayedRating = hoverRating !== null ? hoverRating : reviewRating
    const ratingLabel = displayedRating > 0 ? RATING_LABELS[displayedRating] : null

    const shiftDate = formatShiftDate(shift?.start_time)
    const shiftTimeRange = shift?.start_time && shift?.end_time
        ? `${formatShiftTime(shift.start_time)} — ${formatShiftTime(shift.end_time)}`
        : null

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className=" max-h-[90vh] p-0 overflow-scroll">
                {/* En-tête avec dégradé — plus impactant qu'un simple titre */}
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-5 border-b border-border/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2.5 text-xl">
                            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                                <MessageSquare className="w-5 h-5 text-primary" />
                            </div>
                            {selectedReview ? t('reviews.editReview') : t('freelancers.leaveReview')}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Carte freelance — plus grande, avec photo XL + détails de la mission */}
                    <div className="mt-5 flex items-start gap-4 p-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 shadow-sm">
                        {freelancer?.profile_photo_url ? (
                            <img
                                src={freelancer.profile_photo_url}
                                alt=""
                                className="w-16 h-16 rounded-2xl object-cover shrink-0 ring-2 ring-primary/10"
                                loading="lazy"
                                width={64}
                                height={64}
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 ring-2 ring-primary/10">
                                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                                    {freelancer?.first_name?.charAt(0)}
                                    {freelancer?.last_name?.charAt(0)}
                                </span>
                            </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="font-bold text-base text-foreground truncate">
                                {freelancer?.first_name} {freelancer?.last_name}
                            </p>
                            {shift?.position_name && (
                                <p className="text-sm font-medium text-primary">
                                    {shift.position_name}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                                {shiftDate && (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                                        <CalendarDays className="w-3.5 h-3.5" />
                                        {shiftDate}
                                    </span>
                                )}
                                {shiftTimeRange && (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Clock className="w-3.5 h-3.5" />
                                        {shiftTimeRange}
                                    </span>
                                )}
                                {establishmentName && (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Building2 className="w-3.5 h-3.5" />
                                        {establishmentName}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 px-6 py-6">
                    {/* Star Rating Input — étoiles plus grandes + libellé dynamique */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            {t('reviews.rating')}
                        </label>
                        <div className="flex flex-col items-center gap-3 py-2">
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setReviewRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(null)}
                                        className="p-1.5 rounded-xl transition-all hover:scale-125 hover:bg-amber-50 dark:hover:bg-amber-950/30 active:scale-110"
                                    >
                                        <Star
                                            className={cn(
                                                "w-11 h-11 transition-colors drop-shadow-sm",
                                                (hoverRating !== null ? star <= hoverRating : star <= reviewRating)
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "text-gray-300 dark:text-gray-600"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            <span
                                className={cn(
                                    "text-sm font-semibold h-5 transition-opacity",
                                    ratingLabel ? "opacity-100 text-amber-600 dark:text-amber-400" : "opacity-0"
                                )}
                            >
                                {ratingLabel || ' '}
                            </span>
                        </div>
                    </div>

                    {/* Comment — textarea plus grand + compteur de caractères */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-foreground">
                                {t('reviews.yourReview')}
                            </label>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {reviewComment.length}/{MAX_COMMENT_LENGTH}
                            </span>
                        </div>
                        <Textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                            placeholder={t('freelancers.reviewPlaceholder')}
                            rows={6}
                            className="resize-none text-[15px] leading-relaxed rounded-xl"
                            maxLength={MAX_COMMENT_LENGTH}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('reviews.commentHint', {
                                defaultValue: 'Votre avis aide les autres établissements — soyez précis et bienveillant.',
                            })}
                        </p>
                    </div>
                </div>

                <DialogFooter className="px-6 pb-6 gap-2">
                    <Button variant="outline" size="lg" onClick={onClose} className="rounded-xl">
                        {t('common.cancel')}
                    </Button>
                    <Button
                        size="lg"
                        onClick={onSubmit}
                        disabled={reviewRating === 0 || isPending}
                        className="rounded-xl min-w-[160px]"
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {selectedReview ? t('freelancers.updateReview') : t('freelancers.submitReview')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}