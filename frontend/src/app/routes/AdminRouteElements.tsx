import { AdminVouchersView } from '../../screens/admin/AdminVouchersView';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../shared/ui/toast/useToast';
import { getAdminPath } from '../../routes/paths';
import {
  canAccessAdminModule,
  canWriteAdminModule,
  type AdminModuleKey,
} from '../../features/auth/session/adminAccessPolicy';
import { useAuthSession } from '../../features/auth/session/useAuthSession';
import { AdminAuditView } from '../../screens/admin/AdminAuditView';
import { AdminCatalogMetaView } from '../../screens/admin/AdminCatalogMetaView';
import { AdminCustomersView } from '../../screens/admin/AdminCustomersView';
import { AdminDashboardView } from '../../screens/admin/AdminDashboardView';
import { AdminInventoryView } from '../../screens/admin/AdminInventoryView';
import { AdminInwardView } from '../../screens/admin/AdminInwardView';
import { AdminOrderDetailView } from '../../screens/admin/AdminOrderDetailView';
import { AdminOrdersView } from '../../screens/admin/AdminOrdersView';
import { AdminProductDetailView } from '../../screens/admin/AdminProductDetailView';
import { AdminProductsView } from '../../screens/admin/AdminProductsView';
import { AdminReportsView } from '../../screens/admin/AdminReportsView';
import { AdminRolesView } from '../../screens/admin/AdminRolesView';
import { AdminSettingsView } from '../../screens/admin/AdminSettingsView';
import { AdminStaffView } from '../../screens/admin/AdminStaffView';
import { AdminSuppliersView } from '../../screens/admin/AdminSuppliersView';

const positiveInteger = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const useAdminRouteDeps = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const navigateTab = (key: string) => navigate(getAdminPath(key));
  return { navigate, navigateTab, showToast };
};

const useAdminWriteAccess = (moduleKey: AdminModuleKey): boolean => {
  const { profile, permissionCodes } = useAuthSession();
  return canWriteAdminModule(moduleKey, profile, permissionCodes);
};

const dashboardModuleKeys: readonly AdminModuleKey[] = [
  'orders',
  'products',
  'inventory',
  'inward',
  'customers',
  'staff',
  'audit',
  'reports',
];

export const AdminDashboardRoute = () => {
  const { navigateTab } = useAdminRouteDeps();
  const { profile, permissionCodes } = useAuthSession();
  const visibleModuleKeys = dashboardModuleKeys.filter((moduleKey) =>
    canAccessAdminModule(moduleKey, profile, permissionCodes),
  );

  return <AdminDashboardView onNavigateTab={navigateTab} visibleModuleKeys={visibleModuleKeys} />;
};

export const AdminProductsRoute = () => {
  const { navigate, navigateTab, showToast } = useAdminRouteDeps();
  const canWrite = useAdminWriteAccess('products');
  const openProduct = (productId: string) =>
    navigate(`/admin/products/${encodeURIComponent(productId)}`);

  return (
    <AdminProductsView
      onSelectProduct={openProduct}
      onEditProduct={openProduct}
      onNavigateTab={navigateTab}
      showToast={showToast}
      canWrite={canWrite}
    />
  );
};

export const AdminProductDetailRoute = () => {
  const { productId } = useParams<{ productId: string }>();
  const parsedProductId = positiveInteger(productId);
  const { navigateTab, showToast } = useAdminRouteDeps();
  const canWrite = useAdminWriteAccess('products');

  if (!parsedProductId) return <Navigate to="/admin/products" replace />;

  return (
    <AdminProductDetailView
      key={parsedProductId}
      productId={parsedProductId}
      onNavigateTab={navigateTab}
      showToast={showToast}
      canWrite={canWrite}
    />
  );
};

