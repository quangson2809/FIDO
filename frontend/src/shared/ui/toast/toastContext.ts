import { createContext } from 'react';

export interface ToastContextValue {
  message: string | null;
  showToast: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);
