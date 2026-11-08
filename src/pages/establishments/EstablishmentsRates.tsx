import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft, BadgeDollarSign, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

interface JobRate {
  id: string
  job_position_id: string
  category_id: string
  min_rate: number
  max_rate: number
  job_position: {
    id: string
    name_translations: Record<string, string>
    category_id: string
    // ✅ نجلبها من job_positions لفرض الحد الأدنى الموصى به لكل مهنة
    recommended_hourly_rate_min: number | null
    recommended_hourly_rate_max: number | null
  }
  category: {
    id: string
    name_translations: Record<string, string>
  }
}

const MIN_RATE_FLOOR = 10

export default function EstablishmentsRates() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { company } = useAuthStore()
  const queryClient = useQueryClient()

  const [editedRates, setEditedRates] = useState<Record<string, { min_rate: number; max_rate: number }>>({})
  const [rawInputs, setRawInputs] = useState<Record<string, { min_rate?: string; max_rate?: string }>>({})

  // Fetch establishment info
  const { data: establishment } = useQuery({
    queryKey: ['establishment', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name, logo_url')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Fetch rates with job position and category info
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['establishment-job-rates', id],
    queryFn: async () => {
      if (!id) return []
      const { data, error } = await supabase
        .from('establishment_job_rates')
        .select(`
          id,
          job_position_id,
          category_id,
          min_rate,
          max_rate,
          job_position:job_positions(id, name_translations, category_id, recommended_hourly_rate_min, recommended_hourly_rate_max),
          category:establishment_categories(id, name_translations)
        `)
        .eq('establishment_id', id)
        .order('category_id')

      if (error) throw error
      return data as unknown as JobRate[]
    },
    enabled: !!id,
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: { id: string; min_rate: number; max_rate: number }[]) => {
      await Promise.all(
        updates.map(({ id: rateId, min_rate, max_rate }) =>
          supabase
            .from('establishment_job_rates')
            .update({ min_rate, max_rate })
            .eq('id', rateId)
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishment-job-rates', id] })
      setEditedRates({})
      setRawInputs({})
      toast.success(t('establishments.ratesSaved', { defaultValue: 'Tarification mise à jour' }))
    },
    onError: () => {
      toast.error(t('establishments.ratesSaveError', { defaultValue: 'Erreur lors de la sauvegarde' }))
    },
  })

  const getName = (translations: Record<string, string>) => {
    return translations?.[i18n.language] || translations?.['fr'] || Object.values(translations || {})[0] || ''
  }

  // Called on every keystroke — just stores the raw string, no validation
  const handleRateChange = (rateId: string, field: 'min_rate' | 'max_rate', value: string) => {
    setRawInputs(prev => ({
      ...prev,
      [rateId]: { ...prev[rateId], [field]: value },
    }))
  }

  // Called when the input loses focus — validate then commit or revert
  const handleRateBlur = (rateId: string, field: 'min_rate' | 'max_rate', value: string) => {
    const numValue = parseFloat(value)

    const revert = () => {
      setRawInputs(prev => ({
        ...prev,
        [rateId]: { ...prev[rateId], [field]: undefined },
      }))
    }

    // Empty or NaN → revert silently
    if (isNaN(numValue)) {
      revert()
      return
    }

    // Absolute floor
    if (numValue < MIN_RATE_FLOOR) {
      toast.error(
        t('establishments.minRateFloor', { defaultValue: `Le taux minimum légal est de ${MIN_RATE_FLOOR} €/h` })
      )
      revert()
      return
    }

    // ✅ جديد — لا نسمح بأي قيمة (min أو max) أقل من recommended_hourly_rate_min الخاص بهذه المهنة
    const rate = rates.find(r => r.id === rateId)!
    const recommendedMin = rate.job_position?.recommended_hourly_rate_min

    if (recommendedMin !== null && recommendedMin !== undefined && numValue < recommendedMin) {
      toast.error(
        t('establishments.belowRecommendedMin', {
          defaultValue: `Le taux ne peut pas être inférieur au minimum recommandé pour ce poste (${recommendedMin} €/h)`,
          rate: recommendedMin,
        })
      )
      revert()
      return
    }

    const currentMin = editedRates[rateId]?.min_rate ?? rate.min_rate
    const currentMax = editedRates[rateId]?.max_rate ?? rate.max_rate

    if (field === 'min_rate' && numValue > currentMax) {
      toast.error(t('establishments.minExceedsMax', { defaultValue: 'Le minimum ne peut pas dépasser le maximum' }))
      revert()
      return
    }

    if (field === 'max_rate' && numValue < currentMin) {
      toast.error(t('establishments.maxBelowMin', { defaultValue: 'Le maximum ne peut pas être inférieur au minimum' }))
      revert()
      return
    }

    // Valid — commit to editedRates and clear raw
    setEditedRates(prev => ({
      ...prev,
      [rateId]: {
        min_rate: prev[rateId]?.min_rate ?? rate.min_rate,
        max_rate: prev[rateId]?.max_rate ?? rate.max_rate,
        [field]: numValue,
      },
    }))
    setRawInputs(prev => ({
      ...prev,
      [rateId]: { ...prev[rateId], [field]: undefined },
    }))
  }

  // Returns the raw string while typing, otherwise the committed/original value
  const getInputValue = (rate: JobRate, field: 'min_rate' | 'max_rate'): string => {
    const raw = rawInputs[rate.id]?.[field]
    if (raw !== undefined) return raw
    const committed = editedRates[rate.id]?.[field]
    if (committed !== undefined) return String(committed)
    return String(rate[field])
  }

  const handleSave = () => {
    const updates = Object.entries(editedRates).map(([rateId, values]) => {
      const original = rates.find(r => r.id === rateId)!
      return {
        id: rateId,
        min_rate: values.min_rate ?? original.min_rate,
        max_rate: values.max_rate ?? original.max_rate,
      }
    })
    if (updates.length === 0) return
    updateMutation.mutate(updates)
  }

  const hasChanges = Object.keys(editedRates).length > 0

  // Group by category
  const groupedRates = rates.reduce<Record<string, JobRate[]>>((acc, rate) => {
    const categoryId = rate.category_id
    if (!acc[categoryId]) acc[categoryId] = []
    acc[categoryId].push(rate)
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back', { defaultValue: 'Retour' })}
          </button>

          <div className="flex items-center gap-4">
            {establishment?.logo_url ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/50 shrink-0">
                <img src={establishment.logo_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-2xl">
                  {establishment?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <BadgeDollarSign className="w-5 h-5 text-primary" />
                <h1 className="text-3xl font-bold">
                  {t('establishments.ratesTitle', { defaultValue: 'Tarification' })}
                </h1>
              </div>
              <p className="text-muted-foreground text-sm">
                {establishment?.name} —{' '}
                {t('establishments.ratesSubtitle', {
                  defaultValue: 'Définissez les fourchettes de taux horaires par poste',
                })}
              </p>
            </div>
          </div>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('common.save', { defaultValue: 'Enregistrer' })}
          </Button>
        )}
      </div>

      {/* Rates grouped by category */}
      <div className="space-y-4">
        {Object.entries(groupedRates).map(([categoryId, categoryRates]) => {
          const categoryName = getName(categoryRates[0]?.category?.name_translations || {})

          return (
            <Card key={categoryId}>
              <CardContent className="p-0">
                {/* Category header */}
                <div className="px-5 py-3 border-b border-border/60 bg-muted/30 rounded-t-xl">
                  <h3 className="text-sm font-semibold text-foreground">{categoryName}</h3>
                </div>

                {/* Table */}
                <div className="divide-y divide-border/40">
                  {/* Header row */}
                  <div className="grid grid-cols-3 px-5 py-2.5 text-xs font-medium text-muted-foreground">
                    <span>{t('establishments.position', { defaultValue: 'Poste' })}</span>
                    <span className="text-center">{t('establishments.minRate', { defaultValue: 'Min (€/h)' })}</span>
                    <span className="text-center">{t('establishments.maxRate', { defaultValue: 'Max (€/h)' })}</span>
                  </div>

                  {categoryRates.map((rate) => {
                    const isEdited = !!editedRates[rate.id]
                    const recommendedMin = rate.job_position?.recommended_hourly_rate_min
                    return (
                      <div
                        key={rate.id}
                        className={`grid grid-cols-3 px-5 py-3 items-center transition-colors ${
                          isEdited ? 'bg-primary/5' : 'hover:bg-muted/20'
                        }`}
                      >
                        <div>
                          <span className="text-sm font-medium text-foreground block">
                            {getName(rate.job_position?.name_translations || {})}
                          </span>
                          {/* ✅ جديد — تذكير مرئي بالحد الأدنى الموصى به لهذه المهنة */}
                          {recommendedMin !== null && recommendedMin !== undefined && (
                            <span className="text-[11px] text-muted-foreground">
                              {t('establishments.recommendedMinHint', {
                                defaultValue: `Min. recommandé : ${recommendedMin} €/h`,
                                rate: recommendedMin,
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-center">
                          <input
                            type="number"
                            step="0.5"
                            min={recommendedMin ?? MIN_RATE_FLOOR}
                            value={getInputValue(rate, 'min_rate')}
                            onChange={(e) => handleRateChange(rate.id, 'min_rate', e.target.value)}
                            onBlur={(e) => handleRateBlur(rate.id, 'min_rate', e.target.value)}
                            className="w-20 text-center text-sm border border-border/60 rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>

                        <div className="flex justify-center">
                          <input
                            type="number"
                            step="0.5"
                            min={recommendedMin ?? MIN_RATE_FLOOR}
                            value={getInputValue(rate, 'max_rate')}
                            onChange={(e) => handleRateChange(rate.id, 'max_rate', e.target.value)}
                            onBlur={(e) => handleRateBlur(rate.id, 'max_rate', e.target.value)}
                            className="w-20 text-center text-sm border border-border/60 rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Floating save bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-card border border-border shadow-lg rounded-2xl px-5 py-3">
            <span className="text-sm text-muted-foreground">
              {Object.keys(editedRates).length}{' '}
              {t('establishments.ratesModified', { defaultValue: 'poste(s) modifié(s)' })}
            </span>
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {t('common.save', { defaultValue: 'Enregistrer' })}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}