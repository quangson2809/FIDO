import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
import { storefrontFixture } from './helpers/storefrontFixture.mjs';

const server = await createServer({ server: { port: 5198, strictPort: true } });
await server.listen();
let browser;
const date = '2026-11-17T00:00:00Z';

async function check(name, action, width = 1280) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const fixture = storefrontFixture();
  const state = { status: 'PENDING', allowed: ['CANCEL'], mode: 'success', posts: [], reads: 0, release: () => {} };
  const detail = (id = 1) => ({
    order_id: id, order_code: `FIDO-${id}`, order_status: id === 1 ? state.status : 'PENDING',
    recipient: { name: 'Test', phone: '0901234567', email: null, address: 'Hà Nội' }, items: [],
    subtotal: 100000, discount: 1000, shipping_fee: 30000, total: 129000,
    payment: { payment_status: 'UNPAID', amount_due: 129000, amount_received: 0, amount_refunded: 0 },
    completed_at: null, returned_at: null, created_at: date, updated_at: date,
    allowed_actions: id === 1 ? state.allowed : ['CANCEL'],
  });
  await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const match = path.match(/^\/api\/v1\/me\/orders\/(\d+)(\/cancel)?$/);
    if (match) {
      assert.equal(request.headers().authorization, 'Bearer fixture');
      if (match[2]) {
        assert.equal(request.method(), 'POST');
        assert.equal(request.postData(), null, 'owner and action are derived by the backend');
        state.posts.push(path);
        if (state.mode === 'defer') await new Promise(resolve => { state.release = resolve; });
        if (state.mode === 'conflict') {
          state.status = 'CONFIRMED'; state.allowed = [];
          return route.fulfill({ status: 409, json: { code: 'ORDER_TRANSITION_NOT_ALLOWED', message: 'ORDER_TRANSITION_NOT_ALLOWED' } });
        }
        if (state.mode === 'error') return route.fulfill({ status: 500, json: { message: 'Internal Server Error' } });
        state.status = 'CANCELLED'; state.allowed = [];
        return route.fulfill({ json: { data: detail(Number(match[1])) } });
      }
      state.reads++;
      if (state.mode === 'not-found') return route.fulfill({ status: 404, json: { code: 'ORDER_NOT_FOUND' } });
      return route.fulfill({ json: { data: detail(Number(match[1])) } });
    }
    if (path === '/api/v1/me/orders') return route.fulfill({ json: {
      data: [{ ...detail(), payment_status: 'UNPAID', image_url: null }],
      meta: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    } });
    return fixture.handler(route);
  });
  const go = path => page.goto(`http://localhost:5198${path}`);
  try {
    await action(page, state, go);
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log(`PASS: ${name}`);
  } finally {
    state.release();
    await page.close();
  }
}

try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  await mkdir('.browser-evidence/order-cancel', { recursive: true });
  for (const width of [375, 1280]) {
    await check(`confirmed cancellation, busy guard and refreshed history (${width}px)`, async (page, state, go) => {
      state.mode = 'defer';
      await go('/orders/1');
      const open = page.getByRole('button', { name: 'Hủy đơn hàng', exact: true });
      await open.click();
      const dialog = page.getByRole('dialog', { name: 'Xác nhận hủy đơn hàng' });
      await dialog.waitFor();
      assert.equal(state.posts.length, 0);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
      assert.equal(await open.evaluate(button => document.activeElement === button), true);
      await open.click();
      await dialog.getByRole('button', { name: 'Giữ đơn hàng' }).click();
      assert.equal(state.posts.length, 0);
      await open.click();
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 10 && box.y > 0, 'dialog stays inside the viewport');
      assert.ok(Math.abs(box.x + box.width / 2 - width / 2) < 2, 'dialog is centered');
      const heading = await dialog.getByRole('heading').boundingBox();
      assert.ok(heading.x - box.x >= 20, 'dialog content has breathing room');
      await page.screenshot({ path: `.browser-evidence/order-cancel/confirm-${width}.png` });
      const sent = page.waitForRequest(request => request.url().endsWith('/me/orders/1/cancel'));
      await dialog.getByRole('button', { name: 'Xác nhận hủy', exact: true }).evaluate(button => { button.click(); button.click(); });
      await sent;
      assert.equal(await dialog.getByRole('button', { name: 'Đang hủy...' }).isDisabled(), true);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 1);
      assert.equal(state.posts.length, 1);
      state.release();
      await page.getByRole('status').filter({ hasText: 'Đã hủy đơn hàng.' }).waitFor();
      assert.equal(await dialog.count(), 0);
      assert.equal(await open.count(), 0);
      assert.equal(state.posts.length, 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#storefront-main').getByRole('button', { name: 'Đơn hàng của tôi', exact: true }).click();
      await page.locator('article').getByText('Đã hủy', { exact: true }).waitFor();
    }, width);
  }

  await check('visibility follows server actions, including unavailable PENDING', async (page, state, go) => {
    for (const status of ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'DELIVERY_FAILED', 'COMPLETED', 'CANCELLED', 'RETURNED']) {
      state.status = status; state.allowed = [];
      await go('/orders/1');
      await page.getByRole('heading', { name: 'FIDO-1', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).count(), 0);
    }
    assert.equal(state.posts.length, 0);
  });

  await check('409 refreshes stale order and removes cancellation', async (page, state, go) => {
    state.mode = 'conflict';
    await go('/orders/1');
    await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
    const initialReads = state.reads;
    await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click();
    await page.getByText('Đã xác nhận', { exact: true }).waitFor();
    assert.equal(await page.getByRole('alert').textContent(), 'Đơn hàng đã thay đổi hoặc không còn đủ điều kiện hủy. Vui lòng kiểm tra trạng thái mới.');
    assert.equal(await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).count(), 0);
    assert.ok(state.reads > initialReads, 'reload detail after a stale-state conflict');
    assert.equal(state.posts.length, 1);
  });

  await check('failed cancellation shows a safe error and supports explicit retry', async (page, state, go) => {
    state.mode = 'error';
    await go('/orders/1');
    await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Chưa thể hủy đơn hàng.' }).waitFor();
    state.mode = 'success';
    await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Đã hủy đơn hàng.' }).waitFor();
    assert.equal(state.posts.length, 2);
  });

  await check('not-found order exposes no cancellation control', async (page, state, go) => {
    state.mode = 'not-found';
    await go('/orders/1');
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).count(), 0);
    assert.equal(state.posts.length, 0);
  });

  await check('late cancellation response cannot replace another order', async (page, state, go) => {
    state.mode = 'defer';
    await go('/orders/1');
    await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
    const sent = page.waitForRequest(request => request.url().endsWith('/me/orders/1/cancel'));
    await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click();
    await sent;
    await page.evaluate(() => { history.pushState(null, '', '/orders/2'); dispatchEvent(new PopStateEvent('popstate')); });
    await page.getByRole('heading', { name: 'FIDO-2', exact: true }).waitFor();
    const response = page.waitForResponse(result => result.url().endsWith('/me/orders/1/cancel'));
    state.release();
    await response;
    await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'FIDO-2', exact: true }).count(), 1);
    assert.equal(await page.getByText('Đã hủy đơn hàng.', { exact: true }).count(), 0);
  });
} finally {
  await browser?.close();
  await server.close();
}
