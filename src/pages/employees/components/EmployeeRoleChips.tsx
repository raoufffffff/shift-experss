import { Chip } from '@/components/ui/Chip';
import { useJobPositions } from '../hooks/useJobPositions';

interface EmployeeRoleChipsProps {
  ids: string[] | null | undefined;
  /** Nombre max de chips affichés (le reste est résumé en "+N"). Illimité si absent. */
  max?: number;
  /** Texte affiché (en orange) quand aucun métier n'est attribué. */
  emptyLabel?: string;
}

export function EmployeeRoleChips({ ids, max, emptyLabel }: EmployeeRoleChipsProps) {
  const { jobPositionsById } = useJobPositions();

  const labels = (ids || [])
    .map((id) => jobPositionsById.get(id)?.label)
    .filter((l): l is string => !!l);

  if (labels.length === 0) {
    return emptyLabel
      ? <span className="text-xs text-amber-600">{emptyLabel}</span>
      : <span className="text-sm text-muted-foreground">-</span>;
  }

  const shown = max ? labels.slice(0, max) : labels;
  const rest = labels.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((label) => (
        <Chip key={label} variant="secondary">{label}</Chip>
      ))}
      {rest > 0 && <Chip variant="default">+{rest}</Chip>}
    </div>
  );
}