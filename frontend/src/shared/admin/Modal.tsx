import { useEffect, useId, useRef, type ReactNode } from 'react';
export function Modal({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} className="admin-modal" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}><header><h2 id={titleId}>{title}</h2><button type="button" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}>×</button></header>{children}</dialog>;
}
