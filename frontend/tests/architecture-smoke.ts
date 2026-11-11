import { buildProductCreate, emptyProductCreateForm, validateProductImageFiles, productCreateServerError } from '../src/features/catalog/model/productCreateForm';
import { attributeDraftFromValues, buildProductAttributeValueIds, preserveUnmanagedProductAttributeValueIds, sameProductAttributeValueIds } from '../src/features/catalog/model/productAttributeForm';
import assert from 'node:assert/strict';
import { productSummaryMetadata } from '../src/features/catalog/model/productSummary';
import { LatestMutationQueue } from '../src/features/cart/model/LatestMutationQueue';
import {
  buildFamilyGallery,
  buildMovedImageOrder,
  sortProductImages,
} from '../src/features/catalog/model/productImageOrder';
import type { ProductFamilyDto, ProductImageDto } from '../src/features/catalog/types';
import { selectHomepageParentCategories } from '../src/features/catalog/model/categoryTree';
import {
  canAccessAdminModule,
  canWriteAdminModule,
} from '../src/features/auth/session/adminAccessPolicy';
import { canPurchaseProduct } from '../src/features/catalog/model/purchaseAvailability';
import { buildCheckoutQuoteKey } from '../src/features/orders/model/checkoutQuoteKey';
import {
  voucherStatusOptions,
  voucherRequestFields,
  voucherSubmission,
} from '../src/features/promotion/model/voucherFormModel';
import type { VoucherInput } from '../src/features/promotion/types';
import { getVietnamMonthStart, getVietnamToday } from '../src/shared/time/vietnamCalendar';
import { isAdminProfile, isSuperAdminProfile } from '../src/features/auth/session/sessionAccess';
import {
  adminCustomerDetailPath,
  adminOrderDetailPath,
  adminProductDetailPath,
  checkoutSuccessPath,
  orderDetailPath,
  productDetailPath,
  resolveAdminRoute,
  toAdminChildPath,
} from '../src/routes/paths';
import { setApiAccessToken, subscribeToApiAccessToken } from '../src/services/http/apiClient';
import type { MeDto } from '../src/features/auth/types';

const homepageCategoryFixture = [
  { category_id: 1, parent_category_id: null, name: 'Root parent' },
  { category_id: 2, parent_category_id: null, name: 'Root leaf' },
  { category_id: 3, parent_category_id: 1, name: 'Nested parent' },
  { category_id: 4, parent_category_id: 3, name: 'Nested leaf' },
  { category_id: 5, parent_category_id: 999, name: 'Orphan parent' },
  { category_id: 6, parent_category_id: 5, name: 'Orphan child' },
];
assert.deepEqual(
  selectHomepageParentCategories(homepageCategoryFixture).map((category) => category.category_id),
  [1],
  'only explicit top-level categories with descendants own home showcases',
);

const summary = {
  id: '1',
  product_id: 1,
  sku: 'FIDO-PANTS-1',
  name: 'Managed product',
  slug: 'managed-product',
  imageUrl: '',
  selling_price: 200000,
  status: 'ACTIVE' as const,
  brand: 'FIDO',
  category: 'Quần',
};
assert.deepEqual(productSummaryMetadata(summary), {
  text: 'Thương hiệu: FIDO',
  label: 'Thương hiệu: FIDO',
});
assert.deepEqual(productSummaryMetadata({ ...summary, brand: '' }), {
  text: 'Danh mục: Quần',
  label: 'Danh mục: Quần',
});
assert.equal(productSummaryMetadata({ ...summary, brand: '', category: '' }), null);

const profileWithRole = (code: string, permissionCodes: readonly string[] = []): MeDto => ({
  account: {
    id: 1,
    full_name: 'Test Account',
    phone: '0900000000',
    email: null,
    status: 'ACTIVE',
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
  },
  addresses: [],
  roles: [
    {
      role_id: 1,
      code,
      name: code,
      description: null,
    },
  ],
  permissions: permissionCodes.map((permissionCode, index) => ({
    permission_id: index + 1,
    code: permissionCode,
    name: permissionCode,
  })),
});

