import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cartService } from '../api/service';
import { LatestMutationQueue } from '../model/LatestMutationQueue';
import type { CartDto, CartViewItem } from '../types';
import {
  hasApiAccessToken,
  subscribeToApiAccessToken,
} from '../../../services/http/apiClient';
import { resolveImageUrl } from '../../../services/media/imageUrl';
import { useToast } from '../../../shared/ui/toast/useToast';
import { CartContext, type CartContextValue } from './cartContext';

const toCartItems = (cart: CartDto): CartViewItem[] => cart.items.map((item) => ({
  id: String(item.cart_item_id),
  name: item.product_name,
  variantId: item.variant_id,
  price: item.unit_price,
  imageUrl: resolveImageUrl(item.image_url) ?? '',
  size: item.size,
  color: item.color,
  quantity: item.quantity,
}));

interface CartViewState {
  items: CartViewItem[];
  subtotal: number;
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartViewItem[]>([]);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartRevision, setCartRevision] = useState(0);

  const cartViewRef = useRef<CartViewState>({ items: [], subtotal: 0 });
  const mutationQueueRef = useRef(new LatestMutationQueue<CartDto>());

  const applyLocalCart = useCallback((items: CartViewItem[], subtotal: number): void => {
    cartViewRef.current = { items, subtotal };
    setCartItems(items);
    setCartSubtotal(subtotal);
    setCartRevision((current) => current + 1);
  }, []);

  const applyCart = useCallback((cart: CartDto): void => {
    applyLocalCart(toCartItems(cart), cart.subtotal);
  }, [applyLocalCart]);

  const clearCartState = useCallback((): void => {
    applyLocalCart([], 0);
  }, [applyLocalCart]);

  const refreshCart = useCallback(async (): Promise<void> => {
    if (!hasApiAccessToken()) {
      clearCartState();
      return;
    }

    applyCart(await cartService.getCart());
  }, [applyCart, clearCartState]);

  const reconcileAfterMutationFailure = useCallback(async (message: string): Promise<void> => {
    showToast(message);
    try {
      await refreshCart();
    } catch {
      clearCartState();
    }
  }, [clearCartState, refreshCart, showToast]);

  const enqueueCartMutation = useCallback((
    operation: () => Promise<CartDto>,
    errorMessage: string,
  ): void => {
    setCartRevision((current) => current + 1);
    mutationQueueRef.current.enqueue(operation, {
      onLatestSuccess: applyCart,
      onLatestError: () => reconcileAfterMutationFailure(errorMessage),
    });
  }, [applyCart, reconcileAfterMutationFailure]);

  useEffect(() => {
    let active = true;

    const loadCart = async () => {
      if (!hasApiAccessToken()) {
        clearCartState();
        return;
      }

      try {
        const cart = await cartService.getCart();
        if (active) applyCart(cart);
      } catch {
        if (active) clearCartState();
      }
    };

    void loadCart();

    const unsubscribe = subscribeToApiAccessToken((token) => {
      if (!token && active) {
        mutationQueueRef.current.invalidate();
        clearCartState();
        setIsCartOpen(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyCart, clearCartState]);

  const ensureCartAuthentication = (): boolean => {
    if (hasApiAccessToken()) return true;

    clearCartState();
    setIsCartOpen(false);
    showToast('Vui lòng đăng nhập để sử dụng giỏ hàng và đặt hàng.');
    return false;
  };

  const addToCart = (variantId: number, productName: string, quantity = 1) => {
    if (!ensureCartAuthentication()) return;

    enqueueCartMutation(
      () => cartService.addItem(variantId, Math.max(1, quantity)),
      'Không thể cập nhật giỏ hàng. Vui lòng thử lại.',
    );
    setIsCartOpen(true);
    showToast('Đang thêm ' + productName + ' vào giỏ hàng...');
  };

  const removeFromCart = (itemId: string) => {
    if (!ensureCartAuthentication()) return;

    const item = cartViewRef.current.items.find((candidate) => candidate.id === itemId);
    if (!item) return;

    applyLocalCart(
      cartViewRef.current.items.filter((candidate) => candidate.id !== itemId),
      Math.max(0, cartViewRef.current.subtotal - item.price * item.quantity),
    );

    enqueueCartMutation(
      () => cartService.removeItem(Number(itemId)),
      'Không thể xóa sản phẩm khỏi giỏ hàng.',
    );
  };

  const setCartQuantity = (itemId: string, quantity: number) => {
    if (!ensureCartAuthentication()) return;

    const item = cartViewRef.current.items.find((candidate) => candidate.id === itemId);
    if (!item) return;

    const normalizedQuantity = Math.trunc(quantity);
    if (normalizedQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    if (normalizedQuantity === item.quantity) return;

    const nextItems = cartViewRef.current.items.map((candidate) =>
      candidate.id === itemId
        ? { ...candidate, quantity: normalizedQuantity }
        : candidate,
    );
    const nextSubtotal = Math.max(
      0,
      cartViewRef.current.subtotal + (normalizedQuantity - item.quantity) * item.price,
    );
    applyLocalCart(nextItems, nextSubtotal);

    enqueueCartMutation(
      () => cartService.updateItem(Number(itemId), normalizedQuantity),
      'Không thể cập nhật số lượng giỏ hàng.',
    );
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    setCartQuantity(itemId, quantity);
  };

  const changeCartQuantity = (itemId: string, delta: number) => {
    const item = cartViewRef.current.items.find((candidate) => candidate.id === itemId);
    if (!item || !Number.isFinite(delta)) return;
    setCartQuantity(itemId, item.quantity + Math.trunc(delta));
  };

  const value: CartContextValue = {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    cartSubtotal,
    cartRevision,
    refreshCart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    changeCartQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
