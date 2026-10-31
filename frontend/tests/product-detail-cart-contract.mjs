import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5184, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const date = '2026-10-28T00:00:00Z';
const category = {
  category_id: 1,
  parent_category_id: null,
  name: 'Áo',
  slug: 'ao',
  status: 'ACTIVE',
};
const brand = { brand_id: 1, name: 'FIDO', slug: 'fido', status: 'ACTIVE' };
const attribute = {
  attribute_id: 1,
  attribute_code: 'MATERIAL',
  attribute_name: 'Chất liệu',
  attribute_value_id: 101,
  value: 'COTTON',
  label: 'Cotton',
};
const product = {
  product_id: 1,
  parent_product_id: null,
  sku: 'FIDO-TEE-001',
  name: 'Áo FIDO',
  slug: 'ao-fido',
  description: '<h3>MÔ TẢ SẢN PHẨM</h3><p>Áo thun mềm mại, dễ phối đồ.</p>'
    + '<img src="/images/about/details.svg" onerror="window.__unsafe = true">'
    + '<script>window.__unsafe = true</script>',
  category,
  brand,
  selling_price: 199000,
  status: 'ACTIVE',
  images: [{
    id: 1001, image_url: '/images/about/palette.svg',
    is_primary: true, sort_order: 0,
  }],
  created_at: date,
  updated_at: date,
  attribute_values: [attribute],
};
const emptyCart = {
  cart_id: null,
  account_id: 1,
  items: [],
  subtotal: 0,
  created_at: null,
  updated_at: null,
};
const colorValue = (id, value, label) => ({
  attribute_id: 2, attribute_code: 'COLOR', attribute_name: 'Màu sắc',
  attribute_value_id: id, value, label,
});
const sizeValue = (id, value) => ({
  attribute_id: 3, attribute_code: 'SIZE', attribute_name: 'Kích thước',
  attribute_value_id: id, value, label: value,
});
const artwork = {
  'black-m': '/images/about/wardrobe.svg',
  'black-l': '/images/about/details.svg',
  'white-l': '/images/about/palette.svg',
  'white-l-alt': '/images/about/wardrobe.svg',
};
const child = (id, sku, name, price, color, size, image) => ({
  ...product,
  product_id: id,
  parent_product_id: 1,
  sku, name, selling_price: price,
  images: [{
    id: 1000 + id, image_url: artwork[image],
    is_primary: true, sort_order: 0,
  }],
  attribute_values: [attribute, color, size],
});
const blackM = child(2, 'FIDO-TEE-BLACK-M', 'Áo FIDO Đen M', 219000,
  colorValue(201, 'BLACK', 'Đen'), sizeValue(301, 'M'), 'black-m');
blackM.images.push({
  id: 2002, image_url: '/images/about/details.svg',
  is_primary: false, sort_order: 1,
});
const blackL = child(3, 'FIDO-TEE-BLACK-L', 'Áo FIDO Đen L', 239000,
  colorValue(201, 'BLACK', 'Đen'), sizeValue(302, 'L'), 'black-l');
blackL.images = []; // A family member with no gallery falls back to root images in the UI.
const whiteL = child(4, 'FIDO-TEE-WHITE-L', 'Áo FIDO Trắng L', 229000,
  colorValue(202, 'WHITE', 'Trắng'), sizeValue(302, 'L'), 'white-l');
const whiteLAlt = child(5, 'FIDO-TEE-WHITE-L-ALT', 'Áo FIDO Trắng L kiểu khác', 249000,
  colorValue(202, 'WHITE', 'Trắng'), sizeValue(302, 'L'), 'white-l-alt');
