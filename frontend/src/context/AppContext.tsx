import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScreenId, CartItem, Order, OrderStatus, UserProfile } from '../types';
import { getPathForScreen, getScreenFromPath } from '../routes/paths';
import { mockUiCartItems, mockUiOrders, mockUiUserProfile, toUiProduct } from '../mocks/uiData';
import { mockProductDetails, mockVouchers } from '../mocks/apiData';

interface AppContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  selectedOrderId: string;
  setSelectedOrderId: (id: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartItems: CartItem[];
  addToCart: (product: any, size?: string | number, color?: string, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
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
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedProductIdState, setSelectedProductIdState] = useState<string>('101');
  const [selectedOrderIdState, setSelectedOrderIdState] = useState<string>('ORD-20260926-001');
  const selectedProductIdRef = useRef('101');
  const selectedOrderIdRef = useRef('ORD-20260926-001');

  const [isCartOpen, setIsCartOpenState] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(mockUiCartItems);
  const [appliedVoucher, setAppliedVoucher] = useState<string>('');
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [orders, setOrders] = useState<Order[]>(mockUiOrders);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(mockUiUserProfile);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

  const currentScreen = useMemo(
    () => getScreenFromPath(location.pathname),
    [location.pathname],
  );

  const setSelectedProductId = useCallback((id: string) => {
    selectedProductIdRef.current = id;
    setSelectedProductIdState(id);
  }, []);

  const setSelectedOrderId = useCallback((id: string) => {
    selectedOrderIdRef.current = id;
    setSelectedOrderIdState(id);
  }, []);

  const setIsCartOpen = useCallback((open: boolean) => {
    setIsCartOpenState(open);
  }, []);

  const setCurrentScreen = useCallback(
    (screen: ScreenId) => {
      if (screen === 'cart') {
        setIsCartOpenState(true);
        return;
      }

      navigate(
        getPathForScreen(
          screen,
          selectedProductIdRef.current,
          selectedOrderIdRef.current,
        ),
      );
    },
    [navigate],
  );

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3200);
  };

  const addToCart = (product: any, size?: string | number, color?: string, quantity: number = 1) => {
    const productId = Number(product.product_id ?? product.id);
    const source = mockProductDetails.find((item) => item.product_id === productId);
    if (!source) return;

    const variant =
      source.variants.find((item) =>
        (size == null || item.size.display_name === String(size)) &&
        (color == null || item.color.name === color),
      ) ?? source.variants[0];

    if (!variant) return;

    const uiProduct = toUiProduct(source);
    const existing = cartItems.find((item) =>
      item.productId === String(productId) &&
      String(item.size) === variant.size.display_name &&
      item.color === variant.color.name,
    );

    if (existing) {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, variant.available_quantity) }
            : item,
        ),
      );
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          id: `mock-${variant.variant_id}`,
          productId: String(productId),
          name: source.name,
          sku: variant.sku ?? '',
          price: variant.effective_price,
          imageUrl: uiProduct.imageUrl,
          size: variant.size.display_name,
          color: variant.color.name,
          quantity: Math.min(quantity, variant.available_quantity),
          fabricSummary: source.material_care ?? '',
          badge: source.sale_status,
        },
      ]);
    }

    showToast(`Đã thêm ${source.name} vào giỏ hàng mock`);
  };

  const removeFromCart = (itemId: string) =>
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));

  const updateCartQuantity = (itemId: string, quantity: number) => {
    setCartItems((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.id !== itemId)
        : prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  };

  const applyVoucher = (code: string): boolean => {
    const normalized = code.trim().toUpperCase();
    const exists = mockVouchers.some((voucher) => voucher.code === normalized);
    if (exists) {
      setAppliedVoucher(normalized);
      setVoucherDiscount(0);
    }
    return exists;
  };

  const removeVoucher = () => {
    setAppliedVoucher('');
    setVoucherDiscount(0);
  };

  const updateOrderRecipient = (orderId: string, phone: string, address: string, note?: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              customerPhone: phone,
              recipientAddress: address,
              deliveryNote: note,
              recipient: order.recipient
                ? { ...order.recipient, phone, address, note }
                : { fullName: order.customerName, phone, address, note },
              updatedAt: new Date().toISOString(),
            }
          : order,
      ),
    );
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status, updatedAt: new Date().toISOString() }
          : order,
      ),
    );
  };

  const createOrder = (orderData: Partial<Order>): Order => {
    const nextNumber = orders.length + 1;
    const now = new Date().toISOString();
    const created: Order = {
      ...orderData,
      id: orderData.id ?? `ORD-MOCK-${String(nextNumber).padStart(3, '0')}`,
      customerName: orderData.customerName ?? `Tài khoản #${userProfile.id}`,
      customerPhone: orderData.customerPhone ?? userProfile.phone,
      customerEmail: orderData.customerEmail ?? userProfile.email,
      recipientAddress: orderData.recipientAddress ?? userProfile.addresses[0]?.address ?? '',
      createdAt: orderData.createdAt ?? now,
      updatedAt: orderData.updatedAt ?? now,
      status: orderData.status ?? 'PENDING',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID_COD',
      paymentStatusLabel: 'Chưa thu COD',
      items: orderData.items ?? [],
      subtotal: orderData.subtotal ?? 0,
      voucherDiscount: 0,
      shippingFee: orderData.shippingFee ?? 0,
      total: orderData.total ?? orderData.subtotal ?? 0,
    };
    setOrders((prev) => [created, ...prev]);
    setCartItems([]);
    return created;
  };
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
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
        selectedProductId: selectedProductIdState,
        setSelectedProductId,
        selectedOrderId: selectedOrderIdState,
        setSelectedOrderId,
        isCartOpen,
        setIsCartOpen,
        cartItems,
        addToCart,
        removeFromCart,
        updateCartQuantity,
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

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