const AdminCatalogMetaRoute = ({
  tab,
}: {
  tab: 'categories' | 'brands' | 'sizes' | 'colors';
}) => {
  const { navigateTab, showToast } = useAdminRouteDeps();
  const canWrite = useAdminWriteAccess(tab);
  return (
    <AdminCatalogMetaView
      key={tab}
      initialTab={tab}
      onNavigateTab={navigateTab}
      showToast={showToast}
      canWrite={canWrite}
    />
  );
};

export const AdminCategoriesRoute = () => <AdminCatalogMetaRoute tab="categories" />;
export const AdminBrandsRoute = () => <AdminCatalogMetaRoute tab="brands" />;
export const AdminSizesRoute = () => <AdminCatalogMetaRoute tab="sizes" />;
export const AdminColorsRoute = () => <AdminCatalogMetaRoute tab="colors" />;

export const AdminOrdersRoute = () => {
  const { navigate } = useAdminRouteDeps();
  return <AdminOrdersView onSelectOrder={(orderId) => navigate(`/admin/orders/${orderId}`)} />;
};

export const AdminOrderDetailRoute = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const parsedOrderId = positiveInteger(orderId);
  const { navigate } = useAdminRouteDeps();

  if (!parsedOrderId) return <Navigate to="/admin/orders" replace />;
  return <AdminOrderDetailView key={parsedOrderId} orderId={parsedOrderId} onBack={() => navigate('/admin/orders')} />;
};

export const AdminInwardRoute = () => {
  const { navigateTab, showToast } = useAdminRouteDeps();
  const canWrite = useAdminWriteAccess('inward');
  return <AdminInwardView showToast={showToast} onNavigateTab={navigateTab} canWrite={canWrite} />;
};

export const AdminInventoryRoute = () => {
  const { showToast } = useAdminRouteDeps();
  const canWrite = useAdminWriteAccess('inventory');
  return <AdminInventoryView showToast={showToast} canWrite={canWrite} />;
};

export const AdminSuppliersRoute = () => {
  const { navigateTab, showToast } = useAdminRouteDeps();
  const canWrite = useAdminWriteAccess('suppliers');
  return <AdminSuppliersView showToast={showToast} onNavigateTab={navigateTab} canWrite={canWrite} />;
};

export const AdminCustomersRoute = () => {
  const { navigate, showToast } = useAdminRouteDeps();
  return (
    <AdminCustomersView
      onSelectCustomer={(customerId) => navigate(`/admin/customers/${customerId}`)}
      onCloseDetail={() => navigate('/admin/customers')}
      showToast={showToast}
    />
  );
};

export const AdminCustomerDetailRoute = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const parsedCustomerId = positiveInteger(customerId);
  const { navigate, showToast } = useAdminRouteDeps();

  if (!parsedCustomerId) return <Navigate to="/admin/customers" replace />;

  return (
    <AdminCustomersView
      initialCustomerId={parsedCustomerId}
      onSelectCustomer={(nextCustomerId) => navigate(`/admin/customers/${nextCustomerId}`)}
      onCloseDetail={() => navigate('/admin/customers')}
      showToast={showToast}
    />
  );
};

export const AdminStaffRoute = () => {
  const { showToast } = useAdminRouteDeps();
  return <AdminStaffView showToast={showToast} />;
};

export const AdminRolesRoute = () => {
  const { showToast } = useAdminRouteDeps();
  return <AdminRolesView showToast={showToast} />;
};

export const AdminAuditRoute = () => {
  const { showToast } = useAdminRouteDeps();
  return <AdminAuditView showToast={showToast} />;
};

export const AdminReportsRoute = () => {
  const { showToast } = useAdminRouteDeps();
  return <AdminReportsView showToast={showToast} />;
};

export const AdminContentRoute = () => {
  const { showToast } = useAdminRouteDeps();
  const canWrite = useAdminWriteAccess('content');
  return <AdminSettingsView showToast={showToast} canWrite={canWrite} />;
};

export const AdminVouchersRoute = () => {
  const { showToast } = useAdminRouteDeps();
  const canWrite = useAdminWriteAccess('vouchers');
  return <AdminVouchersView canWrite={canWrite} showToast={showToast} />;
};
