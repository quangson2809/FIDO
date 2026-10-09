import { DirtyFormProvider } from '../../shared/admin/DirtyFormProvider';
import React, { Suspense, lazy, type ReactNode } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { Header } from '../../components/Header';
import { useAuthSession } from '../../features/auth/session/useAuthSession';
import { ADMIN_DETAIL_PATHS, ADMIN_PATHS, APP_PATHS, toAdminChildPath } from '../../routes/paths';

const HomeScreen = lazy(() => import('../../screens/HomeScreen').then((module) => ({ default: module.HomeScreen })));
const CatalogScreen = lazy(() => import('../../screens/CatalogScreen').then((module) => ({ default: module.CatalogScreen })));
const ProductDetailScreen = lazy(() => import('../../screens/ProductDetailScreen').then((module) => ({ default: module.ProductDetailScreen })));
const CheckoutScreen = lazy(() => import('../../screens/CheckoutScreen').then((module) => ({ default: module.CheckoutScreen })));
const OrderSuccessScreen = lazy(() => import('../../screens/OrderSuccessScreen').then((module) => ({ default: module.OrderSuccessScreen })));
const OrderDetailScreen = lazy(() => import('../../screens/OrderDetailScreen').then((module) => ({ default: module.OrderDetailScreen })));
const MyOrdersScreen = lazy(() => import('../../screens/MyOrdersScreen').then((module) => ({ default: module.MyOrdersScreen })));
const PolicyScreen = lazy(() => import('../../screens/PolicyScreen').then((module) => ({ default: module.PolicyScreen })));
const AuthScreen = lazy(() => import('../../screens/AuthScreen').then((module) => ({ default: module.AuthScreen })));
const ProfileScreen = lazy(() => import('../../screens/ProfileScreen').then((module) => ({ default: module.ProfileScreen })));
const CartDrawer = lazy(() => import('../../screens/CartDrawer').then((module) => ({ default: module.CartDrawer })));
const AdminScreen = lazy(() => import('../../screens/AdminScreen').then((module) => ({ default: module.AdminScreen })));

const AdminDashboardRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminDashboardRoute })));
const AdminProductsRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminProductsRoute })));
const AdminProductDetailRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminProductDetailRoute })));
const AdminCategoriesRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminCategoriesRoute })));
const AdminBrandsRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminBrandsRoute })));
const AdminSizesRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminSizesRoute })));
const AdminColorsRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminColorsRoute })));
const AdminOrdersRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminOrdersRoute })));
const AdminOrderDetailRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminOrderDetailRoute })));
const AdminInwardRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminInwardRoute })));
const AdminInventoryRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminInventoryRoute })));
const AdminSuppliersRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminSuppliersRoute })));
const AdminCustomersRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminCustomersRoute })));
const AdminCustomerDetailRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminCustomerDetailRoute })));
const AdminStaffRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminStaffRoute })));
const AdminRolesRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminRolesRoute })));
const AdminAuditRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminAuditRoute })));
const AdminReportsRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminReportsRoute })));
const AdminContentRoute = lazy(() => import('./AdminRouteElements').then((module) => ({ default: module.AdminContentRoute })));

export const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center bg-[#FAF9F5] text-sm text-[#687069]">
    Đang tải giao diện...
  </div>
);

const StorefrontLayout: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-[#FAF9F5] text-[#0B2419]">
    <Header />
    <main className="flex-1 pb-8"><Outlet /></main>
    <CartDrawer />
    <Footer />
  </div>
);

const RequireAuthenticated: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { status, isAuthenticated } = useAuthSession();
  const location = useLocation();

  if (status === 'checking') return <RouteFallback />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to={APP_PATHS.auth}
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

  if (!isAuthenticated) return <Navigate to={APP_PATHS.adminLogin} replace />;
  if (!isAdmin) return <Navigate to={APP_PATHS.profile} replace />;

  return <>{children}</>;
};

