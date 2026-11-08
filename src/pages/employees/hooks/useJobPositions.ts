import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/error-handler';
import type { JobPosition } from '../types';

interface RawJobPosition {
  id: string;
  slug: string;
  name_translations: Record<string, string> | null;
  display_order: number | null;
  active: boolean;
}

/**
 * job_positions n'a PAS de colonne `title` : les noms sont dans `name_translations`
 * (ex: {"fr": "Serveur / Serveuse"}). On résout la langue courante, puis fr, puis en,
 * puis la première valeur disponible, puis le slug.
 */
export function resolveJobPositionLabel(
  nameTranslations: Record<string, string> | null | undefined,
  slug: string,
  lang: string
): string {
  const tr = nameTranslations || {};
  return tr[lang] || tr.fr || tr.en || Object.values(tr)[0] || slug;
}

export function useJobPositions() {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'fr').split('-')[0];

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['job-positions'],
    staleTime: 60 * 60 * 1000, // le catalogue change très rarement
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_positions')
        .select('id, slug, name_translations, display_order, active')
        .order('display_order');

      if (error) {
        const message = handleSupabaseError(error, {
          context: 'EmployeesPage',
          operation: 'fetchJobPositions',
        });
        throw new Error(message);
      }
      return (data || []) as RawJobPosition[];
    },
  });

  // Tous les métiers (actifs ou non) pour l'AFFICHAGE d'un métier déjà attribué
  const jobPositionsById = useMemo(() => {
    const map = new Map<string, JobPosition>();
    raw.forEach((jp) => {
      map.set(jp.id, {
        id: jp.id,
        slug: jp.slug,
        label: resolveJobPositionLabel(jp.name_translations, jp.slug, lang),
        active: jp.active,
      });
    });
    return map;
  }, [raw, lang]);

  // Seulement les métiers actifs, triés par nom, pour la SÉLECTION
  const jobPositions = useMemo(
    () =>
      Array.from(jobPositionsById.values())
        .filter((jp) => jp.active)
        .sort((a, b) => a.label.localeCompare(b.label, lang)),
    [jobPositionsById, lang]
  );

  return { jobPositions, jobPositionsById, isLoading };
}