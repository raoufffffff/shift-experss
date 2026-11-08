import { cn } from '@/lib/cn'
import {
    Clock,
    CheckCircle2,
    Loader2,
} from 'lucide-react'
import { useReviewsData } from './hooks/useReviewsData'
import { PendingReviewsTab } from './components/PendingReviewsTab'
import { GivenReviewsTab } from './components/GivenReviewsTab'
import { ReviewModal } from './components/ReviewModal'
 
export function ReviewsPage() {
    const {
        t,
        dateFnsLocale,
        activeTab,
        handleTabChange,
        pendingReviews,
        givenReviews,
        isLoading,
        isReviewModalOpen,
        setIsReviewModalOpen,
        selectedApplication,
        selectedReview,
        reviewRating,
        setReviewRating,
        reviewComment,
        setReviewComment,
        hoverRating,
        setHoverRating,
        submitReviewMutation,
        openReviewModal,
        openEditReviewModal,
        closeReviewModal,
    } = useReviewsData()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('reviews.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('reviews.subtitle')}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-col space-y-6">
                <div className="border-b border-border">
                    <nav className="flex -mb-px space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => handleTabChange('pending')}
                            className={cn(
                                "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                                activeTab === 'pending'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-700"
                            )}
                        >
                            <Clock className={cn(
                                "mr-2 h-4 w-4",
                                activeTab === 'pending' ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            )} />
                            <span>{t('reviews.tabs.pending')}</span>
                            <span className={cn(
                                "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                                activeTab === 'pending'
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {pendingReviews.length}
                            </span>
                        </button>

                        <button
                            onClick={() => handleTabChange('given')}
                            className={cn(
                                "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                                activeTab === 'given'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-700"
                            )}
                        >
                            <CheckCircle2 className={cn(
                                "mr-2 h-4 w-4",
                                activeTab === 'given' ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            )} />
                            <span>{t('reviews.tabs.given')}</span>
                            <span className={cn(
                                "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                                activeTab === 'given'
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {givenReviews.length}
                            </span>
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="min-h-[400px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : activeTab === 'pending' ? (
                        <PendingReviewsTab
                            applications={pendingReviews}
                            onEvaluate={openReviewModal}
                            t={t}
                            dateFnsLocale={dateFnsLocale}
                        />
                    ) : (
                        <GivenReviewsTab
                            reviews={givenReviews}
                            onEdit={openEditReviewModal}
                            t={t}
                            dateFnsLocale={dateFnsLocale}
                        />
                    )}
                </div>
            </div>

            {/* Review Modal */}
            <ReviewModal
                isOpen={isReviewModalOpen}
                onOpenChange={setIsReviewModalOpen}
                selectedApplication={selectedApplication}
                selectedReview={selectedReview}
                reviewRating={reviewRating}
                setReviewRating={setReviewRating}
                reviewComment={reviewComment}
                setReviewComment={setReviewComment}
                hoverRating={hoverRating}
                setHoverRating={setHoverRating}
                onSubmit={() => submitReviewMutation.mutate()}
                onClose={closeReviewModal}
                isPending={submitReviewMutation.isPending}
                t={t}
            />
        </div>
    )
}
