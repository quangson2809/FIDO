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
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedProductIdState, setSelectedProductIdState] = useState<string>('1');
  const [selectedOrderIdState, setSelectedOrderIdState] = useState<string>('1');
  const selectedProductIdRef = useRef('1');
  const selectedOrderIdRef = useRef('1');

  const [isCartOpen, setIsCartOpenState] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [freeHemming, setFreeHemming] = useState<boolean>(true);
  const [hemmingNote, setHemmingNote] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<string>('');
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
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
    // Implementation placeholder
    void size;
    void color;
    void quantity;
    showToast(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  const removeFromCart = (itemId: string) =>
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));

  const updateCartQuantity = (itemId: string, quantity: number) => {
    void itemId;
    void quantity;
  };

  const applyVoucher = (code: string): boolean => {
    void code;
    return true;
  };

  const removeVoucher = () => {};
  const updateOrderRecipient = (orderId: string, phone: string, address: string, note?: string) => {
    void orderId;
    void phone;
    void address;
    void note;
  };
  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    void orderId;
    void status;
  };
  const createOrder = (orderData: Partial<Order>): Order => {
    void orderData;
    return {} as Order;
  };
  const toggleWishlist = (productId: string) => {
    void productId;
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

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
