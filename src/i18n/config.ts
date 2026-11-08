import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

// Import FR translations directly (bundled) for instant availability
import frTranslations from './locales/fr.json';

// Detect initial language from localStorage or browser
const getInitialLanguage = () => {
  const savedLocale = localStorage.getItem('i18nextLng')
  if (savedLocale && ['en', 'fr', 'es', 'it', 'zh'].includes(savedLocale)) {
    return savedLocale
  }
  const browserLocale = navigator.language.split('-')[0]
  return ['en', 'fr', 'es', 'it', 'zh'].includes(browserLocale) ? browserLocale : 'fr'
}

// Store the init promise so we can await it before rendering
export const i18nInitPromise = i18n
  .use(initReactI18next)
  .use(resourcesToBackend((language: string, namespace: string) => {
    // FR is already bundled, only lazy load other languages
    if (language === 'fr') {
      return Promise.resolve(frTranslations);
    }
    // Dynamically import other locale json files
    return import(`./locales/${language}.json`);
  }))
  .init({
    fallbackLng: 'fr',
    supportedLngs: ['en', 'fr', 'es', 'it', 'zh'],
    lng: getInitialLanguage(), // Detect language

    // Bundled FR resources for instant availability
    resources: {
      fr: { translation: frTranslations }
    },

    // Prevent showing keys
    returnEmptyString: false,
    returnNull: false,

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false, // Disable suspense since we're explicitly awaiting
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
    },

    // Allow partial bundled languages (FR bundled, others lazy)
    partialBundledLanguages: true
  });

export default i18n;
