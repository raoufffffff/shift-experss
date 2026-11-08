import { useTranslation } from 'react-i18next'
import { Building2, MapPin, ArrowRight, ArrowLeft, Phone } from 'lucide-react'
import { motion } from 'framer-motion'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { seInputIconCls, sePrimaryBtnCls, seSecondaryBtnCls } from '@/components/auth/AuthShell'
import type { UseSignupFormReturn } from '../hooks/useSignupForm'

interface SignupStep2Props {
  form: UseSignupFormReturn
}

export function SignupStep2({ form }: SignupStep2Props) {
  const { t } = useTranslation()

  return (
    <motion.form
      key="step2"
      custom={2}
      variants={form.slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      onSubmit={form.handleNextStep}
      className="space-y-5"
    >
      {/* Step Title */}
      <h2 className="font-display font-bold text-base text-se-ink text-center">
        {t('auth.stepYourBusiness')}
      </h2>

      {/* Company Name */}
      <div>
        <label htmlFor="companyName" className="se-eyebrow block mb-1.5">
          {t('auth.companyName')}
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" />
          <input
            id="companyName"
            type="text"
            value={form.companyName}
            onChange={(e) => form.handleCompanyNameChange(e.target.value)}
            placeholder={t('auth.companyNamePlaceholder')}
            required
            className={seInputIconCls}
          />
        </div>
      </div>

      {/* Establishment Name */}
      <div>
        <label htmlFor="establishmentName" className="se-eyebrow block mb-1.5">
          {t('auth.establishmentName')}
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" />
          <input
            id="establishmentName"
            type="text"
            value={form.establishmentName}
            onChange={(e) => form.setEstablishmentName(e.target.value)}
            placeholder={t('auth.establishmentNamePlaceholder')}
            required
            disabled={form.sameAsCompany}
            className={seInputIconCls}
          />
        </div>

        {/* Checkbox */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="sameAsCompany"
            checked={form.sameAsCompany}
            onChange={(e) => form.handleSameAsCompanyToggle(e.target.checked)}
            className="w-4 h-4 accent-se-blue"
          />
          <label htmlFor="sameAsCompany" className="text-sm text-se-muted cursor-pointer">
            {t('auth.sameAsCompany')}
          </label>
        </div>
      </div>



      {/* Establishment Phone */}
      <div>
        <label htmlFor="establishmentPhone" className="se-eyebrow block mb-1.5">
          {t('auth.establishmentPhone', { defaultValue: 'Téléphone de l\'établissement' })}
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-se-muted" />
          <input
            id="establishmentPhone"
            type="tel"
            value={form.establishmentPhone}
            onChange={(e) => form.setEstablishmentPhone(e.target.value)}
            placeholder={t('auth.establishmentPhonePlaceholder', { defaultValue: '01 23 45 67 89' })}
            required
            className={seInputIconCls}
          />
        </div>
      </div>

      {/* Establishment Address - REQUIRED */}
      <AddressAutocomplete
        label={t('auth.establishmentAddress', { defaultValue: 'Adresse complète' })}
        placeholder={t('auth.searchAddressPlaceholder', { defaultValue: 'Rechercher une adresse...' })}
        selectedAddress={form.selectedAddress}
        onSelect={form.setSelectedAddress}
        error={form.addressError || undefined}
        required
        mode="address"
      />

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={form.handlePreviousStep}
          className={seSecondaryBtnCls}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('auth.previousStep')}
        </button>

        <button
          type="submit"
          className={sePrimaryBtnCls}
        >
          {t('auth.nextStep')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.form>
  )
}
