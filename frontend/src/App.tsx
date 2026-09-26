import React, { useEffect } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
} from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './screens/CartDrawer';
import { HomeScreen } from './screens/HomeScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { OrderSuccessScreen } from './screens/OrderSuccessScreen';
import { OrderDetailScreen } from './screens/OrderDetailScreen';
import { MyOrdersScreen } from './screens/MyOrdersScreen';
import { PolicyScreen } from './screens/PolicyScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ShowroomsScreen } from './screens/ShowroomsScreen';
import { AdminScreen } from './screens/AdminScreen';
import { AdminLoginScreen } from './screens/AdminLoginScreen';

const Toast: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className={`fixed right-4 sm:right-8 z-[70] ${compact ? 'bottom-6' : 'bottom-8'}`}>
      <div className="bg-[#0B2419] text-white px-5 py-3 shadow-2xl border border-[#E8C75B]/30 flex items-center gap-3 rounded-lg">
        <span className="material-symbols-outlined text-[#E8C75B] text-xl">info</span>
        <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
      </div>
    </div>
  );
};

const StorefrontLayout: React.FC = () => (
  <div className="flex flex-col min-h-screen bg-[#FAF9F5] text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#0B2419] selection:text-[#E8C75B]">
    <Header />
    <main className="flex-1">
      <Outlet />
    </main>
    <CartDrawer />
    <Footer />
    <Toast />
  </div>
);

const ProductDetailRoute: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { selectedProductId, setSelectedProductId } = useApp();

  useEffect(() => {
    if (productId && productId !== selectedProductId) {
      setSelectedProductId(productId);
    }
  }, [productId, selectedProductId, setSelectedProductId]);

  if (productId && productId !== selectedProductId) return null;
  return <ProductDetailScreen />;
};

const OrderDetailRoute: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { selectedOrderId, setSelectedOrderId } = useApp();

  useEffect(() => {
    if (orderId && orderId !== selectedOrderId) {
      setSelectedOrderId(orderId);
    }
  }, [orderId, selectedOrderId, setSelectedOrderId]);

  if (orderId && orderId !== selectedOrderId) return null;
  return <OrderDetailScreen />;
};

const AdminLoginRoute: React.FC = () => (
  <div className="min-h-screen bg-[#071710] font-['Plus_Jakarta_Sans',sans-serif]">
    <AdminLoginScreen />
    <Toast compact />
  </div>
);

const AdminRoute: React.FC = () => (
  <div className="min-h-screen bg-[#071911] text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#0B2419] selection:text-[#E8C75B]">
    <AdminScreen />
    <Toast />
  </div>
);

const AppRoutes: React.FC = () => (
  <Routes>
    <Route element={<StorefrontLayout />}>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/products" element={<CatalogScreen />} />
      <Route path="/products/:productId" element={<ProductDetailRoute />} />
      <Route path="/checkout" element={<CheckoutScreen />} />
      <Route path="/checkout/success" element={<OrderSuccessScreen />} />
      <Route path="/orders" element={<MyOrdersScreen />} />
      <Route path="/orders/:orderId" element={<OrderDetailRoute />} />
      <Route path="/policies" element={<PolicyScreen />} />
      <Route path="/login" element={<AuthScreen />} />
      <Route path="/account" element={<ProfileScreen />} />
      <Route path="/showrooms" element={<ShowroomsScreen />} />
    </Route>

    <Route path="/admin/login" element={<AdminLoginRoute />} />
    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
    <Route path="/admin/*" element={<AdminRoute />} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
