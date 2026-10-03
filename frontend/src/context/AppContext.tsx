import { createContext, useContext } from 'react';
import type { CatalogProductView } from '../features/catalog/types';
import type { CartItem, Order, OrderStatus, ScreenId, UserProfile } from '../types';

export interface CartProductInput {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  sku?: string;
  fabric?: string;
  variants?: CatalogProductView['variants'];
}

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
  addToCart: (
    product: CartProductInput,
    size?: string | number,
    color?: string,
    quantity?: number,
  ) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  freeHemming: boolean;
  setFreeHemming: (enabled: boolean) => void;
  hemmingNote: string;
  setHemmingNote: (note: string) => void;
  appliedVoucher: string;
  voucherDiscount: number;
  applyVoucher: (code: string) => boolean;
  removeVoucher: () => void;
  orders: Order[];
  updateOrderRecipient: (orderId: string, phone: string, address: string, note?: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  createOrder: (orderData: Partial<Order>) => Order;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  userProfile: UserProfile;
  updateUserProfile: (dataOrPhone: Partial<UserProfile> | string, email?: string) => void;
  toast: { message: string; visible: boolean };
  toastMessage: string | null;
  showToast: (message: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
