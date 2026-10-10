import { useEffect, useRef, type ReactNode } from 'react';

// Native modal dialogs isolate the background and contain keyboard focus.
export function StorefrontDialog({ name, onClose, children, className = '', busy = false }: {
  name: string; onClose: () => void; children: ReactNode; className?: string; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return <dialog ref={ref} tabIndex={-1} aria-label={name} aria-busy={busy} className={`storefront-dialog ${className}`}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const dialog = event.currentTarget;
      const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (!controls.some(element => element === document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    {children}
  </dialog>;
}
