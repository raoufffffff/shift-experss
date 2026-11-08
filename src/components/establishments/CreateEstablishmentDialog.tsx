import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { canCreateEstablishment } from '@shared/subscription-limits'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { logger } from '@/utils/logger'
import { handleSupabaseError } from '@/lib/error-handler'
import { useTranslation } from 'react-i18next'
import { GeocodingResult } from '@/utils/geocoding'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Label } from '@/components/ui/label'

const getEstablishmentSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('establishments.nameRequired')),
})

interface CreateEstablishmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateEstablishmentDialog({
  open,
  onOpenChange,
}: CreateEstablishmentDialogProps) {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language.split('-')[0] || 'fr'
  const queryClient = useQueryClient()
  const { company } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<GeocodingResult | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)




  const establishmentSchema = getEstablishmentSchema(t)
  type EstablishmentFormData = z.infer<typeof establishmentSchema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EstablishmentFormData>({
    resolver: zodResolver(establishmentSchema),
  })

  // Compter les établissements existants
  const { data: establishmentsCount } = useQuery({
    queryKey: ['establishments-count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0
      const { count } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
      return count || 0
    },
    enabled: !!company?.id && open,
  })

  const createMutation = useMutation({
    mutationFn: async (data: EstablishmentFormData) => {
      if (!company?.id) throw new Error('No company found')

      // Vérifier les limites avant création
      const plan = company.subscription_plan || 'free'
      const limitCheck = canCreateEstablishment(establishmentsCount || 0, plan)
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.message || t('establishments.limitReachedError'))
      }

      // Vérifier l'adresse
      if (!selectedAddress) {
        throw new Error(t('establishments.addressRequired', { defaultValue: 'Veuillez sélectionner une adresse vérifiée' }))
      }

      const { data: establishment, error } = await supabase
        .from('establishments')
        .insert({
          company_id: company.id,
          name: data.name,
          // Use street part if available to avoid duplication with city/postal_code columns
          address: selectedAddress.street || selectedAddress.formattedAddress,
          city: selectedAddress.city,
          postal_code: selectedAddress.postalCode || null,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
          logo_url: logoUrl,

        })
        .select()
        .single()

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'CreateEstablishmentDialog',
          operation: 'query'
        });
        throw new Error(message);
      }
      return establishment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishments'] })
      reset()
      setSelectedAddress(null)

      onOpenChange(false)
      setError(null)
      setAddressError(null)
    },
    onError: (err: Error) => {
      logger.error('Error creating establishment:', err)
      setError(err.message)
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

    createMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('establishments.new')}</DialogTitle>
          <DialogDescription>
            {t('establishments.newDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('establishments.nameLabel')}
            placeholder={t('establishments.namePlaceholder')}
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('establishments.logo', { defaultValue: 'Logo de l\'établissement' })}</Label>
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              folder={`establishments/temp_${Date.now()}`}
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t('common.creating') : t('establishments.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
