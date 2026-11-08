import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'fr', label: '\ud83c\uddeb\ud83c\uddf7 Fran\u00e7ais', short: '\ud83c\uddeb\ud83c\uddf7' },
  { code: 'en', label: '\ud83c\uddec\ud83c\udde7 English', short: '\ud83c\uddec\ud83c\udde7' },
  { code: 'es', label: '\ud83c\uddea\ud83c\uddf8 Espa\u00f1ol', short: '\ud83c\uddea\ud83c\uddf8' },
  { code: 'it', label: '\ud83c\uddee\ud83c\uddf9 Italiano', short: '\ud83c\uddee\ud83c\uddf9' },
  { code: 'zh', label: '\ud83c\udde8\ud83c\uddf3 \u4e2d\u6587', short: '\ud83c\udde8\ud83c\uddf3' },
]

export function AuthLanguageSelector() {
  const [isLangOpen, setIsLangOpen] = useState(false)
  const { i18n } = useTranslation()

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0]

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="relative">
        <button
          onClick={() => setIsLangOpen(!isLangOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span>{currentLang.short}</span>
        </button>
        {isLangOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsLangOpen(false)} />
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-20">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code)
                    setIsLangOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-md last:rounded-b-md ${i18n.language === lang.code ? 'bg-gray-50 font-medium' : ''
                    }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
