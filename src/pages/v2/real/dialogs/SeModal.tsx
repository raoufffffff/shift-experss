/** Modale centrée du nouveau design (remplace les dialogues shadcn dans l'espace v2). */
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const seField =
  'w-full h-11 rounded-se-sm border border-se-line bg-se-surface px-3 text-sm text-se-ink placeholder:text-se-muted/70 focus:outline-none focus:border-se-blue disabled:opacity-50';
export const seArea =
  'w-full rounded-se-sm border border-se-line bg-se-surface px-3 py-2.5 text-sm text-se-ink placeholder:text-se-muted/70 focus:outline-none focus:border-se-blue';
export const sePrimary =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-se-sm text-sm font-semibold bg-se-blue text-white hover:bg-se-blue-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const seGhost =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-se-sm text-sm font-semibold border border-se-line bg-se-surface text-se-ink hover:bg-se-surface-2 transition-colors disabled:opacity-50';

export function SeModal({
  open, onClose, title, subtitle, children, footer, wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="se-root fixed inset-0 z-[100] grid place-items-center p-4" style={{ background: 'transparent' }}>
      <div className="absolute inset-0 bg-se-ink/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col bg-se-surface border border-se-line rounded-se shadow-se-md`}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-se-line">
          <div className="min-w-0">
            <h3 className="font-display font-extrabold text-lg text-se-ink">{title}</h3>
            {subtitle && <p className="text-sm text-se-muted mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-se-sm text-se-muted hover:text-se-ink hover:bg-se-surface-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="p-4 border-t border-se-line flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Labeled({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="se-eyebrow block mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-se-muted mt-1">{hint}</span>}
    </label>
  );
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger'; children: ReactNode }) {
  const cls =
    tone === 'danger' ? 'bg-se-danger-wash text-se-danger' : tone === 'warn' ? 'bg-se-cascade-wash text-se-cascade-ink' : 'bg-se-blue-wash text-se-blue-ink';
  return <div className={`rounded-se-sm px-3 py-2.5 text-sm ${cls}`}>{children}</div>;
}
