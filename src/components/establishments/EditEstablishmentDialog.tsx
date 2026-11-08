import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { toast } from 'sonner'
import type { Establishment } from '@shared/types'
import { logger } from '@/utils/logger'
import { handleSupabaseError } from '@/lib/error-handler'
import { useTranslation } from 'react-i18next'
import { GeocodingResult } from '@/utils/geocoding'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Zap, UserCheck } from 'lucide-react'

const createEstablishmentSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('establishments.nameRequired')),
})

type EstablishmentFormData = z.infer<ReturnType<typeof createEstablishmentSchema>>

interface EditEstablishmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  establishment: (Establishment & {
    address?: string | null
    city?: string | null
    postal_code?: string | null
    latitude?: number | null
    longitude?: number | null
    category_id?: string | null
    // ✅ جديد — إعداد قبول الترشيحات الافتراضي على مستوى المؤسسة
    auto_accept_applications?: boolean | null
  }) | null
}

// ✅ جديد — مكوّن اختيار وضع قبول الترشيحات (تلقائي / يدوي)
function ApplicationModeToggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {t('establishments.applicationMode.label', { defaultValue: 'Acceptation des candidats' })}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
            value
              ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-300 dark:ring-amber-700'
              : 'border-border hover:border-border-strong hover:bg-muted/30'
          }`}
        >
          <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
            value ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-muted'
          }`}>
            <Zap className={`w-3.5 h-3.5 ${value ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`} strokeWidth={2.5} />
          </span>
          <span>
            <span className={`block text-sm font-semibold ${value ? 'text-amber-800 dark:text-amber-300' : 'text-foreground'}`}>
              {t('establishments.applicationMode.automatic', { defaultValue: 'Automatique' })}
            </span>
            <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
              {t('establishments.applicationMode.automaticDesc', { defaultValue: 'Le premier candidat est accepté automatiquement.' })}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
            !value
              ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-300 dark:ring-blue-700'
              : 'border-border hover:border-border-strong hover:bg-muted/30'
          }`}
        >
          <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
            !value ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-muted'
          }`}>
            <UserCheck className={`w-3.5 h-3.5 ${!value ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`} strokeWidth={2.5} />
          </span>
          <span>
            <span className={`block text-sm font-semibold ${!value ? 'text-blue-800 dark:text-blue-300' : 'text-foreground'}`}>
              {t('establishments.applicationMode.manual', { defaultValue: 'Manuelle' })}
            </span>
            <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
              {t('establishments.applicationMode.manualDesc', { defaultValue: 'Vous validez vous-même chaque candidat.' })}
            </span>
          </span>
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {t('establishments.applicationMode.hint', {
          defaultValue: 'Cette valeur sera proposée par défaut pour chaque nouveau shift — modifiable pour un shift précis sans changer ce réglage.',
        })}
      </p>
    </div>
  )
}

