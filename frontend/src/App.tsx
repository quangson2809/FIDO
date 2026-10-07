import React, { Suspense, lazy, type ReactNode } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AppProvider } from './context/AppProvider';
import { useApp } from './context/AppContext';
import { AuthSessionProvider, useAuthSession } from './features/auth/session/AuthSessionContext';

const HomeScreen = lazy(() => import('./screens/HomeScreen').then((module) => ({ default: module.HomeScreen })));
const CatalogScreen = lazy(() => import('./screens/CatalogScreen').then((module) => ({ default: module.CatalogScreen })));
const ProductDetailScreen = lazy(() => import('./screens/ProductDetailScreen').then((module) => ({ default: module.ProductDetailScreen })));
const CheckoutScreen = lazy(() => import('./screens/CheckoutScreen').then((module) => ({ default: module.CheckoutScreen })));
const OrderSuccessScreen = lazy(() => import('./screens/OrderSuccessScreen').then((module) => ({ default: module.OrderSuccessScreen })));
const OrderDetailScreen = lazy(() => import('./screens/OrderDetailScreen').then((module) => ({ default: module.OrderDetailScreen })));
const MyOrdersScreen = lazy(() => import('./screens/MyOrdersScreen').then((module) => ({ default: module.MyOrdersScreen })));
const PolicyScreen = lazy(() => import('./screens/PolicyScreen').then((module) => ({ default: module.PolicyScreen })));
const AuthScreen = lazy(() => import('./screens/AuthScreen').then((module) => ({ default: module.AuthScreen })));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then((module) => ({ default: module.ProfileScreen })));
const CartDrawer = lazy(() => import('./screens/CartDrawer').then((module) => ({ default: module.CartDrawer })));
const AdminScreen = lazy(() => import('./screens/AdminScreen').then((module) => ({ default: module.AdminScreen })));

const adminRoute = <K extends keyof typeof import('./app/routes/AdminRouteElements')>(name: K) =>
  lazy(() => import('./app/routes/AdminRouteElements').then((module) => ({ default: module[name] })));

const AdminDashboardRoute = adminRoute('AdminDashboardRoute');
const AdminProductsRoute = adminRoute('AdminProductsRoute');
const AdminProductDetailRoute = adminRoute('AdminProductDetailRoute');
const AdminCategoriesRoute = adminRoute('AdminCategoriesRoute');
const AdminBrandsRoute = adminRoute('AdminBrandsRoute');
const AdminSizesRoute = adminRoute('AdminSizesRoute');
const AdminColorsRoute = adminRoute('AdminColorsRoute');
const AdminOrdersRoute = adminRoute('AdminOrdersRoute');
const AdminOrderDetailRoute = adminRoute('AdminOrderDetailRoute');
const AdminInwardRoute = adminRoute('AdminInwardRoute');
const AdminInventoryRoute = adminRoute('AdminInventoryRoute');
const AdminSuppliersRoute = adminRoute('AdminSuppliersRoute');
const AdminCustomersRoute = adminRoute('AdminCustomersRoute');
const AdminCustomerDetailRoute = adminRoute('AdminCustomerDetailRoute');
const AdminStaffRoute = adminRoute('AdminStaffRoute');
const AdminRolesRoute = adminRoute('AdminRolesRoute');
const AdminAuditRoute = adminRoute('AdminAuditRoute');
const AdminReportsRoute = adminRoute('AdminReportsRoute');
const AdminContentRoute = adminRoute('AdminContentRoute');

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center bg-[#FAF9F5] text-sm text-[#687069]">
    Đang tải giao diện...
  </div>
);

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

const RequireAuthenticated: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { status, isAuthenticated } = useAuthSession();
  const location = useLocation();

  if (status === 'checking') return <RouteFallback />;
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <>{children}</>;
};

const RequireAdmin: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { status, isAuthenticated, isAdmin } = useAuthSession();

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071A12] text-sm text-white/70">
        Đang kiểm tra quyền quản trị...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/account" replace />;
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
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/products" element={<CatalogScreen />} />
        <Route path="/products/:productId" element={<ProductDetailScreen />} />
        <Route path="/policies" element={<PolicyScreen />} />
        <Route path="/login" element={<AuthScreen />} />

        <Route path="/checkout" element={<RequireAuthenticated><CheckoutScreen /></RequireAuthenticated>} />
        <Route path="/checkout/success/:orderId" element={<RequireAuthenticated><OrderSuccessScreen /></RequireAuthenticated>} />
        <Route path="/checkout/success" element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<RequireAuthenticated><MyOrdersScreen /></RequireAuthenticated>} />
        <Route path="/orders/:orderId" element={<RequireAuthenticated><OrderDetailScreen /></RequireAuthenticated>} />
        <Route path="/account" element={<RequireAuthenticated><ProfileScreen /></RequireAuthenticated>} />

        <Route path="/showrooms" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginRoute />} />
      <Route path="/admin" element={<RequireAdmin><AdminRoute /></RequireAdmin>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardRoute />} />
        <Route path="products" element={<AdminProductsRoute />} />
        <Route path="products/:productId" element={<AdminProductDetailRoute />} />
        <Route path="catalog/categories" element={<AdminCategoriesRoute />} />
        <Route path="catalog/brands" element={<AdminBrandsRoute />} />
        <Route path="catalog/sizes" element={<AdminSizesRoute />} />
        <Route path="catalog/colors" element={<AdminColorsRoute />} />
        <Route path="orders" element={<AdminOrdersRoute />} />
        <Route path="orders/:orderId" element={<AdminOrderDetailRoute />} />
        <Route path="goods-receipts" element={<AdminInwardRoute />} />
        <Route path="inventory" element={<AdminInventoryRoute />} />
        <Route path="inventory/history" element={<AdminInventoryRoute />} />
        <Route path="suppliers" element={<AdminSuppliersRoute />} />
        <Route path="customers" element={<AdminCustomersRoute />} />
        <Route path="customers/:customerId" element={<AdminCustomerDetailRoute />} />
        <Route path="staff" element={<AdminStaffRoute />} />
        <Route path="roles" element={<AdminRolesRoute />} />
        <Route path="audit" element={<AdminAuditRoute />} />
        <Route path="reports" element={<AdminReportsRoute />} />
        <Route path="content" element={<AdminContentRoute />} />

        <Route path="products/detail" element={<Navigate to="/admin/products" replace />} />
        <Route path="orders/detail" element={<Navigate to="/admin/orders" replace />} />
        <Route path="orders/tailoring" element={<Navigate to="/admin/orders" replace />} />
        <Route path="customers/detail" element={<Navigate to="/admin/customers" replace />} />
        <Route path="vouchers" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="settings" element={<Navigate to="/admin/content" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default function App() {
  return (
    <AuthSessionProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </AuthSessionProvider>
  );
}
