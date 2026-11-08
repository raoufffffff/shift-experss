import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Globe } from 'lucide-react'
import { logger } from '@/utils/logger'
import { LocalizedLink } from '@/components/LocalizedLink'
import { useLocale } from '@/hooks/useLocale'
import { useLocation } from 'react-router-dom'

interface AuthHeaderProps {
  currentPage: 'login' | 'signup'
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
]

export function AuthHeader({ currentPage }: AuthHeaderProps) {
  const { t, i18n } = useTranslation()
  const { navigate } = useLocale()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLanguageChange = (langCode: string) => {
    logger.log('Changing language to:', langCode)
    i18n.changeLanguage(langCode)
    setIsLangOpen(false)

    // Change URL locale - replace the first segment
    const pathSegments = location.pathname.split('/').filter(Boolean)
    pathSegments[0] = langCode // Replace locale
    const newPath = '/' + pathSegments.join('/')
    window.location.href = newPath // Full reload to ensure everything syncs
  }

  const landingUrl = 'https://shift.express'

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${isScrolled
            ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-border'
            : 'bg-white'
          }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <a href={landingUrl} className="-m-1.5 p-1.5 flex items-center gap-2">
              <img src="/logo-header.svg" alt="Shift Express" className="h-8 w-8" loading="lazy" width={32} height={32} />
              <span className="text-xl text-foreground font-sans lowercase">
                <span className="font-semibold">shift</span>
                <span className="font-light">express</span>
              </span>
            </a>
          </div>

          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-muted-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="h-6 w-6" />
            </button>
          </div>

          <div className="hidden lg:flex lg:gap-x-8">
            <a href={`${landingUrl}#features`} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
              {t('header.features')}
            </a>
            <a href={`${landingUrl}#pricing`} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
              {t('header.pricing')}
            </a>
            <a href={`${landingUrl}/download`} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
              {t('header.download')}
            </a>
            <a href={`${landingUrl}#faq`} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
              {t('header.faq')}
            </a>
          </div>

          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4 lg:items-center">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span>{currentLanguage.flag}</span>
                <span className="hidden xl:inline">{currentLanguage.name}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>

              {isLangOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsLangOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                  >
                    <div className="py-1">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${lang.code === i18n.language
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:bg-muted/50'
                            }`}
                        >
                          <span className="text-xl">{lang.flag}</span>
                          <span>{lang.name}</span>
                          {lang.code === i18n.language && (
                            <svg className="ml-auto h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </div>

            <LocalizedLink to={currentPage === 'login' ? '/signup' : '/login'}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
              >
                {currentPage === 'login' ? t('auth.signupLink') : t('auth.loginLink')}
              </motion.div>
            </LocalizedLink>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-[100]"
          >
            <motion.div
              className="fixed inset-0 bg-foreground/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[110] w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm border-l border-border"
            >
              <div className="flex items-center justify-between">
                <a href={landingUrl} className="-m-1.5 p-1.5 flex items-center gap-2">
                  <img src="/logo-header.svg" alt="Shift Express" className="h-8 w-8" loading="lazy" width={32} height={32} />
                  <span className="text-xl text-foreground font-sans lowercase">
                    <span className="font-semibold">shift</span>
                    <span className="font-light">express</span>
                  </span>
                </a>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-muted-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-border">
                  <div className="space-y-2 py-6">
                    <a
                      href={`${landingUrl}#features`}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-muted/50"
                    >
                      {t('header.features')}
                    </a>
                    <a
                      href={`${landingUrl}#pricing`}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-muted/50"
                    >
                      {t('header.pricing')}
                    </a>
                    <a
                      href={`${landingUrl}/download`}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-muted/50"
                    >
                      {t('header.download')}
                    </a>
                    <a
                      href={`${landingUrl}#faq`}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-muted/50"
                    >
                      {t('header.faq')}
                    </a>
                  </div>
                  <div className="py-6">
                    <LocalizedLink
                      to={currentPage === 'login' ? '/signup' : '/login'}
                      className="block rounded-xl bg-primary px-4 py-3 text-center text-base font-semibold text-white shadow-lg shadow-primary/30"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {currentPage === 'login' ? t('auth.signupLink') : t('auth.loginLink')}
                    </LocalizedLink>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