const AdminRoute: React.FC = () => (
  <div className="min-h-screen bg-[#071911] text-[#0B2419]">
    <DirtyFormProvider><AdminScreen /></DirtyFormProvider>
  </div>
);

const AdminLoginRoute: React.FC = () => (
  <div className="min-h-screen bg-[#071A12]">
    <AuthScreen adminOnly />
  </div>
);

export const AppRoutes: React.FC = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route path={APP_PATHS.home} element={<HomeScreen />} />
        <Route path={APP_PATHS.catalog} element={<CatalogScreen />} />
        <Route path={APP_PATHS.productDetail} element={<ProductDetailScreen />} />
        <Route path={APP_PATHS.policy} element={<PolicyScreen />} />
        <Route path={APP_PATHS.auth} element={<AuthScreen />} />

        <Route path={APP_PATHS.checkout} element={<RequireAuthenticated><CheckoutScreen /></RequireAuthenticated>} />
        <Route path={APP_PATHS.checkoutSuccessDetail} element={<RequireAuthenticated><OrderSuccessScreen /></RequireAuthenticated>} />
        <Route path={APP_PATHS.checkoutSuccess} element={<Navigate to={APP_PATHS.myOrders} replace />} />
        <Route path={APP_PATHS.myOrders} element={<RequireAuthenticated><MyOrdersScreen /></RequireAuthenticated>} />
        <Route path={APP_PATHS.orderDetail} element={<RequireAuthenticated><OrderDetailScreen /></RequireAuthenticated>} />
        <Route path={APP_PATHS.profile} element={<RequireAuthenticated><ProfileScreen /></RequireAuthenticated>} />

        <Route path={APP_PATHS.showrooms} element={<Navigate to={APP_PATHS.home} replace />} />
      </Route>

      <Route path={APP_PATHS.adminLogin} element={<AdminLoginRoute />} />
      <Route path={APP_PATHS.adminRoot} element={<RequireAdmin><AdminRoute /></RequireAdmin>}>
        <Route index element={<Navigate to={APP_PATHS.admin} replace />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.dashboard)} element={<AdminDashboardRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.products)} element={<AdminProductsRoute />} />
        <Route path={toAdminChildPath(ADMIN_DETAIL_PATHS.product)} element={<AdminProductDetailRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.categories)} element={<AdminCategoriesRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.brands)} element={<AdminBrandsRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.sizes)} element={<AdminSizesRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.colors)} element={<AdminColorsRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.orders)} element={<AdminOrdersRoute />} />
        <Route path={toAdminChildPath(ADMIN_DETAIL_PATHS.order)} element={<AdminOrderDetailRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.inward)} element={<AdminInwardRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.inventory)} element={<AdminInventoryRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.history)} element={<AdminInventoryRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.suppliers)} element={<AdminSuppliersRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.customers)} element={<AdminCustomersRoute />} />
        <Route path={toAdminChildPath(ADMIN_DETAIL_PATHS.customer)} element={<AdminCustomerDetailRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.staff)} element={<AdminStaffRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.roles)} element={<AdminRolesRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.audit)} element={<AdminAuditRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.reports)} element={<AdminReportsRoute />} />
        <Route path={toAdminChildPath(ADMIN_PATHS.content)} element={<AdminContentRoute />} />

        <Route path="products/detail" element={<Navigate to={ADMIN_PATHS.products} replace />} />
        <Route path="orders/detail" element={<Navigate to={ADMIN_PATHS.orders} replace />} />
        <Route path="orders/tailoring" element={<Navigate to={ADMIN_PATHS.orders} replace />} />
        <Route path="customers/detail" element={<Navigate to={ADMIN_PATHS.customers} replace />} />
        <Route path="vouchers" element={<Navigate to={APP_PATHS.admin} replace />} />
        <Route path="settings" element={<Navigate to={ADMIN_PATHS.content} replace />} />
        <Route path="*" element={<Navigate to={APP_PATHS.admin} replace />} />
      </Route>

      <Route path="*" element={<Navigate to={APP_PATHS.home} replace />} />
    </Routes>
  </Suspense>
);
