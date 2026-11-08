import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { useLocale } from '@/hooks/useLocale'
import { GeocodingResult } from '@/utils/geocoding'

export function useSignupForm() {
  const { setTheme } = useTheme()

  // Force light mode on this page
  useEffect(() => {
    setTheme('light')
  }, [setTheme])

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [establishmentName, setEstablishmentName] = useState('')
  const [sameAsCompany, setSameAsCompany] = useState(false)

  const [establishmentPhone, setEstablishmentPhone] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<GeocodingResult | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)

  // Step 2 fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const signup = useAuthStore((state) => state.signup)
  const { navigate } = useLocale()
  const { t } = useTranslation()

  // When checkbox is toggled, sync establishment name with company name
  const handleSameAsCompanyToggle = (checked: boolean) => {
    setSameAsCompany(checked)
    if (checked) {
      setEstablishmentName(companyName)
    }
  }

  // Sync establishment name when company name changes if checkbox is checked
  const handleCompanyNameChange = (value: string) => {
    setCompanyName(value)
    if (sameAsCompany) {
      setEstablishmentName(value)
    }
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === 1) {
      // Validate step 1: name
      if (!firstName.trim() || !lastName.trim()) {
        toast.error(t('auth.fillAllFields'))
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!companyName.trim() || !establishmentName.trim() || !establishmentPhone.trim()) {
        toast.error(t('auth.fillAllFields'))
        return
      }
      // Address is REQUIRED
      if (!selectedAddress) {
        setAddressError(t('auth.addressRequired', { defaultValue: 'Veuillez s\u00e9lectionner l\'adresse de votre \u00e9tablissement' }))
        return
      }
      setAddressError(null)
      setCurrentStep(3)
    }
  }

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate step 2
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error(t('auth.fillAllFields'))
      return
    }

    if (password.length < 8) {
      toast.error(t('auth.passwordTooShort'))
      return
    }

    // Check password match - don't prevent submission but show error
    if (password !== confirmPassword) {
      return // Error is shown inline
    }

    setIsLoading(true)

    try {
      // Call signup with all data including address
      await signup(email, password, companyName, {
        firstName,
        lastName,
        establishmentName,
        establishmentPhone,

        establishmentAddress: selectedAddress?.street || selectedAddress?.formattedAddress,
        establishmentCity: selectedAddress?.city,
        establishmentPostalCode: selectedAddress?.postalCode,
        establishmentLatitude: selectedAddress?.latitude,
        establishmentLongitude: selectedAddress?.longitude,
      })

      // Show success state
      setIsLoading(false)
      setIsSuccess(true)

      // Redirect after 5 seconds
      setTimeout(() => {
        navigate('/login')
      }, 5000)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.signupError')
      toast.error(message)
      setIsLoading(false)
    }
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  return {
    // Step 1 fields
    firstName,
    setFirstName,
    lastName,
    setLastName,

    // Step 2 fields (business)
    companyName,
    establishmentName,
    setEstablishmentName,
    sameAsCompany,
    selectedAddress,
    setSelectedAddress,
    addressError,
    handleSameAsCompanyToggle,
    handleCompanyNameChange,

    // Step 3 fields (account)
    email,
    setEmail,
    password,
    setPassword,
    establishmentPhone,
    setEstablishmentPhone,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,

    // Step management
    currentStep,
    isLoading,
    isSuccess,

    // Handlers
    handleNextStep,
    handlePreviousStep,
    handleSubmit,

    // Animation
    slideVariants,
  }
}

export type UseSignupFormReturn = ReturnType<typeof useSignupForm>
