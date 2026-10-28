import { adminCatalogMetaService } from '../src/features/catalog/api/adminCatalogMetaService';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { authService } from '../src/features/auth/api/service';
import { profileService } from '../src/features/auth/api/profileService';
import { cartService } from '../src/features/cart/api/service';
import { catalogService } from '../src/features/catalog/api/service';
import { contentService } from '../src/features/content/api/service';
import { orderService } from '../src/features/orders/api/service';
import { checkoutService } from '../src/features/orders/api/checkoutService';
import { voucherService } from '../src/features/promotion/api/service';
import { voucherSubmission } from '../src/features/promotion/model/voucherFormModel';
import type { VoucherInput } from '../src/features/promotion/types';
import { reportService } from '../src/features/report/api/service';
import { apiClient, hasApiAccessToken } from '../src/services/http/apiClient';

const account = {
  account_id: 900001,
  full_name: 'Quản trị hệ thống',
  phone: '0909000001',
  email: 'superadmin@fido.local',
  status: 'ACTIVE',
  created_at: '2026-09-01T00:00:00',
  updated_at: '2026-09-01T00:00:00',
};

const writeJson = (response: ServerResponse, status: number, body: unknown): void => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

let bearerRequestCount = 0;
let malformedLoginResponse = false;
let malformedMeResponse = false;

const requireBearer = (request: IncomingMessage): void => {
  assert.equal(request.headers.authorization, 'Bearer smoke-token');
  bearerRequestCount += 1;
};

