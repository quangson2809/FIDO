import React from 'react';
import { AppRoutes } from './app/routes/AppRoutes';
import { AuthSessionProvider } from './features/auth/session/AuthSessionContext';
import { CartProvider } from './features/cart/context/CartProvider';
import { ToastProvider } from './shared/ui/toast/ToastProvider';
import { ToastViewport } from './shared/ui/toast/ToastViewport';

export default function App() {
  return (
    <AuthSessionProvider>
      <ToastProvider>
        <CartProvider>
          <AppRoutes />
          <ToastViewport />
        </CartProvider>
      </ToastProvider>
    </AuthSessionProvider>
  );
}
