import * as React from 'react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
  hideClose?: boolean;
}

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

// Context pour partager les IDs entre les composants
const DialogContext = React.createContext<{
  titleId: string;
  descriptionId: string;
}>({
  titleId: '',
  descriptionId: '',
});

let dialogIdCounter = 0;
const generateDialogId = () => `dialog-${++dialogIdCounter}`;

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const [titleId] = React.useState(() => `${generateDialogId()}-title`);
  const [descriptionId] = React.useState(() => `${generateDialogId()}-description`);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      // Sauvegarder l'élément actif pour restaurer le focus après fermeture
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      // Restaurer le focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Gérer la touche Escape
  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ titleId, descriptionId }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        {/* Content */}
        <div className="relative z-50 my-auto">{children}</div>
      </div>
    </DialogContext.Provider>
  );
};

const DialogContent: React.FC<DialogContentProps> = ({
  className,
  children,
  hideClose: _hideClose,
}) => {
  const { titleId, descriptionId } = React.useContext(DialogContext);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Focus trap
  React.useEffect(() => {
    if (!dialogRef.current) return;

    // Focus le dialog à l'ouverture
    const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    // Gérer le focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        'bg-card text-card-foreground rounded-lg shadow-lg p-6 w-full max-w-lg mx-4 border border-border',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>
  );
};

const DialogHeader: React.FC<DialogHeaderProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn('flex flex-col space-y-1.5 mb-4', className)}>
      {children}
    </div>
  );
};

const DialogTitle: React.FC<DialogTitleProps> = ({ className, children }) => {
  const { titleId } = React.useContext(DialogContext);
  return (
    <h2 id={titleId} className={cn('text-lg font-semibold text-foreground', className)}>
      {children}
    </h2>
  );
};

const DialogDescription: React.FC<DialogDescriptionProps> = ({
  className,
  children,
}) => {
  const { descriptionId } = React.useContext(DialogContext);
  return (
    <p id={descriptionId} className={cn('text-sm text-muted-foreground', className)}>{children}</p>
  );
};

const DialogFooter: React.FC<DialogFooterProps> = ({
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6',
        className
      )}
    >
      {children}
    </div>
  );
};

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
