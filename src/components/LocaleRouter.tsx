import { useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/hooks/useLocale'

type LocaleRouterProps = {
  children: React.ReactNode
}

/**
 * LocaleRouter ensures that all routes have a valid locale prefix
 * Redirects to default locale if missing or invalid
 */
export function LocaleRouter({ children }: LocaleRouterProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { locale } = useParams<{ locale: string }>()
  const { i18n } = useTranslation()

  useEffect(() => {
    // Check if current path has a locale
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const firstSegment = pathSegments[0]

    // If no locale or invalid locale in URL
    if (!firstSegment || !SUPPORTED_LOCALES.includes(firstSegment as typeof SUPPORTED_LOCALES[number])) {
      // Detect locale from: localStorage → navigator → default
      const savedLocale = localStorage.getItem('i18nextLng')
      const browserLocale = navigator.language.split('-')[0] // 'en-US' → 'en'

      const detectedLocale =
        savedLocale && SUPPORTED_LOCALES.includes(savedLocale as typeof SUPPORTED_LOCALES[number])
          ? savedLocale
          : SUPPORTED_LOCALES.includes(browserLocale as typeof SUPPORTED_LOCALES[number])
          ? browserLocale
          : DEFAULT_LOCALE

      // Redirect to locale-prefixed path
      const newPath = `/${detectedLocale}${location.pathname}${location.search}${location.hash}`
      navigate(newPath, { replace: true })
    } else {
      // Valid locale in URL, sync with i18n only if different
      if (i18n.language !== firstSegment) {
        i18n.changeLanguage(firstSegment).then(() => {
          // Persist the language change in localStorage
          localStorage.setItem('i18nextLng', firstSegment)
        })
      }
    }
  }, [location.pathname, navigate, i18n])

  return <>{children}</>
}
