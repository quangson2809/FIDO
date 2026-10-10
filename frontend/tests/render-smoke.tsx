import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Header } from '../src/components/Header';
import { AdminScreen } from '../src/screens/AdminScreen';
import { VoucherForm } from '../src/features/promotion/components/VoucherForm';
import type { VoucherDetail } from '../src/features/promotion/types';
import { ProductPurchasePanel } from '../src/features/catalog/components/ProductDetailSections';
import { AdminProductInfoSection } from '../src/features/catalog/components/AdminProductDetailSections';
import { AuthSessionContext, type AuthSessionContextValue } from '../src/features/auth/session/sessionContext';
import { CartContext, type CartContextValue } from '../src/features/cart/context/cartContext';
import { ToastProvider } from '../src/shared/ui/toast/ToastProvider';
import type { MeDto } from '../src/features/auth/types';
import type { AdminProductDetailDto, ProductDetailDto, ProductVariantDto } from '../src/features/catalog/types';

const noOp = () => undefined;
const asyncNoOp = async () => undefined;

const profile: MeDto = {
  account: {
    account_id: 1,
    phone: '0900000000',
    email: 'catalog@fido.local',
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
  },
  addresses: [],
  roles: [{
    role_id: 2,
    code: 'ADMIN',
    name: 'Admin',
    description: null,
  }],
  permissions: [
    { permission_id: 1, code: 'CATALOG_READ', name: 'Catalog read' },
    { permission_id: 2, code: 'CATALOG_WRITE', name: 'Catalog write' },
  ],
};

const authValue: AuthSessionContextValue = {
  status: 'authenticated',
  sessionError: null,
  profile,
  isAuthenticated: true,
  isAdmin: true,
  permissionCodes: profile.permissions.map((permission) => permission.code),
  login: async () => profile,
  logout: noOp,
  refreshProfile: async () => profile,
};

const cartValue: CartContextValue = {
  isCartOpen: false,
  setIsCartOpen: noOp,
  cartItems: [{
    id: '1',
    name: 'FIDO Tee',
    variantId: 101,
    price: 199000,
    imageUrl: '',
    size: 'M',
    color: 'Black',
    quantity: 2,
  }],
  cartSubtotal: 398000,
  cartRevision: 1,
  isCartBusy: false,
  cartLoading: false, cartError: null,
  withCartLock: async (operation) => operation(),
  synchronizePurchasedCart: asyncNoOp,
  refreshCart: asyncNoOp,
  addToCart: noOp,
  removeFromCart: noOp,
  updateCartQuantity: noOp,
  changeCartQuantity: noOp,
};

const renderWithShell = (node: React.ReactNode, initialEntry = '/') =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthSessionContext.Provider value={authValue}>
        <ToastProvider>
          <CartContext.Provider value={cartValue}>
            {node}
          </CartContext.Provider>
        </ToastProvider>
      </AuthSessionContext.Provider>
    </MemoryRouter>,
  );

const headerHtml = renderWithShell(<Header />);
assert.match(headerHtml, /FIDO/);
assert.match(headerHtml, /Giỏ hàng/);
assert.match(headerHtml, /Tài khoản/);

const adminHtml = renderWithShell(
  <Routes>
    <Route path="/admin" element={<AdminScreen />}>
      <Route path="products" element={<div>Nested admin content</div>} />
    </Route>
  </Routes>,
  '/admin/products',
);
assert.match(adminHtml, /Sản phẩm/);
assert.match(adminHtml, /Nested admin content/);
assert.doesNotMatch(adminHtml, />Tồn kho</);
assert.doesNotMatch(adminHtml, />Vai trò &amp; quyền</);

const voucherAllHtml = renderToStaticMarkup(<VoucherForm voucher={null} canWrite onClose={noOp} onSaved={noOp} />);
assert.match(voucherAllHtml, /Toàn bộ sản phẩm/);
assert.doesNotMatch(voucherAllHtml, /Tìm danh mục|Tìm sản phẩm|ID danh mục|Giảm tối đa/);
const voucherCategory: VoucherDetail = {
  voucher_id: 30, code: 'WELCOME10', discount_type: 'FIXED_AMOUNT', discount_value: 10000,
  maximum_discount: null, minimum_amount: 400000, starts_at: '2026-10-09T00:00:00Z',
  ends_at: '2026-10-12T00:00:00Z', scope: 'CATEGORY',
  product_ids: [], category_ids: [5], global_limit: 10, customer_limit: 1,
  enabled: true, active_usage: 0, ever_used: false,
};
const voucherCategoryHtml = renderToStaticMarkup(<VoucherForm voucher={voucherCategory} canWrite onClose={noOp} onSaved={noOp} />);
assert.match(voucherCategoryHtml, /Chọn danh mục áp dụng/);
assert.doesNotMatch(voucherCategoryHtml, /ID danh mục/);
const voucherProductHtml = renderToStaticMarkup(<VoucherForm
  voucher={{ ...voucherCategory, scope: 'PRODUCT', category_ids: [], product_ids: [12] }}
  canWrite onClose={noOp} onSaved={noOp} />);
