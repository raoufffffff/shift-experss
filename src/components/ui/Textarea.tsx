import * as React from 'react';
import { cn } from '@/lib/cn';
import { useTranslation } from 'react-i18next';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

// Générateur d'ID unique pour l'accessibilité
let textareaIdCounter = 0;
const generateId = () => `textarea-${++textareaIdCounter}`;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const { t } = useTranslation();
    // Générer un ID unique si non fourni
    const textareaId = React.useMemo(() => id || generateId(), [id]);
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

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
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-label={t('accessibility.required')}>*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground',
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
        />
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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

Textarea.displayName = 'Textarea';

export { Textarea };
