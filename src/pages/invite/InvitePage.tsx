import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Building2, Mail, CheckCircle, XCircle, Loader2, Smartphone, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { handleSupabaseError } from '@/lib/error-handler'
import { useLocale } from '@/hooks/useLocale'

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  console.log(token)
  const { t } = useTranslation();
  const { navigate } = useLocale();
  const [accountCreated, setAccountCreated] = useState(false);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Force light mode for this page
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
  }

  // Fetch invitation details via edge function (bypasses RLS)
  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) throw new Error('Token is required')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-invitation-details`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ token }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.error === 'expired') {
          throw new Error('expired');
        }
        throw new Error('not_found');
      }

      return result.invitation;
    },
    enabled: !!token,
    retry: false,
  });
      logger.log(invitation  );

  // Accept EMPLOYEE invitation (NO password - OTP only)
  const acceptEmployeeInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!invitation || !token) throw new Error('Invitation not found');

      logger.log('🚀 Début création compte employé:', invitation.email);

      // Appeler l'Edge Function pour créer le compte employé (sans mot de passe)
      logger.log('📝 Création compte employé via Edge Function...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-employee-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            token: token,
            email: invitation.email,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        logger.error('❌ Erreur Edge Function:', result);
        // Handle specific error codes
        if (result.error === 'EMAIL_ALREADY_REGISTERED') {
          throw new Error(t('invitePage.error.emailAlreadyRegistered'));
        }
        throw new Error(result.error || t('invitePage.error.accountCreationFailed'));
      }

      logger.log('✅ Compte employé créé:', result.user.id);
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

  // Accept MANAGER invitation (with password)
  const acceptManagerInvitationMutation = useMutation({
    
    mutationFn: async () => {
      if (!invitation || !token) throw new Error('Invitation not found');
 
      logger.log('🚀 Début création compte manager:', invitation.email);

      // Validation
      if (!password || password.length < 8) {
        throw new Error(t('invitePage.password.minLength'));
      }

      if (password !== confirmPassword) {
        throw new Error(t('invitePage.password.mismatch'));
      }

      // Appeler l'Edge Function pour créer le compte (email auto-confirmé)
      logger.log('📝 Création compte manager via Edge Function...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-manager-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: invitation.email,
            password: password,
            invitation_token: token,
            company_id: invitation.company?.id,
            establishment_id: invitation.establishment_id,
            first_name: invitation.first_name ,
            last_name: invitation.last_name,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        logger.error('❌ Erreur Edge Function:', result);
        throw new Error(result.error || t('invitePage.error.accountCreationFailed'));
      }

      logger.log('✅ Compte manager créé:', result.user_id);
      return { user: { id: result.user_id } };
    },
    onSuccess: () => {
      setAccountCreated(true);
      toast.success(t('invitePage.toast.managerCreated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('invitePage.toast.error'));
    },
  });

  const isManagerInvitation = invitation?.role === 'manager';
  const acceptInvitationMutation = isManagerInvitation
    ? acceptManagerInvitationMutation
    : acceptEmployeeInvitationMutation;

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
    const isExpired = error?.message === 'expired';
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              {isExpired ? t('invitePage.error.expiredTitle') : t('invitePage.error.invalidTitle')}
            </h2>
            <p className="text-gray-600 mb-4">
              {isExpired
                ? t('invitePage.error.expired')
                : t('invitePage.error.invalid')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accountCreated) {
    if (isManagerInvitation) {
      // Success message for MANAGER
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-gray-900">{t('invitePage.accountCreated')}</h2>
                <p className="text-gray-600">
                  {t('invitePage.managerAccountCreated')}
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg space-y-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-2">
                      🎉 {t('invitePage.success.manager.canLogin')}
                    </p>
                    <p className="text-sm text-blue-800">
                      {t('invitePage.success.manager.loginInstructions', { email: invitation.email })}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className="w-full mt-6"
                size="lg"
              >
                {t('invitePage.loginNow')}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Success message for EMPLOYEE
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-gray-900">{t('invitePage.accountCreated')}</h2>
              <p className="text-gray-600">
                {t('invitePage.employeeAccountCreated')}
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg space-y-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Smartphone className="w-6 h-6 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-2">
                    📱 {t('invitePage.success.employee.nextSteps')}
                  </p>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li>{t('invitePage.success.employee.step1')}</li>
                    <li>{t('invitePage.success.employee.step2', { email: invitation.email })}</li>
                    <li>{t('invitePage.success.employee.step3')}</li>
                    <li>{t('invitePage.success.employee.step4')}</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Download buttons */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border-2 border-gray-200 space-y-4">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 mb-1">
                  📱 {t('invitePage.success.employee.downloadApp')}
                </p>
                <p className="text-sm text-gray-600">
                  {t('invitePage.success.employee.choosePlatform')}
                </p>
              </div>

              <div className="space-y-3">
                {/* App Store */}
                <a
                  href="https://apps.apple.com/us/app/shift-express/id6754389301"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full bg-black text-white py-4 px-6 rounded-xl font-semibold text-base hover:bg-gray-900 hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl"
                >
                  {t('invitePage.success.employee.appStore')}
                </a>

                {/* Android APK */}
                <a
                  href="https://github.com/shiftexpress01/shift-express-apk/releases/latest/download/shift-express-v2.0.0.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-semibold text-base hover:from-green-700 hover:to-green-800 hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl"
                >
                  {t('invitePage.success.employee.androidApk')}
                </a>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                {t('invitePage.success.employee.loginReminder')}
              </p>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                <strong>⚠️ {t('common.important')}:</strong> {t('invitePage.success.employee.mobileOnly')}
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
          <CardTitle className="text-gray-900">
            {isManagerInvitation ? t('invitePage.createManagerAccount') : t('invitePage.activateEmployeeAccount')}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {t('invitePage.invitedToJoin', { company: invitation.company?.name })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation details */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{invitation.company?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{invitation.email}</span>
            </div>
            <div className="flex items-center gap-2">
              {isManagerInvitation ? (
                <Shield className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Smartphone className="w-4 h-4 text-muted-foreground" />
              )}
              <Badge variant={isManagerInvitation ? 'default' : 'secondary'}>
                {isManagerInvitation ? t('invitePage.role.manager') : t('invitePage.role.employee')}
              </Badge>
            </div>
          </div>

          {/* Manager: Password fields */}
          {isManagerInvitation && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>🔐 {t('invitePage.manager.createPassword')}</strong>
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  {t('invitePage.manager.accessDescription')}
                </p>
              </div>

              <Input
                type="password"
                label={t('invitePage.password.label')}
                placeholder={t('invitePage.password.placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                error={password && password.length < 8 ? t('invitePage.password.minLength') : undefined}
              />

              <Input
                type="password"
                label={t('invitePage.password.confirmLabel')}
                placeholder={t('invitePage.password.confirmPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={password && confirmPassword && password !== confirmPassword ? t('invitePage.password.mismatch') : undefined}
              />
            </div>
          )}

          {/* Employee: No password needed */}
          {!isManagerInvitation && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 mb-3">
                <strong>🎉 {t('invitePage.employee.welcome')}</strong>
              </p>
              <p className="text-sm text-blue-800">
                {t('invitePage.employee.activationInstructions')}
              </p>
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={() => acceptInvitationMutation.mutate()}
            className="w-full"
            disabled={
              acceptInvitationMutation.isPending ||
              (isManagerInvitation && (!password || password !== confirmPassword || password.length < 8))
            }
            size="lg"
          >
            {acceptInvitationMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {isManagerInvitation ? t('invitePage.button.creatingAccount') : t('invitePage.button.activating')}
              </>
            ) : (
              isManagerInvitation ? t('invitePage.button.createManagerAccount') : t('invitePage.button.activateAccount')
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t('invitePage.expiresOn', { date: invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : 'N/A' })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