let capturedRegistrationBody: unknown;
let capturedLoginBody: unknown;
let capturedAttributeCreateBody: unknown;
let capturedAttributePatchBody: unknown;
let capturedOptionCreateBody: unknown;
let capturedOptionPatchBody: unknown;
let capturedVoucherBody: unknown;
let capturedQuoteBody: unknown;
let capturedOrderBody: unknown;
const voucherPolicy: VoucherInput = {
  code: 'SAVE10K',
  discount_type: 'FIXED_AMOUNT',
  discount_value: 10000,
  maximum_discount: null,
  minimum_amount: 0,
  starts_at: '2026-10-09T00:00:00Z',
  ends_at: '2026-11-09T00:00:00Z',
  scope: 'ALL',
  product_ids: [],
  category_ids: [],
  global_limit: null,
  customer_limit: 1,
  enabled: true,
};
const voucherDetail = { ...voucherPolicy, voucher_id: 27, active_usage: 0, ever_used: false };
const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (url.pathname === '/api/v1/admin/catalog/meta' && request.method === 'GET') {
    requireBearer(request);
    writeJson(response, 200, {
      data: {
        attribute_types: [
          { id: 1, code: 'OPTION', name: 'Lựa chọn', data_type: 'OPTION' },
          { id: 2, code: 'TEXT', name: 'Văn bản', data_type: 'TEXT' },
          { id: 3, code: 'NUMBER', name: 'Số', data_type: 'NUMBER' },
          { id: 4, code: 'BOOLEAN', name: 'Có/Không', data_type: 'BOOLEAN' },
        ],
        attributes: [],
      },
    });
    return;
  }

  if (
    url.pathname.startsWith('/api/v1/admin/catalog/attributes') &&
    (request.method === 'POST' || request.method === 'PATCH')
  ) {
    requireBearer(request);
    let raw = '';
    request.on('data', (chunk: Buffer) => {
      raw += chunk.toString();
    });
    request.on('end', () => {
      const body = JSON.parse(raw) as Record<string, unknown>;
      const attribute = {
        id: 1,
        code: 'MATERIAL',
        name: 'Material',
        data_type: 'TEXT',
        is_required: false,
        is_variant_defining: false,
        sort_order: 0,
        options: [],
      };
      const option = {
        id: 1,
        attribute_id: 1,
        value: 'COTTON',
        label: 'Cotton',
        sort_order: 0,
      };
      if (url.pathname === '/api/v1/admin/catalog/attributes' && request.method === 'POST') {
        capturedAttributeCreateBody = body;
        writeJson(response, 201, { data: { ...attribute, ...body } });
      } else if (
        url.pathname === '/api/v1/admin/catalog/attributes/1' &&
        request.method === 'PATCH'
      ) {
        capturedAttributePatchBody = body;
        writeJson(response, 200, { data: { ...attribute, ...body } });
      } else if (
        url.pathname === '/api/v1/admin/catalog/attributes/1/options' &&
        request.method === 'POST'
      ) {
        capturedOptionCreateBody = body;
        writeJson(response, 201, { data: { ...option, ...body } });
      } else if (
        url.pathname === '/api/v1/admin/catalog/attributes/1/options/1' &&
        request.method === 'PATCH'
      ) {
        capturedOptionPatchBody = body;
        writeJson(response, 200, { data: { ...option, ...body } });
      } else {
        writeJson(response, 404, { message: 'Not found' });
      }
    });
    return;
  }
  if (url.pathname === '/api/v1/admin/vouchers' && request.method === 'GET') {
    requireBearer(request);
    assert.equal(url.searchParams.get('search'), 'SAVE');
    assert.equal(url.searchParams.get('page'), '1');
    writeJson(response, 200, {
      data: [voucherDetail],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    });
    return;
  }
  if (
    (url.pathname === '/api/v1/admin/vouchers' && request.method === 'POST') ||
    (url.pathname === '/api/v1/admin/vouchers/27' && request.method === 'PUT')
  ) {
    requireBearer(request);
    let raw = '';
    request.on('data', (chunk: Buffer) => {
      raw += chunk.toString();
    });
    request.on('end', () => {
      capturedVoucherBody = JSON.parse(raw);
      writeJson(response, request.method === 'POST' ? 201 : 200, { data: voucherDetail });
    });
    return;
  }
  if (url.pathname === '/api/v1/checkout/quote' && request.method === 'POST') {
    requireBearer(request);
    let raw = '';
    request.on('data', (chunk: Buffer) => {
      raw += chunk.toString();
    });
    request.on('end', () => {
      capturedQuoteBody = JSON.parse(raw);
      writeJson(response, 200, {
        data: {
          quote_id: 'voucher-smoke-quote',
          items: [],
          subtotal: 100000,
          discount: 10000,
          shipping_fee: 30000,
          total: 120000,
          voucher: { voucher_id: 27, code: 'SAVE10K' },
        },
      });
    });
    return;
  }
  if (url.pathname === '/api/v1/orders' && request.method === 'POST') {
    requireBearer(request);
    let raw = '';
    request.on('data', (chunk: Buffer) => {
      raw += chunk.toString();
    });
    request.on('end', () => {
      capturedOrderBody = JSON.parse(raw);
      writeJson(response, 201, {
        data: {
          order_id: 43,
          order_code: 'FIDO-43',
          order_status: 'PENDING',
          subtotal: 100000,
          discount: 10000,
          shipping_fee: 30000,
          total: 120000,
        },
      });
    });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/v1/auth/register') {
    let raw = '';
    request.on('data', (chunk: Buffer) => {
      raw += chunk.toString();
    });
    request.on('end', () => {
      capturedRegistrationBody = JSON.parse(raw);
      writeJson(response, 201, {
        data: {
          access_token: 'register-token',
          token_type: 'Bearer',
          expires_in: 900,
          account,
        },
      });
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    let raw = '';
    request.on('data', (chunk: Buffer) => {
      raw += chunk.toString();
    });
    request.on('end', () => {
      capturedLoginBody = JSON.parse(raw);
      writeJson(response, 200, {
        data: malformedLoginResponse
          ? {
              access_token: 42,
              token_type: 'Bearer',
              expires_in: 900,
              account,
            }
          : {
              access_token: 'smoke-token',
              token_type: 'Bearer',
              expires_in: 900,
              account,
            },
      });
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/me') {
    requireBearer(request);
    writeJson(response, 200, {
      data: {
        account,
        addresses: [],
        roles: [
          {
            role_id: 1,
            code: 'SUPERADMIN',
            name: 'Superadmin',
            description: null,
          },
        ],
        permissions: malformedMeResponse
          ? [{ permission_id: 1, code: 42, name: 'Broken permission' }]
          : [],
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/catalog/products') {
    assert.equal(url.searchParams.get('page'), '1');
    assert.equal(url.searchParams.get('page_size'), '8');
    writeJson(response, 200, {
      data: [
        {
          product_id: 960001,
          parent_product_id: null,
          sku: 'SMOKE-001',
          name: 'Smoke Product',
          slug: 'smoke-product',
          thumbnail: 'https://example.com/product.jpg',
          category: {
            category_id: 1,
            parent_category_id: null,
            name: 'Áo',
            slug: 'ao',
            status: 'ACTIVE',
          },
          brand: null,
          selling_price: 199000,
          status: 'ACTIVE',
        },
      ],
      meta: {
        page: 1,
        page_size: 8,
        total: 1,
        total_pages: 1,
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/catalog/meta') {
    writeJson(response, 200, {
      data: {
        categories: [],
        brands: [],
        attribute_types: [],
        attributes: [],
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/cart') {
    requireBearer(request);
    writeJson(response, 200, {
      data: {
        cart_id: 1,
        account_id: account.account_id,
        items: [],
        subtotal: 0,
        created_at: '2026-10-07T00:00:00',
        updated_at: '2026-10-07T00:00:00',
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/me/orders') {
    requireBearer(request);
    assert.equal(url.searchParams.get('page'), '1');
    writeJson(response, 200, {
      data: [],
      meta: {
        page: 1,
        page_size: 10,
        total: 0,
        total_pages: 0,
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/me/orders/42') {
    requireBearer(request);
    writeJson(response, 200, {
      data: {
        order_id: 42,
        order_code: 'FIDO-42',
        order_status: 'PENDING',
        recipient: { phone: '0909000001', email: null, address: 'Hà Nội' },
        items: [],
        subtotal: 100000,
        discount: 0,
        shipping_fee: 30000,
        total: 130000,
        payment: {
          payment_status: 'UNPAID',
          amount_due: 130000,
          amount_received: 0,
          amount_refunded: 0,
        },
        shipping_info: null,
        completed_at: null,
        returned_at: null,
        created_at: '2026-10-07T00:00:00',
        updated_at: '2026-10-07T00:00:00',
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/content-pages/shipping-policy') {
    writeJson(response, 200, {
      data: {
        page_code: 'shipping-policy',
        title: 'Chính sách giao hàng',
        content: 'Smoke policy',
        updated_at: '2026-09-01T00:00:00',
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/admin/reports/overview') {
    requireBearer(request);
    writeJson(response, 200, {
      data: {
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        completed_sales: 100000,
        returned_adjustment: 0,
        net_sales: 100000,
        orders_by_status: {
          PENDING: 0,
          CONFIRMED: 0,
          PREPARING: 0,
          SHIPPING: 0,
          COMPLETED: 1,
          DELIVERY_FAILED: 0,
          CANCELLED: 0,
          RETURNED: 0,
        },
      },
    });
    return;
  }

  if (
    request.method === 'GET' &&
    [
      '/api/v1/admin/reports/sales-trend',
      '/api/v1/admin/reports/orders-trend',
      '/api/v1/admin/reports/product-performance',
    ].includes(url.pathname)
  ) {
    requireBearer(request);
    assert.equal(url.searchParams.get('from'), '2026-10-01');
    assert.equal(url.searchParams.get('to'), '2026-10-07');
    const base = { from: '2026-10-01', to: '2026-10-07' };
    if (url.pathname.endsWith('product-performance')) {
      assert.equal(url.searchParams.get('limit'), '5');
      writeJson(response, 200, {
        data: {
          ...base,
          items: [
            {
              product_id: 1,
              product_name: 'Test',
              thumbnail: null,
              completed_units: 3,
              returned_units: 1,
              net_units: 2,
            },
          ],
        },
      });
    } else {
      assert.equal(url.searchParams.get('granularity'), 'WEEK');
      const point = url.pathname.endsWith('sales-trend')
        ? {
            period_start: '2026-09-28',
            completed_sales: 100,
            returned_adjustment: 30,
            net_sales: 70,
          }
        : {
            period_start: '2026-09-28',
            total_orders: 1,
            orders_by_status: {
              PENDING: 0,
              CONFIRMED: 0,
              PREPARING: 0,
              SHIPPING: 0,
              COMPLETED: 1,
              DELIVERY_FAILED: 0,
              CANCELLED: 0,
              RETURNED: 0,
            },
          };
      writeJson(response, 200, {
        data: { ...base, granularity: 'WEEK', timezone: 'Asia/Ho_Chi_Minh', points: [point] },
      });
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/test-unauthorized') {
    requireBearer(request);
    writeJson(response, 401, {
      status: 401,
      error: 'Unauthorized',
      path: url.pathname,
    });
    return;
  }

  writeJson(response, 404, {
    status: 404,
    error: 'Not Found',
    path: url.pathname,
  });
});

await new Promise<void>((resolve, reject) => {
  server.once('error', reject);
  server.listen(8080, resolve);
});

try {
  const registered = await authService.register(
    '0909000001',
    'Quản trị hệ thống',
    'superadmin@fido.local',
    'Fido@123',
  );
  assert.equal(registered.account.account_id, account.account_id);
  assert.deepEqual(capturedRegistrationBody, {
    phone: '0909000001',
    full_name: 'Quản trị hệ thống',
    email: 'superadmin@fido.local',
    password: 'Fido@123',
  });
  assert.equal(hasApiAccessToken(), true);

  const login = await authService.login('0909000001', 'Fido@123');
  assert.equal(login.access_token, 'smoke-token');
  assert.deepEqual(capturedLoginBody, {
    phone: '0909000001',
    password: 'Fido@123',
  });

  await adminCatalogMetaService.getMeta();
  const attributeInput = {
    attribute_type_id: 2,
    code: 'MATERIAL',
    name: 'Material',
    is_required: false,
    is_variant_defining: false,
    sort_order: 0,
  };
  const createdAttribute = await adminCatalogMetaService.createAttribute(attributeInput);
  assert.equal(createdAttribute.id, 1);
  assert.deepEqual(capturedAttributeCreateBody, attributeInput);
  const attributePatch = {
    name: 'Chất liệu',
    is_required: true,
    is_variant_defining: false,
    sort_order: 1,
  };
  await adminCatalogMetaService.updateAttribute(1, attributePatch);
  assert.deepEqual(capturedAttributePatchBody, attributePatch);
  const optionInput = { value: 'COTTON', label: 'Cotton', sort_order: 0 };
  await adminCatalogMetaService.createAttributeOption(1, optionInput);
  assert.deepEqual(capturedOptionCreateBody, optionInput);
  const optionPatch = { label: 'Cotton tự nhiên', sort_order: 1 };
  await adminCatalogMetaService.updateAttributeOption(1, 1, optionPatch);
  assert.deepEqual(capturedOptionPatchBody, optionPatch);
  const listed = await voucherService.list('SAVE', 1);
  assert.equal(listed.data[0]?.code, 'SAVE10K');
  const createdVoucher = await voucherService.create(voucherPolicy);
  assert.equal(createdVoucher.voucher_id, 27);
  assert.deepEqual(
    capturedVoucherBody,
    voucherPolicy,
    'Create must preserve the typed voucher policy',
  );
  // Real editor receives VoucherDetail, not VoucherInput. Its response metadata
  // must never be serialized into the strict VoucherRequest endpoint.
  await voucherService.update(27, voucherSubmission({ ...voucherDetail, enabled: false }, false));
  assert.deepEqual(
    capturedVoucherBody,
    { ...voucherPolicy, enabled: false },
    'Updating from a server detail must send only the approved VoucherRequest fields',
  );
  await voucherService.update(27, { ...voucherDetail, enabled: false });
  assert.deepEqual(
    capturedVoucherBody,
    { ...voucherPolicy, enabled: false },
    'HTTP service boundary also strips response metadata for other callers',
  );

  const checkoutRequest = {
    recipient_phone: '0909000001',
    recipient_email: null,
    recipient_address: 'Hà Nội',
    voucher_code: 'SAVE10K',
  };
  const quotedVoucher = await checkoutService.quote(checkoutRequest);
  assert.deepEqual(capturedQuoteBody, checkoutRequest);
  assert.equal(quotedVoucher.discount, 10000);
  assert.equal(quotedVoucher.total, 120000);
  assert.equal(quotedVoucher.voucher?.code, 'SAVE10K');
  if (!quotedVoucher.quote_id) throw new Error('Missing voucher quotation ID');
  const placedOrder = await checkoutService.createOrder({
    ...checkoutRequest,
    quote_id: quotedVoucher.quote_id,
  });
  assert.equal(placedOrder.order_id, 43);
  assert.deepEqual(capturedOrderBody, { ...checkoutRequest, quote_id: 'voucher-smoke-quote' });

  const me = await profileService.getMe();
  assert.equal(me.roles[0]?.code, 'SUPERADMIN');

  const catalog = await catalogService.listProducts({ page: 1, page_size: 8 });
  assert.equal(catalog.items[0]?.product_id, 960001);
  assert.equal(catalog.items[0]?.imageUrl, 'https://example.com/product.jpg');
  assert.equal(catalog.items[0]?.sku, 'SMOKE-001');
  assert.equal(catalog.items[0]?.selling_price, 199000);
  assert.equal(catalog.items[0]?.status, 'ACTIVE');
  assert.equal(catalog.items[0]?.category, 'Áo');
  assert.equal(catalog.meta.page, 1);

  const meta = await catalogService.getMeta();
  assert.deepEqual(meta.categories, []);

  const cart = await cartService.getCart();
  assert.equal(cart.account_id, account.account_id);

  const orders = await orderService.getOrders({ page: 1, page_size: 10 });
  assert.equal(orders.meta.page, 1);

  const orderDetail = await orderService.getOrder(42);
  assert.equal(orderDetail.order_code, 'FIDO-42');

  const policy = await contentService.getPublicPage('shipping-policy');
  assert.equal(policy.page_code, 'shipping-policy');

  const trendQuery = { from: '2026-10-01', to: '2026-10-07', granularity: 'WEEK' } as const;
  assert.equal((await reportService.getSalesTrend(trendQuery)).points[0]?.net_sales, 70);
  assert.equal((await reportService.getOrdersTrend(trendQuery)).points[0]?.total_orders, 1);
  assert.equal((await reportService.getProductPerformance(trendQuery, 5)).items[0]?.net_units, 2);
  const report = await reportService.getOverview('2026-10-01', '2026-10-07');
  assert.equal(report.net_sales, 100000);

  assert.equal(hasApiAccessToken(), true);
  await assert.rejects(() => apiClient.get('/test-unauthorized'));
  assert.equal(hasApiAccessToken(), false, '401 responses must invalidate the reactive auth token');

  malformedLoginResponse = true;
  await assert.rejects(
    () => authService.login('0909000001', 'Fido@123'),
    /Invalid API response from POST \/auth\/login: data\.access_token must be/,
  );
  assert.equal(
    hasApiAccessToken(),
    false,
    'Malformed login payloads must not publish an access token',
  );
  malformedLoginResponse = false;

  await authService.login('0909000001', 'Fido@123');
  malformedMeResponse = true;
  await assert.rejects(
    () => profileService.getMe(),
    /Invalid API response from GET \/me: data\.permissions\[0\]\.code must be/,
  );
  malformedMeResponse = false;

  assert.ok(bearerRequestCount >= 6, 'Authenticated requests must include the bearer token');
  process.stdout.write('API integration smoke: PASS\n');
} finally {
  authService.logout();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
