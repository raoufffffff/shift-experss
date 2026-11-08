import { useParams } from 'react-router-dom'
import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Calendar, Users, Building2, Settings, CreditCard, FileText, Shield, Bell, Zap, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ArticleMapping {
  id: string
  titleKey: string
  categoryKey: string
  icon: React.ComponentType<{ className?: string }>
  docSection: 'shifts' | 'team' | 'settings' | 'data' | 'security' | 'gettingStarted' | 'establishments' | 'productivity'
  docKeys: string[]
}

const articleMappings: Record<string, ArticleMapping> = {
  '1': {
    id: '1',
    titleKey: 'helpCenter.articles.1.title',
    categoryKey: 'helpCenter.categories.shifts',
    icon: Calendar,
    docSection: 'shifts',
    docKeys: ['create', 'notifications']
  },
  '2': {
    id: '2',
    titleKey: 'helpCenter.articles.2.title',
    categoryKey: 'helpCenter.categories.shifts',
    icon: Users,
    docSection: 'shifts',
    docKeys: ['manage']
  },
  '3': {
    id: '3',
    titleKey: 'helpCenter.articles.3.title',
    categoryKey: 'helpCenter.categories.establishments',
    icon: Building2,
    docSection: 'establishments',
    docKeys: ['create', 'positions']
  },
  '4': {
    id: '4',
    titleKey: 'helpCenter.articles.4.title',
    categoryKey: 'helpCenter.categories.team',
    icon: Users,
    docSection: 'team',
    docKeys: ['invite', 'roles', 'stats']
  },
  '5': {
    id: '5',
    titleKey: 'helpCenter.articles.5.title',
    categoryKey: 'helpCenter.categories.settings',
    icon: Bell,
    docSection: 'settings',
    docKeys: ['company']
  },
  '6': {
    id: '6',
    titleKey: 'helpCenter.articles.6.title',
    categoryKey: 'helpCenter.categories.billing',
    icon: CreditCard,
    docSection: 'settings',
    docKeys: ['subscription']
  },
  '7': {
    id: '7',
    titleKey: 'helpCenter.articles.7.title',
    categoryKey: 'helpCenter.categories.data',
    icon: FileText,
    docSection: 'data',
    docKeys: ['export']
  },
  '8': {
    id: '8',
    titleKey: 'helpCenter.articles.8.title',
    categoryKey: 'helpCenter.categories.security',
    icon: Shield,
    docSection: 'security',
    docKeys: ['dataProtection', 'gdpr']
  },
  '9': {
    id: '9',
    titleKey: 'helpCenter.articles.9.title',
    categoryKey: 'helpCenter.categories.productivity',
    icon: Zap,
    docSection: 'productivity',
    docKeys: ['shortcuts']
  },
  '10': {
    id: '10',
    titleKey: 'helpCenter.articles.10.title',
    categoryKey: 'helpCenter.categories.settings',
    icon: Settings,
    docSection: 'settings',
    docKeys: ['company']
  }
}

export function HelpCenterArticle() {
  const { t } = useTranslation()
  const { articleId } = useParams()
  const article = articleId ? articleMappings[articleId] : null

  if (!article) {
    return (
      <div className="space-y-6">
        <Link
          to="/support/centre-aide"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('article.backToHelpCenter')}
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-semibold mb-2">{t('article.notFound')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('article.notFoundDescription')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const Icon = article.icon

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        to="/support/centre-aide"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('article.backToHelpCenter')}
      </Link>

      {/* Article Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <Badge variant="secondary" className="mb-3">
                {t(article.categoryKey)}
              </Badge>
              <CardTitle className="text-2xl mb-3">{t(article.titleKey)}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{t('article.readTime', { minutes: article.docKeys.length * 2 })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{t('article.lastUpdated')} {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Article Content */}
      {article.docKeys.map((docKey) => {
        const contentKey = `documentation.${article.docSection}.${docKey}`
        const title = t(`${contentKey}.title`)
        const content = t(`${contentKey}.content`)

        return (
          <Card key={docKey}>
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none">
                <h3 className="text-lg font-semibold mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{content}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Help CTA */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="text-center">
            <h3 className="font-semibold mb-2">{t('article.wasHelpful')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('article.moreQuestionsDescription')}
            </p>
            <Link to="/support">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                {t('article.contactSupport')}
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