export function EditEstablishmentDialog({
  open,
  onOpenChange,
  establishment,
}: EditEstablishmentDialogProps) {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language.split('-')[0] || 'fr'
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<GeocodingResult | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  // ✅ جديد
  const [autoAcceptApplications, setAutoAcceptApplications] = useState(false)




  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EstablishmentFormData>({
    resolver: zodResolver(createEstablishmentSchema(t)),
  })

  // Fetch fresh establishment data
  const { data: freshEstablishment } = useQuery({
    queryKey: ['establishment', establishment?.id],
    queryFn: async () => {
      if (!establishment?.id) return null
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', establishment.id)
        .single()

      if (error) throw error
      return data as Establishment
    },
    enabled: !!establishment?.id && open,
  })

  // Effectively used establishment data (prefer fresh over prop)
  const effectiveEstablishment = freshEstablishment || establishment

  // Reset form when establishment changes
  useEffect(() => {
    if (effectiveEstablishment) {
      console.log('🏢 Editing establishment:', {
        id: effectiveEstablishment.id,
        name: effectiveEstablishment.name,
        category_id: effectiveEstablishment.category_id,
        address: effectiveEstablishment.address
      })

      reset({
        name: effectiveEstablishment.name,
      })
      // Set initial address
      // On considère qu'une adresse existe si on a une adresse formatée, OU une ville, OU des coordonnées
      if (effectiveEstablishment.address || effectiveEstablishment.city || (effectiveEstablishment.latitude && effectiveEstablishment.longitude)) {
        const formatted = effectiveEstablishment.address || [effectiveEstablishment.city, effectiveEstablishment.postal_code].filter(Boolean).join(', ')

        setSelectedAddress({
          latitude: effectiveEstablishment.latitude || 0,
          longitude: effectiveEstablishment.longitude || 0,
          city: effectiveEstablishment.city || '',
          country: effectiveEstablishment.country || 'France',
          formattedAddress: formatted || t('establishments.uploadedAddress', { defaultValue: 'Adresse enregistrée' }),
          postalCode: effectiveEstablishment.postal_code || undefined,
        })
      } else {
        setSelectedAddress(null)
      }
      setLogoUrl(effectiveEstablishment.logo_url || null)
      // ✅ جديد
      setAutoAcceptApplications(!!(effectiveEstablishment as any).auto_accept_applications)
      setAddressError(null)
      setError(null)
    }
  }, [effectiveEstablishment, reset])

  const updateMutation = useMutation({
    mutationFn: async (data: EstablishmentFormData) => {
      if (!establishment?.id) throw new Error('No establishment found')

      // Vérifier l'adresse
      if (!selectedAddress) {
        throw new Error(t('establishments.addressRequired', { defaultValue: 'Veuillez sélectionner une adresse vérifiée' }))
      }

      const { data: updated, error } = await supabase
        .from('establishments')
        .update({
          name: data.name,
          address: selectedAddress.street || selectedAddress.formattedAddress, // Use street if available, otherwise formattedAddress
          city: selectedAddress.city,
          postal_code: selectedAddress.postalCode || null,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
          logo_url: logoUrl,
          // ✅ جديد
          auto_accept_applications: autoAcceptApplications,

        })
        .eq('id', establishment.id)
        .select()
        .single()

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'EditEstablishmentDialog',
          operation: 'query'
        });
        throw new Error(message);
      }
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishments'] })
      queryClient.invalidateQueries({ queryKey: ['establishment', establishment?.id] })
      toast.success(t('establishments.editDialog.updateSuccess'))
      onOpenChange(false)
      setError(null)
      setAddressError(null)
    },
    onError: (err: Error) => {
      logger.error('Error updating establishment:', err)
      setError(err.message)
      toast.error(t('establishments.editDialog.updateError'))
    },
  })

  const onSubmit = (data: EstablishmentFormData) => {
    setError(null)
    setAddressError(null)

    // Validate address before submit
    if (!selectedAddress) {
      setAddressError(t('establishments.addressRequired', { defaultValue: 'Veuillez sélectionner une adresse vérifiée' }))
      return
    }

    updateMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('establishments.editDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('establishments.editDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('establishments.editDialog.nameLabel')}
            placeholder={t('establishments.editDialog.namePlaceholder')}
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('establishments.logo', { defaultValue: 'Logo de l\'établissement' })}</Label>
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              folder={`establishments/${establishment?.id}`}
            />
          </div>



          <AddressAutocomplete
            label={t('establishments.addressLabel', { defaultValue: 'Adresse complète' })}
            placeholder={t('establishments.searchAddressPlaceholder', { defaultValue: 'Rechercher une adresse...' })}
            selectedAddress={selectedAddress}
            onSelect={setSelectedAddress}
            error={addressError || undefined}
            required
            mode="address"
          />

          {/* ✅ جديد — إعداد وضع قبول الترشيحات */}
          <ApplicationModeToggle
            value={autoAcceptApplications}
            onChange={setAutoAcceptApplications}
          />

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('establishments.editDialog.updating') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}