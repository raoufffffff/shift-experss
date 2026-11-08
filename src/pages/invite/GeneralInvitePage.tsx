import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Building2, Mail, CheckCircle, XCircle, Loader2, Smartphone, User } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface InvitationData {
  establishment: {
    name: string;
    city: string;
    address: string;
  };
  company: {
    name: string;
  };
  expires_at: string | null;
}

export function GeneralInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [accountCreated, setAccountCreated] = useState(false);

  // Force light mode for this page
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
  }

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Fetch invitation details (public endpoint, no auth required)
  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ['general-invitation', token],
    queryFn: async () => {
      if (!token) throw new Error('Token is required');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/invitations/public/${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.code || 'INVALID_TOKEN');
      }

      const data = await response.json();
      return data.invitation as InvitationData;
    },
    enabled: !!token,
    retry: false,
  });

  // Accept general invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!invitation || !token) throw new Error('Invitation not found');

      // Validation
      if (!firstName || !lastName || !email) {
        throw new Error(t('generalInvitePage.validation.requiredFields'));
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error(t('generalInvitePage.validation.invalidEmail'));
      }

      logger.log('🚀 Début inscription via invitation générale:', email);

      // Call Edge Function to create employee account via general invitation
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-general-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            token,
            first_name: firstName,
            last_name: lastName,
            email,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        logger.error('❌ Erreur Edge Function:', result);
        // Handle specific error codes
        if (result.error === 'EMAIL_ALREADY_REGISTERED') {
          throw new Error(t('generalInvitePage.error.emailAlreadyRegistered'));
        }
        throw new Error(result.error || t('invitePage.toast.error'));
      }

      logger.log('✅ Compte employé créé via invitation générale:', result.user_id);
      return result;
    },
    onSuccess: () => {
      setAccountCreated(true);
      toast.success(t('invitePage.toast.employeeCreated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('invitePage.toast.error'));
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">{t('invitePage.loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    const errorCode = error?.message;
    const isExpired = errorCode === 'EXPIRED_TOKEN';
    const isMaxUses = errorCode === 'MAX_USES_REACHED';

    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              {isExpired && t('invitePage.error.expiredTitle')}
              {isMaxUses && t('generalInvitePage.error.maxUsesTitle')}
              {!isExpired && !isMaxUses && t('invitePage.error.invalidTitle')}
            </h2>
            <p className="text-gray-600 mb-4">
              {isExpired && t('invitePage.error.expired')}
              {isMaxUses && t('generalInvitePage.error.maxUses')}
              {!isExpired && !isMaxUses && t('generalInvitePage.error.invalid')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accountCreated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-gray-900">{t('generalInvitePage.success.title')}</h2>
              <p className="text-gray-600">
                {t('invitePage.employeeAccountCreated')}
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg space-y-4">
              <div className="flex items-start gap-3">
                <Smartphone className="w-6 h-6 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-2">
                    {t('invitePage.success.employee.nextSteps')}
                  </p>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li>{t('generalInvitePage.success.step1')}</li>
                    <li>{t('invitePage.success.employee.step2', { email })}</li>
                    <li>{t('generalInvitePage.success.step3')}</li>
                    <li>{t('generalInvitePage.success.step4')}</li>
                    <li>{t('invitePage.success.employee.step4')}</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                <strong>{t('common.important')}:</strong> {t('invitePage.success.employee.mobileOnly')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-gray-900">{t('generalInvitePage.title')}</CardTitle>
          <CardDescription className="text-gray-600">
            {t('invitePage.invitedToJoin', { company: invitation.company.name })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation details */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium">{invitation.establishment.name}</p>
                <p className="text-xs text-gray-600">{invitation.establishment.city}</p>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900 mb-2">
              <strong>{t('invitePage.employee.welcome')}</strong>
            </p>
            <p className="text-sm text-blue-800">
              {t('generalInvitePage.formInstructions')}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <Input
              type="text"
              label={t('common.firstName')}
              placeholder={t('generalInvitePage.firstNamePlaceholder')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              icon={<User className="w-4 h-4" />}
            />

            <Input
              type="text"
              label={t('common.lastName')}
              placeholder={t('generalInvitePage.lastNamePlaceholder')}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              icon={<User className="w-4 h-4" />}
            />

            <Input
              type="email"
              label={t('common.email')}
              placeholder={t('generalInvitePage.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="w-4 h-4" />}
              error={email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? t('generalInvitePage.validation.invalidEmail') : undefined}
            />
          </div>

          {/* Submit button */}
          <Button
            onClick={() => acceptInvitationMutation.mutate()}
            className="w-full"
            disabled={
              acceptInvitationMutation.isPending ||
              !firstName ||
              !lastName ||
              !email ||
              !!(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            }
            size="lg"
          >
            {acceptInvitationMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('invitePage.button.creatingAccount')}
              </>
            ) : (
              t('generalInvitePage.button.createAccount')
            )}
          </Button>

          {invitation.expires_at && (
            <p className="text-xs text-center text-gray-600">
              {t('invitePage.expiresOn', { date: new Date(invitation.expires_at).toLocaleDateString() })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