const familyProducts = [product, blackM, blackL, whiteL, whiteLAlt];
const availableByProduct = new Map([[1, 8], [2, 2], [3, 0], [4, 3], [5, 4]]);
const family = {
  root_product_id: 1,
  members: familyProducts.map(({ product_id, parent_product_id, sku, name,
    selling_price, status, images, attribute_values }) => ({
    product_id, parent_product_id, sku, name, selling_price,
    status, images, attribute_values,
    available_quantity: availableByProduct.get(product_id),
    purchasable: availableByProduct.get(product_id) > 0,
  })),
};
const detailed = new Map(familyProducts.map((p) => [p.product_id, { ...p, family }]));
let detail = detailed.get(1);
const cartRequests = [];
const cartQuantities = new Map();
const cartResult = () => {
  const items = [...cartQuantities].map(([id, quantity]) => {
    const p = detailed.get(id);
    return {
      cart_item_id: id, product_id: id, quantity, product_name: p.name,
      image_url: null, thumbnail: null, sku: p.sku, unit_price: p.selling_price,
      line_total: quantity * p.selling_price, available_quantity: 5,
    };
  });
  return {
    ...emptyCart, cart_id: 1, items,
    subtotal: items.reduce((sum, item) => sum + item.line_total, 0),
    created_at: date, updated_at: date,
  };
};

await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture-token'));
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace('/api/v1', '');
  const send = (body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  if (request.method() === 'OPTIONS') return send({}, 204);
  if (path === '/me') {
    return send({
      data: {
        account: {
          id: 1,
          full_name: 'Test Customer',
          phone: '0900000000',
          email: 'customer@example.test',
          status: 'ACTIVE',
          created_at: date,
          updated_at: date,
        },
        addresses: [],
        roles: [{ id: 1, code: 'CUSTOMER', name: 'Khách hàng', description: null, status: 'ACTIVE' }],
        permissions: [],
      },
    });
  }
  if (path === '/catalog/meta') {
    return send({
      data: {
        categories: [category],
        brands: [brand],
        attributes: [],
      },
    });
  }
  if (path === '/catalog/products/1') return send({ data: detail });
  const childMatch = path.match(/^\/catalog\/products\/(\d+)$/);
  if (childMatch) {
    const childDetail = detailed.get(Number(childMatch[1]));
    return childDetail ? send({ data: childDetail }) : send({ message: 'Not found' }, 404);
  }
  if (path === '/catalog/products') {
    return send({ data: [], meta: { page: 1, page_size: 4, total: 0, total_pages: 0 } });
  }
  if (path === '/cart') {
    return send({ data: cartQuantities.size ? cartResult() : emptyCart });
  }
  if (path === '/cart/items' && request.method() === 'POST') {
    const body = request.postDataJSON();
    cartRequests.push(body);
    assert.deepEqual(Object.keys(body).sort(), ['product_id', 'quantity']);
    assert.ok(detailed.has(body.product_id), 'Cart requires an existing Product ID');
    cartQuantities.set(body.product_id,
      (cartQuantities.get(body.product_id) ?? 0) + body.quantity);
    return send({ data: cartResult() });
  }
  return send({ data: [] });
});