assert.match(voucherProductHtml, /Tìm sản phẩm/);
assert.doesNotMatch(voucherProductHtml, /ID sản phẩm/);
const voucherPercentHtml = renderToStaticMarkup(<VoucherForm
  voucher={{ ...voucherCategory, discount_type: 'PERCENTAGE', discount_value: 10, maximum_discount: 10000 }}
  canWrite onClose={noOp} onSaved={noOp} />);
assert.match(voucherPercentHtml, /Giảm tối đa/);

const variant: ProductVariantDto = {
  variant_id: 101,
  size: {
    size_value_id: 10,
    size_system_id: 1,
    code: 'M',
    display_name: 'M',
    sort_order: 1,
  },
  color: {
    color_id: 20,
    code: 'BLACK',
    name: 'Đen',
  },
  sku: 'FIDO-TEE-M-BLK',
  effective_price: 199000,
  sale_status: 'ON_SALE',
  available_quantity: 5,
};

const product: ProductDetailDto = {
  product_id: 1,
  name: 'FIDO Essential Tee',
  description: 'Áo thun cơ bản.',
  category: {
    category_id: 1,
    parent_category_id: null,
    name: 'Áo',
  },
  brand: null,
  size_system: {
    size_system_id: 1,
    code: 'TOP',
    name: 'Áo',
    size_values: [variant.size],
  },
  gender: null,
  season: null,
  style: null,
  material_care: null,
  base_price: 199000,
  sale_status: 'ON_SALE',
  images: [],
  variants: [variant],
};

const purchasePanelHtml = renderToStaticMarkup(
  <ProductPurchasePanel
    product={product}
    selectedVariant={variant}
    onSaleVariants={[variant]}
    sizeOptions={[variant.size]}
    colorOptions={[variant.color]}
    selectedSizeValueId={variant.size.size_value_id}
    selectedColorId={variant.color.color_id}
    quantity={1}
    variantCanBePurchased
    displayedPrice={variant.effective_price}
    sizeAvailability={() => true}
    colorAvailability={() => true}
    colorCompatibility={() => true}
    onSelectSize={noOp}
    onSelectColor={noOp}
    onQuantityChange={noOp}
    onAddToCart={noOp}
  />,
);
assert.match(purchasePanelHtml, /FIDO Essential Tee/);
assert.match(purchasePanelHtml, /Thêm vào giỏ hàng/);
assert.match(purchasePanelHtml, /Còn 5/);

const adminProduct: AdminProductDetailDto = {
  ...product,
  category_id: product.category.category_id,
  brand_id: null,
  size_system_id: product.size_system.size_system_id,
  variants: [],
  created_at: '2026-10-07T00:00:00Z',
  updated_at: '2026-10-07T00:00:00Z',
};
const readOnlyProductInfoHtml = renderToStaticMarkup(
  <AdminProductInfoSection
    product={adminProduct}
    sizeSystems={[adminProduct.size_system]}
    sizeSystemId={String(adminProduct.size_system.size_system_id)}
    onSizeSystemChange={noOp}
    editing={false}
    busy={false}
    canWrite={false}
    name={adminProduct.name}
    description={adminProduct.description ?? ''}
    basePrice={String(adminProduct.base_price)}
    saleStatus={adminProduct.sale_status}
    onEditingChange={noOp}
    onNameChange={noOp}
    onDescriptionChange={noOp}
    onBasePriceChange={noOp}
    onSaleStatusChange={noOp}
    onSave={noOp}
    onCancel={noOp}
  />,
);
assert.doesNotMatch(readOnlyProductInfoHtml, /Chỉnh sửa/);

