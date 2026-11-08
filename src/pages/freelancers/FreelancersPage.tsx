import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useLocale } from '@/hooks/useLocale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import {
  Users,
  Star,
  Search,
  Mail,
  Phone,
  MapPin,
  Loader2,
  User,
  ExternalLink,
  ArrowUpDown,
  Heart,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { handleSupabaseError } from '@/lib/error-handler';
import { format } from 'date-fns';
import { fr, enUS, es, it, zhCN } from 'date-fns/locale';

interface EstablishmentFreelancer {
  id: string;
  establishment_id: string;
  freelancer_id: string;
  is_favorite: boolean;
  notes: string | null;
  created_at: string;
  freelancer: {
    id: string;
    first_name: string;
    last_name: string;
    public_id?: string;
    email: string;
    phone: string | null;
    city: string | null;
    profile_photo_url: string | null;
  };
  missions_count?: number;
  average_rating?: number;
}

type SortOption = 'name-asc' | 'name-desc' | 'rating' | 'missions';

export function FreelancersPage() {
  const { t, i18n } = useTranslation();
  const { navigate } = useLocale();
  const { company } = useAuthStore();
  const { selectedEstablishmentId } = useEstablishmentStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [freelancerToRemove, setFreelancerToRemove] = useState<EstablishmentFreelancer | null>(null);

  // Get date-fns locale
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'es': return es;
      case 'it': return it;
      case 'zh': return zhCN;
      default: return enUS;
    }
  };

  // Fetch favorite freelancers for the establishment
  const { data: freelancers, isLoading, error } = useQuery({
    queryKey: ['establishment-favorite-freelancers', selectedEstablishmentId],
    queryFn: async () => {
      if (!selectedEstablishmentId) return [];

      logger.log('📥 Fetching favorite freelancers...');

      const { data, error } = await supabase
        .from('establishment_freelancers')
        .select(`
          id,
          establishment_id,
          freelancer_id,
          is_favorite,
          notes,
          created_at,
          freelancer:freelancers(
            id,
            public_id,
            first_name,
            last_name,
            email,
            phone,
            city,
            profile_photo_url
          )
        `)
        .eq('establishment_id', selectedEstablishmentId)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('❌ Error fetching freelancers:', error);
        throw error;
      }

      // Fetch missions count and ratings for each freelancer
      const freelancersWithStats = await Promise.all(
        (data || []).map(async (ef) => {
          // Count completed missions
          const { count: missionsCount } = await supabase
            .from('shift_freelancer_applications')
            .select('id', { count: 'exact', head: true })
            .eq('freelancer_id', ef.freelancer_id)
            .in('status', ['accepted', 'completed']);

          // Get average rating
          const { data: reviews } = await supabase
            .from('freelancer_reviews')
            .select('rating')
            .eq('freelancer_id', ef.freelancer_id)
            .eq('establishment_id', selectedEstablishmentId);

          let averageRating: number | undefined;
          if (reviews && reviews.length > 0) {
            const sum = reviews.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0);
            averageRating = Math.round((sum / reviews.length) * 10) / 10;
          }

          return {
            ...ef,
            missions_count: missionsCount || 0,
            average_rating: averageRating,
          };
        })
      );

      logger.log(`✅ Found ${freelancersWithStats.length} freelancers`);
      return freelancersWithStats as EstablishmentFreelancer[];
    },
    enabled: !!selectedEstablishmentId,
  });

  // Remove from favorites mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('establishment_freelancers')
        .update({ is_favorite: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishment-favorite-freelancers'] });
      toast.success(t('freelancers.removedFromFavorites', { defaultValue: 'Retiré des favoris' }));
      setRemoveConfirmOpen(false);
      setFreelancerToRemove(null);
    },
    onError: (error) => {
      handleSupabaseError(error, { context: 'FreelancersPage', operation: 'removeFavorite' });
    },
  });

  // Handle remove button click - open confirmation modal
  const handleRemoveClick = (freelancer: EstablishmentFreelancer) => {
    setFreelancerToRemove(freelancer);
    setRemoveConfirmOpen(true);
  };

  // Confirm removal
  const handleConfirmRemove = () => {
    if (freelancerToRemove) {
      removeFavoriteMutation.mutate(freelancerToRemove.id);
    }
  };

  // Filter and search freelancers
  const filteredFreelancers = useMemo(() => {
    if (!freelancers) return [];

    return freelancers.filter((ef) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${ef.freelancer.first_name} ${ef.freelancer.last_name}`.toLowerCase();
        const email = ef.freelancer.email.toLowerCase();
        const city = ef.freelancer.city?.toLowerCase() || '';

        if (!fullName.includes(query) && !email.includes(query) && !city.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [freelancers, searchQuery]);

  // Sort freelancers
  const sortedFreelancers = useMemo(() => {
    const sorted = [...filteredFreelancers];

    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => {
          const nameA = `${a.freelancer.first_name} ${a.freelancer.last_name}`.toLowerCase();
          const nameB = `${b.freelancer.first_name} ${b.freelancer.last_name}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case 'name-desc':
        return sorted.sort((a, b) => {
          const nameA = `${a.freelancer.first_name} ${a.freelancer.last_name}`.toLowerCase();
          const nameB = `${b.freelancer.first_name} ${b.freelancer.last_name}`.toLowerCase();
          return nameB.localeCompare(nameA);
        });
      case 'rating':
        // Highest rating first, null ratings at the end
        return sorted.sort((a, b) => {
          if (a.average_rating === undefined && b.average_rating === undefined) return 0;
          if (a.average_rating === undefined) return 1;
          if (b.average_rating === undefined) return -1;
          return b.average_rating - a.average_rating;
        });
      case 'missions':
        // Most missions first
        return sorted.sort((a, b) => (b.missions_count || 0) - (a.missions_count || 0));
      default:
        return sorted;
    }
  }, [filteredFreelancers, sortBy]);

  // Stats - just count since all are favorites
  const favoritesCount = freelancers?.length || 0;

  if (!selectedEstablishmentId) {
    return (
      <div className="space-y-6 px-4 md:px-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t('freelancers.favoritesTitle', { defaultValue: 'Freelances favoris' })}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('freelancers.favoritesSubtitle', { defaultValue: 'Vos freelances préférés pour des missions rapides' })}
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-gray-500">
              {t('freelancers.selectEstablishment', { defaultValue: 'Sélectionnez un établissement pour voir vos favoris' })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {t('freelancers.favoritesTitle', { defaultValue: 'Freelances favoris' })}
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold tracking-tight border border-amber-500 text-amber-600 bg-amber-50/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-600">
              {favoritesCount}
            </span>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('freelancers.favoritesSubtitle', { defaultValue: 'Vos freelances préférés pour des missions rapides' })}
          </p>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder={t('freelancers.searchPlaceholder', { defaultValue: 'Rechercher par nom, email ou ville...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                options={[
                  { value: 'name-asc', label: t('freelancers.sortByNameAsc', { defaultValue: 'Nom A-Z' }) },
                  { value: 'name-desc', label: t('freelancers.sortByNameDesc', { defaultValue: 'Nom Z-A' }) },
                  { value: 'rating', label: t('freelancers.sortByRating', { defaultValue: 'Meilleure note' }) },
                  { value: 'missions', label: t('freelancers.sortByMissions', { defaultValue: 'Plus de missions' }) },
                ]}
                className="text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sortedFreelancers.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? t('freelancers.noResults', { defaultValue: 'Aucun freelance trouvé' })
                  : t('freelancers.noFavorites', { defaultValue: 'Aucun freelance favori pour le moment' })}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('freelancers.addFavoritesHint', { defaultValue: 'Ajoutez des freelances en favoris depuis la page détail d\'une mission' })}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>{t('freelancers.freelancer', { defaultValue: 'Freelance' })}</TableHead>
                  <TableHead>{t('freelancers.contact', { defaultValue: 'Contact' })}</TableHead>
                  <TableHead>{t('freelancers.location', { defaultValue: 'Localisation' })}</TableHead>
                  <TableHead className="text-center">{t('freelancers.missions', { defaultValue: 'Missions' })}</TableHead>
                  <TableHead className="text-center">{t('freelancers.rating', { defaultValue: 'Note' })}</TableHead>
                  <TableHead className="text-right">{t('common.actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFreelancers.map((ef) => (
                  <TableRow key={ef.id} className="group">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveClick(ef)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        title={t('freelancers.removeFromFavorites', { defaultValue: 'Retirer des favoris' })}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {ef.freelancer.profile_photo_url ? (
                          <img
                            src={ef.freelancer.profile_photo_url}
                            alt={`${ef.freelancer.first_name} ${ef.freelancer.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                            loading="lazy"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {ef.freelancer.first_name} {ef.freelancer.last_name}
                            {ef.freelancer.public_id && (
                              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 uppercase tracking-tighter">
                                {ef.freelancer.public_id}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('freelancers.since', { defaultValue: 'Depuis' })}{' '}
                            {format(new Date(ef.created_at), 'MMM yyyy', { locale: getDateLocale() })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 opacity-60 cursor-help" title={t('freelancers.contactVisibleOnlyInShift', { defaultValue: "Visible uniquement lors d'un shift actif" })}>
                        <Lock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">[{t('common.private', { defaultValue: 'Privé' })}]</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ef.freelancer.city ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span>{ef.freelancer.city}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Chip variant="secondary">
                        {ef.missions_count}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-center">
                      {ef.average_rating ? (
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{ef.average_rating}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/freelancers/${ef.freelancer_id}`)}
                        className="gap-1"
                      >
                        {t('common.view', { defaultValue: 'Voir' })}
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Remove from favorites confirmation modal */}
      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t('freelancers.removeConfirmTitle', { defaultValue: 'Retirer des favoris ?' })}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {freelancerToRemove && (
                <>
                  <span className="font-medium text-foreground">
                    {freelancerToRemove.freelancer.first_name} {freelancerToRemove.freelancer.last_name}
                  </span>
                  {' '}
                  {t('freelancers.removeConfirmMessage', {
                    defaultValue: 'sera retiré de vos favoris et disparaîtra de cette liste.'
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setRemoveConfirmOpen(false);
                setFreelancerToRemove(null);
              }}
            >
              {t('common.cancel', { defaultValue: 'Annuler' })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={removeFavoriteMutation.isPending}
            >
              {removeFavoriteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.loading', { defaultValue: 'Chargement...' })}
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  {t('freelancers.confirmRemove', { defaultValue: 'Retirer des favoris' })}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
