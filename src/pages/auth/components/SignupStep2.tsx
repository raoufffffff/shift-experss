import { useTranslation } from 'react-i18next'
import { Building2, MapPin, ArrowRight, ArrowLeft, Phone } from 'lucide-react'
import { motion } from 'framer-motion'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
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
      <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">
        {t('auth.stepYourBusiness')}
      </h2>

      {/* Company Name */}
      <div>
        <label htmlFor="companyName" className="block text-sm font-semibold text-gray-700 mb-2">
          {t('auth.companyName')}
        </label>
        <div className="relative group">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            id="companyName"
            type="text"
            value={form.companyName}
            onChange={(e) => form.handleCompanyNameChange(e.target.value)}
            placeholder={t('auth.companyNamePlaceholder')}
            required
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Establishment Name */}
      <div>
        <label htmlFor="establishmentName" className="block text-sm font-semibold text-gray-700 mb-2">
          {t('auth.establishmentName')}
        </label>
        <div className="relative group">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            id="establishmentName"
            type="text"
            value={form.establishmentName}
            onChange={(e) => form.setEstablishmentName(e.target.value)}
            placeholder={t('auth.establishmentNamePlaceholder')}
            required
            disabled={form.sameAsCompany}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Checkbox */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="sameAsCompany"
            checked={form.sameAsCompany}
            onChange={(e) => form.handleSameAsCompanyToggle(e.target.checked)}
            className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
          />
          <label htmlFor="sameAsCompany" className="text-sm text-gray-600 cursor-pointer">
            {t('auth.sameAsCompany')}
          </label>
        </div>
      </div>



      {/* Establishment Phone */}
      <div>
        <label htmlFor="establishmentPhone" className="block text-sm font-semibold text-gray-700 mb-2">
          {t('auth.establishmentPhone', { defaultValue: 'Téléphone de l\'établissement' })}
        </label>
        <div className="relative group">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            id="establishmentPhone"
            type="tel"
            value={form.establishmentPhone}
            onChange={(e) => form.setEstablishmentPhone(e.target.value)}
            placeholder={t('auth.establishmentPhonePlaceholder', { defaultValue: '01 23 45 67 89' })}
            required
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200"
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
      <div className="flex gap-3 mt-8">
        <motion.button
          type="button"
          onClick={form.handlePreviousStep}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('auth.previousStep')}
        </motion.button>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold py-4 px-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {t('auth.nextStep')}
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.form>
  )
}