const stoppedProductPanelHtml = renderToStaticMarkup(
  <ProductPurchasePanel
    product={{ ...product, sale_status: 'STOPPED' }}
    selectedVariant={variant}
    onSaleVariants={[variant]}
    sizeOptions={[variant.size]}
    colorOptions={[variant.color]}
    selectedSizeValueId={variant.size.size_value_id}
    selectedColorId={variant.color.color_id}
    quantity={1}
    variantCanBePurchased={false}
    displayedPrice={variant.effective_price}
    sizeAvailability={() => true}
    colorAvailability={() => true}
    colorCompatibility={() => true}
    onSelectSize={noOp}
    onSelectColor={noOp}
    onQuantityChange={noOp}
    onAddToCart={noOp}
  />,
);
assert.match(stoppedProductPanelHtml, /Sản phẩm đã ngừng bán/);
assert.match(stoppedProductPanelHtml, /Không khả dụng/);
assert.doesNotMatch(stoppedProductPanelHtml, />Thêm vào giỏ hàng</);

process.stdout.write('Frontend render smoke: PASS\n');

// Admin query/permission states are distinct and actionable even without data.
const { QueryFeedback } = await import('../src/shared/admin/QueryFeedback');
const { Pagination } = await import('../src/shared/admin/Pagination');
const { ApiClientError } = await import('../src/services/http/apiError');
assert.match(renderToStaticMarkup(<QueryFeedback loading />), /role="status"/);
assert.match(renderToStaticMarkup(<QueryFeedback empty />), /Chưa có dữ liệu/);
assert.match(renderToStaticMarkup(<QueryFeedback empty filtered />), /Không có kết quả phù hợp/);
const forbiddenHtml = renderToStaticMarkup(<QueryFeedback error={new ApiClientError('Forbidden', 403)} onRetry={noOp} />);
assert.match(forbiddenHtml, /không có quyền/);
assert.match(forbiddenHtml, /Thử lại/);
const paginationHtml = renderToStaticMarkup(<Pagination meta={{ page: 1, page_size: 20, total: 25, total_pages: 2 }} onPage={noOp} />);
assert.match(paginationHtml, /25 kết quả/);
assert.match(paginationHtml, /disabled=""/);
const forbiddenAdmin = renderWithShell(<Routes><Route path="/admin" element={<AdminScreen />}><Route path="inventory" element={<div>Protected inventory content</div>} /></Route></Routes>, '/admin/inventory');
assert.match(forbiddenAdmin, /Không có quyền truy cập/);
assert.doesNotMatch(forbiddenAdmin, /Protected inventory content/);

import { SalesSection, ProductsSection } from '../src/features/report/components/ReportSections';
const zeroSales = renderToStaticMarkup(<SalesSection report={{ from: '2026-01-01', to: '2026-01-01', granularity: 'DAY', timezone: 'Asia/Ho_Chi_Minh', points: [{ period_start: '2026-01-01', completed_sales: 0, returned_adjustment: 0, net_sales: 0 }] }} />);
assert.match(zeroSales, /Chưa có doanh số/);
assert.match(zeroSales, /Bảng doanh số chính xác/);
assert.match(zeroSales, /0₫/);
const ranked = { from: '2026-01-01', to: '2026-01-01', items: [{ product_id: 8, product_name: 'Historical product', thumbnail: null, completed_units: 2, returned_units: 2, net_units: 0 }] };
const forbiddenProductLink = renderToStaticMarkup(<MemoryRouter><ProductsSection report={ranked} canReadCatalog={false} /></MemoryRouter>);
assert.doesNotMatch(forbiddenProductLink, /href=/);
assert.match(forbiddenProductLink, /Historical product/);
const allowedProductLink = renderToStaticMarkup(<MemoryRouter><ProductsSection report={ranked} canReadCatalog /></MemoryRouter>);
assert.match(allowedProductLink, /href="\/admin\/products\/8"/);

import { AboutScreen } from '../src/screens/AboutScreen';
import { Footer } from '../src/components/Footer';
const aboutHtml = renderWithShell(<AboutScreen />, '/about');
assert.equal((aboutHtml.match(/<h1 /g) ?? []).length, 1);
for (const text of ['Câu chuyện FIDO', 'FIT', 'INNOVATE', 'DEVOTE', 'OPEN', 'Khám phá sản phẩm', 'Mua sắm ngay', 'Xem chính sách']) assert.ok(aboutHtml.includes(text));
assert.match(aboutHtml, /href="\/products"/);
assert.match(aboutHtml, /href="\/policies"/);
assert.match(aboutHtml, /loading="lazy"/);
assert.match(renderWithShell(<Header />, '/about'), /<a[^>]*aria-current="page"[^>]*href="\/about"/);
assert.match(renderWithShell(<Footer />), /href="\/about"/);
console.log('About render and navigation checks passed');
