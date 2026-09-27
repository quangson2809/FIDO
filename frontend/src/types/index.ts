export type ScreenId =
  | 'home'
  | 'catalog'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'order-success'
  | 'order-detail'
  | 'my-orders'
  | 'policy'
  | 'auth'
  | 'profile'
  | 'showrooms'
  | 'admin-login'
  | 'admin';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPING'
  | 'DELIVERY_FAILED'
  | 'COMPLETED'
  | 'RETURNED'
  | 'CANCELLED'
  | 'processing'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'cancelled';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  parentCategory: 'Áo' | 'Quần' | 'Phụ kiện';
  brand: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  imageUrl: string;
  galleryImages: string[];
  statusBadge?: string;
  statusType?: 'sale' | 'new' | 'bestseller' | 'stock' | 'preorder' | 'limited';
  description: string;
  fabric: string;
  colors: { name: string; hex: string }[];
  sizes: (string | number)[];
  rating: number;
  reviewsCount: number;
  inStockCount: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  size: string | number;
  color: string;
  quantity: number;
  fabricSummary: string;
  badge?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  size: string | number;
  color: string;
  quantity: number;
  subCategory?: string;
  product?: Product;
  selectedColor?: string;
  selectedSize?: string | number;
}

export interface OrderRecipient {
  fullName: string;
  phone: string;
  address: string;
  district?: string;
  city?: string;
  note?: string;
}

export interface Order {
  id: string; // e.g. "ORD-001" or "ORD-20260924-001"
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  recipientAddress: string;
  deliveryNote?: string;
  deliveryTimeWindow?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  returnDate?: string;
  returnReason?: string;
  status: OrderStatus;
  statusLabel?: string;
  paymentMethod: 'COD';
  paymentStatus: 'UNPAID_COD' | 'COLLECTED_COD' | 'PAID' | 'REFUNDED';
  paymentStatusLabel: string;
  items: OrderItem[];
  subtotal: number;
  voucherCode?: string;
  voucherDiscount?: number;
  shippingFee: number;
  total: number;
  totalAmount?: number;
  courier?: string;
  recipient?: OrderRecipient;
}

export interface AddressDto {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
  tag: string;
  note?: string;
}

export interface BodyMeasurements {
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hips: number;
  shoulder: number;
  inseam: number;
  preferredPantsLength: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  name?: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  district?: string;
  tier: string;
  membershipTier?: string;
  tierPoints: number;
  loyaltyPoints?: number;
  nextTierPoints: number;
  avatarInitials: string;
  joinedDate: string;
  addresses: AddressDto[];
  measurements?: BodyMeasurements;
}

export interface Showroom {
  id: string;
  name: string;
  typeBadge: string;
  city: 'hcm' | 'hn';
  address: string;
  phone: string;
  openingHours: string;
  openHours?: string;
  features: string[];
  imageUrl: string;
  image?: string;
  isBespoke: boolean;
  distanceInfo: string;
  coordinates: { top: string; left: string };
}
