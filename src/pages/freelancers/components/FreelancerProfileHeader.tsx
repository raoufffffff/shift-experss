import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Star,
  StarOff,
  Loader2,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import type { Freelancer, FreelancerApplication } from '../types';

interface FreelancerProfileHeaderProps {
  freelancer: Freelancer;
  averageRating: number;
  reviewCount: number;
  isFavorite: boolean;
  canToggleFavorite: boolean;
  isTogglingFavorite: boolean;
  hideContactActions?: boolean;
  onBack: () => void;
   onToggleFavorite: () => void;
  onOpenReviewsModal: () => void;
  onRequestAttestation: () => void;
  onNavigateToMessages: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function FreelancerProfileHeader({
  freelancer,
  averageRating,
  reviewCount, 
  isFavorite,
  canToggleFavorite,
  isTogglingFavorite,
   onBack,
  onToggleFavorite,
  onOpenReviewsModal,
  onRequestAttestation,
  onNavigateToMessages,
  hideContactActions,
  t,
}: FreelancerProfileHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {/* Profile Photo */}
        {freelancer.profile_photo_url ? (
          <img
            src={freelancer.profile_photo_url}
            alt={`${freelancer.first_name} ${freelancer.last_name}`}
            className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200"
            loading="lazy"
            width={64}
            height={64}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-800">
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {freelancer.first_name.charAt(0)}{freelancer.last_name.charAt(0)}
            </span>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              {freelancer.first_name} {freelancer.last_name}
              {freelancer.public_id && (
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/50 uppercase tracking-wider">
                  {freelancer.public_id}
                </span>
              )}
            </h1>
            {/* Stars Rating Display */}
            {reviewCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= Math.round(averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 dark:text-gray-600'
                        }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {averageRating.toFixed(1)}
                </span>
                <button
                  onClick={onOpenReviewsModal}
                  className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                >
                  ({reviewCount} {t('freelancers.reviews')})
                </button>
              </div>
            )}
            {reviewCount === 0 && (
              <button
                onClick={onOpenReviewsModal}
                className="text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline"
              >
                {t('freelancers.noReviewsYet')}
              </button>
            )}
          </div>
          <p className="text-muted-foreground text-sm sm:text-base flex items-center gap-2 mt-1">
            <Briefcase className="w-4 h-4" />
            {t('freelancers.freelancer')}
            {freelancer.city && (
              <>
                <span className="mx-1">•</span>
                <MapPin className="w-4 h-4" />
                {freelancer.city}
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-auto sm:ml-0">
        {!hideContactActions && (
          <>
            <Button
              variant="outline"
              onClick={onNavigateToMessages}
              className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
            >
              <MessageSquare className="w-4 h-4" />
              {t('chat.sendMessage', { defaultValue: 'Message' })}
            </Button>
            <Button
              variant="outline"
              onClick={onRequestAttestation}
              className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <ShieldCheck className="w-4 h-4" />
              {t('applications.actions.requestAttestation', { defaultValue: 'Attestation de vigilance' })}
            </Button>
          </>
        )}
        {/* <Button
          variant="outline"
          onClick={onOpenReviewsModal}
          className="gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          {t('freelancers.reviews')}
        </Button> */}
        <Button
          variant={isFavorite ? 'default' : 'outline'}
          onClick={onToggleFavorite}
          disabled={isTogglingFavorite || !canToggleFavorite}
          className={isFavorite ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
          title={!canToggleFavorite ? t('freelancers.selectEstablishmentFirst') : undefined}
        >
          {isTogglingFavorite ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isFavorite ? (
            <>
              <Star className="w-4 h-4 mr-2 fill-current" />
              {t('freelancers.favorite')}
            </>
          ) : (
            <>
              <StarOff className="w-4 h-4 mr-2" />
              {t('freelancers.addToFavorites')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
