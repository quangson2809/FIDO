import React, { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { AppProvider } from './context/AppProvider';
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
import { AdminScreen } from './screens/AdminScreen';
import { profileService } from './features/auth/api/profileService';
import { hasApiAccessToken } from './services/http/apiClient';

const Toast: React.FC = () => {
  const { toastMessage } = useApp();
  if (!toastMessage) return null;
  return (
    <div className="fixed bottom-6 right-4 z-[70] sm:right-8">
      <div className="flex items-center gap-3 border border-[#E8C75B]/30 bg-[#0B2419] px-5 py-3 text-white shadow-2xl">
        <span className="material-symbols-outlined text-xl text-[#E8C75B]">info</span>
        <span className="text-xs font-medium sm:text-sm">{toastMessage}</span>
      </div>
    </div>
  );
};

const StorefrontLayout: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-[#FAF9F5] text-[#0B2419]">
    <Header />
    <main className="flex-1 pb-8"><Outlet /></main>
    <CartDrawer />
    <Footer />
    <Toast />
  </div>
);

const ProductDetailRoute: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { selectedProductId, setSelectedProductId } = useApp();

  useEffect(() => {
    if (productId && productId !== selectedProductId) setSelectedProductId(productId);
  }, [productId, selectedProductId, setSelectedProductId]);

  if (!productId) return <Navigate to="/products" replace />;
  if (productId !== selectedProductId) return null;
  return <ProductDetailScreen />;
};

const OrderDetailRoute: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { selectedOrderId, setSelectedOrderId } = useApp();

  useEffect(() => {
    if (orderId && orderId !== selectedOrderId) setSelectedOrderId(orderId);
  }, [orderId, selectedOrderId, setSelectedOrderId]);

  if (!orderId) return <Navigate to="/orders" replace />;
  if (orderId !== selectedOrderId) return null;
  return <OrderDetailScreen />;
};

const RequireAuthenticated: React.FC<{ children: ReactNode }> = ({ children }) => (
  hasApiAccessToken() ? <>{children}</> : <Navigate to="/login" replace />
);

type AdminAccessState = 'checking' | 'allowed' | 'forbidden' | 'unauthenticated';

const RequireAdmin: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AdminAccessState>(
    hasApiAccessToken() ? 'checking' : 'unauthenticated',
  );

  useEffect(() => {
    if (!hasApiAccessToken()) return undefined;

    let active = true;
    void profileService.getMe()
      .then((me) => {
        if (!active) return;
        const allowed = me.roles.some((role) => role.code === 'ADMIN' || role.code === 'SUPERADMIN');
        setState(allowed ? 'allowed' : 'forbidden');
      })
      .catch(() => {
        if (active) setState('unauthenticated');
      });

    return () => { active = false; };
  }, []);

  if (state === 'unauthenticated') return <Navigate to="/admin/login" replace />;
  if (state === 'forbidden') return <Navigate to="/account" replace />;
  if (state === 'checking') {
    return <div className="flex min-h-screen items-center justify-center bg-[#071A12] text-sm text-white/70">Đang kiểm tra quyền quản trị...</div>;
  }
  return <>{children}</>;
};

const AdminRoute: React.FC = () => (
  <div className="min-h-screen bg-[#071911] text-[#0B2419]">
    <AdminScreen />
    <Toast />
  </div>
);

const AdminLoginRoute: React.FC = () => (
  <div className="min-h-screen bg-[#071A12]">
    <AuthScreen adminOnly />
    <Toast />
  </div>
);

const AppRoutes: React.FC = () => (
  <Routes>
    <Route element={<StorefrontLayout />}>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/products" element={<CatalogScreen />} />
      <Route path="/products/:productId" element={<ProductDetailRoute />} />
      <Route path="/policies" element={<PolicyScreen />} />
      <Route path="/login" element={<AuthScreen />} />

      <Route path="/checkout" element={<RequireAuthenticated><CheckoutScreen /></RequireAuthenticated>} />
      <Route path="/checkout/success" element={<RequireAuthenticated><OrderSuccessScreen /></RequireAuthenticated>} />
      <Route path="/orders" element={<RequireAuthenticated><MyOrdersScreen /></RequireAuthenticated>} />
      <Route path="/orders/:orderId" element={<RequireAuthenticated><OrderDetailRoute /></RequireAuthenticated>} />
      <Route path="/account" element={<RequireAuthenticated><ProfileScreen /></RequireAuthenticated>} />

      {/* The old showroom page contained business data that is not backed by the current API. */}
      <Route path="/showrooms" element={<Navigate to="/" replace />} />
    </Route>

    <Route path="/admin/login" element={<AdminLoginRoute />} />
    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

    {/* Legacy state-based detail URLs now redirect to stable resource URLs. */}
    <Route path="/admin/products/detail" element={<Navigate to="/admin/products" replace />} />
    <Route path="/admin/orders/detail" element={<Navigate to="/admin/orders" replace />} />
    <Route path="/admin/customers/detail" element={<Navigate to="/admin/customers" replace />} />
    <Route path="/admin/orders/tailoring" element={<Navigate to="/admin/orders" replace />} />
    <Route path="/admin/vouchers" element={<Navigate to="/admin/dashboard" replace />} />

    <Route path="/admin/*" element={<RequireAdmin><AdminRoute /></RequireAdmin>} />
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
