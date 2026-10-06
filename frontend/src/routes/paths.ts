import type { ScreenId } from '../types';

export const APP_PATHS = {
  home: '/',
  catalog: '/products',
  checkout: '/checkout',
  orderSuccess: '/checkout/success',
  myOrders: '/orders',
  policy: '/policies',
  auth: '/login',
  profile: '/account',
  adminLogin: '/admin/login',
  admin: '/admin/dashboard',
} as const;

export const ADMIN_PATHS: Record<string, string> = {
  dashboard: '/admin/dashboard',
  products: '/admin/products',
  categories: '/admin/catalog/categories',
  brands: '/admin/catalog/brands',
  sizes: '/admin/catalog/sizes',
  colors: '/admin/catalog/colors',
  orders: '/admin/orders',
  inward: '/admin/goods-receipts',
  inventory: '/admin/inventory',
  history: '/admin/inventory/history',
  suppliers: '/admin/suppliers',
  customers: '/admin/customers',
  staff: '/admin/staff',
  roles: '/admin/roles',
  audit: '/admin/audit',
  reports: '/admin/reports',
  content: '/admin/content',
  settings: '/admin/settings',
};

export interface AdminRouteResolution {
  menuKey: string;
  breadcrumb: string;
  productId?: string;
  orderId?: number;
  customerId?: number;
}

export const getPathForScreen = (
  screen: ScreenId,
  selectedProductId = '',
  selectedOrderId = '',
): string => {
  switch (screen) {
    case 'home':
      return APP_PATHS.home;
    case 'catalog':
      return APP_PATHS.catalog;
    case 'product-detail':
      return selectedProductId
        ? `/products/${encodeURIComponent(selectedProductId)}`
        : APP_PATHS.catalog;
    case 'checkout':
      return APP_PATHS.checkout;
    case 'order-success':
      return APP_PATHS.orderSuccess;
    case 'order-detail':
      return selectedOrderId
        ? `/orders/${encodeURIComponent(selectedOrderId)}`
        : APP_PATHS.myOrders;
    case 'my-orders':
      return APP_PATHS.myOrders;
    case 'policy':
      return APP_PATHS.policy;
    case 'auth':
      return APP_PATHS.auth;
    case 'profile':
      return APP_PATHS.profile;
    case 'admin':
      return APP_PATHS.admin;
    case 'cart':
    default:
      return APP_PATHS.home;
  }
};

export const getScreenFromPath = (pathname: string): ScreenId => {
  if (pathname.startsWith('/admin')) return 'admin';
  if (/^\/products\/[^/]+\/?$/.test(pathname)) return 'product-detail';
  if (pathname === APP_PATHS.catalog) return 'catalog';
  if (pathname === APP_PATHS.orderSuccess) return 'order-success';
  if (pathname === APP_PATHS.checkout) return 'checkout';
  if (/^\/orders\/[^/]+\/?$/.test(pathname)) return 'order-detail';
  if (pathname === APP_PATHS.myOrders) return 'my-orders';
  if (pathname === APP_PATHS.policy) return 'policy';
  if (pathname === APP_PATHS.auth || pathname === APP_PATHS.adminLogin) return 'auth';
  if (pathname === APP_PATHS.profile) return 'profile';
  return 'home';
};

export const getAdminPath = (menuKey: string): string =>
  ADMIN_PATHS[menuKey] ?? APP_PATHS.admin;

const positiveInteger = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const resolveAdminRoute = (pathname: string): AdminRouteResolution => {
  const productMatch = pathname.match(/^\/admin\/products\/([^/]+)\/?$/);
  if (productMatch && productMatch[1] !== 'detail') {
    return {
      menuKey: 'product-detail',
      breadcrumb: 'Chi tiết sản phẩm',
      productId: decodeURIComponent(productMatch[1]),
    };
  }

  const orderMatch = pathname.match(/^\/admin\/orders\/([^/]+)\/?$/);
  if (orderMatch && orderMatch[1] !== 'detail' && orderMatch[1] !== 'tailoring') {
    return {
      menuKey: 'order-detail',
      breadcrumb: 'Chi tiết đơn hàng',
      orderId: positiveInteger(orderMatch[1]),
    };
  }

  const customerMatch = pathname.match(/^\/admin\/customers\/([^/]+)\/?$/);
  if (customerMatch && customerMatch[1] !== 'detail') {
    return {
      menuKey: 'customer-detail',
      breadcrumb: 'Chi tiết khách hàng',
      customerId: positiveInteger(customerMatch[1]),
    };
  }

  if (pathname === '/admin/products') return { menuKey: 'products', breadcrumb: 'Sản phẩm' };
  if (pathname === '/admin/catalog/categories') return { menuKey: 'categories', breadcrumb: 'Danh mục' };
  if (pathname === '/admin/catalog/brands') return { menuKey: 'brands', breadcrumb: 'Thương hiệu' };
  if (pathname === '/admin/catalog/sizes') return { menuKey: 'sizes', breadcrumb: 'Hệ size' };
  if (pathname === '/admin/catalog/colors') return { menuKey: 'colors', breadcrumb: 'Màu sắc' };
  if (pathname === '/admin/orders') return { menuKey: 'orders', breadcrumb: 'Đơn hàng' };
  if (pathname === '/admin/goods-receipts') return { menuKey: 'inward', breadcrumb: 'Phiếu nhập kho' };
  if (pathname === '/admin/inventory/history') return { menuKey: 'history', breadcrumb: 'Lịch sử biến động' };
  if (pathname === '/admin/inventory') return { menuKey: 'inventory', breadcrumb: 'Tồn kho' };
  if (pathname === '/admin/suppliers') return { menuKey: 'suppliers', breadcrumb: 'Nhà cung cấp' };
  if (pathname === '/admin/customers') return { menuKey: 'customers', breadcrumb: 'Khách hàng' };
  if (pathname === '/admin/staff') return { menuKey: 'staff', breadcrumb: 'Nhân viên' };
  if (pathname === '/admin/roles') return { menuKey: 'roles', breadcrumb: 'Vai trò & quyền' };
  if (pathname === '/admin/audit') return { menuKey: 'audit', breadcrumb: 'Audit' };
  if (pathname === '/admin/reports') return { menuKey: 'reports', breadcrumb: 'Báo cáo' };
  if (pathname === '/admin/content') return { menuKey: 'content', breadcrumb: 'Nội dung & chính sách' };
  if (pathname === '/admin/settings') return { menuKey: 'settings', breadcrumb: 'Cài đặt nội dung' };
  return { menuKey: 'dashboard', breadcrumb: 'Tổng quan' };
};
