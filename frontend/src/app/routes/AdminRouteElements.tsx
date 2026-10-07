import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getAdminPath } from '../../routes/paths';
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
  const { showToast } = useApp();
  const navigateTab = (key: string) => navigate(getAdminPath(key));
  return { navigate, navigateTab, showToast };
};

export const AdminDashboardRoute = () => {
  const { navigateTab, showToast } = useAdminRouteDeps();
  return <AdminDashboardView onNavigateTab={navigateTab} showToast={showToast} />;
};

export const AdminProductsRoute = () => {
  const { navigate, navigateTab, showToast } = useAdminRouteDeps();
  const openProduct = (productId: string) =>
    navigate(`/admin/products/${encodeURIComponent(productId)}`);

  return (
    <AdminProductsView
      onSelectProduct={openProduct}
      onEditProduct={openProduct}
      onNavigateTab={navigateTab}
      showToast={showToast}
    />
  );
};

export const AdminProductDetailRoute = () => {
  const { productId } = useParams<{ productId: string }>();
  const parsedProductId = positiveInteger(productId);
  const { navigateTab, showToast } = useAdminRouteDeps();

  if (!parsedProductId) return <Navigate to="/admin/products" replace />;

  return (
    <AdminProductDetailView
      productId={parsedProductId}
      onNavigateTab={navigateTab}
      showToast={showToast}
    />
  );
};

const AdminCatalogMetaRoute = ({
  tab,
}: {
  tab: 'categories' | 'brands' | 'sizes' | 'colors';
}) => {
  const { navigateTab, showToast } = useAdminRouteDeps();
  return (
    <AdminCatalogMetaView
      key={tab}
      initialTab={tab}
      onNavigateTab={navigateTab}
      showToast={showToast}
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
  return <AdminOrderDetailView orderId={parsedOrderId} onBack={() => navigate('/admin/orders')} />;
};

export const AdminInwardRoute = () => {
  const { navigateTab, showToast } = useAdminRouteDeps();
  return <AdminInwardView showToast={showToast} onNavigateTab={navigateTab} />;
};

export const AdminInventoryRoute = () => {
  const { showToast } = useAdminRouteDeps();
  return <AdminInventoryView showToast={showToast} />;
};

export const AdminSuppliersRoute = () => {
  const { navigateTab, showToast } = useAdminRouteDeps();
  return <AdminSuppliersView showToast={showToast} onNavigateTab={navigateTab} />;
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
  return <AdminSettingsView showToast={showToast} />;
};