assert.equal(isAdminProfile(profileWithRole('SUPERADMIN')), true);
assert.equal(isAdminProfile(profileWithRole('ADMIN')), true);
assert.equal(isAdminProfile(profileWithRole('CUSTOMER')), false);
assert.equal(isAdminProfile(null), false);
assert.equal(isSuperAdminProfile(profileWithRole('SUPERADMIN')), true);
assert.equal(isSuperAdminProfile(profileWithRole('ADMIN')), false);

const voucherStaff = profileWithRole('ADMIN', ['VOUCHER_WRITE']);
assert.equal(canAccessAdminModule('vouchers', voucherStaff, ['VOUCHER_WRITE']), true);
assert.equal(canAccessAdminModule('products', voucherStaff, ['VOUCHER_WRITE']), false);
const voucherFixture: VoucherInput = {
  code: ' WELCOME10 ', discount_type: 'PERCENT', discount_value: 1250,
  maximum_discount: null, minimum_order_value: 400000,
  starts_at: null, ends_at: null, usage_limit: 10,
};
const voucherServerDetail = { ...voucherFixture, id: 990001, usage_count: 2, status: 'ACTIVE' };
assert.deepEqual(voucherRequestFields(voucherServerDetail), voucherFixture);
assert.deepEqual(voucherSubmission(voucherServerDetail), { ...voucherFixture, code: 'WELCOME10' });
assert.equal(voucherSubmission(voucherServerDetail).discount_value, 1250, 'percent is stored as basis points');
assert.equal(voucherSubmission({ ...voucherFixture, discount_type: 'FIXED', maximum_discount: 1000 }).maximum_discount, 1000,
  'do not erase a valid server cap');
assert.deepEqual(voucherStatusOptions.EXPIRED, ['EXPIRED'], 'expired vouchers cannot be reactivated');
assert.deepEqual(voucherStatusOptions.DRAFT, ['DRAFT', 'ACTIVE', 'INACTIVE']);

