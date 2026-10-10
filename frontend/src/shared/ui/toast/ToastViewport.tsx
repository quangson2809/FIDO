import React from 'react';
import { useToast } from './useToast';

export const ToastViewport: React.FC = () => {
  const { message } = useToast();
  if (!message) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 right-4 z-[70] sm:right-8">
      <div className="flex items-center gap-3 border border-[#E8C75B]/30 bg-[#0B2419] px-5 py-3 text-white shadow-2xl">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-[#E8C75B]"><circle cx="12" cy="12" r="9" /><path d="M12 11v6 M12 7v1" /></svg>
        <span className="text-xs font-medium sm:text-sm">{message}</span>
      </div>
    </div>
  );
};
