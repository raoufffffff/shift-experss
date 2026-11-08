import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'

type Locale = 'en' | 'fr' | 'es' | 'it' | 'zh'

export const SUPPORTED_LOCALES: Locale[] = ['en', 'fr', 'es', 'it', 'zh']
export const DEFAULT_LOCALE: Locale = 'en'

export function useLocale() {
  const { locale } = useParams<{ locale: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n } = useTranslation()

  // Validate and get current locale
  const currentLocale: Locale =
    locale && SUPPORTED_LOCALES.includes(locale as Locale)
      ? (locale as Locale)
      : DEFAULT_LOCALE

  // Sync i18n with URL locale
  useEffect(() => {
    if (i18n.language !== currentLocale) {
      i18n.changeLanguage(currentLocale)
    }
  }, [currentLocale, i18n])

  // Helper to navigate with locale
  const navigateWithLocale = (path: string, options?: { replace?: boolean; state?: unknown }) => {
    const localizedPath = path.startsWith('/')
      ? `/${currentLocale}${path}`
      : `/${currentLocale}/${path}`
    navigate(localizedPath, options)
  }

  // Helper to get localized path
  const getLocalizedPath = (path: string): string => {
    if (path.startsWith('/') && !path.startsWith(`/${currentLocale}`)) {
      return `/${currentLocale}${path}`
    }
    return path
  }

  return {
    locale: currentLocale,
    navigate: navigateWithLocale,
    getLocalizedPath,
  }
}
