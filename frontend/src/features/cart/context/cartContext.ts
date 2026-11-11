import { createContext } from 'react';
import type { CartViewItem } from '../types';

export interface CartContextValue {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartItems: CartViewItem[];
  cartSubtotal: number;
  cartRevision: number;
  isCartBusy: boolean;
  cartLoading: boolean;
  cartError: string | null;
  withCartLock: <T>(operation: () => Promise<T>) => Promise<T>;
  synchronizePurchasedCart: () => void;
  refreshCart: () => Promise<void>;
  addToCart: (productId: number, productName: string, quantity?: number) => void;
  removeFromCart: (itemId: number) => void;
  clearCart: () => void;
  updateCartQuantity: (itemId: number, quantity: number) => void;
  changeCartQuantity: (itemId: number, delta: number) => void;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);
