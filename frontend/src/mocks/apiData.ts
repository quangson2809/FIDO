// Mock API dataset aligned with "DANH MỤC API TINH GỌN THEO CSDL".
// Keep this file contract-shaped: do not add UI-only fields here.

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AccountDto {
  account_id: number;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddressDto {
  address_id: number;
  address_text: string;
  created_at: string;
}

export interface RoleDto {
  role_id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface PermissionDto {
  permission_id: number;
  code: string;
  name: string;
}

export interface RoleDetailDto extends RoleDto {
  permissions: PermissionDto[];
}

export interface MeDto {
  account: AccountDto;
  addresses: AddressDto[];
  roles: RoleDto[];
  permissions: PermissionDto[];
}

export interface StaffAccountSummaryDto {
  account: AccountDto;
  roles: RoleDto[];
}

export interface StaffAccountDetailDto extends StaffAccountSummaryDto {
  permissions: PermissionDto[];
}

export interface AccessControlDto {
  roles: RoleDetailDto[];
  permissions: PermissionDto[];
}

export interface CategoryDto {
  category_id: number;
  parent_category_id: number | null;
  name: string;
}

export interface BrandDto {
  brand_id: number;
  name: string;
}

export interface SizeValueDto {
  size_value_id: number;
  size_system_id: number;
  code: string;
  display_name: string;
  sort_order: number;
}

export interface SizeSystemDto {
  size_system_id: number;
  code: string;
  name: string;
  size_values: SizeValueDto[];
}

export interface ColorDto {
  color_id: number;
  code: string;
  name: string;
}

export interface ProductImageDto {
  image_id: number;
  image_url: string;
  alt_text: string | null;
}

export interface ProductVariantDto {
  variant_id: number;
  size: SizeValueDto;
  color: ColorDto;
  sku: string | null;
  effective_price: number;
  sale_status: string;
  available_quantity: number;
}

export interface ProductSummaryDto {
  product_id: number;
  name: string;
  category: CategoryDto;
  brand: BrandDto | null;
  base_price: number;
  sale_status: string;
}

export interface ProductDetailDto {
  product_id: number;
  name: string;
  description: string | null;
  category: CategoryDto;
  brand: BrandDto | null;
  size_system: SizeSystemDto;
  gender: string | null;
  season: string | null;
  style: string | null;
  material_care: string | null;
  base_price: number;
  sale_status: string;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
}

export interface AdminVariantDto {
  variant_id: number;
  product_id: number;
  size_value_id: number;
  color_id: number;
  sku: string | null;
  override_price: number | null;
  sale_status: string;
  available_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface CatalogMetaDto {
  categories: CategoryDto[];
  brands: BrandDto[];
  size_systems: SizeSystemDto[];
  colors: ColorDto[];
  genders: string[];
  seasons: string[];
  styles: string[];
}

export interface CartItemDto {
  cart_item_id: number;
  variant_id: number;
  quantity: number;
  product_name: string;
  size: string;
  color: string;
  unit_price: number;
  line_total: number;
  available_quantity: number;
}

export interface CartDto {
  cart_id: number;
  account_id: number | null;
  items: CartItemDto[];
  subtotal: number;
  created_at: string;
  updated_at: string;
}

export interface VoucherDto {
  voucher_id: number;
  code: string;
}

export interface CheckoutItemDto {
  variant_id: number;
  quantity: number;
  product_name: string;
  size: string;
  color: string;
  unit_price: number;
  line_total: number;
  available_quantity: number;
}

export interface CheckoutQuoteDto {
  items: CheckoutItemDto[];
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  voucher: VoucherDto | null;
}

export interface RecipientDto {
  phone: string;
  email: string | null;
  address: string;
}

export interface OrderItemDto {
  order_item_id: number;
  variant_id: number;
  product_name: string;
  sku: string | null;
  size: string;
  color: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface PaymentPublicDto {
  payment_status: PaymentStatus;
  amount_due: number;
  amount_received: number;
  amount_refunded: number;
}

export interface PaymentAdminDto extends PaymentPublicDto {
  collected_by_account_id: number | null;
  collected_at: string | null;
  refunded_by_account_id: number | null;
  refunded_at: string | null;
}

export interface ShippingInfoDto {
  delivery_mode: string;
  carrier_name: string | null;
}

export interface OrderSummaryDto {
  order_id: number;
  order_code: string;
  order_status: string;
  payment_status: string;
  total: number;
  created_at: string;
  completed_at: string | null;
  returned_at: string | null;
}

export interface OrderCustomerDetailDto {
  order_id: number;
  order_code: string;
  order_status: string;
  recipient: RecipientDto;
  items: OrderItemDto[];
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  payment: PaymentPublicDto;
  shipping_info: ShippingInfoDto | null;
  completed_at: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderAdminDetailDto extends Omit<OrderCustomerDetailDto, 'payment'> {
  customer_account_id: number | null;
  voucher_id: number | null;
  customer_service_note: string | null;
  cancel_reason: string | null;
  payment: PaymentAdminDto;
  allowed_actions: string[];
}

export interface SupplierDto {
  supplier_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  usage_status: string;
  note: string | null;
}

export interface GoodsReceiptItemDto {
  receipt_item_id: number;
  variant_id: number;
  quantity: number;
}

export type GoodsReceiptStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface GoodsReceiptSummaryDto {
  receipt_id: number;
  receipt_code: string;
  supplier_id: number;
  receipt_status: GoodsReceiptStatus;
  receipt_date: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface GoodsReceiptDetailDto extends GoodsReceiptSummaryDto {
  created_by_account_id: number;
  confirmed_by_account_id: number | null;
  note: string | null;
  items: GoodsReceiptItemDto[];
  updated_at: string;
}

export interface InventoryRowDto {
  variant_id: number;
  sku: string | null;
  product_id: number;
  product_name: string;
  size: string;
  color: string;
  sale_status: string;
  available_quantity: number;
  updated_at: string;
}

export interface InventoryTransactionDto {
  txn_id: number;
  variant_id: number;
  quantity_delta: number;
  transaction_type: string;
  order_id: number | null;
  goods_receipt_id: number | null;
  actor_account_id: number;
  reason: string | null;
  created_at: string;
}

export interface AuditLogDto {
  audit_id: number;
  actor_account_id: number;
  action: string;
  target_type: string;
  target_id: string;
  description: string | null;
  created_at: string;
}

export interface ReportOverviewDto {
  from: string;
  to: string;
  completed_sales: number;
  returned_adjustment: number;
  net_sales: number;
  orders_by_status: Record<string, number>;
}

export interface PublicContentPageDto {
  page_code: string;
  title: string;
  content: string;
  updated_at: string;
}

export interface ContentPageDto extends PublicContentPageDto {
  page_id: number;
  updated_by_account_id: number;
}

export interface CustomerSummaryDto {
  account_id: number;
  phone: string | null;
  email: string | null;
  order_count: number;
  last_order_at: string | null;
}

export interface CustomerDetailDto {
  account: AccountDto;
  addresses: AddressDto[];
  orders: OrderSummaryDto[];
}

const img = (seed: string) =>
  `https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80&sig=${seed}`;

const now = '2026-09-27T00:00:00+07:00';

export const mockPermissions: PermissionDto[] = [
  { permission_id: 1, code: 'CATALOG_MANAGE', name: 'Quản lý catalog' },
  { permission_id: 2, code: 'ORDER_PROCESS', name: 'Xử lý đơn hàng' },
  { permission_id: 3, code: 'INVENTORY_MANAGE', name: 'Quản lý tồn kho' },
  { permission_id: 4, code: 'SUPPLIER_MANAGE', name: 'Quản lý nhà cung cấp' },
  { permission_id: 5, code: 'STAFF_MANAGE', name: 'Quản lý tài khoản nội bộ' },
  { permission_id: 6, code: 'RBAC_MANAGE', name: 'Quản lý vai trò và quyền' },
  { permission_id: 7, code: 'AUDIT_READ', name: 'Xem nhật ký thao tác' },
  { permission_id: 8, code: 'REPORT_READ', name: 'Xem báo cáo' },
  { permission_id: 9, code: 'CONTENT_MANAGE', name: 'Quản lý nội dung' },
  { permission_id: 10, code: 'CUSTOMER_READ', name: 'Xem khách hàng' },
];

const superAdminRole: RoleDetailDto = {
  role_id: 1,
  code: 'SUPERADMIN',
  name: 'Super Admin',
  description: 'Vai trò quản trị cao nhất của hệ thống.',
  permissions: mockPermissions,
};

const adminRole: RoleDetailDto = {
  role_id: 2,
  code: 'ADMIN',
  name: 'Admin',
  description: 'Vai trò nhân viên nội bộ; quyền hiệu lực phụ thuộc Permission được gán.',
  permissions: mockPermissions.filter((permission) =>
    [1, 2, 3, 4, 7, 8, 10].includes(permission.permission_id),
  ),
};

const customerRole: RoleDetailDto = {
  role_id: 3,
  code: 'CUSTOMER',
  name: 'Customer',
  description: 'Khách hàng đã đăng ký.',
  permissions: [],
};

export const mockRoles: RoleDetailDto[] = [superAdminRole, adminRole, customerRole];

export const mockAccounts: AccountDto[] = [
  { account_id: 1001, phone: '0912345678', email: 'son.nguyen@example.com', created_at: '2026-05-12T09:00:00+07:00', updated_at: '2026-09-26T21:10:00+07:00' },
  { account_id: 2001, phone: '0900000001', email: 'superadmin@fido.local', created_at: '2026-01-01T08:00:00+07:00', updated_at: now },
  { account_id: 2002, phone: '0900000002', email: 'admin.orders@fido.local', created_at: '2026-03-02T08:30:00+07:00', updated_at: '2026-09-26T18:30:00+07:00' },
  { account_id: 2003, phone: '0900000003', email: 'admin.inventory@fido.local', created_at: '2026-03-08T09:20:00+07:00', updated_at: '2026-09-26T17:10:00+07:00' },
  { account_id: 1002, phone: '0988776655', email: 'customer2@example.com', created_at: '2026-06-10T10:00:00+07:00', updated_at: '2026-09-24T10:00:00+07:00' },
  { account_id: 1003, phone: '0903112233', email: null, created_at: '2026-07-01T10:00:00+07:00', updated_at: '2026-09-20T10:00:00+07:00' },
];

export const mockAddresses: Record<number, AddressDto[]> = {
  1001: [
    { address_id: 501, address_text: '128 Nguyễn Trãi, Thanh Xuân, Hà Nội', created_at: '2026-05-12T09:10:00+07:00' },
    { address_id: 502, address_text: '18 Cầu Giấy, Cầu Giấy, Hà Nội', created_at: '2026-08-18T14:20:00+07:00' },
  ],
  1002: [
    { address_id: 503, address_text: '45 Tràng Tiền, Hoàn Kiếm, Hà Nội', created_at: '2026-06-10T10:20:00+07:00' },
  ],
  1003: [
    { address_id: 504, address_text: '25 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', created_at: '2026-07-01T10:30:00+07:00' },
  ],
};

export const mockMe: MeDto = {
  account: mockAccounts[0],
  addresses: mockAddresses[1001],
  roles: [customerRole],
  permissions: [],
};

export const mockStaffAccounts: StaffAccountDetailDto[] = [
  { account: mockAccounts[1], roles: [superAdminRole], permissions: superAdminRole.permissions },
  { account: mockAccounts[2], roles: [adminRole], permissions: adminRole.permissions },
  { account: mockAccounts[3], roles: [adminRole], permissions: adminRole.permissions.filter((p) => [3, 4, 7].includes(p.permission_id)) },
];

export const mockAccessControl: AccessControlDto = {
  roles: mockRoles,
  permissions: mockPermissions,
};

export const mockCategories: CategoryDto[] = [
  { category_id: 1, parent_category_id: null, name: 'Áo' },
  { category_id: 2, parent_category_id: null, name: 'Quần' },
  { category_id: 3, parent_category_id: null, name: 'Phụ kiện' },
  { category_id: 11, parent_category_id: 1, name: 'Áo sơ mi' },
  { category_id: 12, parent_category_id: 1, name: 'Áo Polo' },
  { category_id: 13, parent_category_id: 1, name: 'Áo Blazer' },
  { category_id: 21, parent_category_id: 2, name: 'Quần Jeans & Denim' },
  { category_id: 22, parent_category_id: 2, name: 'Quần Tây & Khaki' },
  { category_id: 31, parent_category_id: 3, name: 'Thắt lưng' },
];

export const mockBrands: BrandDto[] = [
  { brand_id: 1, name: 'FIDO' },
  { brand_id: 2, name: 'Kurabo Okayama Denim' },
  { brand_id: 3, name: 'Albini Fabric' },
];

const alphaSizes: SizeValueDto[] = ['S', 'M', 'L', 'XL'].map((code, index) => ({
  size_value_id: 101 + index,
  size_system_id: 1,
  code,
  display_name: code,
  sort_order: index + 1,
}));

const waistSizes: SizeValueDto[] = ['29', '30', '31', '32', '33', '34'].map((code, index) => ({
  size_value_id: 201 + index,
  size_system_id: 2,
  code,
  display_name: code,
  sort_order: index + 1,
}));

export const mockSizeSystems: SizeSystemDto[] = [
  { size_system_id: 1, code: 'ALPHA', name: 'Kích cỡ chữ', size_values: alphaSizes },
  { size_system_id: 2, code: 'WAIST', name: 'Vòng eo inch', size_values: waistSizes },
];

export const mockColors: ColorDto[] = [
  { color_id: 1, code: 'INDIGO', name: 'Chàm Indigo' },
  { color_id: 2, code: 'NAVY', name: 'Navy' },
  { color_id: 3, code: 'BLACK', name: 'Đen' },
  { color_id: 4, code: 'WHITE', name: 'Trắng' },
  { color_id: 5, code: 'OLIVE', name: 'Xanh Olive' },
  { color_id: 6, code: 'BEIGE', name: 'Be' },
  { color_id: 7, code: 'BROWN', name: 'Nâu' },
];

const category = (id: number) => mockCategories.find((item) => item.category_id === id)!;
const brand = (id: number) => mockBrands.find((item) => item.brand_id === id)!;
const sizeSystem = (id: number) => mockSizeSystems.find((item) => item.size_system_id === id)!;
const color = (id: number) => mockColors.find((item) => item.color_id === id)!;
const size = (systemId: number, code: string) =>
  sizeSystem(systemId).size_values.find((item) => item.code === code)!;

const makeVariant = (
  variant_id: number,
  systemId: number,
  sizeCode: string,
  colorId: number,
  sku: string,
  price: number,
  qty: number,
): ProductVariantDto => ({
  variant_id,
  size: size(systemId, sizeCode),
  color: color(colorId),
  sku,
  effective_price: price,
  sale_status: 'ACTIVE',
  available_quantity: qty,
});

export const mockProductDetails: ProductDetailDto[] = [
  {
    product_id: 101,
    name: 'Quần Jeans Selvedge 14oz',
    description: 'Quần jeans may sẵn phom straight, chất liệu denim selvedge.',
    category: category(21),
    brand: brand(2),
    size_system: sizeSystem(2),
    gender: 'NAM',
    season: null,
    style: 'STRAIGHT',
    material_care: 'Giặt lạnh, lộn trái sản phẩm, hạn chế sấy nhiệt cao.',
    base_price: 1390000,
    sale_status: 'ACTIVE',
    images: [
      { image_id: 1001, image_url: img('101a'), alt_text: 'Quần Jeans Selvedge 14oz mặt trước' },
      { image_id: 1002, image_url: img('101b'), alt_text: 'Chi tiết vải denim selvedge' },
    ],
    variants: [
      makeVariant(10001, 2, '29', 1, 'FIDO-JS14-29-IND', 1390000, 8),
      makeVariant(10002, 2, '30', 1, 'FIDO-JS14-30-IND', 1390000, 12),
      makeVariant(10003, 2, '31', 1, 'FIDO-JS14-31-IND', 1390000, 7),
      makeVariant(10004, 2, '32', 1, 'FIDO-JS14-32-IND', 1390000, 10),
      makeVariant(10005, 2, '33', 1, 'FIDO-JS14-33-IND', 1390000, 4),
    ],
  },
  {
    product_id: 102,
    name: 'Quần Âu Gurkha Cạp Cao',
    description: 'Quần âu Gurkha cạp cao, hai ly trước, phom tapered.',
    category: category(22),
    brand: brand(1),
    size_system: sizeSystem(2),
    gender: 'NAM',
    season: null,
    style: 'GURKHA',
    material_care: 'Giặt khô hoặc giặt nhẹ bằng nước lạnh; ủi nhiệt thấp.',
    base_price: 1490000,
    sale_status: 'ACTIVE',
    images: [
      { image_id: 1011, image_url: img('102a'), alt_text: 'Quần Âu Gurkha màu Navy' },
    ],
    variants: [
      makeVariant(10101, 2, '30', 2, 'FIDO-GK-30-NVY', 1490000, 6),
      makeVariant(10102, 2, '31', 2, 'FIDO-GK-31-NVY', 1490000, 9),
      makeVariant(10103, 2, '32', 2, 'FIDO-GK-32-NVY', 1490000, 11),
      makeVariant(10104, 2, '33', 3, 'FIDO-GK-33-BLK', 1490000, 5),
    ],
  },
  {
    product_id: 103,
    name: 'Áo Sơ Mi Linen',
    description: 'Áo sơ mi linen may sẵn, cổ spread, phom regular.',
    category: category(11),
    brand: brand(3),
    size_system: sizeSystem(1),
    gender: 'NAM',
    season: 'SUMMER',
    style: 'REGULAR',
    material_care: 'Giặt nhẹ bằng nước lạnh, phơi tự nhiên.',
    base_price: 990000,
    sale_status: 'ACTIVE',
    images: [
      { image_id: 1021, image_url: img('103a'), alt_text: 'Áo sơ mi linen trắng' },
    ],
    variants: [
      makeVariant(10201, 1, 'S', 4, 'FIDO-LIN-S-WHT', 990000, 5),
      makeVariant(10202, 1, 'M', 4, 'FIDO-LIN-M-WHT', 990000, 13),
      makeVariant(10203, 1, 'L', 4, 'FIDO-LIN-L-WHT', 990000, 8),
      makeVariant(10204, 1, 'XL', 5, 'FIDO-LIN-XL-OLV', 990000, 3),
    ],
  },
  {
    product_id: 104,
    name: 'Áo Polo Cotton Mercerized',
    description: 'Polo cotton mercerized bề mặt mịn, phom regular.',
    category: category(12),
    brand: brand(1),
    size_system: sizeSystem(1),
    gender: 'NAM',
    season: null,
    style: 'REGULAR',
    material_care: 'Giặt máy chế độ nhẹ, không tẩy.',
    base_price: 790000,
    sale_status: 'ACTIVE',
    images: [
      { image_id: 1031, image_url: img('104a'), alt_text: 'Áo Polo Cotton Mercerized màu Navy' },
    ],
    variants: [
      makeVariant(10301, 1, 'M', 2, 'FIDO-POLO-M-NVY', 790000, 16),
      makeVariant(10302, 1, 'L', 2, 'FIDO-POLO-L-NVY', 790000, 12),
      makeVariant(10303, 1, 'XL', 3, 'FIDO-POLO-XL-BLK', 790000, 9),
    ],
  },
  {
    product_id: 105,
    name: 'Áo Blazer Linen Cấu Trúc Nhẹ',
    description: 'Blazer linen hai khuy, cấu trúc nhẹ, phù hợp khí hậu nóng.',
    category: category(13),
    brand: brand(1),
    size_system: sizeSystem(1),
    gender: 'NAM',
    season: 'SUMMER',
    style: 'TAILORED',
    material_care: 'Chỉ giặt khô.',
    base_price: 2790000,
    sale_status: 'ACTIVE',
    images: [
      { image_id: 1041, image_url: img('105a'), alt_text: 'Blazer linen màu Be' },
    ],
    variants: [
      makeVariant(10401, 1, 'M', 6, 'FIDO-BLZ-M-BGE', 2790000, 4),
      makeVariant(10402, 1, 'L', 6, 'FIDO-BLZ-L-BGE', 2790000, 5),
      makeVariant(10403, 1, 'XL', 2, 'FIDO-BLZ-XL-NVY', 2790000, 2),
    ],
  },
  {
    product_id: 106,
    name: 'Thắt Lưng Da Bò',
    description: 'Thắt lưng da bò khóa kim, hoàn thiện tối giản.',
    category: category(31),
    brand: brand(1),
    size_system: sizeSystem(1),
    gender: 'NAM',
    season: null,
    style: 'CLASSIC',
    material_care: 'Lau bằng khăn mềm, tránh ngâm nước.',
    base_price: 590000,
    sale_status: 'ACTIVE',
    images: [
      { image_id: 1051, image_url: img('106a'), alt_text: 'Thắt lưng da bò màu nâu' },
    ],
    variants: [
      makeVariant(10501, 1, 'M', 7, 'FIDO-BELT-M-BRN', 590000, 15),
      makeVariant(10502, 1, 'L', 7, 'FIDO-BELT-L-BRN', 590000, 18),
      makeVariant(10503, 1, 'XL', 3, 'FIDO-BELT-XL-BLK', 590000, 11),
    ],
  },
];

export const mockProductSummaries: ProductSummaryDto[] = mockProductDetails.map((product) => ({
  product_id: product.product_id,
  name: product.name,
  category: product.category,
  brand: product.brand,
  base_price: product.base_price,
  sale_status: product.sale_status,
}));

export const mockCatalogMeta: CatalogMetaDto = {
  categories: mockCategories,
  brands: mockBrands,
  size_systems: mockSizeSystems,
  colors: mockColors,
  genders: ['NAM'],
  seasons: ['SUMMER'],
  styles: ['STRAIGHT', 'GURKHA', 'REGULAR', 'TAILORED', 'CLASSIC'],
};

const variants = mockProductDetails.flatMap((product) =>
  product.variants.map((variant) => ({ product, variant })),
);

const byVariant = (variantId: number) => variants.find((item) => item.variant.variant_id === variantId)!;

const cartItem = (cart_item_id: number, variantId: number, quantity: number): CartItemDto => {
  const { product, variant } = byVariant(variantId);
  return {
    cart_item_id,
    variant_id: variantId,
    quantity,
    product_name: product.name,
    size: variant.size.display_name,
    color: variant.color.name,
    unit_price: variant.effective_price,
    line_total: variant.effective_price * quantity,
    available_quantity: variant.available_quantity,
  };
};

export const mockCart: CartDto = {
  cart_id: 7001,
  account_id: 1001,
  items: [cartItem(7101, 10003, 1), cartItem(7102, 10202, 1)],
  subtotal: 2380000,
  created_at: '2026-09-26T20:00:00+07:00',
  updated_at: '2026-09-26T23:45:00+07:00',
};

export const mockVouchers: VoucherDto[] = [
  { voucher_id: 801, code: 'FIDO100' },
  { voucher_id: 802, code: 'WELCOME' },
];

const orderItem = (order_item_id: number, variantId: number, quantity: number): OrderItemDto => {
  const { product, variant } = byVariant(variantId);
  return {
    order_item_id,
    variant_id: variantId,
    product_name: product.name,
    sku: variant.sku,
    size: variant.size.display_name,
    color: variant.color.name,
    unit_price: variant.effective_price,
    quantity,
    line_total: variant.effective_price * quantity,
  };
};

const recipient: RecipientDto = {
  phone: '0912345678',
  email: 'son.nguyen@example.com',
  address: '128 Nguyễn Trãi, Thanh Xuân, Hà Nội',
};

const payment = (
  status: PaymentStatus,
  total: number,
  actor: number | null = null,
): PaymentAdminDto => ({
  payment_status: status,
  amount_due: status === 'UNPAID' ? total : 0,
  amount_received: status === 'PAID' ? total : 0,
  amount_refunded: status === 'REFUNDED' ? total : 0,
  collected_by_account_id: status === 'PAID' ? actor : null,
  collected_at: status === 'PAID' ? '2026-09-25T15:10:00+07:00' : null,
  refunded_by_account_id: status === 'REFUNDED' ? actor : null,
  refunded_at: status === 'REFUNDED' ? '2026-09-26T14:20:00+07:00' : null,
});

const makeOrder = (
  order_id: number,
  code: string,
  status: string,
  items: OrderItemDto[],
  paymentStatus: PaymentStatus,
  createdAt: string,
  options: Partial<OrderAdminDetailDto> = {},
): OrderAdminDetailDto => {
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const discount = 0;
  const shipping_fee = 0;
  const total = subtotal - discount + shipping_fee;
  return {
    order_id,
    order_code: code,
    order_status: status,
    recipient,
    items,
    subtotal,
    discount,
    shipping_fee,
    total,
    payment: payment(paymentStatus, total, 2002),
    shipping_info: status === 'SHIPPING' || status === 'COMPLETED' || status === 'DELIVERY_FAILED'
      ? { delivery_mode: 'MANUAL_EXTERNAL', carrier_name: 'Đơn vị giao hàng ngoài' }
      : null,
    completed_at: status === 'COMPLETED' || status === 'RETURNED' ? '2026-09-25T15:10:00+07:00' : null,
    returned_at: status === 'RETURNED' ? '2026-09-26T14:20:00+07:00' : null,
    created_at: createdAt,
    updated_at: '2026-09-26T23:00:00+07:00',
    customer_account_id: 1001,
    voucher_id: null,
    customer_service_note: null,
    cancel_reason: status === 'CANCELLED' ? 'Khách yêu cầu hủy trước khi giao.' : null,
    allowed_actions: [],
    ...options,
  };
};

export const mockOrderDetails: OrderAdminDetailDto[] = [
  makeOrder(9001, 'ORD-20260926-001', 'PENDING', [orderItem(1, 10003, 1)], 'UNPAID', '2026-09-26T08:15:00+07:00', { allowed_actions: ['CONFIRM', 'CANCEL'] }),
  makeOrder(9002, 'ORD-20260926-002', 'CONFIRMED', [orderItem(2, 10102, 1)], 'UNPAID', '2026-09-26T09:20:00+07:00', { allowed_actions: ['PREPARE', 'CANCEL'] }),
  makeOrder(9003, 'ORD-20260926-003', 'PREPARING', [orderItem(3, 10202, 2)], 'UNPAID', '2026-09-26T10:45:00+07:00', { allowed_actions: ['SHIP', 'CANCEL'] }),
  makeOrder(9004, 'ORD-20260925-014', 'SHIPPING', [orderItem(4, 10302, 1), orderItem(5, 10502, 1)], 'UNPAID', '2026-09-25T12:30:00+07:00', { allowed_actions: ['COMPLETE', 'DELIVERY_FAILED'] }),
  makeOrder(9005, 'ORD-20260925-011', 'DELIVERY_FAILED', [orderItem(6, 10401, 1)], 'UNPAID', '2026-09-25T09:40:00+07:00', { customer_service_note: 'Liên hệ lại khách trước khi giao lại.', allowed_actions: ['RETRY', 'CANCEL'] }),
  makeOrder(9006, 'ORD-20260924-020', 'COMPLETED', [orderItem(7, 10002, 1), orderItem(8, 10203, 1)], 'PAID', '2026-09-24T11:00:00+07:00'),
  makeOrder(9007, 'ORD-20260923-018', 'RETURNED', [orderItem(9, 10103, 1)], 'REFUNDED', '2026-09-23T13:10:00+07:00', { customer_service_note: 'Hoàn trả toàn đơn tại cửa hàng.' }),
  makeOrder(9008, 'ORD-20260922-010', 'CANCELLED', [orderItem(10, 10301, 1)], 'UNPAID', '2026-09-22T16:20:00+07:00'),
];

export const mockOrderSummaries: OrderSummaryDto[] = mockOrderDetails.map((order) => ({
  order_id: order.order_id,
  order_code: order.order_code,
  order_status: order.order_status,
  payment_status: order.payment.payment_status,
  total: order.total,
  created_at: order.created_at,
  completed_at: order.completed_at,
  returned_at: order.returned_at,
}));

export const mockSuppliers: SupplierDto[] = [
  { supplier_id: 301, name: 'Nhà cung cấp Denim A', phone: '02873001001', email: 'denim.a@example.com', address: 'TP. Hồ Chí Minh', usage_status: 'ACTIVE', note: 'Cung cấp vải denim.' },
  { supplier_id: 302, name: 'Nhà cung cấp Linen B', phone: '02473001002', email: 'linen.b@example.com', address: 'Hà Nội', usage_status: 'ACTIVE', note: 'Cung cấp linen.' },
  { supplier_id: 303, name: 'Nhà cung cấp Phụ liệu C', phone: '02873001003', email: null, address: 'Bình Dương', usage_status: 'INACTIVE', note: 'Phụ liệu may mặc.' },
];

export const mockGoodsReceipts: GoodsReceiptDetailDto[] = [
  {
    receipt_id: 401,
    receipt_code: 'GR-20260926-001',
    supplier_id: 301,
    receipt_status: 'CONFIRMED',
    receipt_date: '2026-09-26',
    confirmed_at: '2026-09-26T09:30:00+07:00',
    created_at: '2026-09-26T08:00:00+07:00',
    created_by_account_id: 2003,
    confirmed_by_account_id: 2003,
    note: 'Nhập bổ sung denim.',
    items: [{ receipt_item_id: 4101, variant_id: 10003, quantity: 20 }, { receipt_item_id: 4102, variant_id: 10004, quantity: 20 }],
    updated_at: '2026-09-26T09:30:00+07:00',
  },
  {
    receipt_id: 402,
    receipt_code: 'GR-20260926-002',
    supplier_id: 302,
    receipt_status: 'DRAFT',
    receipt_date: '2026-09-26',
    confirmed_at: null,
    created_at: '2026-09-26T13:00:00+07:00',
    created_by_account_id: 2003,
    confirmed_by_account_id: null,
    note: 'Chờ kiểm đếm.',
    items: [{ receipt_item_id: 4201, variant_id: 10202, quantity: 15 }],
    updated_at: '2026-09-26T13:30:00+07:00',
  },
  {
    receipt_id: 403,
    receipt_code: 'GR-20260925-004',
    supplier_id: 303,
    receipt_status: 'CANCELLED',
    receipt_date: '2026-09-25',
    confirmed_at: null,
    created_at: '2026-09-25T10:00:00+07:00',
    created_by_account_id: 2003,
    confirmed_by_account_id: null,
    note: 'Hủy do sai số lượng chứng từ.',
    items: [{ receipt_item_id: 4301, variant_id: 10501, quantity: 12 }],
    updated_at: '2026-09-25T11:00:00+07:00',
  },
];

export const mockInventoryRows: InventoryRowDto[] = variants.map(({ product, variant }) => ({
  variant_id: variant.variant_id,
  sku: variant.sku,
  product_id: product.product_id,
  product_name: product.name,
  size: variant.size.display_name,
  color: variant.color.name,
  sale_status: variant.sale_status,
  available_quantity: variant.available_quantity,
  updated_at: '2026-09-26T23:30:00+07:00',
}));

export const mockInventoryTransactions: InventoryTransactionDto[] = [
  { txn_id: 6001, variant_id: 10003, quantity_delta: 20, transaction_type: 'GOODS_RECEIPT', order_id: null, goods_receipt_id: 401, actor_account_id: 2003, reason: 'Xác nhận phiếu nhập GR-20260926-001', created_at: '2026-09-26T09:30:00+07:00' },
  { txn_id: 6002, variant_id: 10004, quantity_delta: 20, transaction_type: 'GOODS_RECEIPT', order_id: null, goods_receipt_id: 401, actor_account_id: 2003, reason: 'Xác nhận phiếu nhập GR-20260926-001', created_at: '2026-09-26T09:30:00+07:00' },
  { txn_id: 6003, variant_id: 10002, quantity_delta: -1, transaction_type: 'ORDER_CONFIRMED', order_id: 9006, goods_receipt_id: null, actor_account_id: 2002, reason: 'Xác nhận đơn ORD-20260924-020', created_at: '2026-09-24T11:10:00+07:00' },
  { txn_id: 6004, variant_id: 10203, quantity_delta: -1, transaction_type: 'ORDER_CONFIRMED', order_id: 9006, goods_receipt_id: null, actor_account_id: 2002, reason: 'Xác nhận đơn ORD-20260924-020', created_at: '2026-09-24T11:10:00+07:00' },
  { txn_id: 6005, variant_id: 10103, quantity_delta: 1, transaction_type: 'RETURN', order_id: 9007, goods_receipt_id: null, actor_account_id: 2002, reason: 'Hoàn tồn đơn trả lại', created_at: '2026-09-26T14:20:00+07:00' },
  { txn_id: 6006, variant_id: 10301, quantity_delta: 2, transaction_type: 'ADJUSTMENT_IN', order_id: null, goods_receipt_id: null, actor_account_id: 2003, reason: 'Kiểm kê điều chỉnh tăng', created_at: '2026-09-26T16:00:00+07:00' },
];

export const mockAuditLogs: AuditLogDto[] = [
  { audit_id: 7001, actor_account_id: 2002, action: 'ORDER_CONFIRM', target_type: 'Order', target_id: '9002', description: 'Xác nhận đơn ORD-20260926-002.', created_at: '2026-09-26T09:40:00+07:00' },
  { audit_id: 7002, actor_account_id: 2003, action: 'GOODS_RECEIPT_CONFIRM', target_type: 'GoodsReceipt', target_id: '401', description: 'Xác nhận phiếu nhập GR-20260926-001.', created_at: '2026-09-26T09:30:00+07:00' },
  { audit_id: 7003, actor_account_id: 2003, action: 'INVENTORY_ADJUST', target_type: 'ProductVariant', target_id: '10301', description: 'Điều chỉnh tồn +2 sau kiểm kê.', created_at: '2026-09-26T16:00:00+07:00' },
  { audit_id: 7004, actor_account_id: 2001, action: 'ROLE_UPDATE', target_type: 'Role', target_id: '2', description: 'Cập nhật tập permission của ADMIN.', created_at: '2026-09-26T18:10:00+07:00' },
  { audit_id: 7005, actor_account_id: 2001, action: 'STAFF_ACCOUNT_UPDATE', target_type: 'Account', target_id: '2003', description: 'Cập nhật vai trò tài khoản nội bộ.', created_at: '2026-09-26T18:20:00+07:00' },
];

const completedSales = mockOrderDetails
  .filter((order) => order.order_status === 'COMPLETED')
  .reduce((sum, order) => sum + order.total, 0);
const returnedAdjustment = mockOrderDetails
  .filter((order) => order.order_status === 'RETURNED')
  .reduce((sum, order) => sum + order.total, 0);

export const mockReportOverview: ReportOverviewDto = {
  from: '2026-09-01',
  to: '2026-09-27',
  completed_sales: completedSales,
  returned_adjustment: returnedAdjustment,
  net_sales: completedSales - returnedAdjustment,
  orders_by_status: mockOrderDetails.reduce<Record<string, number>>((acc, order) => {
    acc[order.order_status] = (acc[order.order_status] ?? 0) + 1;
    return acc;
  }, {}),
};

export const mockContentPages: ContentPageDto[] = [
  { page_id: 901, page_code: 'RETURN_POLICY', title: 'Chính sách đổi trả', content: 'Nội dung chính sách đổi trả dùng cho môi trường mock.', updated_by_account_id: 2001, updated_at: '2026-09-26T19:00:00+07:00' },
  { page_id: 902, page_code: 'SHIPPING_POLICY', title: 'Chính sách giao hàng', content: 'Nội dung chính sách giao hàng COD dùng cho môi trường mock.', updated_by_account_id: 2001, updated_at: '2026-09-26T19:05:00+07:00' },
];

export const mockCustomerSummaries: CustomerSummaryDto[] = mockAccounts
  .filter((account) => account.account_id >= 1000 && account.account_id < 2000)
  .map((account) => {
    const orders = mockOrderDetails.filter((order) => order.customer_account_id === account.account_id);
    return {
      account_id: account.account_id,
      phone: account.phone,
      email: account.email,
      order_count: orders.length,
      last_order_at: orders.map((order) => order.created_at).sort().at(-1) ?? null,
    };
  });

export const mockCustomerDetails: CustomerDetailDto[] = mockCustomerSummaries.map((summary) => {
  const account = mockAccounts.find((item) => item.account_id === summary.account_id)!;
  return {
    account,
    addresses: mockAddresses[summary.account_id] ?? [],
    orders: mockOrderSummaries.filter((order) =>
      mockOrderDetails.some((detail) => detail.order_id === order.order_id && detail.customer_account_id === summary.account_id),
    ),
  };
});
