export const APP_PATHS = {
  home: '/',
  catalog: '/products',
  categoryProducts: '/categories/:categoryId',
  productDetail: '/products/:productId',
  checkout: '/checkout',
  checkoutSuccess: '/checkout/success',
  checkoutSuccessDetail: '/checkout/success/:orderId',
  myOrders: '/orders',
  orderDetail: '/orders/:orderId',
  policy: '/policies',
  about: '/about',
  auth: '/login',
  profile: '/account',
  showrooms: '/showrooms',
  adminRoot: '/admin',
  adminLogin: '/admin/login',
  admin: '/admin/dashboard',
} as const;

export const ADMIN_PATHS = {
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
  vouchers: '/admin/vouchers',
  suppliers: '/admin/suppliers',
  customers: '/admin/customers',
  staff: '/admin/staff',
  roles: '/admin/roles',
  audit: '/admin/audit',
  reports: '/admin/reports',
  content: '/admin/content',
  settings: '/admin/settings',
} as const;

export const ADMIN_DETAIL_PATHS = {
  product: '/admin/products/:productId',
  order: '/admin/orders/:orderId',
  customer: '/admin/customers/:customerId',
} as const;

export type AdminPathKey = keyof typeof ADMIN_PATHS;

export interface AdminRouteResolution {
  menuKey: string;
  breadcrumb: string;
  productId?: string;
  orderId?: number;
  customerId?: number;
}

export const getAdminPath = (menuKey: string): string =>
  menuKey in ADMIN_PATHS
    ? ADMIN_PATHS[menuKey as AdminPathKey]
    : APP_PATHS.admin;

export const toAdminChildPath = (absolutePath: string): string => {
  const prefix = APP_PATHS.adminRoot + '/';
  return absolutePath.startsWith(prefix)
    ? absolutePath.slice(prefix.length)
    : absolutePath;
};

export const productDetailPath = (productId: string | number): string =>
  APP_PATHS.productDetail.replace(':productId', encodeURIComponent(String(productId)));

export const orderDetailPath = (orderId: string | number): string =>
  APP_PATHS.orderDetail.replace(':orderId', encodeURIComponent(String(orderId)));

export const checkoutSuccessPath = (orderId: string | number): string =>
  APP_PATHS.checkoutSuccessDetail.replace(':orderId', encodeURIComponent(String(orderId)));

export const adminProductDetailPath = (productId: string | number): string =>
  ADMIN_DETAIL_PATHS.product.replace(':productId', encodeURIComponent(String(productId)));

export const adminOrderDetailPath = (orderId: string | number): string =>
  ADMIN_DETAIL_PATHS.order.replace(':orderId', encodeURIComponent(String(orderId)));

export const adminCustomerDetailPath = (customerId: string | number): string =>
  ADMIN_DETAIL_PATHS.customer.replace(':customerId', encodeURIComponent(String(customerId)));

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

  if (pathname === ADMIN_PATHS.products) return { menuKey: 'products', breadcrumb: 'Sản phẩm' };
  if (pathname === ADMIN_PATHS.categories) return { menuKey: 'categories', breadcrumb: 'Danh mục' };
  if (pathname === ADMIN_PATHS.brands) return { menuKey: 'brands', breadcrumb: 'Thương hiệu' };
  if (pathname === ADMIN_PATHS.sizes) return { menuKey: 'sizes', breadcrumb: 'Hệ size' };
  if (pathname === ADMIN_PATHS.colors) return { menuKey: 'colors', breadcrumb: 'Màu sắc' };
  if (pathname === ADMIN_PATHS.orders) return { menuKey: 'orders', breadcrumb: 'Đơn hàng' };
  if (pathname === ADMIN_PATHS.inward) return { menuKey: 'inward', breadcrumb: 'Phiếu nhập kho' };
  if (pathname === ADMIN_PATHS.history) return { menuKey: 'history', breadcrumb: 'Lịch sử biến động' };
  if (pathname === ADMIN_PATHS.inventory) return { menuKey: 'inventory', breadcrumb: 'Tồn kho' };
  if (pathname === ADMIN_PATHS.suppliers) return { menuKey: 'suppliers', breadcrumb: 'Nhà cung cấp' };
  if (pathname === ADMIN_PATHS.customers) return { menuKey: 'customers', breadcrumb: 'Khách hàng' };
  if (pathname === ADMIN_PATHS.staff) return { menuKey: 'staff', breadcrumb: 'Nhân viên' };
  if (pathname === ADMIN_PATHS.roles) return { menuKey: 'roles', breadcrumb: 'Vai trò & quyền' };
  if (pathname === ADMIN_PATHS.audit) return { menuKey: 'audit', breadcrumb: 'Audit' };
  if (pathname === ADMIN_PATHS.reports) return { menuKey: 'reports', breadcrumb: 'Báo cáo' };
  if (pathname === ADMIN_PATHS.vouchers) return { menuKey: 'vouchers', breadcrumb: 'Voucher' };
  if (pathname === ADMIN_PATHS.content) return { menuKey: 'content', breadcrumb: 'Nội dung & chính sách' };
  if (pathname === ADMIN_PATHS.settings) return { menuKey: 'settings', breadcrumb: 'Cài đặt nội dung' };
  return { menuKey: 'dashboard', breadcrumb: 'Tổng quan' };
};

export const categoryProductsPath = (categoryId: number): string =>
  APP_PATHS.categoryProducts.replace(':categoryId', String(categoryId));
