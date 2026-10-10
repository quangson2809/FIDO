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
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';
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
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const confirmedViewRef = useRef<CartViewState>({ items: [], subtotal: 0 });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartViewItem[]>([]);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartRevision, setCartRevision] = useState(0);
  const [mutationPending, setMutationPending] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const checkoutLockRef = useRef(false);
  const viewVersionRef = useRef(0);

  const cartViewRef = useRef<CartViewState>({ items: [], subtotal: 0 });
  const mutationQueueRef = useRef(new LatestMutationQueue<CartDto>());

  const applyLocalCart = useCallback((items: CartViewItem[], subtotal: number): void => {
    viewVersionRef.current += 1;
    cartViewRef.current = { items, subtotal };
    setCartItems(items);
    setCartSubtotal(subtotal);
    setCartRevision((current) => current + 1);
  }, []);

  const applyCart = useCallback((cart: CartDto): void => {
    const items = toCartItems(cart);
    confirmedViewRef.current = { items, subtotal: cart.subtotal };
    setCartError(null);
    applyLocalCart(items, cart.subtotal);
  }, [applyLocalCart]);

  const clearCartState = useCallback((): void => {
    confirmedViewRef.current = { items: [], subtotal: 0 };
    setCartError(null);
    applyLocalCart([], 0);
  }, [applyLocalCart]);

  const refreshCart = useCallback(async (): Promise<void> => {
    if (!hasApiAccessToken()) {
      clearCartState();
      return;
    }

    const version = viewVersionRef.current;
    setCartLoading(true);
    try {
      const cart = await cartService.getCart();
      if (version === viewVersionRef.current) applyCart(cart);
    } catch (cause: unknown) {
      if (version === viewVersionRef.current) setCartError(getStorefrontErrorMessage(cause, 'Chưa thể tải giỏ hàng. Vui lòng thử lại.'));
      throw cause;
    } finally { setCartLoading(false); }
  }, [applyCart, clearCartState]);

  const reconcileAfterMutationFailure = useCallback(async (message: string): Promise<void> => {
    showToast(message);
    try {
      await refreshCart();
    } catch {
      // Restore the last confirmed view if reconciliation also fails; never show an empty cart as a successful read.
      applyLocalCart(confirmedViewRef.current.items, confirmedViewRef.current.subtotal);
      setCartError('Chưa thể xác nhận thay đổi giỏ hàng. Vui lòng tải lại trước khi thanh toán.');
    }
  }, [applyLocalCart, refreshCart, showToast]);

  const enqueueCartMutation = useCallback((
    operation: () => Promise<CartDto>,
    errorMessage: string,
  ): void => {
    viewVersionRef.current += 1;
    setMutationPending(true);
    setCartRevision((current) => current + 1);
    mutationQueueRef.current.enqueue(operation, {
      onLatestSuccess: (cart) => { applyCart(cart); setMutationPending(false); showToast('Đã cập nhật giỏ hàng.'); },
      onLatestError: async () => {
        await reconcileAfterMutationFailure(errorMessage);
        setMutationPending(false);
      },
    });
  }, [applyCart, reconcileAfterMutationFailure, showToast]);

  useEffect(() => {
    let active = true;

    const loadCart = async () => {
      if (!hasApiAccessToken()) {
        clearCartState();
        setCartLoading(false);
        return;
      }

      const version = viewVersionRef.current;
      try {
        const cart = await cartService.getCart();
        if (active && version === viewVersionRef.current) applyCart(cart);
      } catch {
        if (active && version === viewVersionRef.current) setCartError('Chưa thể tải giỏ hàng. Vui lòng thử lại.');
      } finally { if (active) setCartLoading(false); }
    };

    void loadCart();

    const unsubscribe = subscribeToApiAccessToken((token) => {
      if (!token && active) {
        mutationQueueRef.current.invalidate();
        setMutationPending(false);
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
    if (checkoutLockRef.current) {
      showToast('Vui lòng chờ hoàn tất bước xác nhận đơn hàng.');
      return false;
    }
    if (hasApiAccessToken()) return true;

    clearCartState();
    setIsCartOpen(false);
    showToast('Vui lòng đăng nhập để sử dụng giỏ hàng và đặt hàng.');
    return false;
  };

  const withCartLock = async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (checkoutLockRef.current) throw new Error('Giỏ hàng đang được xử lý.');
    checkoutLockRef.current = true;
    setCheckoutPending(true);
    try {
      await mutationQueueRef.current.whenIdle();
      return await operation();
    } finally {
      checkoutLockRef.current = false;
      setCheckoutPending(false);
    }
  };

  const synchronizePurchasedCart = (): void => {
    clearCartState();
    setIsCartOpen(false);
    // Refresh must not delay navigation or turn an already-created order into a failed checkout.
    void refreshCart().catch(() => {
      showToast('Đơn đã được tạo. Chưa thể tải lại giỏ hàng; vui lòng tải lại trang khi có kết nối.');
    });
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
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 1) return;
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
    isCartBusy: mutationPending || checkoutPending || cartLoading,
    cartLoading, cartError,
    withCartLock,
    synchronizePurchasedCart,
    refreshCart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    changeCartQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