const catalogStaff = profileWithRole('ADMIN', ['CATALOG_READ', 'CATALOG_WRITE']);
assert.equal(
  canAccessAdminModule('dashboard', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']),
  true,
);
assert.equal(
  canAccessAdminModule('products', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']),
  true,
);
assert.equal(
  canAccessAdminModule('inventory', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']),
  false,
);
assert.equal(
  canAccessAdminModule('reports', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']),
  false,
);
assert.equal(canAccessAdminModule('reports', profileWithRole('SUPERADMIN'), []), true);
assert.equal(canAccessAdminModule('products', profileWithRole('CUSTOMER'), []), false);

const catalogReadOnly = profileWithRole('ADMIN', ['CATALOG_READ']);
assert.equal(canWriteAdminModule('products', catalogReadOnly, ['CATALOG_READ']), false);
assert.equal(
  canWriteAdminModule('products', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']),
  true,
);
assert.equal(
  canWriteAdminModule('inventory', profileWithRole('ADMIN', ['INVENTORY_READ']), [
    'INVENTORY_READ',
  ]),
  false,
);
assert.equal(
  canWriteAdminModule(
    'inventory',
    profileWithRole('ADMIN', ['INVENTORY_READ', 'INVENTORY_WRITE']),
    ['INVENTORY_READ', 'INVENTORY_WRITE'],
  ),
  true,
);
assert.equal(canWriteAdminModule('content', profileWithRole('SUPERADMIN'), []), true);

assert.equal(canPurchaseProduct('ACTIVE'), true);
assert.equal(canPurchaseProduct('DRAFT'), false);
assert.equal(canPurchaseProduct('INACTIVE'), false);
assert.equal(canPurchaseProduct('ARCHIVED'), false);
assert.equal(canPurchaseProduct(undefined), false);

const checkoutRequest = {
  recipient_name: 'Test Customer',
  recipient_phone: '0900000000',
  province: 'Hà Nội',
  district: 'Hoàn Kiếm',
  ward: 'Hàng Trống',
  address_line: '1 Đinh Tiên Hoàng',
  voucher_code: null,
};
assert.notEqual(
  buildCheckoutQuoteKey(checkoutRequest, 4),
  buildCheckoutQuoteKey(checkoutRequest, 5),
  'any cart revision change must invalidate an existing checkout quote',
);

const vietnamBoundary = new Date('2026-10-07T17:30:00.000Z');
assert.equal(getVietnamToday(vietnamBoundary), '2026-10-08');
assert.equal(getVietnamMonthStart(vietnamBoundary), '2026-10-01');

assert.deepEqual(resolveAdminRoute('/admin/products/960003'), {
  menuKey: 'product-detail',
  breadcrumb: 'Chi tiết sản phẩm',
  productId: '960003',
});
assert.deepEqual(resolveAdminRoute('/admin/orders/42'), {
  menuKey: 'order-detail',
  breadcrumb: 'Chi tiết đơn hàng',
  orderId: 42,
});
assert.equal(resolveAdminRoute('/admin/inventory/history').menuKey, 'history');
assert.equal(productDetailPath('A/B'), '/products/A%2FB');
assert.equal(orderDetailPath(42), '/orders/42');
assert.equal(checkoutSuccessPath(42), '/checkout/success/42');
assert.equal(adminProductDetailPath(960003), '/admin/products/960003');
assert.equal(adminOrderDetailPath(42), '/admin/orders/42');
assert.equal(adminCustomerDetailPath(7), '/admin/customers/7');
assert.equal(toAdminChildPath('/admin/catalog/categories'), 'catalog/categories');

const imageFixtures = [
  { id: 3, image_url: '3.jpg', is_primary: false, sort_order: 2 },
  { id: 1, image_url: '1.jpg', is_primary: true, sort_order: 0 },
  { id: 2, image_url: '2.jpg', is_primary: false, sort_order: 1 },
];
assert.deepEqual(
  sortProductImages(imageFixtures).map((image) => image.id),
  [1, 2, 3],
);
assert.deepEqual(buildMovedImageOrder(imageFixtures, 2, -1), [
  { image_id: 2, sort_order: 0 },
  { image_id: 1, sort_order: 1 },
  { image_id: 3, sort_order: 2 },
]);
assert.equal(buildMovedImageOrder(imageFixtures, 1, -1), null);
assert.equal(buildMovedImageOrder(imageFixtures, 3, 1), null);

const galleryMember = (id: number, images: ProductImageDto[]): ProductFamilyDto['members'][number] => ({
  product_id: id, parent_product_id: id === 10 ? null : 10, sku: 'SKU-' + id, name: null,
  selling_price: 100000, status: 'ACTIVE', images, attribute_values: [],
  available_quantity: 0, purchasable: false,
});
const galleryImage = (id: number, sort: number, url: string): ProductImageDto => ({
  id, sort_order: sort, image_url: url, is_primary: sort === 0,
});
const galleryFamily: ProductFamilyDto = { root_product_id: 10, members: [
  galleryMember(30, [galleryImage(30, 0, 'child-30.jpg')]),
  galleryMember(2, [galleryImage(22, 1, 'child-2.jpg'), galleryImage(21, 0, 'shared.jpg')]),
  galleryMember(10, [galleryImage(12, 1, 'shared.jpg'), galleryImage(11, 1, 'root.jpg')]),
] };
const galleryBefore = structuredClone(galleryFamily);
assert.deepEqual(buildFamilyGallery(galleryFamily), ['root.jpg', 'shared.jpg', 'child-2.jpg', 'child-30.jpg'],
  'root first, children by ID, images by sort_order then ID, URLs unique, sold-out images included');
assert.deepEqual(galleryFamily, galleryBefore, 'display gallery never mutates Product-owned images');
assert.deepEqual(buildFamilyGallery({ ...galleryFamily, members: galleryFamily.members.filter(m => m.product_id !== 10) }),
  ['shared.jpg', 'child-2.jpg', 'child-30.jpg'], 'gallery uses only the public members returned by the API');
assert.deepEqual(buildFamilyGallery({ root_product_id: 10, members: [galleryMember(10, [])] }), []);
assert.deepEqual(buildFamilyGallery({ root_product_id: 10, members: [] }), []);

const tokenEvents: Array<string | null> = [];
const unsubscribe = subscribeToApiAccessToken((token) => tokenEvents.push(token));
setApiAccessToken('architecture-token');
setApiAccessToken('architecture-token');
setApiAccessToken(null);
unsubscribe();
assert.deepEqual(tokenEvents, ['architecture-token', null]);

const executionOrder: string[] = [];
const publishedValues: number[] = [];
let resolveLatest!: () => void;
const latestPublished = new Promise<void>((resolve) => {
  resolveLatest = resolve;
});
const queue = new LatestMutationQueue<number>();

queue.enqueue(
  async () => {
    executionOrder.push('first');
    return 1;
  },
  {
    onLatestSuccess: (value) => publishedValues.push(value),
    onLatestError: () => {
      throw new Error('first operation should not fail');
    },
  },
);

queue.enqueue(
  async () => {
    executionOrder.push('second');
    return 2;
  },
  {
    onLatestSuccess: (value) => {
      publishedValues.push(value);
      resolveLatest();
    },
    onLatestError: () => {
      throw new Error('second operation should not fail');
    },
  },
);

await latestPublished;
assert.deepEqual(executionOrder, ['first', 'second']);
assert.deepEqual(publishedValues, [2], 'only the newest queued cart response may publish');

const invalidatedQueue = new LatestMutationQueue<number>();
const invalidatedPublishedValues: number[] = [];
let resolveInvalidated!: () => void;
const invalidatedFinished = new Promise<void>((resolve) => {
  resolveInvalidated = resolve;
});
invalidatedQueue.enqueue(
  async () => {
    await Promise.resolve();
    return 99;
  },
  {
    onLatestSuccess: (value) => {
      invalidatedPublishedValues.push(value);
      resolveInvalidated();
    },
    onLatestError: resolveInvalidated,
  },
);
invalidatedQueue.invalidate();
await Promise.race([invalidatedFinished, new Promise<void>((resolve) => setTimeout(resolve, 20))]);
assert.deepEqual(
  invalidatedPublishedValues,
  [],
  'invalidating the cart queue must suppress stale in-flight publication',
);

process.stdout.write('Frontend architecture smoke: PASS\n');

const { formatVietnamDateTime } = await import('../src/shared/time/formatVietnamDateTime');
assert.equal(
  formatVietnamDateTime('2026-10-07T17:30:00'),
  formatVietnamDateTime('2026-10-07T17:30:00Z'),
  'backend UTC timestamps without offset must not use browser timezone',
);
assert.equal(formatVietnamDateTime('invalid'), '—');
const { statusLabel } = await import('../src/shared/admin/statusLabels');
assert.equal(statusLabel('PENDING'), 'Chờ xác nhận');
assert.equal(statusLabel('REFUNDED'), 'Đã hoàn tiền');
assert.equal(statusLabel('DRAFT'), 'Bản nháp');

const { sameCheckoutQuote } = await import('../src/features/orders/model/sameCheckoutQuote');
const confirmedQuote = {
  items: [
    {
      product_id: 1,
      quantity: 2,
      product_name: 'Áo',
      thumbnail: null,
      sku: 'FIDO-001',
      unit_price: 100000,
      discount_amount: 0,
      line_total: 200000,
      available_quantity: 10,
    },
  ],
  subtotal: 200000,
  discount_amount: 0,
  shipping_fee: 30000,
  total_amount: 230000,
  voucher: null,
};
assert.equal(sameCheckoutQuote(confirmedQuote, structuredClone(confirmedQuote)), true);
assert.equal(sameCheckoutQuote(confirmedQuote, { ...confirmedQuote, total_amount: 240000 }), false);
assert.equal(
  sameCheckoutQuote(confirmedQuote, {
    ...confirmedQuote,
    items: [{ ...confirmedQuote.items[0], quantity: 3 }],
  }),
  false,
);
assert.equal(
  sameCheckoutQuote(confirmedQuote, {
    ...confirmedQuote,
    items: [{ ...confirmedQuote.items[0], product_id: 2 }],
  }),
  false,
);
assert.equal(
  sameCheckoutQuote(confirmedQuote, {
    ...confirmedQuote,
    items: [{ ...confirmedQuote.items[0], available_quantity: 9 }],
  }),
  true,
);

const drainingQueue = new LatestMutationQueue<number>();
let releasePending: () => void = () => {
  throw new Error('Pending operation not initialized');
};
const pendingOperation = new Promise<void>((resolve) => {
  releasePending = resolve;
});
const drainedValues: number[] = [];
drainingQueue.enqueue(
  async () => {
    await pendingOperation;
    return 1;
  },
  {
    onLatestSuccess: (value) => drainedValues.push(value),
    onLatestError: () => {
      throw new Error('Unexpected failure');
    },
  },
);
let drained = false;
const waitForDrain = drainingQueue.whenIdle().then(() => {
  drained = true;
});
await Promise.resolve();
assert.equal(drained, false, 'checkout must wait for pending cart mutations');
releasePending();
await waitForDrain;
assert.deepEqual(drainedValues, [1]);
assert.equal(drained, true);
process.stdout.write('Checkout quote comparison and cart drain: PASS\n');

assert.equal(canAccessAdminModule('reports', profileWithRole('ADMIN'), ['REPORT_READ']), true);
assert.equal(canAccessAdminModule('reports', profileWithRole('ADMIN'), []), false);
assert.equal(canAccessAdminModule('reports', profileWithRole('CUSTOMER'), ['REPORT_READ']), false);

import {
  readReportFilters,
  orderDrilldown,
  isCalendarDate,
} from '../src/features/report/model/reportFilters';
import { parseSales, parseOrders, parseProducts } from '../src/features/report/api/parseReport';
assert.equal(isCalendarDate('2026-02-30'), false);
assert.equal(readReportFilters(new URLSearchParams('from=bad&to=2026-10-10')).valid, false);
assert.equal(readReportFilters(new URLSearchParams('from=2026-10-10&to=2026-10-01')).valid, false);
assert.equal(readReportFilters(new URLSearchParams('granularity=YEAR')).valid, false);
const drill = new URL(
  orderDrilldown(
    { from: '2026-10-01', to: '2026-10-10', granularity: 'WEEK' },
    'PENDING',
    '2026-09-28',
  ),
  'http://test',
);
assert.equal(drill.searchParams.get('created_from'), '2026-09-30T17:00:00Z');
assert.equal(drill.searchParams.get('created_to'), '2026-10-04T16:59:59.999999Z');
assert.equal(drill.searchParams.get('status'), 'PENDING');
assert.throws(() =>
  parseSales({
    from: '2026-01-01',
    to: '2026-01-01',
    granularity: 'DAY',
    timezone: 'UTC',
    points: [],
  }),
);
assert.throws(() =>
  parseProducts({
    from: '2026-01-01',
    to: '2026-01-01',
    items: [
      {
        product_id: 1,
        product_name: 'Test',
        thumbnail: null,
        completed_units: 'bad',
        returned_units: 0,
        net_units: 0,
      },
    ],
  }),
);
assert.throws(() =>
  parseOrders({
    from: '2026-01-01',
    to: '2026-01-01',
    granularity: 'DAY',
    timezone: 'Asia/Ho_Chi_Minh',
    points: [{ period_start: '2026-01-01', total_orders: 3, orders_by_status: {} }],
  }),
);

import {
  readCatalogQuery,
  catalogQueryParams,
  catalogUrlParams,
} from '../src/features/catalog/model/catalogQuery';
import { recipientErrors } from '../src/features/orders/model/recipientValidation';
import { getStorefrontErrorMessage } from '../src/services/http/storefrontError';
import { ApiClientError } from '../src/services/http/apiError';
assert.deepEqual(
  readCatalogQuery(
    new URLSearchParams('page=NaN&category_id=-1&brand_id=1.2&min_price=-2&max_price=bad'),
  ),
  { page: 1 },
);
assert.deepEqual(readCatalogQuery(new URLSearchParams('min_price=200&max_price=100')), { page: 1 });
assert.deepEqual(
  readCatalogQuery(new URLSearchParams('page=2147483648&category_id=2')),
  { page: 1, category_id: 2 },
  'page must fit the backend Integer contract',
);
assert.equal(
  readCatalogQuery(new URLSearchParams('page=2147483647')).page,
  2147483647,
  'do not invent a smaller pagination limit',
);
const sharedCatalogQuery = readCatalogQuery(
  new URLSearchParams('q=shirt&category_id=2&min_price=0&page=2'),
);
assert.equal(
  catalogQueryParams(sharedCatalogQuery).toString(),
  'q=shirt&category_id=2&min_price=0&page=2',
);
const scopedCatalogQuery = readCatalogQuery(
  new URLSearchParams('q=shirt&category_id=999&brand_id=2&page=3'),
  null,
  4,
);
assert.deepEqual(
  scopedCatalogQuery,
  { page: 3, q: 'shirt', category_id: 4, brand_id: 2 },
  'route category cannot be replaced by a URL category',
);
assert.equal(
  catalogQueryParams(scopedCatalogQuery).get('category_id'),
  '4',
  'API still receives the route category',
);
assert.equal(
  catalogUrlParams(scopedCatalogQuery, 4).toString(),
  'q=shirt&brand_id=2&page=3',
  'category URL preserves filters and pagination without duplicate scope',
);
const validRecipient = {
  recipient_name: 'Test Customer',
  recipient_phone: '+84 90-000-0000',
  province: 'Hà Nội',
  district: 'Hoàn Kiếm',
  ward: 'Hàng Trống',
  address_line: '1 Đinh Tiên Hoàng',
  voucher_code: null,
};
assert.deepEqual(recipientErrors(validRecipient), {
  name: null,
  phone: null,
  province: null,
  district: null,
  ward: null,
  addressLine: null,
});
assert.ok(recipientErrors({ ...validRecipient, recipient_name: ' ' }).name);
assert.ok(recipientErrors({ ...validRecipient, recipient_phone: 'bad' }).phone);
assert.ok(recipientErrors({ ...validRecipient, province: ' ' }).province);
assert.ok(recipientErrors({ ...validRecipient, district: ' ' }).district);
assert.ok(recipientErrors({ ...validRecipient, ward: ' ' }).ward);
assert.ok(recipientErrors({ ...validRecipient, address_line: ' ' }).addressLine);
assert.equal(
  getStorefrontErrorMessage(new ApiClientError('SQL private stack', 500), 'Thử lại.'),
  'Thử lại.',
);
assert.match(
  getStorefrontErrorMessage(new ApiClientError('Unauthorized', 401), 'Thử lại.'),
  /đăng nhập/,
);
assert.match(
  getStorefrontErrorMessage(new ApiClientError('Forbidden', 403), 'Thử lại.'),
  /không có quyền/,
);
console.log('Storefront URL, structured recipient and safe error models: PASS');

// Product option drafts preserve persisted IDs even when metadata is partial.
const optionAttribute = { id: 99, code: 'MATERIAL', name: 'Material', is_required: true,
  is_variant_defining: false, sort_order: 0,
  options: [{ id: 991, attribute_id: 99, value: 'COTTON', label: 'Cotton', sort_order: 0 }] };
const savedOption = { attribute_id: 99, attribute_code: 'MATERIAL', attribute_name: 'Material',
  attribute_value_id: 992, value: 'WOOL', label: 'Wool' };
const savedDraft = attributeDraftFromValues([], [savedOption]);
assert.equal(savedDraft['99'], '992');
const retained = buildProductAttributeValueIds([optionAttribute], savedDraft, 'ACTIVE', [savedOption]);
assert.deepEqual(retained, { attributeValueIds: [992], errors: [] });
assert.deepEqual(preserveUnmanagedProductAttributeValueIds([savedOption], [], []), [992]);
assert.ok(sameProductAttributeValueIds(retained.attributeValueIds, [992]));
assert.deepEqual(buildProductAttributeValueIds([optionAttribute], { '99': '991' }, 'ACTIVE').attributeValueIds, [991]);
assert.equal(buildProductAttributeValueIds([optionAttribute], {}, 'ACTIVE').errors.length, 1);
assert.equal(buildProductAttributeValueIds([optionAttribute], {}, 'DRAFT').errors.length, 0);
assert.equal(buildProductAttributeValueIds([optionAttribute], { '99': '992' }, 'DRAFT').errors.length, 1);
console.log('Product option draft preservation: PASS');

assert.equal(buildProductAttributeValueIds([], savedDraft, 'DRAFT').errors.length, 1,
  'Create must not silently drop a selection when its Attribute disappears from metadata');
assert.equal(buildProductAttributeValueIds([], savedDraft, 'DRAFT', [savedOption]).errors.length, 0);

// Create feedback uses the same option-only and integer VND contract as the server.
const createBase = { ...emptyProductCreateForm, sku: ' NEW-SKU ', sellingPrice: '0' };
const minimalCreate = buildProductCreate(createBase, {}, null, null);
assert.ok(minimalCreate.payload, 'minimal DRAFT does not require metadata');
assert.equal(minimalCreate.payload.selling_price, 0);
assert.equal(minimalCreate.payload.sku, 'NEW-SKU');
assert.equal(minimalCreate.payload.category_id, null);
assert.equal(buildProductCreate({ ...createBase, sellingPrice: '' }, {}, null, null).payload, null);
assert.ok(buildProductCreate({ ...createBase, sellingPrice: '1.50' }, {}, null, null).errors.sellingPrice);
assert.ok(buildProductCreate({ ...createBase, costPrice: '-1' }, {}, null, null).errors.costPrice);
assert.ok(buildProductCreate({ ...createBase, status: 'ACTIVE' }, {}, null, null).errors.attributes);
const createMeta = { attributes: [optionAttribute] };
assert.ok(buildProductCreate({ ...createBase, status: 'ACTIVE' }, {}, null, createMeta).errors['attribute:99']);
assert.deepEqual(buildProductCreate({ ...createBase, status: 'ACTIVE' }, { '99': '991' }, null, createMeta).payload?.attribute_value_ids, [991]);
assert.equal(buildProductCreate(createBase, { '99': '991' }, null, { attributes: [] }).payload, null,
  'metadata refresh cannot silently discard a selected Option');
assert.ok(buildProductCreate({ ...createBase, categoryId: '1' }, {}, {
  categories: [{ category_id: 1, parent_category_id: null, name: 'Old', slug: 'old', status: 'INACTIVE' }], brands: [], attributes: [],
}, createMeta).errors.categoryId);
assert.deepEqual(productCreateServerError('PRODUCT_SKU_ALREADY_EXISTS')?.[0], 'sku');
assert.equal(productCreateServerError('CONFLICT'), null, 'a generic conflict is never assumed to be a duplicate SKU');
const uploadLimits = { max_files: 2, max_file_bytes: 10, max_request_bytes: 30, content_types: ['image/png'] };
const smallImage = new File([new Uint8Array(8)], 'small.png', { type: 'image/png' });
assert.equal(validateProductImageFiles([smallImage], uploadLimits), null);
assert.ok(validateProductImageFiles([smallImage], undefined));
assert.ok(validateProductImageFiles([smallImage, smallImage, smallImage], uploadLimits));
assert.ok(validateProductImageFiles([new File([new Uint8Array(11)], 'big.png', { type: 'image/png' })], uploadLimits));
assert.ok(validateProductImageFiles([new File(['text'], 'fake.txt', { type: 'text/plain' })], uploadLimits));
console.log('Product Create contract and upload validation: PASS');
