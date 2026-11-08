import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleSupabaseError } from '@/lib/error-handler'
import { useTranslation } from 'react-i18next';

const createPositionSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(2, t('positions.createDialog.titleRequired')),
  description: z.string().optional(),
  establishment_id: z.string().optional(),
});

type PositionFormData = {
  title: string
  description?: string
  establishment_id?: string
};

interface CreatePositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: {
    id: string;
    title: string;
    description: string | null;
    establishment_id: string | null;
  } | null;
}

export function CreatePositionDialog({ open, onOpenChange, position }: CreatePositionDialogProps) {
  const { t } = useTranslation();
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PositionFormData>({
    resolver: zodResolver(createPositionSchema(t)),
  });

  const establishmentId = watch('establishment_id');

  // Reset form when dialog opens/closes or when editing a different position
  useEffect(() => {
    if (open && position) {
      reset({
        title: position.title,
        description: position.description || '',
        establishment_id: position.establishment_id || '',
      });
    } else if (open && !position) {
      reset({
        title: '',
        description: '',
        establishment_id: '',
      });
    }
  }, [open, position, reset]);

  // Fetch establishments
  const { data: establishments = [] } = useQuery({
    queryKey: ['establishments', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name');

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'CreatePositionDialog',


          operation: 'query'


        });


        throw new Error(message);


      }
      return data;
    },
    enabled: !!company?.id && open,
  });

  // Create/Update position mutation
  const savePositionMutation = useMutation({
    mutationFn: async (formData: PositionFormData) => {
      if (!company?.id) throw new Error('Company ID not found');

      const positionData = {
        company_id: company.id,
        title: formData.title,
        description: formData.description || null,
        establishment_id: formData.establishment_id || null,
      };

      if (position?.id) {
        // Update existing position
        const { error } = await supabase
          .from('positions')
          .update(positionData)
          .eq('id', position.id);

        if (error) {


          const message = handleSupabaseError(error, {


            context: 'CreatePositionDialog',


            operation: 'query'


          });


          throw new Error(message);


        }
      } else {
        // Create new position
        const { error } = await supabase
          .from('positions')
          .insert(positionData);

        if (error) {


          const message = handleSupabaseError(error, {


            context: 'CreatePositionDialog',


            operation: 'query'


          });


          throw new Error(message);


        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success(position ? t('positions.createDialog.updateSuccess') : t('positions.createDialog.createSuccess'));
      onOpenChange(false);
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || t('positions.createDialog.saveError'));
    },
  });

  const onSubmit = (data: PositionFormData) => {
    savePositionMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {position ? t('positions.createDialog.titleEdit') : t('positions.createDialog.titleCreate')}
          </DialogTitle>
          <DialogDescription>
            {position
              ? t('positions.createDialog.descriptionEdit')
              : t('positions.createDialog.descriptionCreate')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('positions.createDialog.titleLabel')}
            placeholder={t('positions.createDialog.titlePlaceholder')}
            error={errors.title?.message}
            {...register('title')}
            required
          />

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('positions.createDialog.establishmentLabel')}
            </label>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Select
                value={establishmentId || ''}
                onChange={(e) => setValue('establishment_id', e.target.value || '')}
                options={[
                  { value: '', label: t('positions.allEstablishments') },
                  ...establishments.map((e) => ({
                    value: e.id,
                    label: e.name,
                  })),
                ]}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('positions.createDialog.establishmentNote')}
            </p>
          </div>

          <Textarea
            label={t('positions.createDialog.descriptionLabel')}
            placeholder={t('positions.createDialog.descriptionPlaceholder')}
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={savePositionMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={savePositionMutation.isPending}>
              {savePositionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('positions.createDialog.saving')}
                </>
              ) : position ? (
                t('positions.createDialog.update')
              ) : (
                t('positions.createDialog.create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
