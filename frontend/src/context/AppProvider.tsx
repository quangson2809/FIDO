import React, { useEffect, useState, type ReactNode } from 'react';
import { cartService } from '../features/cart/api/service';
import type { CartDto } from '../features/cart/types';
import { resolveImageUrl } from '../services/media/imageUrl';
import type { CartItem, Order, OrderStatus, ScreenId, UserProfile } from '../types';
import { AppContext, type CartProductInput } from './AppContext';

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

const isRemoteCartItem = (itemId: string): boolean => /^\d+$/.test(itemId);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [selectedProductId, setSelectedProductId] = useState('1');
  const [selectedOrderId, setSelectedOrderId] = useState('1');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
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

  const refreshCart = async (): Promise<void> => {
    const cart = await cartService.getCart();
    setCartItems(toCartItems(cart));
  };

  useEffect(() => {
    let active = true;

    const loadCart = async () => {
      try {
        const cart = await cartService.getCart();
        if (active) {
          setCartItems(toCartItems(cart));
        }
      } catch {
        // Guest identity remains source-TBD. Do not invent a guest token/cookie here.
      }
    };

    void loadCart();
    return () => {
      active = false;
    };
  }, []);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    window.setTimeout(
      () => setToast((previous) => ({ ...previous, visible: false })),
      3200,
    );
  };

  const addLocalCartItem = (
    product: CartProductInput,
    size: string | number | undefined,
    color: string | undefined,
    quantity: number,
  ) => {
    const localId = `local-${product.id}-${String(size ?? '')}-${color ?? ''}`;
    setCartItems((current) => {
      const existing = current.find((item) => item.id === localId);
      if (existing) {
        return current.map((item) =>
          item.id === localId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [
        ...current,
        {
          id: localId,
          productId: product.id,
          name: product.name,
          sku: product.sku ?? '',
          price: product.price,
          imageUrl: product.imageUrl,
          size: size ?? '',
          color: color ?? '',
          quantity,
          fabricSummary: product.fabric ?? '',
        },
      ];
    });
  };

  const addToCart = (
    product: CartProductInput,
    size?: string | number,
    color?: string,
    quantity = 1,
  ) => {
    const normalizedQuantity = Math.max(1, quantity);
    const variants = product.variants ?? [];

    if (variants.length === 0) {
      addLocalCartItem(product, size, color, normalizedQuantity);
      showToast(`Đã thêm ${product.name} vào giỏ hàng`);
      return;
    }

    const selectedVariant = variants.find((variant) => {
      const sizeValue = String(size ?? '');
      const sizeMatches = !sizeValue
        || variant.size.display_name === sizeValue
        || variant.size.code === sizeValue;
      const colorMatches = !color
        || variant.color.name === color
        || variant.color.code === color;
      return sizeMatches && colorMatches;
    });

    if (!selectedVariant) {
      showToast('Không tìm thấy biến thể phù hợp với size/màu đã chọn.');
      return;
    }

    void cartService
      .addItem(selectedVariant.variant_id, normalizedQuantity)
      .then((cart) => {
        setCartItems(toCartItems(cart));
        showToast(`Đã thêm ${product.name} vào giỏ hàng`);
      })
      .catch(() => {
        showToast('Không thể cập nhật giỏ hàng.');
      });
  };

  const removeFromCart = (itemId: string) => {
    if (!isRemoteCartItem(itemId)) {
      setCartItems((current) => current.filter((item) => item.id !== itemId));
      return;
    }

    void cartService
      .removeItem(Number(itemId))
      .then((cart) => setCartItems(toCartItems(cart)))
      .catch(() => showToast('Không thể xóa sản phẩm khỏi giỏ hàng.'));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    if (!isRemoteCartItem(itemId)) {
      setCartItems((current) =>
        current.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
      );
      return;
    }

    void cartService
      .updateItem(Number(itemId), quantity)
      .then((cart) => setCartItems(toCartItems(cart)))
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
