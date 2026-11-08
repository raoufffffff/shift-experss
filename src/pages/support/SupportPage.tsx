import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { handleSupabaseError } from '@/lib/error-handler'
import { useTranslation } from 'react-i18next'
import {
  MessageSquare,
  Mail,
  FileText,
  HelpCircle,
  Send,
  Book,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock
} from 'lucide-react'

interface FAQItem {
  questionKey: string
  answerKey: string
}

export function SupportPage() {
  const { t } = useTranslation()
  const { user, company } = useAuthStore()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const faqs: FAQItem[] = [
    { questionKey: 'support.faq.q1', answerKey: 'support.faq.a1' },
    { questionKey: 'support.faq.q2', answerKey: 'support.faq.a2' },
    { questionKey: 'support.faq.q3', answerKey: 'support.faq.a3' },
    { questionKey: 'support.faq.q4', answerKey: 'support.faq.a4' },
    { questionKey: 'support.faq.q5', answerKey: 'support.faq.a5' },
    { questionKey: 'support.faq.q6', answerKey: 'support.faq.a6' },
    { questionKey: 'support.faq.q7', answerKey: 'support.faq.a7' },
    { questionKey: 'support.faq.q8', answerKey: 'support.faq.a8' },
  ]

  const sendSupportMutation = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !message.trim()) {
        throw new Error(t('support.fillAllFields'))
      }

      if (!company?.id || !user?.id) {
        throw new Error(t('support.userOrCompanyNotFound'))
      }

      // Enregistrer le ticket dans la base de données
      const { error } = await supabase
        .from('tickets')
        .insert({
          company_id: company.id,
          user_id: user.id,
          subject,
          description: message,
          status: 'open' as const,
        })

      if (error) {


        const message = handleSupabaseError(error, {


          context: 'SupportPage',


          operation: 'query'


        });


        throw new Error(message);


      }
      // Envoyer l'email de notification à hello@shift.express
      const { data: { session } } = await supabase.auth.getSession()

      const emailResponse = await supabase.functions.invoke('send-support-ticket', {
        body: {
          subject,
          message,
          userEmail: user?.email || '',
          userName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          companyName: company?.name || '',
          plan: company?.subscription_plan || '',
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (emailResponse.error) {
        logger.error('Erreur lors de l\'envoi de l\'email:', emailResponse.error)
        // On ne bloque pas si l'email échoue, le ticket est déjà créé
      }
    },
    onSuccess: () => {
      toast.success(t('support.requestSent'), {
        description: t('support.requestSentDescription'),
      })
      setSubject('')
      setMessage('')
    },
    onError: (error: unknown) => {
      toast.error(t('support.sendError'), {
        description: error instanceof Error ? error.message : t('errors.genericError'),
      })
    },
  })

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('support.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('support.subtitle')}
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-base">{t('support.emailSupport')}</h3>
                  <Badge variant="default" className="text-xs">{t('support.available')}</Badge>
                </div>
                <a
                  href="mailto:hello@shift.express"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  hello@shift.express
                </a>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{t('support.response24h')}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('support.emailDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-base text-muted-foreground">{t('support.liveChat')}</h3>
                  <Badge variant="secondary" className="text-xs">{t('support.comingSoon')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('support.liveChatDescription')}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span>{t('support.inProgress')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Form */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4" />
              {t('support.contactUs')}
            </CardTitle>
            <CardDescription>
              {t('support.contactDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t('support.subject')} *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('support.subjectPlaceholder')}
                className="dark:bg-muted/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{t('support.message')} *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('support.messagePlaceholder')}
                rows={7}
                className="dark:bg-muted/20"
              />
            </div>

            <div className="bg-muted/30 border border-muted p-4 rounded-lg dark:bg-muted/20 dark:border-muted/50">
              <p className="text-xs font-medium mb-2">{t('support.accountInfo')}</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>{t('common.email')} :</span>
                  <span className="font-medium text-foreground">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('support.company')} :</span>
                  <span className="font-medium text-foreground">{company?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('support.plan')} :</span>
                  <Badge variant="secondary" className="text-xs capitalize">{company?.subscription_plan}</Badge>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => sendSupportMutation.mutate()}
              disabled={sendSupportMutation.isPending || !subject.trim() || !message.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              {sendSupportMutation.isPending ? t('support.sending') : t('support.sendMessage')}
            </Button>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Book className="w-4 h-4" />
              {t('support.resources')}
            </CardTitle>
            <CardDescription>
              {t('support.resourcesDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/support/centre-aide"
              className="w-full flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{t('support.helpCenter')}</p>
                  <p className="text-xs text-muted-foreground">{t('support.helpCenterDescription')}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>

            <a
              href="/support/documentation"
              className="w-full flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{t('support.documentation')}</p>
                  <p className="text-xs text-muted-foreground">{t('support.documentationDescription')}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>

            <div className="pt-4 mt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{t('support.serviceStatus')}</h4>
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  {t('support.operational')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('support.allSystemsNormal')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="w-4 h-4" />
            {t('support.faqTitle')}
          </CardTitle>
          <CardDescription>
            {t('support.faqDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border-2 rounded-lg overflow-hidden transition-all ${
                openFaqIndex === index ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-muted-foreground/20'
              }`}
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-4 text-left transition-colors"
              >
                <span className="font-medium text-sm pr-4">{t(faq.questionKey)}</span>
                <div className={`rounded-full p-1 transition-colors ${
                  openFaqIndex === index ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  {openFaqIndex === index ? (
                    <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </button>
              {openFaqIndex === index && (
                <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-primary/20 pt-4 bg-background">
                  {t(faq.answerKey)}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  )
}
