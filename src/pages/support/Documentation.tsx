import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  Search,
  ArrowLeft,
  BookOpen,
  Rocket,
  Users,
  Settings,
  Database,
  Shield,
  ChevronDown,
  ChevronRight,
  Building2,
  Zap,
  UserCheck,
  FileText
} from 'lucide-react'
import { LocalizedLink as Link } from '@/components/LocalizedLink'
import { useTranslation } from 'react-i18next'

interface DocSection {
  id: string
  titleKey: string
  descriptionKey: string
  icon: React.ComponentType<{ className?: string }>
  subsections: {
    id: string
    titleKey: string
    contentKey: string
  }[]
}

export function Documentation() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  const documentation: DocSection[] = [
    {
      id: 'getting-started',
      titleKey: 'documentation.gettingStarted.title',
      descriptionKey: 'documentation.gettingStarted.description',
      icon: Rocket,
      subsections: [
        {
          id: 'intro',
          titleKey: 'documentation.gettingStarted.intro.title',
          contentKey: 'documentation.gettingStarted.intro.content'
        },
        {
          id: 'first-steps',
          titleKey: 'documentation.gettingStarted.firstSteps.title',
          contentKey: 'documentation.gettingStarted.firstSteps.content'
        },
        {
          id: 'dashboard',
          titleKey: 'documentation.gettingStarted.dashboard.title',
          contentKey: 'documentation.gettingStarted.dashboard.content'
        }
      ]
    },
    {
      id: 'shifts',
      titleKey: 'documentation.shifts.title',
      descriptionKey: 'documentation.shifts.description',
      icon: BookOpen,
      subsections: [
        {
          id: 'create',
          titleKey: 'documentation.shifts.create.title',
          contentKey: 'documentation.shifts.create.content'
        },
        {
          id: 'notifications',
          titleKey: 'documentation.shifts.notifications.title',
          contentKey: 'documentation.shifts.notifications.content'
        },
        {
          id: 'manage',
          titleKey: 'documentation.shifts.manage.title',
          contentKey: 'documentation.shifts.manage.content'
        }
      ]
    },
    {
      id: 'team',
      titleKey: 'documentation.team.title',
      descriptionKey: 'documentation.team.description',
      icon: Users,
      subsections: [
        {
          id: 'invite',
          titleKey: 'documentation.team.invite.title',
          contentKey: 'documentation.team.invite.content'
        },
        {
          id: 'roles',
          titleKey: 'documentation.team.roles.title',
          contentKey: 'documentation.team.roles.content'
        },
        {
          id: 'stats',
          titleKey: 'documentation.team.stats.title',
          contentKey: 'documentation.team.stats.content'
        }
      ]
    },
    {
      id: 'freelancers',
      titleKey: 'documentation.freelancers.title',
      descriptionKey: 'documentation.freelancers.description',
      icon: UserCheck,
      subsections: [
        {
          id: 'marketplace',
          titleKey: 'documentation.freelancers.marketplace.title',
          contentKey: 'documentation.freelancers.marketplace.content'
        },
        {
          id: 'favorites',
          titleKey: 'documentation.freelancers.favorites.title',
          contentKey: 'documentation.freelancers.favorites.content'
        },
        {
          id: 'profile',
          titleKey: 'documentation.freelancers.profile.title',
          contentKey: 'documentation.freelancers.profile.content'
        }
      ]
    },
    {
      id: 'documents',
      titleKey: 'documentation.documents.title',
      descriptionKey: 'documentation.documents.description',
      icon: FileText,
      subsections: [
        {
          id: 'contracts',
          titleKey: 'documentation.documents.contracts.title',
          contentKey: 'documentation.documents.contracts.content'
        }
      ]
    },
    {
      id: 'establishments',
      titleKey: 'documentation.establishments.title',
      descriptionKey: 'documentation.establishments.description',
      icon: Building2,
      subsections: [
        {
          id: 'create',
          titleKey: 'documentation.establishments.create.title',
          contentKey: 'documentation.establishments.create.content'
        },
        {
          id: 'positions',
          titleKey: 'documentation.establishments.positions.title',
          contentKey: 'documentation.establishments.positions.content'
        }
      ]
    },
    {
      id: 'productivity',
      titleKey: 'documentation.productivity.title',
      descriptionKey: 'documentation.productivity.description',
      icon: Zap,
      subsections: [
        {
          id: 'shortcuts',
          titleKey: 'documentation.productivity.shortcuts.title',
          contentKey: 'documentation.productivity.shortcuts.content'
        }
      ]
    },
    {
      id: 'settings',
      titleKey: 'documentation.settings.title',
      descriptionKey: 'documentation.settings.description',
      icon: Settings,
      subsections: [
        {
          id: 'company',
          titleKey: 'documentation.settings.company.title',
          contentKey: 'documentation.settings.company.content'
        },
        {
          id: 'subscription',
          titleKey: 'documentation.settings.subscription.title',
          contentKey: 'documentation.settings.subscription.content'
        }
      ]
    },
    {
      id: 'data',
      titleKey: 'documentation.data.title',
      descriptionKey: 'documentation.data.description',
      icon: Database,
      subsections: [
        {
          id: 'export',
          titleKey: 'documentation.data.export.title',
          contentKey: 'documentation.data.export.content'
        }
      ]
    },
    {
      id: 'security',
      titleKey: 'documentation.security.title',
      descriptionKey: 'documentation.security.description',
      icon: Shield,
      subsections: [
        {
          id: 'data-protection',
          titleKey: 'documentation.security.dataProtection.title',
          contentKey: 'documentation.security.dataProtection.content'
        },
        {
          id: 'gdpr',
          titleKey: 'documentation.security.gdpr.title',
          contentKey: 'documentation.security.gdpr.content'
        }
      ]
    }
  ]

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const filteredDocumentation = documentation.filter(section => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const title = t(section.titleKey)
    const description = t(section.descriptionKey)
    return (
      title.toLowerCase().includes(query) ||
      description.toLowerCase().includes(query) ||
      section.subsections.some(sub => {
        const subTitle = t(sub.titleKey)
        const subContent = t(sub.contentKey)
        return subTitle.toLowerCase().includes(query) ||
          subContent.toLowerCase().includes(query)
      })
    )
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
          {t('documentation.backToSupport')}
        </Link>
        <h1 className="text-3xl font-bold">{t('documentation.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('documentation.subtitle')}
        </p>
      </div>

      {/* Search */}
      <Card className="dark:bg-muted/20">
        <CardContent className="pt-6">
          <Input
            icon={<Search className="w-5 h-5" />}
            placeholder={t('documentation.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 text-base dark:bg-background"
          />
        </CardContent>
      </Card>

      {/* Documentation Sections */}
      <div className="space-y-4">
        {filteredDocumentation.map(section => {
          const Icon = section.icon
          const isExpanded = expandedSections.includes(section.id)

          return (
            <Card key={section.id} className="overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full text-left"
              >
                <CardHeader className="hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg">{t(section.titleKey)}</CardTitle>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {t(section.descriptionKey)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </button>

              {isExpanded && (
                <CardContent className="border-t bg-muted/20">
                  <div className="space-y-6 pt-4">
                    {section.subsections.map((subsection, index) => (
                      <div key={subsection.id}>
                        {index > 0 && <div className="border-t my-6" />}
                        <h4 className="font-semibold mb-3 text-sm">{t(subsection.titleKey)}</h4>
                        <div className="text-sm text-muted-foreground leading-relaxed space-y-2 whitespace-pre-line">
                          {t(subsection.contentKey)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {filteredDocumentation.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">{t('documentation.noResults')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('documentation.noResultsDescription')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contact Support CTA */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">{t('documentation.needHelp')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('documentation.needHelpDescription')}
              </p>
            </div>
            <Link to="/support">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                {t('documentation.contactSupport')}
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
