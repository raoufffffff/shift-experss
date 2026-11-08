import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { canAddEmployee } from '@shared/subscription-limits';
import { SubscriptionPlanEnum } from '@shared/types';
import { logger } from '@/utils/logger';
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
import { Select } from '@/components/ui/Select';
import { Loader2, Mail, Check, Building2, Crown, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleSupabaseError } from '@/lib/error-handler';
import { useTranslation } from 'react-i18next';

const getInviteSchema = (t: (key: string) => string) => z.object({
  email: z.string().email(t('employees.emailInvalid')),
  first_name: z.string().min(2, t('employees.firstNameRequired')),
  last_name: z.string().min(2, t('employees.lastNameRequired')),
  establishment_id: z.string().min(1, t('employees.establishmentRequired')),
});

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToGeneralLink?: (establishmentId: string, establishmentName: string) => void;
}

export function InviteDialog({ open, onOpenChange, onSwitchToGeneralLink }: InviteDialogProps) {
  const { t } = useTranslation();
  const { company } = useAuthStore();
  const queryClient = useQueryClient();
  const [inviteSent, setInviteSent] = useState(false);

  const inviteSchema = getInviteSchema(t);
  type InviteFormData = z.infer<typeof inviteSchema>;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  }); 

  const establishmentId = watch('establishment_id');

  // Fetch establishments
  const { data: establishments = [] } = useQuery({
    queryKey: ['establishments', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('name');

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'InviteDialog',


          operation: 'query'


        });


        throw new Error(message);


      }
      return data;
    },
    enabled: !!company?.id && open,
  });

  // Auto-select establishment if there's only one active
  useEffect(() => {
    if (establishments.length === 1 && !establishmentId) {
      setValue('establishment_id', establishments[0].id);
    }
  }, [establishments, establishmentId, setValue]);

  // Compter les employés pour vérifier les limites
  const { data: employeesCount = 0 } = useQuery({
    queryKey: ['employees-count', company?.id, establishmentId, company?.subscription_plan],
    queryFn: async () => {
      if (!company?.id) return 0;

      let query = supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('active', true);

      // Pour Pro: compter par établissement, pour Free: global
      if (company.subscription_plan === SubscriptionPlanEnum.PRO && establishmentId) {
        query = query.eq('establishment_id', establishmentId);
      }

      const { count } = await query;
      return count || 0;
    },
    enabled: !!company?.id && open,
  });

  // Vérifier les limites
  // Pour le plan Pro, on attend que l'établissement soit sélectionné
  // Pour les autres plans (FREE), on vérifie immédiatement
  const limitCheck = company && company.subscription_plan
    ? (company.subscription_plan === SubscriptionPlanEnum.PRO && !establishmentId)
      ? null
      : canAddEmployee(
        employeesCount,
        company.subscription_plan,
        company.subscription_plan === SubscriptionPlanEnum.PRO
      )
    : null;
  const canInvite = limitCheck?.allowed ?? (company?.subscription_plan === SubscriptionPlanEnum.PRO ? true : false);

  // Create invitation mutation
  const createInviteMutation = useMutation({
    mutationFn: async (formData: InviteFormData) => {
      if (!company?.id) throw new Error('Company ID not found');

      // Vérifier les limites avant création
      if (!canInvite && limitCheck?.message) {
        throw new Error(limitCheck.message);
      }

      // 1. Vérifier si un utilisateur avec cet email existe
      // const { data: userData } = await supabase
      //   .from('users')
      //   .select('id')
      //   .eq('email', formData.email)
      //   .single();
      //   if (userData) {
      //   // 2. Vérifier si cet utilisateur est déjà un employé
      //   const { data: existingEmployee } = await supabase
      //     .from('employees')
      //     .select('id')
      //     .eq('user_id', userData?.id )
      //     .single();
      //   console.log(existingEmployee, "existingEmployee")
      //   if (existingEmployee) {
      //     throw new Error(t('employees.emailAlreadyRegistered'));
      //   }
      // }

      // Créer l'invitation
      const invitationData = {
        company_id: company.id,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        establishment_id: formData.establishment_id,
        role: 'employee' as const,
      };

      const { data: invitation, error } = await supabase
        .from('team_invitations')
        .insert(invitationData)
        .select()
        .single();

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'InviteDialog',


          operation: 'query'


        });


        throw new Error(message);


      }

      const inviteUrl = `${window.location.origin}/invite/${invitation.token}`;
      return { invitation, inviteUrl, formData };
    },
    onSuccess: async ({ invitation, inviteUrl, formData }) => {
      // Envoyer l'email via Edge Function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const establishment = establishments.find(e => e.id === formData.establishment_id);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-team-invitation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              email: invitation.email,
              invitationToken: invitation.token,
              companyName: company?.name || '',
              inviterName: company?.name || t('employees.yourEmployer'),
              establishmentName: establishment?.name,
              role: 'employee',
            }),
          }
        );

        if (!response.ok) {
          throw new Error(t('employees.errorSendingEmail'));
        }

        setInviteSent(true);
        toast.success(t('employees.emailSent'));
      } catch (error) {
        logger.error('Error sending invitation email:', error);
        // L'invitation est créée, mais l'email n'a pas pu être envoyé
        setInviteSent(true);
        toast.warning(t('employees.invitationCreatedWarning'), {
          description: t('employees.emailNotSentWarning'),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('employees.inviteError'), {
        duration: 5000,
        action: limitCheck?.limitReached ? {
          label: t('employees.viewPlans'),
          onClick: () => window.location.href = '/subscription'
        } : undefined
      });
    },
  });

  const onSubmit = (data: InviteFormData) => {
    createInviteMutation.mutate(data);
  };

  const handleClose = () => {
    setInviteSent(false);
    reset();
    onOpenChange(false);
  };

  const handleSwitchToGeneralLink = () => {
    if (!onSwitchToGeneralLink) return;

    const selectedEstId = establishmentId || watch('establishment_id');
    if (!selectedEstId) {
      toast.error(t('employees.selectEstablishmentFirst'));
      return;
    }

    const establishment = establishments.find(e => e.id === selectedEstId);
    if (!establishment) return;

    onSwitchToGeneralLink(establishment.id, establishment.name);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {inviteSent ? t('employees.inviteTitleSent') : t('employees.inviteTitle')}
          </DialogTitle>
          <DialogDescription>
            {inviteSent
              ? t('employees.inviteDescriptionSent')
              : t('employees.inviteDescription')}
          </DialogDescription>
        </DialogHeader>

        {createInviteMutation.isPending ? (
          // Loading state with nice animation
          <div className="py-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              {/* Animated spinner */}
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
              </div>

              {/* Loading text */}
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {t('employees.sendingInvitation')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('employees.sendingInvitationDescription')}
                </p>
              </div>

              {/* Steps indicator */}
              <div className="w-full max-w-xs space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-muted-foreground">{t('employees.creatingInvitation')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                  <span className="text-muted-foreground">{t('employees.sendingEmail')}</span>
                </div>
              </div>
            </div>
          </div>
        ) : !inviteSent ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              type="email"
              label={t('employees.email')}
              placeholder={t('employees.emailPlaceholder')}
              error={errors.email?.message}
              {...register('email')}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('employees.firstName')}
                placeholder={t('employees.firstNamePlaceholder')}
                error={errors.first_name?.message}
                {...register('first_name')}
                required
              />
              <Input
                label={t('employees.lastName')}
                placeholder={t('employees.lastNamePlaceholder')}
                error={errors.last_name?.message}
                {...register('last_name')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('employees.establishment')} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <Select
                  {...register('establishment_id')}
                  options={[
                    { value: '', label: t('employees.establishmentPlaceholder') },
                    ...establishments.map((e) => ({
                      value: e.id,
                      label: e.name,
                    })),
                  ]}
                  className="flex-1"
                />
              </div>
              {errors.establishment_id && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.establishment_id.message}
                </p>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>📧 {t('employees.howItWorks')}</strong>
              </p>
              <ol className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-decimal list-inside">
                <li>{t('employees.step1')}</li>
                <li>{t('employees.step2')}</li>
                <li>{t('employees.step3')}</li>
                <li>{t('employees.step4')}</li>
              </ol>
            </div>

            {onSwitchToGeneralLink && (
              <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Link2 className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                      {t('employees.generalLinkOption')}
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                      {t('employees.generalLinkDescription')}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSwitchToGeneralLink}
                      className="text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                    >
                      <Link2 className="w-3 h-3 mr-1.5" />
                      {t('employees.createGeneralLink')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!canInvite && limitCheck?.message && (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3 space-y-3">
                <p>
                  {limitCheck.messageKey
                    ? t(limitCheck.messageKey, {
                      ...limitCheck.messageParams,
                      scope: limitCheck.messageParams?.scope ? t(`limits.scope.${limitCheck.messageParams.scope}`) : '',
                      count: limitCheck.max
                    })
                    : limitCheck.message
                  }
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => window.location.href = '/subscription'}
                  className="w-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 text-white dark:text-white border-0"
                >
                  <Crown className="w-4 h-4 mr-2 text-white dark:text-white" />
                  <span className="text-white dark:text-white">{t('common.upgrade')}</span>
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createInviteMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createInviteMutation.isPending || !canInvite}>
                {!canInvite && <Crown className="w-4 h-4 mr-2" />}
                {createInviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('employees.sending')}
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    {t('employees.sendInvitation')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Success message */}
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('employees.invitationCreated')}</h3>
              <p className="text-sm text-muted-foreground text-center">
                {t('employees.invitationMessage')}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>⚠️ {t('employees.important')}</strong>
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                {t('employees.expirationMessage')}
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                {t('employees.done')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
