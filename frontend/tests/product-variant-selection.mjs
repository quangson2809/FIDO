import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

// Uses an externally installed Playwright via Node resolution (including NODE_PATH).
// No production dependency or app test-only entry point is needed.
const { chromium } = createRequire(import.meta.url)('playwright');
const server = await createServer({ server: { port: 5178, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture-token'));
  const size = (id, name) => ({ size_value_id: id, size_system_id: 1, code: name, display_name: name, sort_order: id });
  const color = (id, name) => ({ color_id: id, code: name, name });
  const variant = (id, sizeValue, colorValue, stock, price = 199000, status = 'ON_SALE') => ({
    variant_id: id, size: sizeValue, color: colorValue, sku: `SKU-${id}`,
    effective_price: price, sale_status: status, available_quantity: stock,
  });
  const m = size(10, 'M');
  const l = size(11, 'L');
  const xl = size(12, 'XL');
  const xxl = size(13, 'XXL');
  const black = color(20, 'Đen');
  const white = color(21, 'Trắng');
  const red = color(22, 'Đỏ');
  const product = {
    product_id: 1, name: 'Variant selection fixture', description: null,
    category: { category_id: 1, parent_category_id: null, name: 'Áo' }, brand: null,
    size_system: { size_system_id: 1, code: 'TOP', name: 'Áo', size_values: [m, l, xl, xxl] },
    gender: null, season: null, style: null, material_care: null,
    base_price: 199000, sale_status: 'ON_SALE', images: [],
    variants: [
      variant(100, m, red, 5, 199000, 'STOPPED'),
      variant(101, m, white, 0),
      variant(102, m, black, 5, 249000),
      variant(103, l, black, 4),
      variant(104, l, white, 3, 279000),
      variant(105, xl, white, 2),
      variant(106, xxl, black, 0, 299000),
      variant(107, xxl, white, 3, 199000, 'STOPPED'),
    ],
  };
  let detail = product;
  const cartRequests = [];
  const emptyCart = { cart_id: 1, account_id: 1, items: [], subtotal: 0, created_at: null, updated_at: null };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
      return;
    }
    let body;
    if (path === '/api/v1/catalog/products/1') body = { data: detail };
    else if (path === '/api/v1/catalog/products') body = { data: [], meta: { page: 1, page_size: 5, total_items: 0, total_pages: 0 } };
    else if (path === '/api/v1/cart/items') {
      cartRequests.push(request.postDataJSON());
      body = { data: emptyCart };
    } else if (path === '/api/v1/cart') body = { data: emptyCart };
    else if (path === '/api/v1/me') body = { data: {
      account: { account_id: 1, phone: '0900000000', email: null, created_at: '', updated_at: '' },
      addresses: [], roles: [{ role_id: 1, code: 'CUSTOMER', name: 'Customer', description: null }], permissions: [],
    } };
    else if (path === '/api/v1/catalog/meta') body = { data: { categories: [], brands: [], size_systems: [], colors: [], genders: [], seasons: [], styles: [] } };
    else { await route.abort(); return; }
    await route.fulfill({ json: body, headers: { 'access-control-allow-origin': '*' } });
  });
  const panel = page.locator('aside').filter({ has: page.getByRole('heading', { name: product.name }) });
  const button = (name) => panel.getByRole('button', { name, exact: true });
  const selected = async (name) => assert.equal(await button(name).getAttribute('aria-pressed'), 'true', `${name} selected`);
  const textIncludes = async (text) => assert.ok((await panel.textContent()).includes(text), text);
  const quantityIs = async (quantity) => assert.equal(await button('Tăng số lượng').locator('..').locator('span').innerText(), String(quantity));
  const load = async () => {
    await page.goto('http://localhost:5178/products/1');
    await panel.waitFor();
  };
  const assertNoCartRequest = async () => {
    const before = cartRequests.length;
    assert.equal(await button('Không khả dụng').isDisabled(), true);
    // Native click must not dispatch on a disabled button.
    await button('Không khả dụng').evaluate((element) => element.click());
    await page.waitForTimeout(100);
    assert.equal(cartRequests.length, before);
  };

  await load();
  await selected('M');
  await selected('Đen');
  await textIncludes('249.000₫');
  assert.equal(await button('Đỏ').count(), 0, 'stopped-only color is not offered');
  await button('Tăng số lượng').click();
  await quantityIs(2);
  await button('L').click();
  await selected('Đen');
  await quantityIs(1);
  await textIncludes('199.000₫');
  await textIncludes('Còn 4');
  await button('Tăng số lượng').click();
  await button('XL').click();
  await selected('XL');
  assert.equal(await button('Đen').getAttribute('aria-pressed'), 'false');
  assert.equal(await button('Trắng').getAttribute('aria-pressed'), 'false');
  assert.equal(await button('Đen').isDisabled(), true);
  assert.equal(await button('Trắng').isEnabled(), true);
  await textIncludes('Màu đã chọn không có ở size XL. Vui lòng chọn màu khác.');
  await textIncludes('Vui lòng chọn màu sắc');
  await textIncludes('Giá gốc tham khảo');
  await textIncludes('để xác định giá chính xác');
  assert.ok(!(await panel.textContent()).includes('Hết hàng'));
  await quantityIs(1);
  await button('Đen').evaluate((element) => element.click());
  assert.equal(await button('Đen').getAttribute('aria-pressed'), 'false');
  await assertNoCartRequest();

  await button('Trắng').click();
  await selected('Trắng');
  assert.ok(!(await panel.textContent()).includes('Màu đã chọn không có'));
  await textIncludes('Còn 2');
  await textIncludes('199.000₫');
  const posted = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/cart/items'));
  await button('Thêm vào giỏ hàng').click();
  assert.deepEqual((await posted).postDataJSON(), { variant_id: 105, quantity: 1 });
  // Reload to dismiss the unrelated cart drawer before continuing selection checks.
  await load();
  await button('L').click();
  await button('Tăng số lượng').click();
  await button('Trắng').click();
  await quantityIs(1);
  await textIncludes('279.000₫');
  await button('M').click();
  await selected('Trắng');
  await textIncludes('Hết hàng');
  await assertNoCartRequest();
  await button('Đen').click();
  await button('XXL').click();
  await selected('Đen');
  await textIncludes('299.000₫');
  await assertNoCartRequest();

  await button('L').click();
  await button('Trắng').click();
  await button('XXL').click();
  await selected('Trắng');
  assert.equal(await button('Trắng').isDisabled(), true, 'stopped combination cannot be clicked');
  await textIncludes('Biến thể ngừng bán');
  await assertNoCartRequest();

  detail = { ...product, variants: product.variants.filter((item) => item.sale_status === 'STOPPED') };
  await load();
  await textIncludes('Vui lòng chọn kích cỡ');
  await textIncludes('Vui lòng chọn màu sắc');
  await textIncludes('Giá gốc tham khảo');
  await assertNoCartRequest();

  detail = { ...product, variants: [variant(201, m, white, 0), variant(202, l, black, 0)] };
  await load();
  await selected('M');
  await selected('Trắng');
  await assertNoCartRequest();

  detail = { ...product, sale_status: 'STOPPED' };
  await load();
  await textIncludes('Sản phẩm đã ngừng bán');
  await assertNoCartRequest();
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('Product variant selection browser tests: PASS (initial selection, compatible/incompatible size, disabled colors, missing selection, stock, stopped variants/product, prices, quantity, cart payload/blocked requests)');
} finally {
  await browser?.close();
  await server.close();
}
