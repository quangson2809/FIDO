import { createContext, useContext } from 'react';
import type { CartItem, ScreenId } from '../types';

export interface AppContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  selectedOrderId: string;
  setSelectedOrderId: (id: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartItems: CartItem[];
  cartSubtotal: number;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: number, productName: string, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  toastMessage: string | null;
  showToast: (message: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
