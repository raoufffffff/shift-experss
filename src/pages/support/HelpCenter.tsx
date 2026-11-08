import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Search,
  ArrowLeft,
  Users,
  Calendar,
  Building2,
  Settings,
  CreditCard,
  FileText,
  Shield,
  Bell,
  Zap,
  ChevronRight,
  UserCheck,
  Star
} from 'lucide-react'
import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { useTranslation } from 'react-i18next'

interface Article {
  id: string
  titleKey: string
  descriptionKey: string
  categoryKey: string
  icon: React.ComponentType<{ className?: string }>
}

export function HelpCenter() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const articles: Article[] = [
    { id: '1', titleKey: 'helpCenter.articles.1.title', descriptionKey: 'helpCenter.articles.1.description', categoryKey: 'helpCenter.categories.shifts', icon: Calendar },
    { id: '2', titleKey: 'helpCenter.articles.2.title', descriptionKey: 'helpCenter.articles.2.description', categoryKey: 'helpCenter.categories.shifts', icon: Users },
    { id: '3', titleKey: 'helpCenter.articles.3.title', descriptionKey: 'helpCenter.articles.3.description', categoryKey: 'helpCenter.categories.establishments', icon: Building2 },
    { id: '4', titleKey: 'helpCenter.articles.4.title', descriptionKey: 'helpCenter.articles.4.description', categoryKey: 'helpCenter.categories.team', icon: Users },
    { id: '5', titleKey: 'helpCenter.articles.5.title', descriptionKey: 'helpCenter.articles.5.description', categoryKey: 'helpCenter.categories.settings', icon: Bell },
    { id: '6', titleKey: 'helpCenter.articles.6.title', descriptionKey: 'helpCenter.articles.6.description', categoryKey: 'helpCenter.categories.billing', icon: CreditCard },
    { id: '7', titleKey: 'helpCenter.articles.7.title', descriptionKey: 'helpCenter.articles.7.description', categoryKey: 'helpCenter.categories.data', icon: FileText },
    { id: '8', titleKey: 'helpCenter.articles.8.title', descriptionKey: 'helpCenter.articles.8.description', categoryKey: 'helpCenter.categories.security', icon: Shield },
    { id: '9', titleKey: 'helpCenter.articles.9.title', descriptionKey: 'helpCenter.articles.9.description', categoryKey: 'helpCenter.categories.freelancers', icon: UserCheck },
    { id: '10', titleKey: 'helpCenter.articles.10.title', descriptionKey: 'helpCenter.articles.10.description', categoryKey: 'helpCenter.categories.settings', icon: Settings },
    { id: '11', titleKey: 'helpCenter.articles.11.title', descriptionKey: 'helpCenter.articles.11.description', categoryKey: 'helpCenter.categories.documents', icon: FileText },
    { id: '12', titleKey: 'helpCenter.articles.12.title', descriptionKey: 'helpCenter.articles.12.description', categoryKey: 'helpCenter.categories.freelancers', icon: Star },
    { id: '13', titleKey: 'helpCenter.articles.13.title', descriptionKey: 'helpCenter.articles.13.description', categoryKey: 'helpCenter.categories.productivity', icon: Zap },
  ]

  const categories = Array.from(new Set(articles.map(a => a.categoryKey)))

  const filteredArticles = articles.filter(article => {
    const title = t(article.titleKey)
    const description = t(article.descriptionKey)
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || article.categoryKey === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/support"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('helpCenter.backToSupport')}
        </Link>
        <h1 className="text-3xl font-bold">{t('helpCenter.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('helpCenter.subtitle')}
        </p>
      </div>

      {/* Search */}
      <Card className="dark:bg-muted/20">
        <CardContent className="pt-6">
          <Input
            icon={<Search className="w-5 h-5" />}
            placeholder={t('helpCenter.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 text-base dark:bg-background"
          />
        </CardContent>
      </Card>

      {/* Categories Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !selectedCategory
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          {t('helpCenter.all')}
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {t(category)}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      {filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map(article => {
            const Icon = article.icon
            return (
              <Link key={article.id} to={`/support/centre-aide/${article.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{t(article.titleKey)}</CardTitle>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {t(article.categoryKey)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{t(article.descriptionKey)}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">{t('helpCenter.noArticles')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('helpCenter.tryDifferentSearch')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contact Support CTA */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">{t('helpCenter.cantFind')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('helpCenter.teamHere')}
              </p>
            </div>
            <Link to="/support">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                {t('helpCenter.contactSupport')}
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
