import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import {
  Star,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import type { FreelancerReview } from '../types';

interface FreelancerReviewsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  freelancerName: string;
  selectedEstablishmentId: string | null;
  currentEstablishmentReview: FreelancerReview | null;
  reviews: FreelancerReview[];
  reviewCount: number;
  reviewRating: number;
  reviewComment: string;
  hoverRating: number | null;
  completedShiftsWithEstablishmentCount: number;
  isSubmitting: boolean;
  dateFnsLocale: Locale;
  onSetReviewRating: (rating: number) => void;
  onSetReviewComment: (comment: string) => void;
  onSetHoverRating: (rating: number | null) => void;
  onSubmitReview: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function FreelancerReviewsModal({
  isOpen,
  onOpenChange,
  freelancerName,
  selectedEstablishmentId,
  currentEstablishmentReview,
  reviews,
  reviewCount,
  reviewRating,
  reviewComment,
  hoverRating,
  completedShiftsWithEstablishmentCount,
  isSubmitting,
  dateFnsLocale,
  onSetReviewRating,
  onSetReviewComment,
  onSetHoverRating,
  onSubmitReview,
  t,
}: FreelancerReviewsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            {t('freelancers.reviewsFor', { name: freelancerName })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Review Section */}
          {selectedEstablishmentId && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {currentEstablishmentReview
                    ? t('freelancers.editYourReview')
                    : t('freelancers.leaveReview')
                  }
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Star Rating Input */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('freelancers.yourRatingLabel')}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = hoverRating ? star <= hoverRating : star <= reviewRating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => onSetReviewRating(star)}
                          onMouseEnter={() => onSetHoverRating(star)}
                          onMouseLeave={() => onSetHoverRating(null)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 transition-colors ${isActive
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300 dark:text-gray-600'
                              }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment Input */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('freelancers.commentOptional')}</p>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => onSetReviewComment(e.target.value)}
                    placeholder={t('freelancers.reviewPlaceholder')}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Completed Shifts Info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {t('freelancers.completedShiftsWithYou', { count: completedShiftsWithEstablishmentCount })}
                  </span>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={onSubmitReview}
                  disabled={reviewRating === 0 || isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {currentEstablishmentReview
                    ? t('freelancers.updateReview')
                    : t('freelancers.submitReview')
                  }
                </Button>
              </CardContent>
            </Card>
          )}

          {!selectedEstablishmentId && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t('freelancers.selectEstablishmentToReview')}
              </p>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              {t('freelancers.allReviews')}
              <span className="text-sm text-muted-foreground">({reviewCount})</span>
            </h3>

            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('freelancers.noReviewsYet')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className={`p-4 rounded-lg border ${review.establishment_id === selectedEstablishmentId
                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                      : 'border-border bg-muted/30'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {review.establishments?.name || t('freelancers.unknownEstablishment')}
                          </span>
                          {review.establishment_id === selectedEstablishmentId && (
                            <Chip variant="secondary" className="text-xs">
                              {t('freelancers.yourReview')}
                            </Chip>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300 dark:text-gray-600'
                                }`}
                            />
                          ))}
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(review.created_at), 'PP', { locale: dateFnsLocale })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
