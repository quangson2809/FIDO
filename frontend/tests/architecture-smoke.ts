import assert from 'node:assert/strict';
import { LatestMutationQueue } from '../src/features/cart/model/LatestMutationQueue';
import { buildMovedImageOrder, sortProductImages } from '../src/features/catalog/model/productImageOrder';
import { canAccessAdminModule, canWriteAdminModule } from '../src/features/auth/session/adminAccessPolicy';
import { canPurchaseProductVariant } from '../src/features/catalog/model/purchaseAvailability';
import { buildCheckoutQuoteKey } from '../src/features/orders/model/checkoutQuoteKey';
import { changeVoucherScope, changeVoucherDiscountType, voucherRequestFields, voucherSubmission } from '../src/features/promotion/model/voucherFormModel';
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
import {
  setApiAccessToken,
  subscribeToApiAccessToken,
} from '../src/services/http/apiClient';
import type { MeDto } from '../src/features/auth/types';

const profileWithRole = (code: string, permissionCodes: readonly string[] = []): MeDto => ({
  account: {
    account_id: 1,
    phone: '0900000000',
    email: null,
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
  },
  addresses: [],
  roles: [{
    role_id: 1,
    code,
    name: code,
    description: null,
  }],
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
  code: ' WELCOME10 ', discount_type: 'FIXED_AMOUNT', discount_value: 10000,
  maximum_discount: 10, minimum_amount: 400000,
  scope: 'CATEGORY', category_ids: [5, 8], product_ids: [],
  starts_at: '2026-10-09T00:00:00Z', ends_at: '2026-10-12T00:00:00Z',
  global_limit: 10, customer_limit: 1, enabled: true,
};
assert.deepEqual(voucherSubmission(voucherFixture, false).category_ids, [5, 8], 'do not replace real category IDs with labels');
assert.equal(voucherSubmission(voucherFixture, false).maximum_discount, null, 'fixed amount has no cap');
assert.equal(voucherSubmission(voucherFixture, true).maximum_discount, 10, 'preserve immutable historical cap for used voucher');
const voucherServerDetail = { ...voucherFixture, voucher_id: 990001, active_usage: 0, ever_used: true };
const expectedVoucherFields = {
  ...voucherFixture,
  code: 'WELCOME10',
  maximum_discount: null,
};
assert.deepEqual(voucherRequestFields(voucherServerDetail), voucherFixture,
  'response-only metadata must not enter editing state');
assert.deepEqual(voucherSubmission(voucherServerDetail, false), expectedVoucherFields,
  'submission must contain only request fields, even if input is a server detail');
assert.deepEqual(voucherSubmission(voucherServerDetail, true), {
  ...voucherFixture, code: 'WELCOME10',
}, 'used voucher retains immutable policy without leaking response metadata');
assert.equal(Object.keys(voucherSubmission(voucherServerDetail, true)).length, Object.keys(voucherFixture).length,
  'no additional property can leak from VoucherDetail to VoucherRequest');
const productScope = changeVoucherScope(voucherFixture, 'PRODUCT');
assert.deepEqual(productScope.category_ids, []);
assert.deepEqual(productScope.product_ids, []);
assert.equal(productScope.scope, 'PRODUCT');
assert.deepEqual(voucherSubmission({ ...productScope, product_ids: [21, 22] }, false).product_ids, [21, 22]);
assert.deepEqual(voucherSubmission({ ...productScope, product_ids: [21, 22] }, false).category_ids, []);
const allScope = changeVoucherScope({ ...productScope, product_ids: [21] }, 'ALL');
assert.deepEqual(voucherSubmission(allScope, false).product_ids, []);
assert.deepEqual(voucherSubmission(allScope, false).category_ids, []);
assert.equal(changeVoucherDiscountType({ ...voucherFixture, discount_type: 'PERCENTAGE' }, 'FIXED_AMOUNT').maximum_discount, null);

const catalogStaff = profileWithRole('ADMIN', ['CATALOG_READ', 'CATALOG_WRITE']);
assert.equal(canAccessAdminModule('dashboard', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']), true);
assert.equal(canAccessAdminModule('products', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']), true);
assert.equal(canAccessAdminModule('inventory', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']), false);
assert.equal(canAccessAdminModule('reports', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']), false);
assert.equal(canAccessAdminModule('reports', profileWithRole('SUPERADMIN'), []), true);
assert.equal(canAccessAdminModule('products', profileWithRole('CUSTOMER'), []), false);

const catalogReadOnly = profileWithRole('ADMIN', ['CATALOG_READ']);
assert.equal(canWriteAdminModule('products', catalogReadOnly, ['CATALOG_READ']), false);
assert.equal(canWriteAdminModule('products', catalogStaff, ['CATALOG_READ', 'CATALOG_WRITE']), true);
assert.equal(canWriteAdminModule('inventory', profileWithRole('ADMIN', ['INVENTORY_READ']), ['INVENTORY_READ']), false);
assert.equal(
  canWriteAdminModule(
    'inventory',
    profileWithRole('ADMIN', ['INVENTORY_READ', 'INVENTORY_WRITE']),
    ['INVENTORY_READ', 'INVENTORY_WRITE'],
  ),
  true,
);
assert.equal(canWriteAdminModule('content', profileWithRole('SUPERADMIN'), []), true);

assert.equal(canPurchaseProductVariant('ON_SALE', { sale_status: 'ON_SALE', available_quantity: 2 }), true);
assert.equal(canPurchaseProductVariant('STOPPED', { sale_status: 'ON_SALE', available_quantity: 2 }), false);
assert.equal(canPurchaseProductVariant('ON_SALE', { sale_status: 'STOPPED', available_quantity: 2 }), false);
assert.equal(canPurchaseProductVariant('ON_SALE', { sale_status: 'ON_SALE', available_quantity: 0 }), false);

const checkoutRequest = {
  recipient_phone: '0900000000',
  recipient_email: null,
  recipient_address: 'Hà Nội',
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

assert.deepEqual(
  resolveAdminRoute('/admin/products/960003'),
  {
    menuKey: 'product-detail',
    breadcrumb: 'Chi tiết sản phẩm',
    productId: '960003',
  },
);
assert.deepEqual(
  resolveAdminRoute('/admin/orders/42'),
  {
    menuKey: 'order-detail',
    breadcrumb: 'Chi tiết đơn hàng',
    orderId: 42,
  },
);
assert.equal(resolveAdminRoute('/admin/inventory/history').menuKey, 'history');
assert.equal(productDetailPath('A/B'), '/products/A%2FB');
assert.equal(orderDetailPath(42), '/orders/42');
assert.equal(checkoutSuccessPath(42), '/checkout/success/42');
assert.equal(adminProductDetailPath(960003), '/admin/products/960003');
assert.equal(adminOrderDetailPath(42), '/admin/orders/42');
assert.equal(adminCustomerDetailPath(7), '/admin/customers/7');
assert.equal(toAdminChildPath('/admin/catalog/categories'), 'catalog/categories');

const imageFixtures = [
  { image_id: 3, image_url: '3.jpg', alt_text: null, sort_order: 2 },
  { image_id: 1, image_url: '1.jpg', alt_text: null, sort_order: 0 },
  { image_id: 2, image_url: '2.jpg', alt_text: null, sort_order: 1 },
];
assert.deepEqual(sortProductImages(imageFixtures).map((image) => image.image_id), [1, 2, 3]);
assert.deepEqual(buildMovedImageOrder(imageFixtures, 2, -1), [
  { image_id: 2, sort_order: 0 },
  { image_id: 1, sort_order: 1 },
  { image_id: 3, sort_order: 2 },
]);
assert.equal(buildMovedImageOrder(imageFixtures, 1, -1), null);
assert.equal(buildMovedImageOrder(imageFixtures, 3, 1), null);

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
await Promise.race([
  invalidatedFinished,
  new Promise<void>((resolve) => setTimeout(resolve, 20)),
]);
assert.deepEqual(
  invalidatedPublishedValues,
  [],
  'invalidating the cart queue must suppress stale in-flight publication',
);

process.stdout.write('Frontend architecture smoke: PASS\n');

const { formatVietnamDateTime } = await import('../src/shared/time/formatVietnamDateTime');
assert.equal(formatVietnamDateTime('2026-10-07T17:30:00'), formatVietnamDateTime('2026-10-07T17:30:00Z'), 'backend UTC timestamps without offset must not use browser timezone');
assert.equal(formatVietnamDateTime('invalid'), '—');
const { statusLabel } = await import('../src/shared/admin/statusLabels');
assert.equal(statusLabel('PENDING'), 'Chờ xác nhận');
assert.equal(statusLabel('REFUNDED'), 'Đã hoàn tiền');
assert.equal(statusLabel('DRAFT'), 'Bản nháp');

const { sameCheckoutQuote } = await import('../src/features/orders/model/sameCheckoutQuote');
const confirmedQuote = {
  items: [{ variant_id: 1, quantity: 2, product_name: 'Áo', size: 'M', color: 'Đen', unit_price: 100000, line_total: 200000, available_quantity: 10 }],
  subtotal: 200000, discount: 0, shipping_fee: 30000, total: 230000, voucher: null,
};
assert.equal(sameCheckoutQuote(confirmedQuote, structuredClone(confirmedQuote)), true);
assert.equal(sameCheckoutQuote(confirmedQuote, { ...confirmedQuote, total: 240000 }), false);
assert.equal(sameCheckoutQuote(confirmedQuote, { ...confirmedQuote, items: [{ ...confirmedQuote.items[0], quantity: 3 }] }), false);
assert.equal(sameCheckoutQuote(confirmedQuote, { ...confirmedQuote, items: [{ ...confirmedQuote.items[0], variant_id: 2 }] }), false);
assert.equal(sameCheckoutQuote(confirmedQuote, { ...confirmedQuote, items: [{ ...confirmedQuote.items[0], available_quantity: 9 }] }), true);

const drainingQueue = new LatestMutationQueue<number>();
let releasePending: () => void = () => { throw new Error('Pending operation not initialized'); };
const pendingOperation = new Promise<void>((resolve) => { releasePending = resolve; });
const drainedValues: number[] = [];
drainingQueue.enqueue(async () => { await pendingOperation; return 1; }, {
  onLatestSuccess: (value) => drainedValues.push(value), onLatestError: () => { throw new Error('Unexpected failure'); },
});
let drained = false;
const waitForDrain = drainingQueue.whenIdle().then(() => { drained = true; });
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

import { readReportFilters, orderDrilldown, isCalendarDate } from '../src/features/report/model/reportFilters';
import { parseSales, parseOrders, parseProducts } from '../src/features/report/api/parseReport';
assert.equal(isCalendarDate('2026-02-30'), false);
assert.equal(readReportFilters(new URLSearchParams('from=bad&to=2026-10-10')).valid, false);
assert.equal(readReportFilters(new URLSearchParams('from=2026-10-10&to=2026-10-01')).valid, false);
assert.equal(readReportFilters(new URLSearchParams('granularity=YEAR')).valid, false);
const drill = new URL(orderDrilldown({ from: '2026-10-01', to: '2026-10-10', granularity: 'WEEK' }, 'PENDING', '2026-09-28'), 'http://test');
assert.equal(drill.searchParams.get('created_from'), '2026-09-30T17:00:00Z');
assert.equal(drill.searchParams.get('created_to'), '2026-10-04T16:59:59.999999Z');
assert.equal(drill.searchParams.get('status'), 'PENDING');
assert.throws(() => parseSales({ from: '2026-01-01', to: '2026-01-01', granularity: 'DAY', timezone: 'UTC', points: [] }));
assert.throws(() => parseProducts({ from: '2026-01-01', to: '2026-01-01', items: [{ product_id: 1, product_name: 'Test', thumbnail: null, completed_units: 'bad', returned_units: 0, net_units: 0 }] }));
assert.throws(() => parseOrders({ from: '2026-01-01', to: '2026-01-01', granularity: 'DAY', timezone: 'Asia/Ho_Chi_Minh', points: [{ period_start: '2026-01-01', total_orders: 3, orders_by_status: {} }] }));
