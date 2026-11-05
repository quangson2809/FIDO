import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
const { chromium } = createRequire(import.meta.url)('playwright');
const server = await createServer({ server: { port: 5180, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const date = '2026-10-08T03:00:00Z';
const reportStatusCounts = {
  PENDING: 2, CONFIRMED: 0, PREPARING: 0, SHIPPING: 0,
  COMPLETED: 1, DELIVERY_FAILED: 0, CANCELLED: 0, RETURNED: 0,
};
const permission = { id: 1, code: 'CATALOG_READ', name: 'Xem danh mục' };
const role = { id: 1, code: 'SUPERADMIN', name: 'Quản trị', description: null };
const meRole = { id: 1, code: 'SUPERADMIN', name: 'Quản trị', description: null, status: 'ACTIVE' };
let me = {
  account: { id: 1, full_name: 'Test Account', phone: '0900000000', email: null, status: 'ACTIVE', created_at: date, updated_at: date },
  addresses: [],
  roles: [meRole],
  permissions: [],
};
const pagination = (data, pageNumber = 1, total = data.length) => ({
  data,
  meta: { page: pageNumber, page_size: 20, total, total_pages: Math.ceil(total / 20) },
});
const metadata = {
  categories: [
    { category_id: 1, parent_category_id: null, name: 'Áo', slug: 'ao', status: 'ACTIVE' },
  ],
  brands: [],
  attributes: [
    {
      id: 1,
      code: 'MATERIAL',
      name: 'Chất liệu',
      is_required: true,
      is_variant_defining: false,
      sort_order: 0,
      options: [{ id: 101, attribute_id: 1, value: 'COTTON', label: 'Cotton', sort_order: 0 }],
    },
  ],
};
let product = {
  product_id: 1,
  parent_product_id: null,
  child_product_ids: [],
  sku: 'TEE-M-BLACK',
  name: 'Áo thử nghiệm',
  slug: 'ao-thu-nghiem',
  description: null,
  category: metadata.categories[0],
  brand: null,
  category_id: 1,
  brand_id: null,
  selling_price: 200000,
  cost_price: null,
  status: 'ACTIVE',
  images: [],
  parent_product: null,
  children: [],
  attribute_values: [
    {
      attribute_id: 1,
      attribute_code: 'MATERIAL',
      attribute_name: 'Chất liệu',
      attribute_value_id: 101,
      value: 'COTTON',
      label: 'Cotton',
    },
  ],
  created_at: date,
  updated_at: date,
};
let order = {
  order_id: 1,
  order_code: 'ORD-001',
  order_status: 'PENDING',
  recipient: { phone: '0900111222', email: null, address: 'Hà Nội' },
  items: [],
  subtotal: 200000,
  discount: 0,
  shipping_fee: 0,
  total: 200000,
  shipping_info: null,
  completed_at: null,
  returned_at: null,
  created_at: date,
  updated_at: date,
  customer_account_id: 1,
  voucher_id: null,
  payment: {
    payment_status: 'UNPAID',
    amount_due: 200000,
    amount_received: 0,
    amount_refunded: 0,
    collected_by_account_id: null,
    collected_at: null,
    refunded_by_account_id: null,
    refunded_at: null,
  },
  allowed_actions: ['CONFIRM', 'CANCEL'],
};
let productPatchAttempts = 0;
const supplier = {
  supplier_id: 1,
  code: 'SUP-001',
  name: 'Nhà cung cấp mẫu',
  phone: null,
  email: null,
  status: 'ACTIVE',
};
let receipt = {
  receipt_id: 1,
  receipt_code: 'GR-001',
  supplier_id: 1,
  warehouse_id: 1,
  receipt_status: 'DRAFT',
  confirmed_at: null,
  created_at: date,
  updated_at: date,
  created_by_account_id: 1,
  confirmed_by_account_id: null,
  items: [{ receipt_item_id: 1, product_id: 1, quantity_received: 2, unit_cost: 100000 }],
};
let customerError = false;
let reportError = false;
let writes = [];
const reads = [];
let voucher = { id: 27, code: 'SAVE10K', discount_type: 'FIXED', discount_value: 10000,
  minimum_order_value: 0, maximum_discount: null, starts_at: null, ends_at: null,
  usage_limit: null, usage_count: 2, status: 'ACTIVE' };
let customerRequests = 0;
await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace('/api/v1', '');
  const send = (body, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
      headers: { 'access-control-allow-origin': '*' },
    });
  if (request.method() === 'OPTIONS')
    return route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      },
    });
  if (request.method() === 'GET') reads.push({ path, query: url.searchParams });
  if (request.method() !== 'GET') {
    writes.push({ path, body: request.postDataJSON() });
    if (path === '/admin/vouchers' || path === '/admin/vouchers/27') {
      if (!['POST', 'PATCH'].includes(request.method())) return send({}, 405);
      voucher = { ...voucher, ...request.postDataJSON(), status: request.method() === 'POST' ? 'DRAFT' : request.postDataJSON().status };
      return send({ data: voucher }, request.method() === 'POST' ? 201 : 200);
    }
    if (path === '/admin/staff-accounts' && request.method() === 'POST') {
      const input = request.postDataJSON();
      return send({ data: { account: { ...me.account, full_name: input.full_name, phone: input.phone }, roles: [role], permissions: [permission] } }, 201);
    }
    if (path === '/admin/permissions/1' && request.method() === 'PATCH') {
      Object.assign(permission, request.postDataJSON());
      return send({ data: permission });
    }
    if (path === '/admin/inventory/adjustments') {
      const input = request.postDataJSON();
      return send({
        data: {
          txn_id: 12,
          product_id: input.product_id,
          warehouse_id: 1,
          quantity_delta: input.quantity_delta,
          transaction_type: 'ADJUSTMENT',
          order_item_id: null,
          goods_receipt_item_id: null,
          reverses_transaction_id: null,
          actor_account_id: 1,
          reason: input.reason_code,
          created_at: date,
        },
      }, 201);
    }
    if (path === '/admin/orders/1/actions') {
      const transitions = {
        CONFIRM: ['CONFIRMED', ['START_PREPARING', 'CANCEL']],
        START_PREPARING: ['PREPARING', ['DISPATCH', 'CANCEL']],
        DISPATCH: ['SHIPPING', ['MARK_DELIVERY_FAILED']],
      };
      const [status, actions] = transitions[request.postDataJSON().action];
      order = { ...order, order_status: status, allowed_actions: actions };
      return send({ data: order });
    }
    if (path === '/admin/orders/1/payment-actions') {
      order = {
        ...order,
        order_status: 'COMPLETED', allowed_actions: [],
        payment: { ...order.payment, payment_status: 'PAID', amount_received: 200000 },
      };
      return send({ data: order });
    }
    if (path === '/admin/products/1' && request.method() === 'PATCH') {
      productPatchAttempts += 1;
      if (productPatchAttempts === 1) return send({ message: 'Lỗi lưu thử nghiệm' }, 500);
      product = { ...product, ...request.postDataJSON() };
      return send({ data: product });
    }
    if (path === '/admin/goods-receipts/1/actions') {
      receipt = { ...receipt, receipt_status: 'CONFIRMED' };
      return send({ data: receipt });
    }
    return send({ message: 'Lỗi lưu thử nghiệm' }, 500);
  }
  if (path === '/admin/vouchers') return send(pagination([voucher]));
  if (path === '/me') return send({ data: me });
  if (path === '/cart')
    return send({ data: { cart_id: 1, account_id: 1, items: [], subtotal: 0 } });
  if (path === '/admin/products/1') return send({ data: product });
  if (path === '/admin/products')
    return send(pagination([{
      product_id: product.product_id,
      parent_product_id: product.parent_product_id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      category: product.category,
      brand: product.brand,
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      status: product.status,
      created_at: product.created_at,
      updated_at: product.updated_at,
      thumbnail: null,
    }]));
  if (path === '/admin/orders/1') return send({ data: order });
  if (path === '/admin/orders')
    return send(pagination([{ ...order, payment_status: order.payment.payment_status }]));
  if (path === '/catalog/meta') return send({ data: metadata });
  if (path === '/admin/catalog/meta') return send({
    data: { attributes: metadata.attributes },
  });
  if (path === '/admin/customers/1') return send({ message: 'Không tải được hồ sơ' }, 500);
  if (path === '/admin/customers') {
    customerRequests++;
    const q = url.searchParams.get('q');
    if (q === 'slow') await new Promise((resolve) => setTimeout(resolve, 400));
    if (customerError) return send({ message: 'Lỗi danh sách' }, 500);
    return send(
      pagination(
        [
          {
            account_id: 1,
            phone: q || '0900111222',
            email: null,
            order_count: 0,
            last_order_at: null,
          },
        ],
        Number(url.searchParams.get('page') || 1),
        25,
      ),
    );
  }
  if (path === '/admin/reports/overview')
    return reportError
      ? send({ message: 'Báo cáo lỗi' }, 500)
      : send({
          data: {
            from: url.searchParams.get('from'),
            to: url.searchParams.get('to'),
            completed_sales: 123456,
            returned_adjustment: 0,
            net_sales: 123456,
            orders_by_status: reportStatusCounts,
          },
        });
  if (path === '/admin/reports/sales-trend')
    return send({
      data: {
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        granularity: url.searchParams.get('granularity') || 'DAY',
        timezone: 'Asia/Ho_Chi_Minh',
        points: [{
          period_start: url.searchParams.get('from'),
          completed_sales: 123456,
          returned_adjustment: 0,
          net_sales: 123456,
        }],
      },
    });
  if (path === '/admin/reports/orders-trend')
    return send({
      data: {
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        granularity: url.searchParams.get('granularity') || 'DAY',
        timezone: 'Asia/Ho_Chi_Minh',
        points: [{
          period_start: url.searchParams.get('from'),
          total_orders: 3,
          orders_by_status: reportStatusCounts,
        }],
      },
    });
  if (path === '/admin/reports/product-performance')
    return send({
      data: {
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        limit: Number(url.searchParams.get('limit') || 10),
        items: [{
          product_id: 1,
          product_name: 'Áo thử nghiệm',
          thumbnail: null,
          completed_units: 1,
          returned_units: 0,
          net_units: 1,
        }],
      },
    });
  if (path === '/admin/suppliers') return send(pagination([supplier]));
  if (path === '/admin/goods-receipts') return send(pagination([receipt]));
  if (path === '/admin/goods-receipts/1') return send({ data: receipt });
  if (path === '/admin/inventory')
    return send(
      pagination([
        {
          warehouse_id: 1,
          product_id: 1,
          sku: 'TEE-M-BLACK',
          product_name: 'Áo thử nghiệm',
          available_quantity: 5,
          version: 0,
          updated_at: date,
        },
      ]),
    );
  if (path === '/admin/staff-accounts')
    return send(
      pagination(
        [{ account: me.account, roles: [role] }],
        Number(url.searchParams.get('page') || 1),
        25,
      ),
    );
  if (path === '/admin/staff-accounts/1')
    return send({ data: { account: me.account, roles: [role], permissions: [permission] } });
  if (path === '/admin/audit-logs')
    return send(
      pagination(
        [
          {
            id: 1,
            actor_account_id: 1,
            action: 'PRODUCT_UPDATE',
            entity_type: 'PRODUCT',
            entity_id: '1',
            before_data: null, after_data: { name: 'Sản phẩm mới' }, correlation_id: null,
            created_at: date,
          },
        ],
        Number(url.searchParams.get('page') || 1),
        25,
      ),
    );
  if (path === '/admin/access-control')
    return send({
      data: { roles: [{ ...role, permissions: [permission] }], permissions: [permission] },
    });
  if (path === '/admin/content-pages/1') return send({ data: { id: 1, slug: 'policy', title: 'Chính sách', content: 'Nội dung gốc', status: 'DRAFT', updated_at: date, updated_by_account_id: 1 } });
  if (path === '/admin/content-pages')
    return send({
      data: [{ id: 1, slug: 'policy', title: 'Chính sách', status: 'DRAFT', updated_at: date }],
    });
  return send(pagination([]));
});
const goto = async (path) => {
  console.log('Check', path);
  await page.goto(`http://localhost:5180${path}`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Hệ thống quản trị', { exact: true }).waitFor();
};
// A click can finish before React Router renders its confirmation. Wait for the
// dialog to be handled so a later navigation cannot consume the wrong handler.
const withConfirm = async (action, decision, messagePattern) => {
  const handled = page.waitForEvent('dialog').then(async (dialog) => {
    const type = dialog.type();
    const message = dialog.message();
    await dialog[decision]();
    assert.equal(type, 'confirm', 'the action must show its expected confirm dialog');
    if (messagePattern) assert.match(message, messagePattern);
  });
  await Promise.all([handled, action()]);
};
try {
  await goto('/admin/customers');
  await page.getByRole('cell', { name: '0900111222', exact: true }).waitFor();
  const count = customerRequests;
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await page.getByRole('cell', { name: '0900111222', exact: true }).waitFor();
  assert.ok(customerRequests > count, 'same-filter search reloads');
  customerError = true;
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(
    await page.getByRole('cell', { name: '0900111222', exact: true }).count(),
    0,
    'failed request hides previous data',
  );
  customerError = false;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await page.getByRole('cell', { name: '0900111222', exact: true }).waitFor();
  const search = page.getByPlaceholder('Tìm theo số điện thoại hoặc email');
  await search.fill('slow');
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await search.fill('latest');
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await page.getByRole('cell', { name: 'latest', exact: true }).waitFor();
  await page.waitForTimeout(500);
  assert.equal(await page.getByRole('cell', { name: 'slow', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await page.getByText('Trang 2', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await page.getByRole('dialog').getByRole('alert').waitFor();
  await page.getByRole('button', { name: 'Đóng hộp thoại' }).click();
  await goto('/admin/inventory');
  await page.getByRole('button', { name: 'Điều chỉnh', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Số lượng điều chỉnh', exact: true }).fill('2');
  await page.getByLabel('Mã lý do điều chỉnh').selectOption('DAMAGE');
  await withConfirm(() => page.getByRole('button', { name: 'Xác nhận', exact: true }).click(), 'accept');
  await page.getByText('Đã điều chỉnh tồn kho.', { exact: true }).waitFor();
  const adjustment = writes.filter((entry) => entry.path === '/admin/inventory/adjustments').at(-1)?.body;
  assert.ok(adjustment);
  assert.deepEqual(Object.keys(adjustment).sort(), [
    'expected_version', 'product_id', 'quantity_delta', 'reason_code', 'source_operation_id',
  ]);
  assert.equal(adjustment.product_id, 1);
  assert.equal(adjustment.quantity_delta, 2);
  assert.equal(adjustment.reason_code, 'DAMAGE');
  assert.equal(adjustment.expected_version, 0);
  assert.match(adjustment.source_operation_id, /^[A-Za-z0-9._:-]{1,80}$/);

  await goto('/admin/catalog/categories');
  await page.locator('main').getByRole('button', { name: 'Thương hiệu', exact: true }).click();
  assert.match(page.url(), /catalog\/brands/);
  await page.goBack();
  assert.match(page.url(), /catalog\/categories/);
  await goto('/admin/content');
  await page.getByRole('button', { name: /Chính sách policy/ }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Nội dung', exact: true }).inputValue(), 'Nội dung gốc');
  assert.equal(await page.getByRole('button', { name: 'Lưu nội dung' }).isEnabled(), true,
    'selecting the current summary must not clear its loaded detail');
  await page.getByRole('textbox', { name: 'Tiêu đề' }).fill('Bản chưa lưu');
  await withConfirm(() => page.getByRole('button', { name: /Đơn hàng/ }).click(), 'dismiss');
  assert.match(page.url(), /admin\/content/);
  await page.getByRole('button', { name: 'Lưu nội dung' }).click();
  await page.getByText('Lỗi lưu thử nghiệm', { exact: false }).waitFor();
  assert.equal(await page.getByRole('textbox', { name: 'Tiêu đề' }).inputValue(), 'Bản chưa lưu');
  await withConfirm(() => page.getByRole('button', { name: /Đơn hàng/ }).click(), 'accept');
  await page.waitForURL('**/admin/orders');
  await page.getByRole('cell', { name: 'ORD-001', exact: true }).waitFor();
  await goto('/admin/goods-receipts');
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Số lượng nhận dòng 1', exact: true }).fill('3');
  const writeCount = writes.length;
  await page.getByRole('button', { name: 'Xác nhận nhập kho', exact: true }).click();
  await page.getByText('Phiếu có thay đổi chưa lưu.', { exact: false }).waitFor();
  assert.equal(writes.length, writeCount, 'dirty receipt cannot confirm');
  await page.getByRole('spinbutton', { name: 'Số lượng nhận dòng 1', exact: true }).fill('2');
  await withConfirm(() => page.getByRole('button', { name: 'Xác nhận nhập kho', exact: true }).click(), 'dismiss');
  assert.equal(writes.length, writeCount, 'cancelled confirmation sends no request');
  await withConfirm(() => page.getByRole('button', { name: 'Xác nhận nhập kho', exact: true }).click(), 'accept');
  await page.getByText('Đã xác nhận nhập kho.', { exact: true }).waitFor();
  assert.equal(writes.length, writeCount + 1);
  await goto('/admin/reports');
  await page.getByText('123.456₫').first().waitFor();
  reportError = true;
  await page.getByRole('navigation', { name: 'Loại báo cáo' }).getByRole('button', { name: 'Đơn hàng', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByText('123.456₫').count(), 0, 'stale report hidden');
  await goto('/admin/products/1');
  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  assert.equal(await page.getByLabel('Giá trị thuộc tính MATERIAL').inputValue(), '101',
    'editing an ACTIVE Product preserves its required Option selection');
  const price = page.getByRole('spinbutton', { name: 'Giá bán (VND)' });
  await price.fill('250000');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await price.inputValue(), '250000', 'failed product patch preserves input');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('250.000₫', { exact: true }).waitFor();
  const productPatch = writes.filter((entry) => entry.path === '/admin/products/1').at(-1)?.body;
  assert.ok(productPatch && !Object.hasOwn(productPatch, 'attribute_values')
    && !Object.hasOwn(productPatch, 'attribute_value_ids'),
    'price-only PATCH must omit untouched Option-backed Attribute values');
  assert.equal(product.attribute_values[0].attribute_value_id, 101,
    'price-only PATCH retains the existing Product Option selection');
  await goto('/admin/orders/1');
  const beforeAction = writes.length;
  await withConfirm(() => page.getByRole('button', { name: 'Xác nhận', exact: true }).click(), 'dismiss');
  assert.equal(writes.length, beforeAction);
  await withConfirm(() => page.getByRole('button', { name: 'Xác nhận', exact: true }).click(), 'accept');
  await page.getByRole('button', { name: 'Bắt đầu chuẩn bị', exact: true }).waitFor();
  assert.equal(writes.length, beforeAction + 1);
  assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).count(), 0,
    'admin recipient edits have no supported API');
  assert.equal(await page.getByRole('button', { name: /thu COD/i }).count(), 0,
    'COD collection is available only while shipping');
  for (const label of ['Bắt đầu chuẩn bị', 'Bắt đầu giao']) {
    await withConfirm(() => page.getByRole('button', { name: label, exact: true }).click(), 'accept');
  }
  await withConfirm(() => page.getByRole('button', { name: 'Hoàn tất giao hàng & thu COD', exact: true }).click(), 'accept', /200.000/);
  await page.getByText('Thanh toán: Đã thu tiền', { exact: false }).waitFor();
  assert.equal(writes.filter((entry) => entry.path === '/admin/orders/1/payment-actions').at(-1).body.action,
    'COMPLETE_DELIVERY_AND_COLLECT_COD');
  assert.deepEqual(writes.filter((entry) => entry.path === '/admin/orders/1/actions').map((entry) => entry.body.action),
    ['CONFIRM', 'START_PREPARING', 'DISPATCH']);
  assert.equal(writes.filter((entry) => entry.path === '/admin/orders/1').length, 0);
  await goto('/admin/orders?status=PENDING');
  assert.equal(
    await page.getByRole('combobox', { name: 'Trạng thái đơn' }).inputValue(),
    'PENDING',
  );
  await page.getByRole('combobox', { name: 'Trạng thái đơn' }).selectOption('CONFIRMED');
  await page.goBack();
  assert.equal(
    await page.getByRole('combobox', { name: 'Trạng thái đơn' }).inputValue(),
    'PENDING',
  );
  await goto('/admin/staff');
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await page.getByText('Trang 2', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Số điện thoại', exact: true })
    .fill('0900999888');
  await withConfirm(() => page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(), 'accept');
  await page.getByRole('dialog').getByRole('alert').waitFor();
  assert.equal(
    await page
      .getByRole('dialog')
      .getByRole('textbox', { name: 'Số điện thoại', exact: true })
      .inputValue(),
    '0900999888',
  );
  await withConfirm(() => page.keyboard.press('Escape'), 'dismiss');
  assert.equal(await page.getByRole('dialog').count(), 1, 'dirty modal survives cancelled Escape');
  await withConfirm(() => page.keyboard.press('Escape'), 'accept');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await goto('/admin/roles');
  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: 'CATALOG_READ', exact: true })
    .uncheck();
  await page.getByText('Gỡ: CATALOG_READ', { exact: true }).waitFor();
  await withConfirm(() => page.getByRole('dialog').getByRole('button', { name: 'Lưu', exact: true }).click(), 'accept');
  await page.getByRole('dialog').getByRole('alert').waitFor();
  assert.equal(
    await page
      .getByRole('dialog')
      .getByRole('checkbox', { name: 'CATALOG_READ', exact: true })
      .isChecked(),
    false,
  );
  await withConfirm(() => page.getByRole('button', { name: 'Đóng hộp thoại' }).click(), 'accept');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await goto('/admin/audit');
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await page.getByText('Trang 2', { exact: false }).waitFor();
  await page.getByRole('textbox', { name: 'Target type' }).fill('PRODUCT');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/admin/audit-logs?') && new URL(response.url()).searchParams.get('entity_type') === 'PRODUCT'),
    page.getByRole('button', { name: 'Lọc', exact: true }).click(),
  ]);
  await page.getByRole('cell', { name: 'PRODUCT 1', exact: true }).waitFor();
  assert.equal(reads.filter((entry) => entry.path === '/admin/audit-logs').at(-1).query.get('entity_type'), 'PRODUCT');
  assert.equal(reads.filter((entry) => entry.path === '/admin/audit-logs').at(-1).query.has('target_type'), false);
  await goto('/admin/roles');
  const permissionPanel = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Danh mục quyền', exact: true }) }).last();
  await permissionPanel.getByRole('button', { name: 'Sửa', exact: true }).click();
  const permissionEditor = page.getByRole('dialog');
  assert.equal(await permissionEditor.getByLabel('Mã quyền', { exact: true }).getAttribute('readonly'), '');
  await permissionEditor.getByLabel('Tên quyền', { exact: true }).fill('Xem danh mục cập nhật');
  await permissionEditor.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('Đã cập nhật permission.', { exact: true }).waitFor();
  assert.deepEqual(writes.filter((entry) => entry.path === '/admin/permissions/1').at(-1).body, { name: 'Xem danh mục cập nhật' });
  assert.equal(writes.some((entry) => entry.path.includes('undefined')), false);
  await goto('/admin/staff');
  await page.getByRole('button', { name: 'Thêm nhân viên', exact: true }).click();
  await page.getByLabel('Họ tên *', { exact: true }).fill('Nguyễn Văn Test');
  await page.getByLabel('Số điện thoại *', { exact: true }).fill('0900222333');
  await page.getByPlaceholder('Mật khẩu *', { exact: true }).fill('Test-password-123');
  await page.getByRole('checkbox', { name: 'SUPERADMIN', exact: true }).check();
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await page.getByText('Đã tạo tài khoản nhân viên.', { exact: true }).waitFor();
  const staffWrite = writes.filter((entry) => entry.path === '/admin/staff-accounts').at(-1).body;
  assert.equal(staffWrite.full_name, 'Nguyễn Văn Test');
  assert.deepEqual(staffWrite.role_ids, [1]);
  await goto('/admin/vouchers');
  await page.getByRole('button', { name: 'Xem / Sửa', exact: true }).click();
  const voucherEditor = page.getByRole('dialog');
  await voucherEditor.getByRole('combobox', { name: 'Loại giảm', exact: true }).selectOption('PERCENT');
  await voucherEditor.getByLabel('Giá trị giảm (%)', { exact: true }).fill('12.50');
  await voucherEditor.getByRole('combobox', { name: 'Trạng thái', exact: true }).selectOption('INACTIVE');
  await voucherEditor.getByRole('button', { name: 'Lưu voucher', exact: true }).click();
  await page.getByText('Đã lưu voucher.', { exact: true }).waitFor();
  assert.deepEqual(writes.filter((entry) => entry.path === '/admin/vouchers/27').at(-1).body,
    { code: 'SAVE10K', discount_type: 'PERCENT', discount_value: 1250, minimum_order_value: 0,
      maximum_discount: null, starts_at: null, ends_at: null, usage_limit: null, status: 'INACTIVE' });
  await page.getByRole('button', { name: 'Tạo voucher', exact: true }).click();
  await voucherEditor.getByLabel('Mã voucher', { exact: true }).fill('NEW10K');
  await voucherEditor.getByLabel('Giá trị giảm (VND)', { exact: true }).fill('10000');
  await voucherEditor.getByRole('button', { name: 'Lưu voucher', exact: true }).click();
  await page.getByRole('cell', { name: 'NEW10K', exact: true }).waitFor();
  assert.deepEqual(writes.filter((entry) => entry.path === '/admin/vouchers').at(-1).body,
    { code: 'NEW10K', discount_type: 'FIXED', discount_value: 10000, minimum_order_value: 0,
      maximum_discount: null, starts_at: null, ends_at: null, usage_limit: null });

  // Visual layout and accessible form naming across every Admin module.
  const routes = [
    '/admin/dashboard',
    '/admin/products',
    '/admin/products/1',
    '/admin/orders',
    '/admin/orders/1',
    '/admin/inventory',
    '/admin/inventory/history',
    '/admin/goods-receipts',
    '/admin/suppliers',
    '/admin/customers',
    '/admin/staff',
    '/admin/roles',
    '/admin/audit',
    '/admin/reports',
    '/admin/content',
    '/admin/catalog/categories',
    '/admin/catalog/brands',
    '/admin/catalog/attributes',
  ];
  reportError = false;
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of routes) {
      await goto(path);
      await page.locator('main h1').waitFor();
      if (path === '/admin/products/1') {
        await page.getByRole('button', { name: 'Tạo sản phẩm con', exact: true }).waitFor();
      }
      await page.waitForTimeout(80);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      if (overflow)
        console.error(
          await page.locator('body *').evaluateAll((nodes) =>
            nodes
              .filter((node) => node.getBoundingClientRect().right > innerWidth + 1)
              .map((node) => ({
                tag: node.tagName,
                cls: node.className,
                right: node.getBoundingClientRect().right,
                position: getComputedStyle(node).position,
              }))
              .slice(-15),
          ),
        );
      assert.equal(overflow, false, `no page overflow ${path} at ${width}px`);
      const unnamed = await page
        .locator('main input:not([type=checkbox]), main select, main textarea')
        .evaluateAll((inputs) =>
          inputs
            .filter(
              (input) =>
                !input.labels?.length &&
                !input.getAttribute('aria-label') &&
                !input.getAttribute('aria-labelledby'),
            )
            .map((input) => input.outerHTML),
        );
      assert.deepEqual(unnamed, [], `inputs have labels on ${path}`);
    }
    await goto('/admin/products');
    await page.locator('table tbody tr').first().waitFor();
    await page.screenshot({ path: `/tmp/fido-admin-products-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  me = { ...me, roles: [{ ...meRole, code: 'ADMIN' }], permissions: [] };
  await goto('/admin/products');
  await page.getByRole('heading', { name: 'Không có quyền truy cập' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Admin UX browser regression: PASS');
} catch (failure) {
  await page.screenshot({ path: '/tmp/fido-admin-failure.png', fullPage: true });
  console.error(await page.locator('body').innerText());
  throw failure;
} finally {
  await browser.close();
  await server.close();
}
