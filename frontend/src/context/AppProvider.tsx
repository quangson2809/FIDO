import React, { useEffect, useState, type ReactNode } from 'react';
import { cartService } from '../features/cart/api/service';
import type { CartDto } from '../features/cart/types';
import { hasApiAccessToken } from '../services/http/apiClient';
import { resolveImageUrl } from '../services/media/imageUrl';
import type { CartItem, Order, OrderStatus, ScreenId, UserProfile } from '../types';
import { AppContext } from './AppContext';

const toCartItems = (cart: CartDto): CartItem[] =>
  cart.items.map((item) => ({
    id: String(item.cart_item_id),
    productId: '',
    name: item.product_name,
    sku: String(item.variant_id),
    price: item.unit_price,
    imageUrl: resolveImageUrl(item.image_url) ?? '',
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    fabricSummary: '',
  }));

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [selectedProductId, setSelectedProductId] = useState('1');
  const [selectedOrderId, setSelectedOrderId] = useState('1');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [freeHemming, setFreeHemming] = useState(true);
  const [hemmingNote, setHemmingNote] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '1',
    fullName: 'Nguyễn Văn A',
    name: 'Nguyễn Văn A',
    phone: '',
    email: 'user@fido.com',
    tier: 'ATELIER PRIVILEGE VIP',
    tierPoints: 24500,
    nextTierPoints: 30000,
    avatarInitials: 'NA',
    joinedDate: '2024',
    addresses: [],
  });
  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    window.setTimeout(
      () => setToast((previous) => ({ ...previous, visible: false })),
      3200,
    );
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
    return () => {
      active = false;
    };
  }, []);

  const addToCart = (variantId: number, productName: string, quantity = 1) => {
    if (!requireCartAuthentication()) return;

    const normalizedQuantity = Math.max(1, quantity);
    void cartService
      .addItem(variantId, normalizedQuantity)
      .then((cart) => {
        applyCart(cart);
        setIsCartOpen(true);
        showToast(`Đã thêm ${productName} vào giỏ hàng`);
      })
      .catch(() => {
        showToast('Không thể cập nhật giỏ hàng. Vui lòng thử lại.');
      });
  };

  const removeFromCart = (itemId: string) => {
    if (!requireCartAuthentication()) return;

    void cartService
      .removeItem(Number(itemId))
      .then(applyCart)
      .catch(() => showToast('Không thể xóa sản phẩm khỏi giỏ hàng.'));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (!requireCartAuthentication()) return;

    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    void cartService
      .updateItem(Number(itemId), quantity)
      .then(applyCart)
      .catch(() => showToast('Không thể cập nhật số lượng giỏ hàng.'));
  };

  const applyVoucher = (code: string): boolean => {
    const normalized = code.trim();
    if (!normalized) return false;
    setAppliedVoucher(normalized);
    setVoucherDiscount(0);
    return true;
  };

  const removeVoucher = () => {
    setAppliedVoucher('');
    setVoucherDiscount(0);
  };

  const updateOrderRecipient = (
    orderId: string,
    phone: string,
    address: string,
    note?: string,
  ) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              customerPhone: phone,
              recipientAddress: address,
              deliveryNote: note,
              recipient: order.recipient
                ? { ...order.recipient, phone, address, note }
                : order.recipient,
            }
          : order,
      ),
    );
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
  };

  const createOrder = (orderData: Partial<Order>): Order => {
    const now = new Date().toISOString();
    const created: Order = {
      id: orderData.id ?? `ORD-${Date.now()}`,
      customerName: orderData.customerName ?? userProfile.fullName,
      customerPhone: orderData.customerPhone ?? userProfile.phone,
      customerEmail: orderData.customerEmail ?? userProfile.email,
      recipientAddress: orderData.recipientAddress ?? '',
      createdAt: orderData.createdAt ?? now,
      updatedAt: orderData.updatedAt ?? now,
      status: orderData.status ?? 'PENDING',
      paymentMethod: orderData.paymentMethod ?? 'COD',
      paymentStatus: orderData.paymentStatus ?? 'UNPAID_COD',
      paymentStatusLabel: orderData.paymentStatusLabel ?? 'Chưa thu COD',
      items: orderData.items ?? [],
      subtotal: orderData.subtotal ?? 0,
      shippingFee: orderData.shippingFee ?? 0,
      total: orderData.total ?? 0,
      ...orderData,
    };
    setOrders((current) => [created, ...current]);
    return created;
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const updateUserProfile = (
    dataOrPhone: Partial<UserProfile> | string,
    email?: string,
  ) => {
    setUserProfile((profile) =>
      typeof dataOrPhone === 'string'
        ? { ...profile, phone: dataOrPhone, ...(email ? { email } : {}) }
        : { ...profile, ...dataOrPhone },
    );
  };

  return (
    <AppContext.Provider
      value={{
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
        freeHemming,
        setFreeHemming,
        hemmingNote,
        setHemmingNote,
        appliedVoucher,
        voucherDiscount,
        applyVoucher,
        removeVoucher,
        orders,
        updateOrderRecipient,
        updateOrderStatus,
        createOrder,
        wishlist,
        toggleWishlist,
        userProfile,
        updateUserProfile,
        toast,
        toastMessage: toast.visible ? toast.message : null,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
