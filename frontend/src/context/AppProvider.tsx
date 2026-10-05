import React, { useEffect, useState, type ReactNode } from 'react';
import { cartService } from '../features/cart/api/service';
import type { CartDto } from '../features/cart/types';
import { hasApiAccessToken } from '../services/http/apiClient';
import { resolveImageUrl } from '../services/media/imageUrl';
import type { CartItem, ScreenId } from '../types';
import { AppContext } from './AppContext';

const toCartItems = (cart: CartDto): CartItem[] => cart.items.map((item) => ({
  id: String(item.cart_item_id),
  name: item.product_name,
  variantId: item.variant_id,
  price: item.unit_price,
  imageUrl: resolveImageUrl(item.image_url) ?? '',
  size: item.size,
  color: item.color,
  quantity: item.quantity,
}));

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    window.setTimeout(() => setToast((previous) => ({ ...previous, visible: false })), 3200);
  };

  const applyCart = (cart: CartDto): void => {
    setCartItems(toCartItems(cart));
    setCartSubtotal(cart.subtotal);
  };

  const clearCartState = (): void => {
    setCartItems([]);
    setCartSubtotal(0);
  };

  const requireCartAuthentication = (): boolean => {
    if (hasApiAccessToken()) return true;
    clearCartState();
    setIsCartOpen(false);
    showToast('Vui lòng đăng nhập để sử dụng giỏ hàng và đặt hàng.');
    setCurrentScreen('auth');
    return false;
  };

  const refreshCart = async (): Promise<void> => {
    if (!hasApiAccessToken()) {
      clearCartState();
      return;
    }
    applyCart(await cartService.getCart());
  };

  useEffect(() => {
    let active = true;
    const loadCart = async () => {
      if (!hasApiAccessToken()) return;
      try {
        const cart = await cartService.getCart();
        if (active) applyCart(cart);
      } catch {
        if (active) clearCartState();
      }
    };
    void loadCart();
    return () => { active = false; };
  }, []);

  const addToCart = (variantId: number, productName: string, quantity = 1) => {
    if (!requireCartAuthentication()) return;
    void cartService.addItem(variantId, Math.max(1, quantity))
      .then((cart) => {
        applyCart(cart);
        setIsCartOpen(true);
        showToast(`Đã thêm ${productName} vào giỏ hàng`);
      })
      .catch(() => showToast('Không thể cập nhật giỏ hàng. Vui lòng thử lại.'));
  };

  const removeFromCart = (itemId: string) => {
    if (!requireCartAuthentication()) return;
    void cartService.removeItem(Number(itemId))
      .then(applyCart)
      .catch(() => showToast('Không thể xóa sản phẩm khỏi giỏ hàng.'));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (!requireCartAuthentication()) return;
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    void cartService.updateItem(Number(itemId), quantity)
      .then(applyCart)
      .catch(() => showToast('Không thể cập nhật số lượng giỏ hàng.'));
  };

  return (
    <AppContext.Provider value={{
      currentScreen,
      setCurrentScreen,
      selectedProductId,
      setSelectedProductId,
      selectedOrderId,
      setSelectedOrderId,
      isCartOpen,
      setIsCartOpen,
      cartItems,
      cartSubtotal,
      refreshCart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      toastMessage: toast.visible ? toast.message : null,
      showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
};
