import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, Link2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Integration {
  provider: string;
  name: string;
  description: string;
  features: string[];
  comingSoon?: boolean;
  category: 'payroll' | 'scheduling';
}

export function IntegrationsPage() {
  const { t } = useTranslation();

  // Payroll integrations
  const payrollIntegrations: Integration[] = [
    {
      provider: 'quickbooks',
      name: 'QuickBooks Payroll',
      description: t('integrations.quickbooksDescription'),
      features: [
        t('integrations.quickbooksFeature1'),
        t('integrations.quickbooksFeature2'),
      ],
      comingSoon: true,
      category: 'payroll',
    },
    {
      provider: 'adp',
      name: 'ADP Workforce Now',
      description: t('integrations.adpDescription'),
      features: [
        t('integrations.adpFeature1'),
        t('integrations.adpFeature2'),
      ],
      comingSoon: true,
      category: 'payroll',
    },
  ];

  // Scheduling integrations
  const schedulingIntegrations: Integration[] = [
    {
      provider: '7shifts',
      name: '7shifts',
      description: t('integrations.7shiftsDescription'),
      features: [
        t('integrations.7shiftsFeature1'),
        t('integrations.7shiftsFeature2'),
        t('integrations.7shiftsFeature3'),
      ],
      comingSoon: true,
      category: 'scheduling',
    },
    {
      provider: 'whenIWork',
      name: 'When I Work',
      description: t('integrations.whenIWorkDescription'),
      features: [
        t('integrations.whenIWorkFeature1'),
        t('integrations.whenIWorkFeature2'),
      ],
      comingSoon: true,
      category: 'scheduling',
    },
    {
      provider: 'square',
      name: 'Square Shifts',
      description: t('integrations.squareDescription'),
      features: [
        t('integrations.squareFeature1'),
        t('integrations.squareFeature2'),
      ],
      comingSoon: true,
      category: 'scheduling',
    },
    {
      provider: 'deputy',
      name: 'Deputy',
      description: t('integrations.deputyDescription'),
      features: [
        t('integrations.deputyFeature1'),
        t('integrations.deputyFeature2'),
      ],
      comingSoon: true,
      category: 'scheduling',
    },
    {
      provider: 'homebase',
      name: 'Homebase',
      description: t('integrations.homebaseDescription'),
      features: [
        t('integrations.homebaseFeature1'),
        t('integrations.homebaseFeature2'),
      ],
      comingSoon: true,
      category: 'scheduling',
    },
  ];

  const renderIntegrationCard = (integration: Integration) => {
    const isConnected = false;

    return (
      <Card key={integration.provider} className="relative">
        {integration.comingSoon && (
          <Badge className="absolute top-4 right-4" variant="secondary">
            {t('integrations.comingSoon')}
          </Badge>
        )}

        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isConnected
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              {isConnected ? (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <Link2 className="w-6 h-6 text-gray-400" />
              )}
            </div>
          </div>
          <CardTitle className="text-lg">{integration.name}</CardTitle>
          <CardDescription>{integration.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Features */}
          <div>
            <h4 className="text-sm font-medium mb-2">{t('integrations.features')}</h4>
            <ul className="space-y-1">
              {integration.features.map((feature, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-3">
            <Button variant="outline" disabled className="w-full">
              {t('integrations.comingSoon')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('integrations.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('integrations.subtitle')}
        </p>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium">{t('integrations.infoTitle')}</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                {t('integrations.infoDescription')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Integrations */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('integrations.payrollTitle')}</h2>
        <p className="text-muted-foreground mb-6">{t('integrations.payrollSubtitle')}</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {payrollIntegrations.map(renderIntegrationCard)}
        </div>
      </div>

      {/* Scheduling Integrations */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('integrations.schedulingTitle')}</h2>
        <p className="text-muted-foreground mb-6">{t('integrations.schedulingSubtitle')}</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {schedulingIntegrations.map(renderIntegrationCard)}
        </div>
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('integrations.needHelp')}</CardTitle>
          <CardDescription>{t('integrations.needHelpDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.href = '/support'}>
            {t('integrations.contactSupport')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
