import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { POPULAR_COUNTRIES, getLanguageFromCountry } from '@shift-express/shared/src/languageUtils';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';

export function CountrySelector() {
  const { i18n, t } = useTranslation();
  // Use localStorage since country column doesn't exist in users table
  const [selectedCountry, setSelectedCountry] = useState(
    localStorage.getItem('user-country') || 'FR'
  );

  const updateCountryMutation = useMutation({
    mutationFn: async (countryCode: string) => {
      // Store in localStorage instead of database (country column doesn't exist)
      localStorage.setItem('user-country', countryCode);
      return countryCode;
    },
    onSuccess: () => {
      toast.success(t('settings.countryUpdated'));
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : t('common.error');
      toast.error(t('settings.countryUpdateError'), {
        description: message,
      });
    },
  });

  const handleCountryChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = event.target.value;
    setSelectedCountry(newCountry);

    // Sauvegarder dans la DB
    await updateCountryMutation.mutateAsync(newCountry);

    // Suggérer un changement de langue si applicable
    const suggestedLanguage = getLanguageFromCountry(newCountry);
    if (suggestedLanguage !== i18n.language) {
      toast.info(t('settings.suggestedLanguage', { language: suggestedLanguage }), {
        description: t('settings.changeLanguageHint'),
        duration: 5000,
      });
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/40 bg-muted/20">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Globe className="w-4 h-4" />
          {t('settings.country')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('settings.selectCountry')}
            </label>
            <Select
              value={selectedCountry}
              onChange={handleCountryChange}
              options={POPULAR_COUNTRIES.map((country) => ({
                value: country.code,
                label: `${country.flag} ${country.nativeName}`,
              }))}
              className="w-full max-w-xs"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('settings.countryDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