try {
  await page.goto('http://localhost:5184/products/1');
  await page.getByRole('heading', { name: 'Áo FIDO', exact: true }).waitFor();
  await page.getByText('SKU: FIDO-TEE-001', { exact: true }).waitFor();
  await page.getByText('199.000₫', { exact: true }).waitFor();
  await page.getByText('Chất liệu', { exact: true }).waitFor();
  await page.getByText('Cotton', { exact: true }).waitFor();
  await page.locator('h3').filter({ hasText: 'MÔ TẢ SẢN PHẨM' }).waitFor();
  await page.getByText('Áo thun mềm mại, dễ phối đồ.').waitFor();
  assert.equal(await page.locator('img[onerror]').count(), 0,
    'HTML description cannot inject event handlers');
  assert.equal(await page.evaluate(() => window.__unsafe), undefined,
    'HTML description cannot run scripts');
  await page.getByRole('button', { name: 'Tăng số lượng' }).click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  await page.getByRole('dialog', { name: 'Giỏ hàng của bạn' }).waitFor();
  assert.deepEqual(cartRequests, [{ product_id: 1, quantity: 2 }]);
  const cartDialog = page.getByRole('dialog', { name: 'Giỏ hàng của bạn' });
  await cartDialog.getByRole('article').getByText('398.000₫', { exact: true }).waitFor();
  await cartDialog.locator('footer').getByText('398.000₫', { exact: true }).waitFor();

  await cartDialog.getByRole('button', { name: 'Đóng giỏ hàng' }).click();

  // Parent has no COLOR/SIZE. Its children supply only real sellable combinations.
  await page.getByRole('button', { name: 'Đen', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Chọn SKU phù hợp' }).isDisabled(), true,
    'unresolved color selection must not add the root Product');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.waitForURL('**/products/2');
  await page.getByText('SKU: FIDO-TEE-BLACK-M', { exact: true }).waitFor();
  await page.getByText('219.000₫', { exact: true }).waitFor();
  await page.locator('img.object-contain[src*="wardrobe.svg"]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Xem ảnh 2' }).click();
  await page.locator('img.h-full.w-full.object-contain[src*="details.svg"]')
    .waitFor({ state: 'attached' });
  await page.getByText('Chất liệu', { exact: true }).waitFor();
  await page.getByText('Cotton', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Đen', exact: true })
    .getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByRole('button', { name: 'L · Hết hàng' }).isDisabled(),
    true, 'out-of-stock size must be disabled for selected color');
  await page.getByRole('button', { name: 'Tăng số lượng' }).click();
  assert.equal(await page.getByRole('button', { name: 'Tăng số lượng' }).isDisabled(),
    true, 'quantity cannot exceed the current stock');
  await page.getByRole('button', { name: 'Giảm số lượng' }).click();

  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  assert.deepEqual(cartRequests.at(-1), { product_id: 2, quantity: 1 },
    'Cart must use the selected child Product ID');
  await page.getByRole('dialog', { name: 'Giỏ hàng của bạn' })
    .getByRole('button', { name: 'Đóng giỏ hàng' }).click();

  // White/M does not exist. Switching color clears the incompatible size.
  await page.getByRole('button', { name: 'Trắng', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'M · Hết hàng' }).isDisabled(),
    true, 'unavailable COLOR/SIZE combination must be disabled');
  await page.getByRole('button', { name: 'L', exact: true }).click();
  await page.getByText('Có nhiều SKU cùng màu và kích thước.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Chọn SKU phù hợp' }).isDisabled(), true,
    'ambiguous color and size cannot silently add the previous Product');
  await page.getByRole('button', { name: /FIDO-TEE-WHITE-L-ALT/ }).click();
  await page.waitForURL('**/products/5');
  await page.getByText('SKU: FIDO-TEE-WHITE-L-ALT', { exact: true }).waitFor();
  await page.getByText('249.000₫', { exact: true }).waitFor();
  await page.locator('img.object-contain[src*="wardrobe.svg"]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  assert.deepEqual(cartRequests.at(-1), { product_id: 5, quantity: 1 },
    'Ambiguous COLOR/SIZE requires explicit SKU selection');
  await page.getByRole('dialog', { name: 'Giỏ hàng của bạn' })
    .getByRole('button', { name: 'Đóng giỏ hàng' }).click();

  await page.goto('http://localhost:5184/products/3');
  await page.getByText('SKU: FIDO-TEE-BLACK-L', { exact: true }).waitFor();
  await page.getByText('Gallery tham khảo từ Product gốc', { exact: false }).waitFor();
  await page.locator('img.object-contain[src*="palette.svg"]').waitFor({ state: 'attached' });
  assert.equal(await page.getByRole('button', { name: 'Hết hàng', exact: true }).isDisabled(),
    true, 'sold-out Product is viewable but cannot be added to Cart');

  detail = { ...detailed.get(1), status: 'INACTIVE' };
  await page.goto('http://localhost:5184/products/1');
  await page.getByRole('heading', { name: 'Áo FIDO', exact: true }).waitFor();
  await page.getByText('Sản phẩm hiện chưa khả dụng để mua.', { exact: true }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Không khả dụng', exact: true }).isDisabled(),
    true,
  );
  assert.deepEqual(cartRequests, [
    { product_id: 1, quantity: 2 },
    { product_id: 2, quantity: 1 },
    { product_id: 5, quantity: 1 },
  ], 'inactive product is not added');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log(
    'Product family browser: parent/child gallery, COLOR/SIZE, duplicate SKU selection, descriptive Attribute separation and exact Cart product_id guard.',
  );
} finally {
  await browser.close();
  await server.close();
}
