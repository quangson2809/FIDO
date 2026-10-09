import { createContext } from 'react';
import type { CartViewItem } from '../types';

export interface CartContextValue {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartItems: CartViewItem[];
  cartSubtotal: number;
  cartRevision: number;
  isCartBusy: boolean;
  withCartLock: <T>(operation: () => Promise<T>) => Promise<T>;
  synchronizePurchasedCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: number, productName: string, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  changeCartQuantity: (itemId: string, delta: number) => void;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);
