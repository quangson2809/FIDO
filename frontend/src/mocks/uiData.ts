import { CartItem, Order, Product, Showroom, UserProfile } from '../types';
import {
  mockCart,
  mockMe,
  mockOrderDetails,
  mockProductDetails,
  ProductDetailDto,
} from './apiData';

const parentCategoryById: Record<number, Product['parentCategory']> = {
  11: 'Áo',
  12: 'Áo',
  13: 'Áo',
  21: 'Quần',
  22: 'Quần',
  31: 'Phụ kiện',
};

const colorHex: Record<string, string> = {
  'Chàm Indigo': '#263A5A',
  Navy: '#13233A',
  Đen: '#111111',
  Trắng: '#F5F5F0',
  'Xanh Olive': '#596348',
  Be: '#C9B99A',
  Nâu: '#76533A',
};

export const toUiProduct = (product: ProductDetailDto): Product & { product_id: number } => {
  const firstVariant = product.variants[0];
  const imageUrl = product.images[0]?.image_url ?? '';
  return {
    product_id: product.product_id,
    id: String(product.product_id),
    sku: firstVariant?.sku ?? `P-${product.product_id}`,
    name: product.name,
    category: product.category.name,
    parentCategory: parentCategoryById[product.category.category_id] ?? 'Phụ kiện',
    brand: product.brand?.name ?? 'FIDO',
    price: firstVariant?.effective_price ?? product.base_price,
    imageUrl,
    galleryImages: product.images.map((image) => image.image_url),
    statusBadge: product.sale_status,
    statusType: product.sale_status === 'ACTIVE' ? 'stock' : 'preorder',
    description: product.description ?? '',
    fabric: product.material_care ?? '',
    colors: [...new Map(product.variants.map((variant) => [
      variant.color.color_id,
      { name: variant.color.name, hex: colorHex[variant.color.name] ?? '#687069' },
    ])).values()],
    sizes: product.size_system.size_values.map((size) => size.display_name),
    rating: 0,
    reviewsCount: 0,
    inStockCount: product.variants.reduce((sum, variant) => sum + variant.available_quantity, 0),
  };
};

export const mockUiProducts: Product[] = mockProductDetails.map(toUiProduct);

const productByVariant = new Map(
  mockProductDetails.flatMap((product) =>
    product.variants.map((variant) => [variant.variant_id, { product, variant }] as const),
  ),
);

export const mockUiCartItems: CartItem[] = mockCart.items.map((item) => {
  const source = productByVariant.get(item.variant_id);
  return {
    id: String(item.cart_item_id),
    productId: String(source?.product.product_id ?? item.variant_id),
    name: item.product_name,
    sku: source?.variant.sku ?? '',
    price: item.unit_price,
    imageUrl: source?.product.images[0]?.image_url ?? '',
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    fabricSummary: source?.product.material_care ?? '',
    badge: source?.product.sale_status,
  };
});

const uiPaymentStatus = (status: string): Order['paymentStatus'] => {
  if (status === 'PAID') return 'COLLECTED_COD';
  if (status === 'REFUNDED') return 'REFUNDED';
  return 'UNPAID_COD';
};

export const mockUiOrders: Order[] = mockOrderDetails.map((order) => ({
  id: order.order_code,
  customerName: order.customer_account_id ? `Tài khoản #${order.customer_account_id}` : 'Khách guest',
  customerPhone: order.recipient.phone,
  customerEmail: order.recipient.email ?? '',
  recipientAddress: order.recipient.address,
  deliveryNote: order.customer_service_note ?? undefined,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
  completedAt: order.completed_at ?? undefined,
  returnDate: order.returned_at ?? undefined,
  returnReason: order.customer_service_note ?? undefined,
  status: order.order_status as Order['status'],
  paymentMethod: 'COD',
  paymentStatus: uiPaymentStatus(order.payment.payment_status),
  paymentStatusLabel:
    order.payment.payment_status === 'PAID'
      ? 'Đã thu COD'
      : order.payment.payment_status === 'REFUNDED'
        ? 'Đã hoàn tiền'
        : 'Chưa thu COD',
  items: order.items.map((item) => {
    const source = productByVariant.get(item.variant_id);
    return {
      id: String(item.order_item_id),
      name: item.product_name,
      sku: item.sku ?? '',
      price: item.unit_price,
      imageUrl: source?.product.images[0]?.image_url ?? '',
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      subCategory: source?.product.category.name,
      selectedColor: item.color,
      selectedSize: item.size,
    };
  }),
  subtotal: order.subtotal,
  voucherDiscount: order.discount,
  shippingFee: order.shipping_fee,
  total: order.total,
  totalAmount: order.total,
  courier: order.shipping_info?.carrier_name ?? undefined,
  recipient: {
    fullName: order.customer_account_id ? `Tài khoản #${order.customer_account_id}` : 'Khách guest',
    phone: order.recipient.phone,
    address: order.recipient.address,
  },
}));

export const mockUiUserProfile: UserProfile = {
  id: String(mockMe.account.account_id),
  fullName: `Khách hàng #${mockMe.account.account_id}`,
  name: `Khách hàng #${mockMe.account.account_id}`,
  phone: mockMe.account.phone ?? '',
  email: mockMe.account.email ?? '',
  tier: '',
  tierPoints: 0,
  nextTierPoints: 0,
  avatarInitials: 'KH',
  joinedDate: mockMe.account.created_at.slice(0, 4),
  addresses: mockMe.addresses.map((address) => ({
    id: String(address.address_id),
    code: String(address.address_id),
    name: 'Địa chỉ đã lưu',
    phone: mockMe.account.phone ?? '',
    address: address.address_text,
    isDefault: false,
    tag: 'Đã lưu',
  })),
};

export const mockUiShowrooms: Showroom[] = [
  {
    id: 'hn-01',
    name: 'FIDO Hà Nội',
    typeBadge: 'Showroom',
    city: 'hn',
    address: 'Hà Nội',
    phone: '024 7300 1000',
    openingHours: '09:00 - 21:00',
    features: ['Thử sản phẩm', 'Hỗ trợ đổi size'],
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    isBespoke: false,
    distanceInfo: 'Thông tin hiển thị mock UI',
    coordinates: { top: '45%', left: '52%' },
  },
  {
    id: 'hcm-01',
    name: 'FIDO TP. Hồ Chí Minh',
    typeBadge: 'Showroom',
    city: 'hcm',
    address: 'TP. Hồ Chí Minh',
    phone: '028 7300 1000',
    openingHours: '09:00 - 21:00',
    features: ['Thử sản phẩm', 'Hỗ trợ đổi size'],
    imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
    isBespoke: false,
    distanceInfo: 'Thông tin hiển thị mock UI',
    coordinates: { top: '56%', left: '48%' },
  },
];
