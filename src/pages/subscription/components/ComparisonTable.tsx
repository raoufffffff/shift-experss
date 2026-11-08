import { useTranslation } from 'react-i18next'
import { Check, Building2, Calendar, Users, BarChart3, Headphones } from 'lucide-react'

export function ComparisonTable() {
  const { t } = useTranslation()

  return (
    <>
      {/* Comparison Table */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-card">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t('subscription.comparison.title')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('subscription.comparison.description')}
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {t('subscription.comparison.feature')}
                  </th>
                  <th className="text-center py-4 px-6 font-bold text-base">Free</th>
                  <th className="text-center py-4 px-6 font-bold text-base">Starter</th>
                  <th className="text-center py-4 px-6 font-bold text-base">Pro</th>
                  <th className="text-center py-4 px-6 font-bold text-base">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">{t('subscription.comparison.establishments')}</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-medium">
                      1
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-medium">
                      1
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-medium">
                      2-5
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-semibold">
                      {t('subscription.comparison.unlimited')}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium">{t('subscription.comparison.shiftsPerMonth', { defaultValue: 'Shifts employés / mois' })}</span>
                        <p className="text-xs text-muted-foreground">{t('subscription.comparison.shiftsFreelanceNote', { defaultValue: 'Shifts freelance toujours illimités' })}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-medium">
                      5
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-semibold">
                      {t('subscription.comparison.unlimited')}
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-semibold">
                      {t('subscription.comparison.unlimited')}
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-semibold">
                      {t('subscription.comparison.unlimited')}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">{t('subscription.comparison.employees')}</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-medium">
                      15
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-medium">
                      50
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-semibold">
                      {t('subscription.comparison.unlimited')}
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-sm font-semibold">
                      {t('subscription.comparison.unlimited')}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">{t('subscription.comparison.analytics')}</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-sm font-medium">{t('subscription.comparison.analyticsBasic')}</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-sm font-medium">{t('subscription.comparison.analyticsBasic')}</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-sm font-medium">{t('subscription.comparison.analyticsAdvanced')}</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-sm font-semibold">{t('subscription.comparison.analyticsPremium')}</span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Headphones className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">{t('subscription.comparison.support')}</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-sm font-medium">{t('subscription.comparison.supportStandard')}</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-sm font-medium">{t('subscription.comparison.supportPriority')}</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-sm font-medium">{t('subscription.comparison.supportDedicated')}</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-sm font-semibold">{t('subscription.comparison.support247')}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-card">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">{t('subscription.faq.title')}</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{t('subscription.faq.changePlan.question')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('subscription.faq.changePlan.answer')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t('subscription.faq.cancelSubscription.question')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('subscription.faq.cancelSubscription.answer')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t('subscription.faq.bankTransfer.question')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('subscription.faq.bankTransfer.answer')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span>{t('subscription.trust.securePayment')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span>{t('subscription.trust.cancelAnytime')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span>{t('subscription.trust.responsiveSupport')}</span>
        </div>
      </div>
    </>
  )
}
