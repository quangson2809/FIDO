import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { storefrontFixture, me, date, meta } from './helpers/storefrontFixture.mjs';
const server = await createServer({ server: { port: 5196, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(10000); page.on('dialog', dialog => dialog.accept());
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    // The fixture deliberately returns 400/409; external artwork/fonts may be unavailable in CI.
    page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text()); });
    await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
    const fixture = storefrontFixture(); fixture.state.quantity = 1;
    const profile = { ...structuredClone(me), roles: [{ id: 1, code: 'SUPERADMIN', name: 'Quản trị', description: null, status: 'ACTIVE' }] };
    const metadata = structuredClone(meta);
    const customer = { ...structuredClone(me.account), id: 2 };
    const receipt = { receipt_id: 1, receipt_code: 'GR-OPS', supplier_id: 1, warehouse_id: 1, receipt_status: 'CONFIRMED', confirmed_at: date, created_at: date, updated_at: date, created_by_account_id: 1, confirmed_by_account_id: 1, items: [{ receipt_item_id: 1, product_id: 1, quantity_received: 2, unit_cost: 1000 }] };
    const corrections = []; let verificationRequests = 0, passwordChanges = 0, passwordResets = 0;
    const orderFilters = [];
    const pagination = data => ({ data, meta: { page: 1, page_size: 20, total: data.length, total_pages: 1 } });
    let blocked = true, price = 200000, attempts = 0, committed = 0, count = null;
    let received = [];
    const keys = []; const pages = [{ id: 1, slug: 'policy', title: 'Chính sách thử nghiệm', content: 'Nội dung ban đầu', status: 'DRAFT', updated_at: date, updated_by_account_id: 1 }];
    const item = () => ({ cart_item_id: 1, product_id: 1, quantity: 1, product_name: 'Áo FIDO', sku: 'FIDO-TEE-001', thumbnail: null, image_url: null, unit_price: price, line_total: price, available_quantity: 5, purchasable: true, unavailable_reason: null });
    const cart = () => ({ cart_id: 1, account_id: 1, items: committed ? [] : [item(), ...(blocked ? [{ ...item(), cart_item_id: 2, product_id: 2, product_name: 'Sản phẩm ngừng bán', purchasable: false, unavailable_reason: 'PRODUCT_NOT_AVAILABLE', line_total: 0 }] : [])], subtotal: committed ? 0 : price });
    const quote = () => ({ items: [item()], subtotal: price, discount_amount: 0, shipping_fee: 30000, total_amount: price + 30000, voucher: null, confirmation_token: price === 200000 ? 'quote-v1' : 'quote-v2' });
    const order = () => ({ order_id: 1, order_code: 'OPS-1', order_status: 'PENDING', recipient: { name: 'Test Customer', phone: '0900000000', email: null, address: '12 Đội Cấn' }, items: [{ ...item(), order_item_id: 1, discount_amount: 0, attribute_snapshot: '[]' }], subtotal: price, discount: 0, shipping_fee: 30000, total: price + 30000, payment: { payment_status: 'UNPAID', amount_due: price + 30000, amount_received: 0, amount_refunded: 0 }, created_at: date, updated_at: date, completed_at: null, returned_at: null, allowed_actions: ['CANCEL'] });
    await page.route('**/api/v1/**', async route => {
      const request = route.request(); const path = new URL(request.url()).pathname.replace('/api/v1', '');
      const method = request.method(); const data = request.postData() ? request.postDataJSON() : null;
      const send = (body, status = 200) => route.fulfill({ status, json: body });
      if (method === 'OPTIONS') return send({});
      if (path === '/me') return send({ data: profile });
      if (path === '/me/email/verification') { verificationRequests++; return route.fulfill({ status: 202, body: '' }); }
      if (path === '/me/password') {
        passwordChanges++;
        assert.equal(data.new_password, 'New-password-123');
        if (data.current_password !== 'Current-password-123') return send({ code: 'CURRENT_PASSWORD_INVALID', message: 'Mật khẩu hiện tại chưa đúng.' }, 400);
        return route.fulfill({ status: 204, body: '' });
      }
      if (path === '/admin/catalog/meta') return send({ data: metadata });
      if (path === '/admin/categories/1' && method === 'PATCH') { metadata.categories[0].status = data.status; return send({ data: metadata.categories[0] }); }
      if (path === '/admin/brands/1' && method === 'PATCH') { metadata.brands[0].status = data.status; return send({ data: metadata.brands[0] }); }
      if (path === '/admin/customers') return send(pagination([{ account_id: 2, phone: customer.phone, email: customer.email, order_count: 1, last_order_at: date }]));
      if (path === '/admin/customers/2') return send({ data: { account: customer, addresses: [], orders: [{ order_id: 1, order_code: 'OPS-HISTORY', order_status: 'PENDING', total: 230000 }] } });
      if (path === '/admin/customers/2/status' && method === 'PATCH') { assert.ok(data.reason.trim()); customer.status = data.status; return send({ data: customer }); }
      if (path === '/admin/suppliers') return send(pagination([{ supplier_id: 1, code: 'SUP-OPS', name: 'Nhà cung cấp kiểm thử', status: 'ACTIVE', phone: null, email: null }]));
      if (path === '/admin/goods-receipts') return send(pagination([receipt]));
      if (path === '/admin/goods-receipts/1') return send({ data: receipt });
      if (path === '/admin/goods-receipts/1/corrections') {
        if (method === 'POST') {
          assert.equal(data.expected_correction_id, corrections.at(-1)?.id ?? null);
          const previous = corrections.at(-1)?.items[0]; const line = data.items[0];
          const before_quantity = previous?.corrected_quantity ?? 2; const before_unit_cost = previous?.corrected_unit_cost ?? 1000;
          const next = { id: corrections.length + 1, goods_receipt_id: 1, created_by: 1, created_at: date, reason: data.reason, items: [{ ...line, before_quantity, before_unit_cost, quantity_delta: line.corrected_quantity - before_quantity, value_delta: line.corrected_quantity * line.corrected_unit_cost - before_quantity * before_unit_cost }] };
          corrections.push(next); return send({ data: next });
        }
        return send({ data: corrections });
      }
      if (path.startsWith('/admin/reports/')) {
        const params = new URL(request.url()).searchParams;
        const range = { from: params.get('from'), to: params.get('to') };
        if (path === '/admin/reports/operations') return send({ data: { ...range, timezone: 'Asia/Ho_Chi_Minh', placed_orders: 4, average_order_value: 25000, status_rates_bps: { CANCELLED: 5000, DELIVERY_FAILED: 2500, RETURNED: 2500 }, slow_moving_from: '2026-11-15', slow_moving_to: '2026-11-24', slow_moving_products: 1 } });
        if (path === '/admin/reports/operations/orders') { orderFilters.push(params.get('status')); return send(pagination([{ order_id: 1, order_code: 'OPS-REPORT', status: params.get('status') ?? 'CANCELLED', total_amount: 25000, created_at: date }])); }
        if (path === '/admin/reports/operations/slow-moving') return send(pagination([{ product_id: 1, sku: 'SLOW-10-DAYS', name: 'Hàng cần xem xét', quantity_on_hand: 3, last_sale_at: null }]));
        if (path === '/admin/reports/overview') return send({ data: { ...range, completed_sales: 0, returned_adjustment: 0, net_sales: 0, orders_by_status: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, SHIPPING: 0, COMPLETED: 0, DELIVERY_FAILED: 1, CANCELLED: 2, RETURNED: 1 } } });
        if (path === '/admin/reports/sales-trend') return send({ data: { ...range, granularity: params.get('granularity'), timezone: 'Asia/Ho_Chi_Minh', points: [] } });
      }
      if (path === '/cart') return send({ data: cart() });
      if (path === '/cart/items/2' && method === 'DELETE') { blocked = false; return send({ data: cart() }); }
      if (path === '/checkout/quote') { assert.equal('confirmation_token' in data, false, 'consent is not a quote input'); return send({ data: quote() }); }
      if (path === '/orders' && method === 'POST') {
        attempts++; keys.push(request.headers()['idempotency-key']);
        if (attempts === 1) { assert.equal(data.confirmation_token, 'quote-v1'); price = 220000; return send({ code: 'CHECKOUT_RECONFIRMATION_REQUIRED', message: 'Giá đã thay đổi. Chưa tạo đơn.' }, 409); }
        assert.equal(data.confirmation_token, 'quote-v2'); committed++; return send({ data: order() }, 201);
      }
      if (path === '/me/orders/1') return send({ data: order() });
      if (path === '/admin/orders/1') return send({ data: { ...order(), order_status: 'CANCELLED', customer_account_id: 1, voucher_id: null, allowed_actions: [], payment: { ...order().payment, collected_by_account_id: null, collected_at: null, refunded_by_account_id: null, refunded_at: null } } });
      if (path === '/admin/orders/1/history') return send({ data: [{ id: 1, action: 'ORDER_CANCEL', actor_account_id: 1, created_at: date, before: { status: 'DELIVERY_FAILED' }, after: { status: 'CANCELLED', reason: 'Kiểm tra hàng quay về' } }] });
      if (path === '/admin/orders/1/return-receipts') {
        if (method === 'POST') { assert.equal(data.items[0].received_quantity, 1); assert.equal(data.items[0].sellable_quantity, 0); const receipt = { id: 1, received_by: 1, reason: data.reason, created_at: date, items: [{ ...data.items[0], condition_code: 'DAMAGED', disposition: 'QUARANTINE' }] }; received = [receipt]; return send({ data: receipt }); }
        return send({ data: received });
      }

      if (path === '/admin/content-pages') {
        if (method === 'POST') { const next = { ...data, id: 2, status: 'DRAFT', updated_at: date, updated_by_account_id: 1 }; pages.push(next); return send({ data: next }, 201); }
        return send({ data: pages });
      }
      if (path.startsWith('/admin/content-pages/')) {
        const content = pages.find(p => p.id === Number(path.split('/').at(-1)));
        if (method === 'PATCH') Object.assign(content, data);
        return send({ data: content });
      }
      if (path === '/admin/inventory') {
        const currentPage = Number(new URL(request.url()).searchParams.get('page') ?? 1);
        return send({ data: [{ warehouse_id: 1, product_id: currentPage, sku: currentPage === 1 ? 'COUNT-SKU' : 'COUNT-SECOND', product_name: 'Sản phẩm kiểm kê', available_quantity: 2, version: currentPage === 1 ? 7 : 9, updated_at: date }], meta: { page: currentPage, page_size: 20, total: 21, total_pages: 2 } });
      }
      if (path === '/admin/stocktakes') {
        if (method === 'POST') { assert.equal(data.items.length, 2, 'physical counts from both inventory pages must be saved'); assert.equal(data.items[0].counted_quantity, 3); assert.equal(data.items[0].expected_version, 7); assert.equal(data.items[1].expected_version, 9); count = { id: 1, warehouse_id: 1, status: 'DRAFT', reason: data.reason, created_by: 1, confirmed_by: null, created_at: date, confirmed_at: null, items: data.items.map(line => ({ ...line, expected_quantity: 2, difference: line.counted_quantity - 2 })) }; return send({ data: count }); }
        return send({ data: count ? [count] : [] });
      }
      if (path === '/admin/stocktakes/1/actions') { assert.equal(data.action, 'CONFIRM'); count.status = 'CONFIRMED'; count.confirmed_by = 1; count.confirmed_at = date; return send({ data: count }); }
      if (path === '/auth/password-reset/request') { assert.equal(data.email, 'verified@example.test'); return route.fulfill({ status: 202, body: '' }); }
      if (path === '/auth/email/verify') { assert.equal(data.token, 'a'.repeat(43)); return route.fulfill({ status: 204, body: '' }); }
      if (path === '/auth/password-reset/confirm') { assert.equal(data.token, 'b'.repeat(43)); assert.equal(data.new_password, 'Reset-password-123'); passwordResets++; return route.fulfill({ status: 204, body: '' }); }
      return fixture.handler(route);
    });
    await page.goto('http://localhost:5196/products');
    await page.getByRole('button', { name: /^Giỏ hàng \(/ }).click();
    await page.getByText('Sản phẩm đã ngừng bán.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Tiếp tục đặt hàng', exact: true }).isDisabled(), true);
    await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Sản phẩm ngừng bán', exact: true }) }).getByRole('button', { name: 'Xóa sản phẩm', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
    await page.getByRole('heading', { name: 'Sản phẩm ngừng bán', exact: true }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Tiếp tục đặt hàng', exact: true }).click();
    await page.getByLabel('Địa chỉ đã lưu').selectOption('1');
    await page.getByRole('button', { name: 'Kiểm tra & báo giá', exact: true }).click();
    await page.getByRole('button', { name: /Đặt hàng COD/ }).click();
    await page.getByRole('button', { name: 'Xác nhận đặt hàng COD', exact: true }).click();
    await page.getByText('Giá hoặc ưu đãi đã thay đổi.', { exact: false }).waitFor(); assert.equal(committed, 0);
    await page.getByRole('button', { name: /Đặt hàng COD/ }).click();
    await page.getByRole('button', { name: 'Xác nhận đặt hàng COD', exact: true }).click();
    await page.waitForURL('**/checkout/success/1'); assert.equal(committed, 1); assert.notEqual(keys[0], keys[1]);
    await page.goto('http://localhost:5196/admin/content');
    await page.getByRole('button', { name: 'Tạo bản nháp nội dung', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Soạn bản nháp nội dung' });
    await modal.getByLabel('Mã đường dẫn').fill('new-policy'); await modal.getByLabel('Tiêu đề bản nháp').fill('Bản nháp mới'); await modal.getByLabel('Nội dung bản nháp').fill('Nội dung cần xem trước.');
    await modal.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click(); await modal.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Xem trước nội dung', exact: true }).click(); await page.getByRole('heading', { name: 'Bản nháp mới', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Công bố', exact: true }).click(); await page.getByText('Trạng thái: Đã công bố', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Gỡ công bố', exact: true }).click(); await page.getByText('Trạng thái: Bản nháp', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Lưu trữ', exact: true }).click(); await page.getByText('Trạng thái: Đã lưu trữ', { exact: true }).waitFor();
    for (const route of ['categories', 'brands']) {
      await page.goto('http://localhost:5196/admin/catalog/' + route);
      await page.getByRole('button', { name: 'Ngừng hiển thị / bán', exact: true }).first().click();
      await page.getByRole('button', { name: 'Kích hoạt lại', exact: true }).waitFor();
      await page.reload();
      await page.getByRole('button', { name: 'Kích hoạt lại', exact: true }).click();
      await page.getByRole('button', { name: 'Kích hoạt lại', exact: true }).waitFor({ state: 'detached' });
    }
    await page.goto('http://localhost:5196/admin/customers/2');
    const customerDialog = page.getByRole('dialog', { name: 'Hồ sơ khách hàng' });
    await customerDialog.getByLabel('Lý do khóa / mở khóa').fill('Xử lý vi phạm');
    await customerDialog.getByRole('button', { name: 'Khóa tài khoản', exact: true }).click();
    await customerDialog.getByRole('button', { name: 'Mở khóa tài khoản', exact: true }).waitFor();
    await customerDialog.getByText('OPS-HISTORY', { exact: false }).waitFor();
    await customerDialog.getByLabel('Lý do khóa / mở khóa').fill('Đã xử lý xong');
    await customerDialog.getByRole('button', { name: 'Mở khóa tài khoản', exact: true }).click();
    await customerDialog.getByRole('button', { name: 'Khóa tài khoản', exact: true }).waitFor();
    await page.goto('http://localhost:5196/admin/goods-receipts');
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
    await page.getByLabel('Số lượng đúng dòng #1').fill('3');
    await page.getByLabel('Lý do sửa sai').fill('Nhận thực tế ba sản phẩm');
    await page.getByRole('button', { name: 'Ghi chứng từ điều chỉnh', exact: true }).click();
    await page.getByText('Dòng #1: 2 × 1.000₫ → 3 × 1.000₫; chênh lệch kho 1, giá trị 1.000₫', { exact: true }).waitFor();
    await page.getByLabel('Giá vốn đúng dòng #1').fill('1500');
    await page.getByLabel('Lý do sửa sai').fill('Điều chỉnh đơn giá theo hóa đơn');
    await page.getByRole('button', { name: 'Ghi chứng từ điều chỉnh', exact: true }).click();
    await page.getByText('Dòng #1: 3 × 1.000₫ → 3 × 1.500₫; chênh lệch kho 0, giá trị 1.500₫', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Số lượng nhận dòng 1', { exact: true }).inputValue(), '2', 'original document stays immutable');
    await page.goto('http://localhost:5196/admin/reports?from=2026-11-01&to=2026-11-24');
    const reports = page.getByRole('region', { name: 'Chỉ tiêu vận hành và dữ liệu đối chiếu' });
    await reports.getByText('25.000₫ / 4 đơn', { exact: true }).waitFor();
    await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/operations/orders') && new URL(response.url()).searchParams.get('status') === 'CANCELLED'),
      reports.getByRole('button', { name: /Tỷ lệ Đã hủy/ }).click(),
    ]);
    assert.equal(orderFilters.at(-1), 'CANCELLED');
    await reports.getByRole('link', { name: 'OPS-REPORT', exact: true }).waitFor();
    await reports.getByRole('link', { name: /SLOW-10-DAYS/ }).waitFor();
    await page.goto('http://localhost:5196/admin/inventory'); await page.getByLabel('Số đếm COUNT-SKU').fill('3');
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await page.getByLabel('Số đếm COUNT-SECOND', { exact: true }).fill('1');
    await page.getByRole('region', { name: 'Kiểm kê hàng thực tế', exact: true }).getByText('COUNT-SKU: 3', { exact: false }).waitFor();
    await page.getByLabel('Nguyên nhân / ghi chú kiểm kê').fill('Đếm lại tại kho');
    await page.getByRole('button', { name: 'Lưu số đếm, chưa điều chỉnh kho', exact: true }).click(); await page.getByRole('heading', { name: 'Kiểm kê #1 · DRAFT', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xác nhận kiểm kê #1', exact: true }).click(); await page.getByRole('heading', { name: 'Kiểm kê #1 · CONFIRMED', exact: true }).waitFor();

    await page.goto('http://localhost:5196/admin/orders/1');
    await page.getByRole('heading', { name: 'Tiếp nhận hàng quay về', exact: true }).waitFor();
    await page.getByLabel('Thực nhận · FIDO-TEE-001').fill('1'); await page.getByLabel('Đủ điều kiện bán lại · FIDO-TEE-001').fill('0');
    await page.getByLabel('Kết quả kiểm tra / lý do tiếp nhận').fill('Hàng lỗi, cách ly'); await page.getByRole('button', { name: 'Xác nhận hàng thực nhận', exact: true }).click();
    await page.getByText('Dòng #1: nhận 1, bán lại 0, cách ly 1', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Lịch sử xử lý đơn', exact: true }).waitFor(); assert.equal(received.length, 1);
    await page.goto('http://localhost:5196/account');
    await page.getByRole('button', { name: 'Gửi liên kết xác minh email', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Đã yêu cầu gửi liên kết xác minh.' }).waitFor(); assert.equal(verificationRequests, 1);
    await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill('Wrong-password-123');
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill('New-password-123');
    await page.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill('New-password-123');
    await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Mật khẩu hiện tại chưa đúng.' }).waitFor();
    await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill('Current-password-123');
    await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
    await page.waitForURL('**/login'); assert.equal(passwordChanges, 2);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('fido.accessToken')), null);
    await page.goto('http://localhost:5196/account-recovery'); await page.getByLabel('Email đã xác minh').fill('verified@example.test'); await page.getByRole('button', { name: 'Gửi liên kết khôi phục', exact: true }).click(); await page.getByRole('status').filter({ hasText: 'Nếu email đã được xác minh' }).waitFor();
    await page.goto('http://localhost:5196/account-recovery#purpose=EMAIL_VERIFY&token=' + 'a'.repeat(43)); await page.getByRole('button', { name: 'Xác nhận email', exact: true }).waitFor(); assert.equal(new URL(page.url()).hash, '');
    await page.getByRole('button', { name: 'Xác nhận email', exact: true }).click(); await page.getByRole('status').filter({ hasText: 'Đã xác minh email.' }).waitFor();
    await page.goto('http://localhost:5196/account-recovery#purpose=PASSWORD_RESET&token=' + 'b'.repeat(43));
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill('Reset-password-123');
    await page.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill('Reset-password-123');
    await page.getByRole('button', { name: 'Đặt mật khẩu mới', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Đã đổi mật khẩu.' }).waitFor(); assert.equal(passwordResets, 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `no horizontal overflow at ${width}`);
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Operational browser PASS: unavailable Cart recovery, pre-creation price consent, content lifecycle, Category/Brand reactivation, customer lock/unlock, receipt correction chain, report drilldown, counts across inventory pages, physical returns/history, password change and verified-email recovery at 375/1440px.');
} finally { await browser.close(); await server.close(); }
