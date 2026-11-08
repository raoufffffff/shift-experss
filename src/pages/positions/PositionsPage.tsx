import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useEstablishmentStore } from '@/stores/establishmentStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Plus, Loader2, Trash2, Edit2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { CreatePositionDialog } from '@/components/positions/CreatePositionDialog';
import { logger } from '@/utils/logger'
import { handleSupabaseError } from '@/lib/error-handler'

interface Position {
  id: string;
  title: string;
  description: string | null;
  establishment_id: string | null;
  establishment?: {
    id: string;
    name: string;
  };
  created_at: string;
}

export function PositionsPage() {
  const { t } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const { company } = useAuthStore();
  const { selectedEstablishmentId } = useEstablishmentStore();
  const queryClient = useQueryClient();

  // Realtime subscription pour auto-update positions
  useEffect(() => {
    if (!company?.id) return

    logger.log('🔴 Subscribing to positions realtime updates for company:', company.id)

    const channel = supabase
      .channel(`positions_${company.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'positions',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          logger.log('🔄 Position changed:', payload)
          queryClient.invalidateQueries({ queryKey: ['positions', company.id] })
        }
      )
      .subscribe()

    return () => {
      logger.log('🔴 Unsubscribing from positions realtime')
      supabase.removeChannel(channel)
    }
  }, [company?.id, queryClient])

  // Fetch positions
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['positions', company?.id, selectedEstablishmentId],
    queryFn: async () => {
      if (!company?.id) return []

      let query = supabase
        .from('positions')
        .select('*, establishment:establishments(id, name)')
        .eq('company_id', company.id)
        .order('title');

      if (selectedEstablishmentId) {
        query = query.or(`establishment_id.eq.${selectedEstablishmentId},establishment_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'PositionsPage',


          operation: 'query'


        });


        throw new Error(message);


      }
      return data as Position[];
    },
    enabled: !!company?.id,
  });

  // Delete position mutation
  const deletePositionMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', positionId);

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'PositionsPage',


          operation: 'query'


        });


        throw new Error(message);


      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success(t('positions.deleteSuccess'));
    },
    onError: () => {
      toast.error(t('positions.deleteError'));
    },
  });

  const handleDelete = (position: Position) => {
    if (confirm(t('positions.confirmDelete', { title: position.title }))) {
      deletePositionMutation.mutate(position.id);
    }
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setEditingPosition(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('positions.title')}</h1>
          <p className="text-gray-600">
            {t('positions.subtitle')}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('positions.create')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-gray-600">{t('positions.total')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Positions table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('positions.count', { count: positions.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">
                {t('positions.noPositions')}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('positions.create')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('positions.positionTitle')}</TableHead>
                  <TableHead>{t('positions.establishment')}</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">
                      {position.title}
                    </TableCell>
                    <TableCell>
                      {position.establishment ? (
                        <Badge variant="secondary">
                          {position.establishment.name}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {t('positions.allEstablishments')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {position.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(position)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(position)}
                          disabled={deletePositionMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <CreatePositionDialog
        open={createDialogOpen}
        onOpenChange={handleCloseDialog}
        position={editingPosition}
      />
    </div>
  );
}
