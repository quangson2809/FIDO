import React from 'react';
import { useToast } from './useToast';

export const ToastViewport: React.FC = () => {
  const { message } = useToast();
  if (!message) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 right-4 z-[70] sm:right-8">
      <div className="flex items-center gap-3 border border-[#E8C75B]/30 bg-[#0B2419] px-5 py-3 text-white shadow-2xl">
        <span aria-hidden="true" className="material-symbols-outlined text-xl text-[#E8C75B]">info</span>
        <span className="text-xs font-medium sm:text-sm">{message}</span>
      </div>
    </div>
  );
};
