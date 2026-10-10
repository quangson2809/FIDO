import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { storefrontFixture, product, meta } from './helpers/storefrontFixture.mjs';
import { mkdir } from 'node:fs/promises';

const server = await createServer({ server: { port: 5185, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const failures = [];
const secondProduct = { ...product, product_id: 2, name: 'Quần FIDO', category: meta.categories[1] };
const recommendations = { data: [product, secondProduct].map(item => ({ ...item, thumbnail: null })), meta: { page: 1, page_size: 5, total: 2, total_pages: 1 } };

async function check(name, action, options = {}) {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, ...options });
  const fixture = storefrontFixture();
  const runtimeErrors = [];
  page.setDefaultTimeout(4000);
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
  await page.route('**/api/v1/**', fixture.handler);
  try {
    await action(page, fixture, path => page.goto('http://localhost:5185' + path));
    assert.deepEqual(runtimeErrors, [], 'no runtime errors');
    console.log(`PASS: ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL: ${name}\n${error.message}`);
  } finally { await page.close(); }
}

try {
  await mkdir('.browser-evidence', { recursive: true });
  await check('Home preserves products when metadata fails, with independent retry', async (page, fixture, go) => {
    fixture.state.failures.set('/catalog/meta', 500);
    await go('/');
    await page.getByText('Áo FIDO', { exact: true }).waitFor();
    const categories = page.locator('#danh-muc');
    await categories.getByRole('alert').waitFor();
    assert.ok(!(await categories.innerText()).includes('Chưa có danh mục'));
    const productReads = fixture.state.requests.filter(request => request.path === '/catalog/products').length;
    await page.screenshot({ animations: 'disabled', path: '.browser-evidence/review-home-partial-375.png', fullPage: true });
    fixture.state.failures.clear();
    await categories.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await categories.getByRole('heading', { name: 'Áo', exact: true }).waitFor();
    assert.equal(fixture.state.requests.filter(request => request.path === '/catalog/products').length, productReads, 'metadata retry must not discard/refetch valid products');
  });
  await check('Home preserves categories when products fail', async (page, fixture, go) => {
    fixture.state.failures.set('/catalog/products', 500);
    await go('/');
    await page.locator('#danh-muc').getByRole('heading', { name: 'Áo', exact: true }).waitFor();
    await page.locator('#san-pham-noi-bat').getByRole('alert').waitFor();
    const metaReads = fixture.state.requests.filter(request => request.path === '/catalog/meta').length;
    fixture.state.failures.clear();
    await page.locator('#san-pham-noi-bat').getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.getByText('Áo FIDO', { exact: true }).waitFor();
    assert.equal(fixture.state.requests.filter(request => request.path === '/catalog/meta').length, metaReads);
  });
  await check('Recommendations recover without resetting the selected product or quantity', async (page, fixture, go) => {
    fixture.state.failures.set('/catalog/products', 500);
    await go('/products/1');
    await page.getByRole('heading', { name: 'Áo FIDO', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Tăng số lượng', exact: true }).click();
    const related = page.getByRole('region', { name: 'Sản phẩm khác', exact: true });
    await related.getByRole('alert').waitFor();
    const detailReads = fixture.state.requests.filter(request => request.path === '/catalog/products/1').length;
    fixture.state.failures.clear();
    await page.route('**/api/v1/catalog/products?*', route => route.fulfill({ json: recommendations }));
    await related.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await related.getByText('Quần FIDO', { exact: true }).waitFor();
    assert.equal(fixture.state.requests.filter(request => request.path === '/catalog/products/1').length, detailReads);
    await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
    await page.getByText('Đã cập nhật giỏ hàng.', { exact: true }).waitFor();
    const added = fixture.state.requests.find(request => request.path === '/cart/items');
    assert.equal(added.body.quantity, 2, 'secondary retry retains purchase choices');
  });
  await check('Slow recommendations do not block the purchase panel', async (page, fixture, go) => {
    let release;
    const delayed = new Promise(resolve => { release = resolve; });
    await page.route('**/api/v1/catalog/products?*', async route => { await delayed; await route.fulfill({ json: recommendations }); });
    try {
      await go('/products/1');
      await page.getByRole('heading', { name: 'Áo FIDO', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).isEnabled(), true);
    } finally { release(); }
  });
  await check('Catalog rejects page values outside the backend Integer contract', async (page, fixture, go) => {
    await go('/products?page=2147483648&category_id=1');
    await page.waitForURL(url => !url.searchParams.has('page'));
    await page.getByText('25 sản phẩm', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('category_id'), '1');
    assert.equal(fixture.state.requests.some(request => new URLSearchParams(request.query).get('page') === '2147483648'), false, 'never send an unbindable page to the API');
  });
  await check('Catalog metadata retry preserves the already loaded product results', async (page, fixture, go) => {
    fixture.state.failures.set('/catalog/meta', 500);
    await go('/products?category_id=1');
    await page.getByText('25 sản phẩm', { exact: true }).waitFor();
    await page.getByRole('button', { name: /^Bộ lọc/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Bộ lọc sản phẩm' });
    await dialog.getByRole('alert').waitFor();
    const productReads = fixture.state.requests.filter(request => request.path === '/catalog/products').length;
    fixture.state.failures.clear();
    await dialog.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('dialog select')?.disabled);
    assert.equal(await dialog.getByLabel('Danh mục', { exact: true }).inputValue(), '1');
    assert.equal(fixture.state.requests.filter(request => request.path === '/catalog/products').length, productReads, 'metadata-only retry must not erase/refetch valid catalog results');
  });
  await check('Changing applied filters clears obsolete draft validation errors', async (page, fixture, go) => {
    await go('/products?category_id=1');
    await page.getByText('25 sản phẩm', { exact: true }).waitFor();
    const open = page.getByRole('button', { name: /^Bộ lọc/ });
    await open.click();
    const dialog = page.getByRole('dialog', { name: 'Bộ lọc sản phẩm' });
    await dialog.getByLabel('Giá từ', { exact: true }).fill('invalid');
    await dialog.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
    await dialog.getByRole('alert').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Xóa Danh mục/ }).click();
    await page.waitForURL('**/products');
    await open.click();
    assert.equal(await dialog.getByLabel('Giá từ', { exact: true }).inputValue(), '');
    assert.equal(await dialog.getByRole('alert').count(), 0, 'old invalid draft must not mark the new query invalid');
  });
  await check('Escape closes header navigation while its trigger retains focus', async (page, fixture, go) => {
    await go('/products');
    await page.getByText('25 sản phẩm', { exact: true }).waitFor();
    for (const name of ['Danh mục sản phẩm', /^(Mở|Đóng) menu$/]) {
      const trigger = page.getByRole('button', { name, exact: true });
      await trigger.focus(); await page.keyboard.press('Enter');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    }
  });
  for (const touch of [false, true]) {
    await check(`Header category disclosure opens with ${touch ? 'touch tap' : 'mouse click'}`, async (page, fixture, go) => {
      await go('/');
      await page.getByText('Áo FIDO', { exact: true }).waitFor();
      const trigger = page.getByRole('button', { name: 'Danh mục sản phẩm', exact: true });
      if (touch) await trigger.tap(); else await trigger.click();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      await page.locator('#storefront-category-menu').getByRole('link', { name: 'Tất cả sản phẩm', exact: true }).click();
      await page.waitForURL('**/products');
      await page.getByText('25 sản phẩm', { exact: true }).waitFor();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    }, { hasTouch: touch, isMobile: touch });
  }
  await check('Reduced motion applies to Home and recommendation navigation', async (page, fixture, go) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const original = window.scrollTo.bind(window);
      window.storefrontScrollCalls = [];
      window.scrollTo = (...args) => { window.storefrontScrollCalls.push(args); original(...args); };
    });
    await page.route('**/api/v1/catalog/products?*', route => route.fulfill({ json: recommendations }));
    await page.route('**/api/v1/catalog/products/2', route => route.fulfill({ json: { data: secondProduct } }));
    await go('/');
    await page.locator('#san-pham-noi-bat').getByRole('button', { name: 'Xem chi tiết: Áo FIDO', exact: true }).click();
    await page.waitForURL('**/products/1');
    assert.notEqual(await page.evaluate(() => window.storefrontScrollCalls.at(-1)?.[0]?.behavior), 'smooth');
    await page.getByRole('region', { name: 'Sản phẩm khác', exact: true }).getByRole('button', { name: /Quần FIDO/ }).click();
    await page.waitForURL('**/products/2');
    assert.notEqual(await page.evaluate(() => window.storefrontScrollCalls.at(-1)?.[0]?.behavior), 'smooth');
  });
  await check('Confirmation traps focus, locks scroll and explains quote expiry', async (page, fixture, go) => {
    await go('/checkout');
    await page.getByLabel('Chọn địa chỉ nhận hàng').selectOption('2');
    fixture.state.expiresAt = new Date(Date.now() + 2000).toISOString();
    await page.getByRole('button', { name: 'Kiểm tra & báo giá', exact: true }).click();
    const trigger = page.getByRole('button', { name: /^Đặt hàng COD/ });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Xác nhận đặt hàng', exact: true });
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true, 'focus remains in confirmation');
    }
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await dialog.getByRole('alert').filter({ hasText: 'Báo giá đã hết hạn' }).waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Xác nhận đặt hàng COD', exact: true }).isDisabled(), true);
    assert.equal(fixture.state.orders, 0);
    await page.screenshot({ animations: 'disabled', path: '.browser-evidence/review-expired-confirmation-375.png' });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  });
  await check('Valid long product names and SKUs never overflow at four viewports', async (page, fixture, go) => {
    const longProduct = { ...product, name: 'FIDO'.repeat(63) + 'ABC', variants: [{ ...product.variants[0], sku: 'FIDO' + 'X'.repeat(96) }] };
    await page.route('**/api/v1/catalog/products/1', route => route.fulfill({ json: { data: longProduct } }));
    await page.route('**/api/v1/catalog/products?*', route => route.fulfill({ json: { data: [{ ...longProduct, thumbnail: null }], meta: { page: 1, page_size: 12, total: 1, total_pages: 1 } } }));
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/products/1', '/products', '/']) {
        await go(path);
        await page.getByRole('heading', { name: longProduct.name, exact: true }).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path}: valid text overflow at ${width}`);
      }
    }
  });
  await check('Policy retry preserves loaded content on temporary errors and respects 404', async (page, fixture, go) => {
    fixture.state.failures.set('/content-pages/return-policy', 500);
    await go('/policies');
    const shipping = page.getByRole('heading', { name: 'Chính sách giao hàng', exact: true });
    await shipping.waitFor();
    fixture.state.failures.clear();
    fixture.state.failures.set('/content-pages/shipping-policy', 500);
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.getByRole('heading', { name: 'Chính sách trả hàng', exact: true }).waitFor();
    await page.getByRole('alert').waitFor();
    assert.equal(await shipping.isVisible(), true, 'temporary failures must not erase previously loaded policies');
    fixture.state.failures.set('/content-pages/shipping-policy', 404);
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await shipping.waitFor({ state: 'detached' });
    await page.getByRole('heading', { name: 'Chính sách trả hàng', exact: true }).waitFor();
    assert.ok(!(await page.locator('main').innerText()).includes('SQLException'));
  });
  assert.deepEqual(failures, [], 'all recovery acceptance cases must pass');
} finally { await browser.close(); await server.close(); }
