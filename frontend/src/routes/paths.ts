import { ScreenId } from '../types';

export const APP_PATHS = {
  home: '/',
  catalog: '/products',
  checkout: '/checkout',
  orderSuccess: '/checkout/success',
  myOrders: '/orders',
  policy: '/policies',
  auth: '/login',
  profile: '/account',
  showrooms: '/showrooms',
  adminLogin: '/admin/login',
  admin: '/admin/dashboard',
} as const;

export const ADMIN_PATHS: Record<string, string> = {
  dashboard: '/admin/dashboard',
  products: '/admin/products',
  'product-detail': '/admin/products/detail',
  'san-pham-detail': '/admin/products/detail',
  categories: '/admin/catalog/categories',
  brands: '/admin/catalog/brands',
  sizes: '/admin/catalog/sizes',
  colors: '/admin/catalog/colors',
  orders: '/admin/orders',
  tailoring: '/admin/orders/tailoring',
  'order-detail': '/admin/orders/detail',
  'don-hang-detail': '/admin/orders/detail',
  inward: '/admin/goods-receipts',
  inventory: '/admin/inventory',
  history: '/admin/inventory/history',
  suppliers: '/admin/suppliers',
  crm: '/admin/customers',
  customers: '/admin/customers',
  'customer-detail': '/admin/customers/detail',
  'khach-hang-detail': '/admin/customers/detail',
  vouchers: '/admin/vouchers',
  employees: '/admin/staff',
  staff: '/admin/staff',
  rbac: '/admin/roles',
  roles: '/admin/roles',
  audit: '/admin/audit',
  reports: '/admin/reports',
  policies: '/admin/content',
  settings: '/admin/settings',
};

export const getPathForScreen = (
  screen: ScreenId,
  selectedProductId = '1',
  selectedOrderId = '1',
): string => {
  switch (screen) {
    case 'home':
      return APP_PATHS.home;
    case 'catalog':
      return APP_PATHS.catalog;
    case 'product-detail':
      return `/products/${encodeURIComponent(selectedProductId)}`;
    case 'checkout':
      return APP_PATHS.checkout;
    case 'order-success':
      return APP_PATHS.orderSuccess;
    case 'order-detail':
      return `/orders/${encodeURIComponent(selectedOrderId)}`;
    case 'my-orders':
      return APP_PATHS.myOrders;
    case 'policy':
      return APP_PATHS.policy;
    case 'auth':
      return APP_PATHS.auth;
    case 'profile':
      return APP_PATHS.profile;
    case 'showrooms':
      return APP_PATHS.showrooms;
    case 'admin-login':
      return APP_PATHS.adminLogin;
    case 'admin':
      return APP_PATHS.admin;
    case 'cart':
    default:
      return APP_PATHS.home;
  }
};

export const getScreenFromPath = (pathname: string): ScreenId => {
  if (pathname === APP_PATHS.adminLogin) return 'admin-login';
  if (pathname.startsWith('/admin')) return 'admin';
  if (/^\/products\/[^/]+$/.test(pathname)) return 'product-detail';
  if (pathname === APP_PATHS.catalog) return 'catalog';
  if (pathname === APP_PATHS.orderSuccess) return 'order-success';
  if (pathname === APP_PATHS.checkout) return 'checkout';
  if (/^\/orders\/[^/]+$/.test(pathname)) return 'order-detail';
  if (pathname === APP_PATHS.myOrders) return 'my-orders';
  if (pathname === APP_PATHS.policy) return 'policy';
  if (pathname === APP_PATHS.auth) return 'auth';
  if (pathname === APP_PATHS.profile) return 'profile';
  if (pathname === APP_PATHS.showrooms) return 'showrooms';
  return 'home';
};

export const getAdminPath = (menuKey: string): string =>
  ADMIN_PATHS[menuKey] ?? APP_PATHS.admin;

export const resolveAdminRoute = (pathname: string): { menuKey: string; breadcrumb: string } => {
  if (pathname === '/admin/products') return { menuKey: 'products', breadcrumb: 'Sản phẩm' };
  if (pathname.startsWith('/admin/products/')) return { menuKey: 'product-detail', breadcrumb: 'Chi tiết sản phẩm' };
  if (pathname === '/admin/catalog/categories') return { menuKey: 'categories', breadcrumb: 'Danh mục' };
  if (pathname === '/admin/catalog/brands') return { menuKey: 'brands', breadcrumb: 'Thương hiệu' };
  if (pathname === '/admin/catalog/sizes') return { menuKey: 'sizes', breadcrumb: 'Hệ size' };
  if (pathname === '/admin/catalog/colors') return { menuKey: 'colors', breadcrumb: 'Màu sắc' };
  if (pathname === '/admin/orders/tailoring') return { menuKey: 'tailoring', breadcrumb: 'Điều phối cắt may' };
  if (pathname === '/admin/orders') return { menuKey: 'orders', breadcrumb: 'Quản lý Đơn hàng' };
  if (pathname.startsWith('/admin/orders/')) return { menuKey: 'order-detail', breadcrumb: 'Chi tiết đơn hàng' };
  if (pathname === '/admin/goods-receipts') return { menuKey: 'inward', breadcrumb: 'Phiếu nhập kho' };
  if (pathname === '/admin/inventory/history') return { menuKey: 'history', breadcrumb: 'Lịch sử biến động' };
  if (pathname === '/admin/inventory') return { menuKey: 'inventory', breadcrumb: 'Tồn kho' };
  if (pathname === '/admin/suppliers') return { menuKey: 'suppliers', breadcrumb: 'Nhà cung cấp' };
  if (pathname.startsWith('/admin/customers/detail')) return { menuKey: 'customer-detail', breadcrumb: 'Chi tiết khách hàng' };
  if (pathname === '/admin/customers') return { menuKey: 'crm', breadcrumb: 'Khách hàng (CRM)' };
  if (pathname === '/admin/vouchers') return { menuKey: 'vouchers', breadcrumb: 'Quản lý Voucher' };
  if (pathname === '/admin/staff') return { menuKey: 'employees', breadcrumb: 'Tài khoản nhân viên' };
  if (pathname === '/admin/roles') return { menuKey: 'rbac', breadcrumb: 'Vai trò & Quyền (RBAC)' };
  if (pathname === '/admin/audit') return { menuKey: 'audit', breadcrumb: 'Nhật ký thao tác (Audit)' };
  if (pathname === '/admin/reports') return { menuKey: 'reports', breadcrumb: 'Báo cáo & Thống kê' };
  if (pathname === '/admin/content') return { menuKey: 'policies', breadcrumb: 'Nội dung & Chính sách' };
  if (pathname === '/admin/settings') return { menuKey: 'settings', breadcrumb: 'Cài đặt' };
  return { menuKey: 'dashboard', breadcrumb: 'Tổng quan' };
};
