import * as React from 'react';
import { cn } from '@/lib/cn';
import { useTranslation } from 'react-i18next';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
}

// Générateur d'ID unique pour l'accessibilité
let selectIdCounter = 0;
const generateId = () => `select-${++selectIdCounter}`;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options = [], children, id, ...props }, ref) => {
    const { t } = useTranslation();
    // Générer un ID unique si non fourni
    const selectId = React.useMemo(() => id || generateId(), [id]);
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    // Construire aria-describedby selon ce qui est affiché
    const ariaDescribedBy = React.useMemo(() => {
      const ids = [];
      if (error) ids.push(errorId);
      if (helperText && !error) ids.push(helperId);
      return ids.length > 0 ? ids.join(' ') : undefined;
    }, [error, helperText, errorId, helperId]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-label={t('accessibility.required')}>*</span>}
          </label>
        )}
        <select
          id={selectId}
          className={cn(
            'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={ariaDescribedBy}
          aria-required={props.required ? 'true' : undefined}
          {...props}
        >
          {children ? children : options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
