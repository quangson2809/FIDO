import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const { chromium } = createRequire(import.meta.url)('playwright');
const server = await createServer({ server: { port: 5181, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let quantity = 2;
let price = 100000;
let orders = 0;
let orderRequests = 0;
const idempotencyKeys = [];
let rejectOrder = false;
let delayOrder = false;
let delayMutation = false;
let failCartRefresh = false;
let releaseOrder = () => {};
let releaseMutation = () => {};
const item = () => ({
  cart_item_id: 1,
  product_id: 1,
  product_name: 'Áo FIDO thử nghiệm',
  thumbnail: null,
  image_url: null,
  sku: 'FIDO-TEST-001',
  quantity,
  unit_price: price,
  line_total: quantity * price,
  discount_amount: 0,
  available_quantity: 10,
});
const cart = () => ({
  cart_id: 1,
  account_id: 1,
  items: quantity ? [item()] : [],
  subtotal: quantity * price,
});
const quote = () => ({
  items: [item()],
  subtotal: quantity * price,
  discount_amount: 0,
  shipping_fee: 30000,
  total_amount: quantity * price + 30000,
  voucher: null,
});
const me = {
  account: {
    id: 1,
    full_name: 'Test Customer',
    phone: '0900000000',
    email: 'user@example.test',
    status: 'ACTIVE',
    created_at: '2026-10-09T00:00:00Z',
    updated_at: '2026-10-09T00:00:00Z',
  },
  addresses: [{
    id: 1,
    recipient_name: 'Test Customer',
    recipient_phone: '0900000000',
    province: 'Hà Nội',
    district: 'Hoàn Kiếm',
    ward: 'Hàng Trống',
    address_line: '1 Đinh Tiên Hoàng',
    is_default: true,
  }],
  roles: [{ role_id: 1, code: 'CUSTOMER', name: 'Customer', description: null }],
  permissions: [],
};
await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace('/api/v1', '');
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
  if (path === '/me') return send({ data: me });
  if (path === '/cart')
    return failCartRefresh && quantity === 0
      ? send({ message: 'Cart read failed' }, 500)
      : send({ data: cart() });
  if (path === '/cart/items/1' && request.method() === 'PATCH') {
    if (delayMutation)
      await new Promise((resolve) => {
        releaseMutation = resolve;
      });
    quantity = request.postDataJSON().quantity;
    return send({ data: cart() });
  }
  if (path === '/checkout/quote') {
    quotedPrice = price;
    return send({ data: quote() });
  }
  if (path === '/orders' && request.method() === 'POST') {
    const orderBody = request.postDataJSON();
    assert.deepEqual(
      Object.keys(orderBody).sort(),
      ['address_line', 'district', 'province', 'recipient_name', 'recipient_phone', 'voucher_code'],
    );
    assert.equal(orderBody.recipient_phone, '0900000000');
    assert.ok(orderBody.address_line);
    const idempotencyKey = request.headers()['idempotency-key'];
    assert.match(idempotencyKey ?? '', /^[A-Za-z0-9._~-]{1,128}$/);
    idempotencyKeys.push(idempotencyKey);
    orderRequests++;
    if (delayOrder)
      await new Promise((resolve) => {
        releaseOrder = resolve;
      });
    if (rejectOrder) return send({ message: 'Không thể tạo đơn thử nghiệm' }, 409);
    orders++;
    const subtotal = quantity * price;
    const total = subtotal + 30000;
    quantity = 0;
    return send(
      {
        data: {
          order_id: orders,
          order_code: `ORD-${orders}`,
          order_status: 'PENDING',
          payment: {
            payment_status: 'UNPAID',
            amount_due: total,
            amount_received: 0,
            amount_refunded: 0,
          },
          subtotal,
          discount: 0,
          shipping_fee: 30000,
          total,
          recipient: {
            phone: orderBody.recipient_phone,
            email: null,
            address: [orderBody.address_line, orderBody.ward, orderBody.district, orderBody.province].join(', '),
          },
          created_at: '2026-10-29T00:00:00Z',
        },
      },
      201,
    );
  }
  if (/^\/me\/orders\/\d+$/.test(path))
    return send({
      data: {
        order_id: orders,
        order_code: `ORD-${orders}`,
        order_status: 'PENDING',
        recipient: { phone: me.account.phone, email: me.account.email, address: 'Hà Nội' },
        items: [],
        subtotal: 0,
        discount: 0,
        shipping_fee: 0,
        total: 0,
        payment: {
          payment_status: 'UNPAID',
          amount_due: 0,
          amount_received: 0,
          amount_refunded: 0,
        },
        shipping_info: null,
        created_at: me.account.created_at,
        updated_at: me.account.updated_at,
        completed_at: null,
        returned_at: null,
      },
    });
  return send({ data: [], meta: { page: 1, page_size: 20, total: 0, total_pages: 0 } });
});
const loadQuote = async () => {
  await page.getByRole('button', { name: /Kiểm tra & báo giá/ }).click();
  await page.getByRole('button', { name: /Đặt hàng COD/ }).waitFor();
};
const openDialog = () => page.getByRole('button', { name: /^Đặt hàng COD/ }).click();
const confirm = () => page.getByRole('button', { name: 'Xác nhận đặt hàng COD', exact: true });
try {
  await page.goto('http://localhost:5181/checkout');
  await page.getByLabel('Địa chỉ đã lưu').selectOption('1');
  await loadQuote();
  await openDialog();
  const dialog = page.getByRole('dialog', { name: 'Xác nhận đặt hàng', exact: true });
  await dialog.waitFor();
  assert.equal(orders, 0);
  assert.match(await dialog.innerText(), /0900000000/);
  assert.match(await dialog.innerText(), /230\.000/);
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  assert.equal(orders, 0);
  assert.equal(
    await page
      .getByRole('button', { name: /^Đặt hàng COD/ })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await openDialog();
  await page.getByRole('button', { name: 'Quay lại chỉnh sửa' }).click();
  assert.equal(orders, 0);

  // The quote is advisory: order creation may return a different backend-confirmed total.
  price = 120000;
  await openDialog();
  await confirm().click();
  await page.waitForURL('**/checkout/success/1');
  assert.equal(orders, 1);
  assert.equal(quantity, 0);
  await page.getByText(/tổng COD cuối cùng do Backend xác nhận là 270\.000/).waitFor();

  // A rejected creation must retain the cart and require a new quote.
  quantity = 2;
  rejectOrder = true;
  await page.goto('http://localhost:5181/checkout');
  await page.getByLabel('Địa chỉ đã lưu').selectOption('1');
  await loadQuote();
  await openDialog();
  await confirm().click();
  await page.getByRole('alert').filter({ hasText: 'Không thể tạo đơn thử nghiệm' }).waitFor();
  assert.equal(orders, 1);
  assert.equal(orderRequests, 2);
  assert.equal(quantity, 2);
  assert.equal(await dialog.count(), 0);

  rejectOrder = false;
  await loadQuote();
  await page.getByLabel('Địa chỉ đã lưu').selectOption('new');
  await page.getByLabel('Địa chỉ cụ thể *').fill('Địa chỉ mới');
  assert.equal(
    await page.getByRole('button', { name: /^Đặt hàng COD/ }).count(),
    0,
    'editing invalidates quote',
  );
  await loadQuote();
  await openDialog();
  await mkdir('.browser-evidence', { recursive: true });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({
      animations: 'disabled',
      path: '.browser-evidence/after-confirmation-' + width + '.png',
    });
  }
  await page.getByRole('button', { name: 'Quay lại chỉnh sửa' }).click();

  // Pending cart writes disable quotation; their response invalidates an older quote.
  await page.getByRole('button', { name: /^Giỏ hàng \(/ }).click();
  delayMutation = true;
  await page.getByLabel('Tăng số lượng').click();
  await page.getByRole('button', { name: 'Đóng giỏ hàng', exact: true }).last().click();
  assert.equal(await page.getByRole('button', { name: /Kiểm tra & báo giá/ }).isDisabled(), true);
  await page.waitForTimeout(100);
  releaseMutation();
  delayMutation = false;
  await loadQuote();
  await openDialog();
  delayOrder = true;
  await confirm().evaluate((el) => {
    el.click();
    el.click();
  });
  await dialog.getByRole('button', { name: 'Đang tạo đơn...', exact: true }).waitFor();
  await page.waitForTimeout(100);
  assert.equal(orders, 1, 'order is not counted until backend creation succeeds');
  assert.equal(orderRequests, 3, 'synchronous double click sends one request');
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 1, 'cannot dismiss while submitting');
  releaseOrder();
  await page.waitForURL('**/checkout/success/2');
  assert.equal(orders, 2);
  assert.equal(quantity, 0);
  assert.match(await page.getByRole('button', { name: /^Giỏ hàng \(/ }).innerText(), /0$/);
  await page.goto('http://localhost:5181/checkout');
  await page.getByText('Giỏ hàng trống.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Kiểm tra & báo giá/ }).isDisabled(), true);

  // A failed reconciliation read must not turn a successful order into an error or a retry.
  quantity = 1;
  delayOrder = false;
  failCartRefresh = true;
  await page.reload();
  await page.getByLabel('Địa chỉ đã lưu').selectOption('1');
  await loadQuote();
  await openDialog();
  await confirm().click();
  await page.waitForURL('**/checkout/success/3');
  assert.equal(orders, 3);
  assert.equal(orderRequests, 4);
  assert.equal(new Set(idempotencyKeys).size, 4, 'each distinct submission must use a fresh key');
  assert.match(await page.getByRole('button', { name: /^Giỏ hàng \(/ }).innerText(), /0$/);
  await page
    .getByText('Đơn đã được tạo. Chưa thể tải lại giỏ hàng; vui lòng tải lại trang khi có kết nối.')
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'Checkout browser flow: PASS (backend-recalculated total/idempotency/COD confirmation/rejection/stale quote/pending mutation/double click/cart reconciliation/375,768,1440)',
  );
} catch (error) {
  console.error(await page.locator('body').innerText(), errors);
  throw error;
} finally {
  await browser.close();
  await server.close();
}
