import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const { chromium } = createRequire(import.meta.url)('playwright');
const server = await createServer({ server: { port: 5181, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let quantity = 2;
let price = 100000;
let orders = 0;
let quotedPrice = price;
let rejectOrder = false;
let delayOrder = false;
let delayMutation = false;
let failCartRefresh = false;
let releaseOrder = () => {};
let releaseMutation = () => {};
const item = () => ({ cart_item_id: 1, variant_id: 1, product_name: 'Áo FIDO thử nghiệm', size: 'M', color: 'Đen', quantity, unit_price: price, line_total: quantity * price, available_quantity: 10, image_url: null });
const cart = () => ({ cart_id: 1, account_id: 1, items: quantity ? [item()] : [], subtotal: quantity * price });
const quote = () => ({ quote_id: 'test-quote', items: [item()], subtotal: quantity * price, discount: 0, shipping_fee: 30000, total: quantity * price + 30000, voucher: null });
const me = { account: { account_id: 1, phone: '0900000000', email: 'user@example.test', created_at: '2026-10-09T00:00:00Z', updated_at: '2026-10-09T00:00:00Z' }, addresses: [{ address_id: 1, address_text: 'Hà Nội', created_at: '2026-10-09T00:00:00Z' }], roles: [{ role_id: 1, code: 'CUSTOMER', name: 'Customer', description: null }], permissions: [] };
await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
await page.route('**/api/v1/**', async route => {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace('/api/v1', '');
  const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (path === '/me') return send({ data: me });
  if (path === '/cart') return failCartRefresh && quantity === 0 ? send({ message: 'Cart read failed' }, 500) : send({ data: cart() });
  if (path === '/cart/items/1' && request.method() === 'PATCH') {
    if (delayMutation) await new Promise(resolve => { releaseMutation = resolve; });
    quantity = request.postDataJSON().quantity;
    return send({ data: cart() });
  }
  if (path === '/checkout/quote') { quotedPrice = price; return send({ data: quote() }); }
  if (path === '/orders' && request.method() === 'POST') {
    assert.equal(request.postDataJSON().quote_id, 'test-quote');
    if (price !== quotedPrice) return send({ message: 'Giá hoặc sản phẩm đã thay đổi' }, 409);
    orders++;
    if (delayOrder) await new Promise(resolve => { releaseOrder = resolve; });
    if (rejectOrder) return send({ message: 'Không thể tạo đơn thử nghiệm' }, 409);
    quantity = 0;
    return send({ data: { order_id: orders, order_code: `ORD-${orders}`, order_status: 'PENDING' } }, 201);
  }
  if (/^\/me\/orders\/\d+$/.test(path)) return send({ data: { order_id: orders, order_code: `ORD-${orders}`, order_status: 'PENDING', recipient: { phone: me.account.phone, email: me.account.email, address: 'Hà Nội' }, items: [], subtotal: 0, discount: 0, shipping_fee: 0, total: 0, payment: { payment_status: 'UNPAID', amount_due: 0, amount_received: 0, amount_refunded: 0 }, shipping_info: null, created_at: me.account.created_at, updated_at: me.account.updated_at, completed_at: null, returned_at: null } });
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
  await page.getByLabel('Chọn địa chỉ nhận hàng').selectOption('1');
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
  assert.equal(await page.getByRole('button', { name: /^Đặt hàng COD/ }).evaluate(el => el === document.activeElement), true);
  await openDialog();
  await page.getByRole('button', { name: 'Quay lại chỉnh sửa' }).click();
  assert.equal(orders, 0);

  await openDialog();
  price = 120000;
  await confirm().click();
  await page.getByRole('alert').filter({ hasText: 'Giá hoặc sản phẩm đã thay đổi' }).waitFor();
  assert.equal(orders, 0, 'changed quote must require new confirmation');
  await loadQuote();
  await openDialog();
  assert.match(await dialog.innerText(), /270\.000/);
  rejectOrder = true;
  await confirm().click();
  await page.getByRole('alert').filter({ hasText: 'Không thể tạo đơn' }).waitFor();
  assert.equal(orders, 1);
  assert.equal(quantity, 2);
  assert.equal(await dialog.count(), 0);

  rejectOrder = false;
  await loadQuote();
  await page.getByLabel('Chọn địa chỉ nhận hàng').selectOption('new');
  await page.getByLabel('Địa chỉ nhận hàng *').fill('Địa chỉ mới');
  assert.equal(await page.getByRole('button', { name: /^Đặt hàng COD/ }).count(), 0, 'editing invalidates quote');
  await loadQuote();
  await openDialog();
  await mkdir('.browser-evidence', { recursive: true });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ animations: 'disabled', path: `.browser-evidence/after-confirmation-${width}.png` });
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
  await confirm().evaluate(el => { el.click(); el.click(); });
  await dialog.getByRole('button', { name: 'Đang tạo đơn...', exact: true }).waitFor();
  await page.waitForTimeout(100);
  assert.equal(orders, 2, 'synchronous double click sends only one additional order');
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 1, 'cannot dismiss while submitting');
  releaseOrder();
  await page.waitForURL('**/checkout/success/2');
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
  await page.getByLabel('Chọn địa chỉ nhận hàng').selectOption('1');
  await loadQuote();
  await openDialog();
  await confirm().click();
  await page.waitForURL('**/checkout/success/3');
  assert.equal(orders, 3);
  assert.match(await page.getByRole('button', { name: /^Giỏ hàng \(/ }).innerText(), /0$/);
  await page.getByText('Đơn đã được tạo. Chưa thể tải lại giỏ hàng; vui lòng tải lại trang khi có kết nối.').waitFor();
  assert.deepEqual(errors, []);
  console.log('Checkout browser flow: PASS (confirmation/cancel/price change/rejection/stale quote/pending mutation/double click/refresh/375,768,1440)');
} catch (error) {
  console.error(await page.locator("body").innerText(), errors);
  throw error;
} finally {
  await browser.close();
  await server.close();
}
