import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import {
  Briefcase,
  Calendar,
  GraduationCap,
  Building2,
  Quote,
  Award,
  CheckCircle,
  Clock,
  BadgeCheck,
} from 'lucide-react';
import type { Freelancer, FreelancerApplication } from '../types';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface FreelancerProfileGridProps {
  freelancer: Freelancer;
  language: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  completedShifts?: FreelancerApplication[];
}

export function FreelancerProfileGrid({
  freelancer,
  language,
  t,
  completedShifts = [],
}: FreelancerProfileGridProps) {
  const dateFnsLocale = language === 'fr' ? fr : enUS;

  // Build platform experiences from completed shifts
  const platformExperiences = completedShifts
    .filter((app) => app.shift)
    .map((app) => ({
      id: app.id,
      title: app.shift!.position_name,
      company: app.shift!.establishments?.name || '',
      period: format(new Date(app.shift!.start_time), 'MMM yyyy', { locale: dateFnsLocale }),
      startTime: app.shift!.start_time,
    }))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const externalExperiences = freelancer.cv_experiences || [];
  const hasPlatformExp = platformExperiences.length > 0;
  const hasExternalExp = externalExperiences.length > 0;

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Bio Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Quote className="w-4 h-4 text-emerald-600" />
            {t('freelancers.aboutMe')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {freelancer.bio ? (
            <p className="text-muted-foreground leading-relaxed">{freelancer.bio}</p>
          ) : (
            <p className="text-muted-foreground/60 italic">{t('freelancers.noBio')}</p>
          )}
        </CardContent>
      </Card>

      {/* Experiences Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            {t('freelancers.experiences')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasPlatformExp || hasExternalExp ? (
            <div className="space-y-6">
              {/* Platform experiences (via Shift Express) */}
              {hasPlatformExp && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {t('freelancers.platformExperiences', { defaultValue: 'Via Shift Express' })}
                    </h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {platformExperiences.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {platformExperiences.map((exp, index) => (
                      <div
                        key={exp.id}
                        className={`relative pl-6 pb-3 ${index !== platformExperiences.length - 1 ? 'border-l-2 border-emerald-200 dark:border-emerald-800' : ''}`}
                      >
                        <div className="absolute left-[-5px] top-1 w-3 h-3 rounded-full bg-emerald-500" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{exp.title}</h4>
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap">
                              <BadgeCheck className="w-3 h-3" />
                              Shift Express
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{exp.company}</span>
                            {/* <span className="mx-1">&bull;</span> */}
                            {/* <Calendar className="w-3.5 h-3.5" /> */}
                            {/* <span>{exp.period}</span> */}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External experiences (hors plateforme) */}
              {hasExternalExp && (
                <div>
                  {hasPlatformExp && (
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        {t('freelancers.externalExperiences', { defaultValue: 'Autres exp\u00e9riences' })}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-muted text-muted-foreground">
                        {externalExperiences.length}
                      </span>
                    </div>
                  )}
                  <div className="space-y-3">
                    {externalExperiences.map((exp, index) => (
                      <div
                        key={exp.id}
                        className={`relative pl-6 pb-3 ${index !== externalExperiences.length - 1 ? 'border-l-2 border-slate-200 dark:border-slate-700' : ''}`}
                      >
                        <div className="absolute left-[-5px] top-1 w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500" />
                        <div className="space-y-1">
                          <h4 className="font-semibold text-foreground">{exp.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{exp.company}</span>
                            <span className="mx-1">&bull;</span>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{exp.period}</span>
                          </div>
                          {exp.description && (
                            <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Briefcase className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('freelancers.noExperiences')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            {t('freelancers.certifications')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {freelancer.certifications && freelancer.certifications.length > 0 ? (
            <div className="space-y-3">
              {freelancer.certifications.map((cert) => {
                const certName = cert.certification?.name || cert.custom_name || ''
                const displayName = cert.specialization
                  ? `${certName} (${cert.specialization})`
                  : certName
                return (
                  <div key={cert.id} className={`flex items-start gap-3 p-3 rounded-lg ${cert.proof_status === 'verified' ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-muted/50'}`}>
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-medium text-foreground">{displayName}</h4>
                        {cert.proof_status === 'verified' && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        {cert.proof_status === 'pending' && (
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {cert.institution && <span>{cert.institution}</span>}
                        {cert.institution && cert.year && <span className="mx-1">&bull;</span>}
                        {cert.year && <span>{cert.year}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : freelancer.cv_formations && freelancer.cv_formations.length > 0 ? (
            /* Fallback: display legacy cv_formations if no certifications yet */
            <div className="space-y-3">
              {freelancer.cv_formations.map((formation) => {
                const proofStatus = (formation as unknown as Record<string, unknown>).proof_status as string | null
                return (
                  <div key={formation.id} className={`flex items-start gap-3 p-3 rounded-lg ${proofStatus === 'verified' ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-muted/50'}`}>
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-medium text-foreground">{formation.title}</h4>
                        {proofStatus === 'verified' && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        {proofStatus === 'pending' && (
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formation.school}</span>
                        <span className="mx-1">&bull;</span>
                        <span>{formation.year}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <GraduationCap className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('freelancers.noCertifications')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Skills Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            {t('freelancers.professionalSkills', { defaultValue: 'Compétences professionnelles' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {freelancer.professional_skills && freelancer.professional_skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {freelancer.professional_skills.map((item) => (
                <Chip
                  key={item.id}
                  variant="secondary"
                  className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-0"
                >
                  {item.skill.name_translations?.[language] || item.skill.name_translations?.fr || item.skill.name}
                </Chip>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Award className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('freelancers.noProfessionalSkills', { defaultValue: 'Aucune compétence renseignée' })}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PMS Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            {t('freelancers.pmsMastery')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {freelancer.mastered_pms && freelancer.mastered_pms.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {freelancer.mastered_pms.map((item) => {
                const proofStatus = (item as unknown as Record<string, unknown>).proof_status as string | null
                return (
                  <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card/50 ${proofStatus === 'verified' ? 'border-emerald-300 dark:border-emerald-700' : 'border-border'}`}>
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-medium text-foreground truncate">{item.pms.name}</h4>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                          item.pms.type === 'pms'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                        }`}>
                          {item.pms.type?.toUpperCase() || 'POS'}
                        </span>
                        {proofStatus === 'verified' && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        {proofStatus === 'pending' && (
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.pms.job_position?.name_translations?.[language] ||
                          item.pms.job_position?.name_translations?.fr ||
                          item.pms.job_position?.name_translations?.en || ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('freelancers.noPmsAdded')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
