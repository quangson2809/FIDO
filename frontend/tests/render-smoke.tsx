import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Header } from '../src/components/Header';
import { AdminScreen } from '../src/screens/AdminScreen';
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
