import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type Language } from '@shared/languageUtils';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Languages } from 'lucide-react';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('i18nextLng', newLanguage);
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/40 bg-muted/20">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Languages className="w-4 h-4" />
          {t('settings.language')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('settings.selectLanguage')}
            </label>
            <Select
              value={i18n.language}
              onChange={handleLanguageChange}
              options={SUPPORTED_LANGUAGES.map((lang: Language) => ({
                value: lang.code,
                label: `${lang.flag} ${lang.nativeName}`,
              }))}
              className="w-full max-w-xs"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('settings.languageDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
