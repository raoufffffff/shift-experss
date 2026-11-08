import { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,   
  DialogTitle,
} from '@/components/ui/Dialog'
import { toast } from 'sonner'
import { Lock, Building2, User as UserIcon, Globe, Shield, Palette, AlertCircle, Phone, Trash2, Share2 } from 'lucide-react'
import { LanguageSelector } from '@/components/settings/LanguageSelector'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { PaymentMethodCard } from '@/components/settings/PaymentMethodCard'
import { useTranslation } from 'react-i18next' 
import { handleSupabaseError } from '@/lib/error-handler'
import { useLocale } from '@/hooks/useLocale'
import { ImageUpload } from '@/components/ui/ImageUpload'
 
export function SettingsPage() {
  const { t } = useTranslation()
  const { navigate } = useLocale()
  const { user, company, setUser, setCompany } = useAuthStore()
  const queryClient = useQueryClient()
  console.log('user', user)
  // Company settings state
  const [companyName, setCompanyName] = useState(company?.name || '')
  const [siret, setSiret] = useState(company?.siret || '')
  const [logoUrl, setLogoUrl] = useState<string | null>(company?.logo_url || null)
  const [billingEmail, setBillingEmail] = useState('')
  const [establishmentPhone, setEstablishmentPhone] = useState('')
  const [establishmentId, setEstablishmentId] = useState<string | null>(null)

  // User profile state
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')

  // Account deletion flow state
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [showDeleteOtpDialog, setShowDeleteOtpDialog] = useState(false)
  const [showDeleteSuccessDialog, setShowDeleteSuccessDialog] = useState(false)
  const [deleteOtpCode, setDeleteOtpCode] = useState('')
  const [deleteDayResult, setDeleteDayResult] = useState<string | null>(null)

  // Fetch billing email + establishment phone
  useEffect(() => {
    if (company?.id) {
      supabase.from('companies').select('billing_email').eq('id', company.id).single().then(({ data }) => {
        if ((data as any)?.billing_email) setBillingEmail((data as any).billing_email)
      })
      supabase.from('establishments').select('id, phone').eq('company_id', company.id).limit(1).single().then(({ data }) => {
        if (data) {
          setEstablishmentId(data.id)
          if ((data as any)?.phone) setEstablishmentPhone((data as any).phone)
        }
      })
    }
  }, [company?.id])

  // Sync state when data is loaded or changed
  useEffect(() => {
    if (company?.name && !companyName) setCompanyName(company.name)
    if (company?.siret && !siret) setSiret(company.siret)
    if (company?.logo_url && !logoUrl) setLogoUrl(company.logo_url)
  }, [company])

  useEffect(() => {
    if (user?.first_name && !firstName) setFirstName(user.first_name)
    if (user?.last_name && !lastName) setLastName(user.last_name)
  }, [user])

  // Fetch SIRET document status
  const { data: siretDocument } = useQuery({
    queryKey: ['company-siret-status', company?.id],
    queryFn: async () => {
      if (!company?.id) return null

      const { data, error } = await supabase
        .from('company_documents' as never)
        .select('*')
        .eq('company_id', company.id)
        .eq('type', 'siret')
        .maybeSingle()

      if (error) return null
      return data as { status: string; rejection_reason?: string } | null
    },
    enabled: !!company?.id
  })


  // Transfert automatique vers les freelancers quand un employé accepté se désiste.
  // Lecture dédiée (indépendante du store) + sauvegarde immédiate au clic : ce réglage
  // a un impact sur les coûts, on évite qu'il dépende d'un clic oublié sur « Enregistrer ».
  const { data: forwardWithdrawn = false, isLoading: forwardLoading } = useQuery({
    queryKey: ['company-forward-withdrawn', company?.id],
    queryFn: async () => {
      if (!company?.id) return false
      const { data, error } = await supabase
        .from('companies')
        .select('forward_withdrawn_shifts_to_freelancers' as never)
        .eq('id', company.id)
        .single()
      if (error) throw error
      return !!(data as unknown as { forward_withdrawn_shifts_to_freelancers?: boolean })?.forward_withdrawn_shifts_to_freelancers
    },
    enabled: !!company?.id && user?.role === 'admin',
  })

  const updateForwardWithdrawnMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!company?.id) throw new Error('Company not found')
      const { error } = await supabase
        .from('companies')
        .update({ forward_withdrawn_shifts_to_freelancers: enabled } as never)
        .eq('id', company.id)
      if (error) {
        const message = handleSupabaseError(error, {
          context: 'SettingsPage',
          operation: 'updateForwardWithdrawn'
        })
        throw new Error(message)
      }
      return enabled
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ['company-forward-withdrawn', company?.id] })
      const previous = queryClient.getQueryData<boolean>(['company-forward-withdrawn', company?.id])
      queryClient.setQueryData(['company-forward-withdrawn', company?.id], enabled)
      return { previous }
    },
    onSuccess: (enabled) => {
      toast.success(
        enabled
          ? t('settings.forwardWithdrawn.enabledToast', { defaultValue: 'Transfert automatique aux freelancers activé' })
          : t('settings.forwardWithdrawn.disabledToast', { defaultValue: 'Transfert automatique aux freelancers désactivé' })
      )
    },
    onError: (error: unknown, _enabled, context) => {
      queryClient.setQueryData(['company-forward-withdrawn', company?.id], context?.previous ?? false)
      toast.error(t('settings.saveError'), {
        description: error instanceof Error ? error.message : t('errors.generic'),
      })
    },
  })

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company not found')

      const { data, error } = await supabase
        .from('companies')
        .update({
          name: companyName,
          siret: siret,
          logo_url: logoUrl,
          billing_email: billingEmail || null,
        } as never)
        .eq('id', company.id)
        .select()
        .single()

      // Update establishment phone
      if (establishmentId) {
        await supabase
          .from('establishments')
          .update({ phone: establishmentPhone || null } as never)
          .eq('id', establishmentId)
      }

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'SettingsPage',


          operation: 'query'


        });


        throw new Error(message);


      }
      return data
    },
    onSuccess: (data) => {
      setCompany(data as unknown as Parameters<typeof setCompany>[0])
      toast.success(t('settings.saveSuccess'))
    },
    onError: (error: unknown) => {
      toast.error(t('settings.saveError'), {
        description: error instanceof Error ? error.message : t('errors.generic'),
      })
    },
  })

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found')

      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'SettingsPage',


          operation: 'query'


        });


        throw new Error(message);


      }
      return data
    },
    onSuccess: (data) => {
      setUser(data)
      toast.success(t('settings.profileSaveSuccess'))
    },
    onError: (error: unknown) => {
      toast.error(t('settings.saveError'), {
        description: error instanceof Error ? error.message : t('errors.generic'),
      })
    },
  })

  // Step 1: send the deletion OTP code to the user's email
  const sendDeleteOtpMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('User email not found')

      const { data, error } = await supabase.functions.invoke('send-delete-account-otp', {
        body: { email: user.email },
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      setShowDeleteConfirmDialog(false)
      setDeleteOtpCode('')
      setShowDeleteOtpDialog(true)
      toast.success(t('settings.deleteAccount.otpSent', { defaultValue: 'Code envoyé par email' }))
    },
    onError: (error: unknown) => {
      toast.error(t('settings.deleteAccount.otpSendError', { defaultValue: 'Erreur lors de l\'envoi du code' }), {
        description: error instanceof Error ? error.message : t('errors.generic'),
      })
    },
  })

  // Step 2: verify the OTP code and schedule the deletion (3-day grace period)
  const verifyDeleteOtpMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('User email not found')
      if (!deleteOtpCode || deleteOtpCode.length !== 6) throw new Error('Code invalide')

      const { data, error } = await supabase.functions.invoke('verify-delete-account-otp', {
        body: { email: user.email, code: deleteOtpCode },
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data as { delete_day: string }
    },
    onSuccess: (data) => {
      setShowDeleteOtpDialog(false)
      setDeleteDayResult(data.delete_day)
      setShowDeleteSuccessDialog(true)
      setUser({ ...user, is_deleting: true, delete_day: data.delete_day } as never)
    },
    onError: (error: unknown) => {
      toast.error(t('settings.deleteAccount.otpVerifyError', { defaultValue: 'Code invalide ou expiré' }), {
        description: error instanceof Error ? error.message : t('errors.generic'),
      })
    },
  })

  // Cancel a scheduled deletion — direct update, no OTP needed (the user is already authenticated)
  const cancelDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found')

      const { data, error } = await supabase
        .from('users')
        .update({ is_deleting: false, delete_day: null })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: (data) => {
      setUser(data)
      toast.success(t('settings.deleteAccount.cancelSuccess', { defaultValue: 'Suppression annulée avec succès' }))
    },
    onError: (error: unknown) => {
      toast.error(t('settings.deleteAccount.cancelError', { defaultValue: "Erreur lors de l'annulation" }), {
        description: error instanceof Error ? error.message : t('errors.generic'),
      })
    },
  })

  // Days remaining before permanent deletion
  const daysRemaining = (() => {
    if (!(user as any)?.delete_day) return null
    const deleteDate = new Date((user as any).delete_day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deleteDate.setHours(0, 0, 0, 0)
    const diffMs = deleteDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  })()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Company Settings - Admin Only */}
      {user?.role === 'admin' && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">{t('settings.companyInfo')}</CardTitle>
              </div>
              <CardDescription className="text-sm">
                {t('settings.companyDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="space-y-3 shrink-0">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.companyLogo', { defaultValue: 'Logo de l\'entreprise' })}</Label>
                    <ImageUpload
                      value={logoUrl}
                      onChange={setLogoUrl}
                      folder={`companies/${company?.id}`}
                      className="w-full md:w-auto"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest" htmlFor="company-name">{t('settings.companyName')}</Label>
                        {company?.public_id && (
                          <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 uppercase tracking-tighter">
                            {company.public_id}
                          </span>
                        )}
                      </div>
                      <Input
                        id="company-name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={t('settings.companyNamePlaceholder')}
                        className="dark:bg-muted/20 h-10 font-medium"
                      />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest" htmlFor="company-siret">
                            {t('settings.siret', { defaultValue: 'Numéro SIRET' })}
                          </Label>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {t('settings.siretRequired')}
                          </p>
                        </div>
                        {company?.siret && (
                          siretDocument?.status === 'verified' ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <Shield className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-bold uppercase tracking-tight">{t('settings.siretVerified')}</span>
                            </div>
                          ) : siretDocument?.status === 'rejected' ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-500/20" title={siretDocument.rejection_reason || t('settings.siretDocumentRejected')}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-bold uppercase tracking-tight">{t('settings.siretRejected')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-[11px] font-bold uppercase tracking-tight">{t('settings.siretPendingVerification')}</span>
                            </div>
                          )
                        )}
                      </div>

                      <div className="relative">
                        <Input
                          id="company-siret"
                          value={siret}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 14);
                            setSiret(value);
                          }}
                          placeholder="12345678900013"
                          className={cn(
                            "dark:bg-muted/20 h-10 font-medium tracking-wide font-mono",
                            siretDocument?.status === 'verified' && "border-emerald-500/30 focus-visible:ring-emerald-500/30",
                            siretDocument?.status === 'rejected' && "border-red-500/30 focus-visible:ring-red-500/30"
                          )}
                          disabled={siretDocument?.status === 'verified'}
                        />
                        {siretDocument?.status === 'verified' && (
                          <Lock className="w-4 h-4 text-emerald-500/50 absolute right-3 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {/* Info Alert Block */}
                      {!company?.siret || siretDocument?.status !== 'verified' ? (
                        <div className={cn(
                          "rounded-lg p-3 text-xs flex gap-3",
                          siretDocument?.status === 'rejected' ? "bg-red-500/5 text-red-600 border border-red-500/10" : "bg-primary/5 text-primary border border-primary/10"
                        )}>
                          {siretDocument?.status === 'rejected' ? (
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {siretDocument?.status === 'rejected'
                                ? t('settings.siretVerificationFailed')
                                : siretDocument?.status === 'pending'
                                  ? t('settings.siretVerificationInProgress')
                                  : t('settings.siretVerificationRequired')
                              }
                            </p>
                            <p className="opacity-90 leading-relaxed">
                              {siretDocument?.status === 'rejected'
                                ? t('settings.siretRejectionReason', { reason: siretDocument.rejection_reason })
                                : t('settings.siretVerificationExplanation')
                              }
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Contact & Facturation */}
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        Contact & Facturation
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground" htmlFor="establishment-phone">
                            {t('settings.establishmentPhone', { defaultValue: 'Téléphone de l\'établissement' })}
                          </Label>
                          <Input
                            id="establishment-phone"
                            type="tel"
                            value={establishmentPhone}
                            onChange={(e) => setEstablishmentPhone(e.target.value)}
                            placeholder="01 23 45 67 89"
                            className="dark:bg-muted/20 h-10"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Communiqué aux freelancers acceptés
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground" htmlFor="billing-email">
                            {t('settings.billingEmail', { defaultValue: 'Email de facturation' })}
                          </Label>
                          <Input
                            id="billing-email"
                            type="email"
                            value={billingEmail}
                            onChange={(e) => setBillingEmail(e.target.value)}
                            placeholder={user?.email || 'compta@exemple.com'}
                            className="dark:bg-muted/20 h-10"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Factures envoyées à cette adresse si renseigné
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => updateCompanyMutation.mutate()}
                  disabled={updateCompanyMutation.isPending}
                  className="px-8 shadow-md hover:shadow-lg transition-all"
                >
                  {updateCompanyMutation.isPending ? t('settings.saving') : t('settings.save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method - Admin Only */}
          <PaymentMethodCard />

          {/* Désistement d'un employé → transfert automatique aux freelancers - Admin Only */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">
                  {t('settings.forwardWithdrawn.title', { defaultValue: 'Remplacement automatique par des freelancers' })}
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                {t('settings.forwardWithdrawn.description', {
                  defaultValue: "Quand un employé que vous aviez accepté se désiste, le shift est automatiquement proposé aux freelancers afin qu'il ne reste pas sans personnel."
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-muted/10 dark:bg-muted/20">
                <div className="flex-1">
                  <Label htmlFor="forward-withdrawn-switch" className="font-medium text-sm cursor-pointer">
                    {t('settings.forwardWithdrawn.label', { defaultValue: 'Proposer aux freelancers en cas de désistement' })}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {forwardWithdrawn
                      ? t('settings.forwardWithdrawn.stateOn', { defaultValue: 'Activé' })
                      : t('settings.forwardWithdrawn.stateOff', { defaultValue: 'Désactivé' })}
                  </p>
                </div>
                <button
                  id="forward-withdrawn-switch"
                  type="button"
                  role="switch"
                  aria-checked={forwardWithdrawn}
                  disabled={forwardLoading || updateForwardWithdrawnMutation.isPending}
                  onClick={() => updateForwardWithdrawnMutation.mutate(!forwardWithdrawn)}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed',
                    forwardWithdrawn ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                      forwardWithdrawn ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('settings.forwardWithdrawn.note', {
                  defaultValue: "Les freelancers sont rémunérés au tarif freelance du shift, commission de la plateforme incluse. Le transfert n'a lieu que si le shift est encore ouvert, a un tarif freelance défini et, en mode règlement (paiement différé), uniquement si votre plafond de crédit le permet."
                })}
              </p>
            </CardContent>
          </Card>
        </>
      )
      }

      {/* Profile Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{t('settings.profileTitle')}</CardTitle>
          </div>
          <CardDescription className="text-sm">
            {t('settings.profileDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">{t('settings.email')}</Label>
            <Input
              id="email"
              type="email"
              value={user?.email}
              disabled
              className="bg-muted dark:bg-muted/30 dark:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.emailNotEditable')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">{t('settings.firstName')}</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('settings.firstNamePlaceholder')}
                className="dark:bg-muted/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">{t('settings.lastName')}</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('settings.lastNamePlaceholder')}
                className="dark:bg-muted/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('settings.role')}</Label>
            <div>
              <div className="inline-flex items-center rounded-lg border-2 border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold capitalize">
                {user?.role}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.roleDescription')}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? t('settings.saving') : t('settings.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{t('settings.preferences')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <LanguageSelector />
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{t('settings.appearance.sectionTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{t('settings.security')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{t('settings.changePassword')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('settings.passwordDescription')}
                </p>
              </div>
              <Button onClick={() => navigate('/forgot-password')} variant="outline" size="sm">
                <Lock className="w-4 h-4 mr-2" />
                {t('settings.resetPassword')}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">{t('settings.activeSessions')}</h4>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 dark:bg-muted/20">
              <div>
                <p className="font-medium text-sm">{t('settings.currentSession')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('settings.connectedFrom')}
                </p>
              </div>
              <Button variant="outline" size="sm">
                {t('settings.disconnect')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Account Deletion */}
      {(user as any)?.is_deleting ? (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-base text-amber-600">
                {t('settings.deleteAccount.scheduledCardTitle', { defaultValue: 'Suppression du compte programmée' })}
              </CardTitle>
            </div>
            <CardDescription className="text-sm">
              {t('settings.deleteAccount.scheduledCardDescription', {
                defaultValue: 'Votre compte sera définitivement supprimé à la fin du compte à rebours.'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500/30">
                  <span className="text-xl font-bold text-amber-600 leading-none">{daysRemaining}</span>
                  <span className="text-[9px] font-semibold text-amber-600/80 uppercase tracking-tight">
                    {t('settings.deleteAccount.days', { defaultValue: 'jours' })}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400">
                    {t('settings.deleteAccount.deletionDate', {
                      defaultValue: `Suppression le ${(user as any)?.delete_day}`
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('settings.deleteAccount.canStillCancel', {
                      defaultValue: 'Vous pouvez encore annuler cette action.'
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelDeleteMutation.mutate()}
                disabled={cancelDeleteMutation.isPending}
                className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              >
                {cancelDeleteMutation.isPending
                  ? t('settings.deleteAccount.cancelling', { defaultValue: 'Annulation...' })
                  : t('settings.deleteAccount.cancelButton', { defaultValue: 'Annuler la suppression' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              <CardTitle className="text-base text-red-600">
                {t('settings.deleteAccount.title', { defaultValue: 'Supprimer le compte' })}
              </CardTitle>
            </div>
            <CardDescription className="text-sm">
              {t('settings.deleteAccount.description', {
                defaultValue: 'Cette action supprimera définitivement votre compte et toutes les données associées.'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5">
              <div>
                <p className="font-medium text-sm text-red-700 dark:text-red-400">
                  {t('settings.deleteAccount.warningTitle', { defaultValue: 'Action irréversible' })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('settings.deleteAccount.warningDescription', {
                    defaultValue: 'Vous aurez 3 jours pour annuler cette action avant la suppression définitive.'
                  })}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirmDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('settings.deleteAccount.button', { defaultValue: 'Supprimer' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog 1: Initial confirmation */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {t('settings.deleteAccount.confirmTitle', { defaultValue: 'Êtes-vous sûr ?' })}
            </DialogTitle>
            <DialogDescription>
              {t('settings.deleteAccount.confirmDescription', {
                defaultValue: 'Un code de vérification va être envoyé à votre adresse email pour confirmer la suppression de votre compte. Vous aurez ensuite 3 jours pour revenir sur votre décision avant que le compte ne soit définitivement supprimé.'
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)}>
              {t('common.cancel', { defaultValue: 'Annuler' })}
            </Button>
            <Button
              variant="destructive"
              onClick={() => sendDeleteOtpMutation.mutate()}
              disabled={sendDeleteOtpMutation.isPending}
            >
              {sendDeleteOtpMutation.isPending
                ? t('settings.deleteAccount.sending', { defaultValue: 'Envoi...' })
                : t('settings.deleteAccount.confirmButton', { defaultValue: 'Oui, envoyer le code' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: OTP code entry */}
      <Dialog open={showDeleteOtpDialog} onOpenChange={setShowDeleteOtpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('settings.deleteAccount.otpTitle', { defaultValue: 'Entrez le code de vérification' })}
            </DialogTitle>
            <DialogDescription>
              {t('settings.deleteAccount.otpDescription', {
                defaultValue: 'Un code à 6 chiffres a été envoyé à votre adresse email. Il expire dans 10 minutes.'
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="delete-otp-code">
              {t('settings.deleteAccount.otpLabel', { defaultValue: 'Code de vérification' })}
            </Label>
            <Input
              id="delete-otp-code"
              value={deleteOtpCode}
              onChange={(e) => setDeleteOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="123456"
              className="mt-2 text-center text-2xl tracking-[0.5em] font-mono h-14"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteOtpDialog(false)}>
              {t('common.cancel', { defaultValue: 'Annuler' })}
            </Button>
            <Button
              variant="destructive"
              onClick={() => verifyDeleteOtpMutation.mutate()}
              disabled={verifyDeleteOtpMutation.isPending || deleteOtpCode.length !== 6}
            >
              {verifyDeleteOtpMutation.isPending
                ? t('settings.deleteAccount.verifying', { defaultValue: 'Vérification...' })
                : t('settings.deleteAccount.verifyButton', { defaultValue: 'Confirmer la suppression' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 3: Success - 3-day grace period info */}
      <Dialog open={showDeleteSuccessDialog} onOpenChange={setShowDeleteSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {t('settings.deleteAccount.scheduledTitle', { defaultValue: 'Suppression programmée' })}
            </DialogTitle>
            <DialogDescription>
              {t('settings.deleteAccount.scheduledDescription', {
                defaultValue: `Votre compte sera définitivement supprimé le ${deleteDayResult}. Vous pouvez annuler cette action à tout moment avant cette date en nous contactant ou depuis cette page.`
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowDeleteSuccessDialog(false)}>
              {t('common.understood', { defaultValue: "J'ai compris" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}