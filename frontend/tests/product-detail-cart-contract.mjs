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
  attribute_name: 'Chất liệu', is_variant_defining: false, sort_order: 3,
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
  attribute_id: 2, attribute_code: 'COLOR', attribute_name: 'Màu sắc', is_variant_defining: true, sort_order: 0,
  attribute_value_id: id, value, label,
});
const sizeValue = (id, value) => ({
  attribute_id: 3, attribute_code: 'SIZE', attribute_name: 'Kích thước', is_variant_defining: true, sort_order: 1,
  attribute_value_id: id, value, label: value,
});
const artwork = {
  'black-m': '/images/about/wardrobe.svg',
  'black-l': '/images/about/details.svg',
  'white-l': '/images/about/palette.svg?sku=white-l',
  'white-l-alt': '/images/about/wardrobe.svg?sku=white-l-alt',
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
blackL.images = []; // This Product still displays the complete family gallery.
const whiteL = child(4, 'FIDO-TEE-WHITE-L', 'Áo FIDO Trắng L', 229000,
  colorValue(202, 'WHITE', 'Trắng'), sizeValue(302, 'L'), 'white-l');
const whiteLAlt = child(5, 'FIDO-TEE-WHITE-L-ALT', 'Áo FIDO Trắng L kiểu khác', 249000,
  colorValue(202, 'WHITE', 'Trắng'), sizeValue(302, 'L'), 'white-l-alt');
whiteL.images.push({ id: 2004, image_url: artwork['black-m'], is_primary: false, sort_order: 1 });
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
const standalone = {
  ...product, product_id: 6, sku: 'FIDO-SINGLE', name: 'Sản phẩm độc lập',
  images: [
    { id: 6002, image_url: artwork['black-m'], is_primary: false, sort_order: 1 },
    { id: 6001, image_url: artwork['black-l'], is_primary: true, sort_order: 0 },
  ],
};
const withoutImages = { ...product, product_id: 7, sku: 'FIDO-EMPTY', name: 'Sản phẩm chưa có ảnh', images: [] };
for (const item of [standalone, withoutImages]) {
  const { product_id, parent_product_id, sku, name, selling_price, status, images, attribute_values } = item;
  detailed.set(item.product_id, {
    ...item, family: { root_product_id: item.product_id, members: [{
      product_id, parent_product_id, sku, name, selling_price, status, images, attribute_values,
      available_quantity: 8, purchasable: true,
    }] },
  });
}
// Metadata-driven fixtures: a single axis and three unrelated axes, without category rules.
const dynamicValue = (id, code, label, option, value, order) => ({
  attribute_id: id, attribute_code: code, attribute_name: label,
  attribute_value_id: option, value, label: value, is_variant_defining: true, sort_order: order,
});
const addDynamicFamily = (rootId, rootValues, childValues) => {
  const rows = [rootValues, childValues].map((attribute_values, index) => ({
    ...product, product_id: rootId + index, parent_product_id: index ? rootId : null,
    sku: 'DYNAMIC-' + (rootId + index), name: 'Dynamic ' + (rootId + index), attribute_values,
  }));
  const family = { root_product_id: rootId, members: rows.map(row => ({
    ...row, available_quantity: 3, purchasable: true,
  })) };
  for (const row of rows) detailed.set(row.product_id, { ...row, family });
};
addDynamicFamily(8,
  [dynamicValue(8, 'FINISH', 'Bề mặt', 81, 'Matte', 1)],
  [dynamicValue(8, 'FINISH', 'Bề mặt', 82, 'Gloss', 1)]);
addDynamicFamily(10,
  [dynamicValue(10, 'TONE', 'Tông màu', 101, 'Đỏ', 1),
   dynamicValue(11, 'CAPACITY', 'Dung lượng', 111, '128GB', 2),
   dynamicValue(12, 'LENGTH', 'Chiều dài', 121, 'Dài', 3)],
  [dynamicValue(10, 'TONE', 'Tông màu', 102, 'Vàng', 1),
   dynamicValue(11, 'CAPACITY', 'Dung lượng', 112, '256GB', 2),
   dynamicValue(12, 'LENGTH', 'Chiều dài', 122, 'Ngắn', 3)]);
const expectedGallery = [product.images[0].image_url, artwork['black-m'], artwork['black-l'],
  artwork['white-l'], artwork['white-l-alt']];
const thumbnailButtons = () => page.getByRole('button', { name: /^Xem ảnh \d+$/ });
const assertFamilyGallery = async () => {
  await thumbnailButtons().nth(expectedGallery.length - 1).waitFor();
  assert.deepEqual(await thumbnailButtons().locator('img').evaluateAll(images => images.map(image => image.getAttribute('src'))),
    expectedGallery, 'all public family images keep the same order and shared URLs appear once');
};
const heroImage = () => page.locator('img.h-full.w-full.object-contain');
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
    return send({ data: [standalone, withoutImages].map(({ product_id, parent_product_id, sku, name, slug,
      category, brand, selling_price, status }) => ({ product_id, parent_product_id, sku, name, slug,
      category, brand, selling_price, status, thumbnail: null })),
      meta: { page: 1, page_size: 5, total: 2, total_pages: 1 } });
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
  await assertFamilyGallery();
  await page.getByRole('button', { name: 'Xem ảnh 4', exact: true }).click();
  assert.equal(await heroImage().getAttribute('src'), artwork['white-l']);
  assert.match(page.url(), /\/products\/1$/, 'viewing another member photo never selects its SKU');
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
  await assertFamilyGallery();
  assert.equal(await heroImage().getAttribute('src'), artwork['white-l'], 'switching SKU preserves the current image');
  assert.equal(await page.getByRole('button', { name: 'Xem ảnh 4', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Xem ảnh 3', exact: true }).click();
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
  await page.getByText('Có nhiều SKU phù hợp.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Chọn SKU phù hợp' }).isDisabled(), true,
    'ambiguous color and size cannot silently add the previous Product');
  await page.getByRole('button', { name: /FIDO-TEE-WHITE-L-ALT/ }).click();
  await page.waitForURL('**/products/5');
  await page.getByText('SKU: FIDO-TEE-WHITE-L-ALT', { exact: true }).waitFor();
  await page.getByText('249.000₫', { exact: true }).waitFor();
  await assertFamilyGallery();
  assert.equal(await heroImage().getAttribute('src'), artwork['black-l'], 'explicit SKU selection also preserves gallery selection');
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  assert.deepEqual(cartRequests.at(-1), { product_id: 5, quantity: 1 },
    'Ambiguous COLOR/SIZE requires explicit SKU selection');
  await page.getByRole('dialog', { name: 'Giỏ hàng của bạn' })
    .getByRole('button', { name: 'Đóng giỏ hàng' }).click();

  await page.goto('http://localhost:5184/products/3');
  await page.getByText('SKU: FIDO-TEE-BLACK-L', { exact: true }).waitFor();
  await assertFamilyGallery();
  assert.equal(await page.getByText('Gallery tham khảo từ Product gốc', { exact: false }).count(), 0);
  await page.locator('img.object-contain[src*="palette.svg"]').waitFor({ state: 'attached' });
  assert.equal(await page.getByRole('button', { name: 'Hết hàng', exact: true }).isDisabled(),
    true, 'sold-out Product is viewable but cannot be added to Cart');

  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Xem ảnh 5', exact: true }).click();
    await page.getByRole('button', { name: 'Phóng to ảnh', exact: true }).click();
    const zoom = page.getByRole('dialog', { name: 'Ảnh sản phẩm' });
    await zoom.getByText('Ảnh 5 / 5', { exact: true }).waitFor();
    assert.equal(await zoom.getByRole('img').getAttribute('src'), artwork['white-l-alt']);
    await page.keyboard.press('ArrowRight');
    await zoom.getByText('Ảnh 1 / 5', { exact: true }).waitFor();
    assert.equal(await zoom.getByRole('img').getAttribute('src'), expectedGallery[0]);
    await page.keyboard.press('ArrowLeft');
    await zoom.getByText('Ảnh 5 / 5', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }

  await page.getByRole('button', { name: 'Xem ảnh 2', exact: true }).click();
  await page.getByRole('button', { name: 'Xem chi tiết: Sản phẩm độc lập', exact: true }).click();
  await page.waitForURL('**/products/6');
  await page.getByText('SKU: FIDO-SINGLE', { exact: true }).waitFor();
  assert.equal(await heroImage().getAttribute('src'), artwork['black-l'], 'changing family resets to its first photo');
  assert.equal(await thumbnailButtons().count(), 2);
  await page.goBack();
  await page.getByText('SKU: FIDO-TEE-BLACK-L', { exact: true }).waitFor();
  await assertFamilyGallery();
  assert.equal(await heroImage().getAttribute('src'), expectedGallery[0]);
  await page.getByRole('button', { name: 'Xem chi tiết: Sản phẩm chưa có ảnh', exact: true }).click();
  await page.waitForURL('**/products/7');
  await page.getByText('SKU: FIDO-EMPTY', { exact: true }).waitFor();
  await page.getByText('Chưa có ảnh', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Phóng to ảnh', exact: true }).count(), 0);
  assert.equal(await thumbnailButtons().count(), 0);

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
  await page.goto('http://localhost:5184/products/8');
  await page.getByText('SKU: DYNAMIC-8', { exact: true }).waitFor();
  assert.equal(await page.getByRole('group', { name: 'Bề mặt', exact: true }).count(), 1);
  assert.equal(await page.getByRole('group', { name: 'Kích thước', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Gloss', exact: true }).click();
  await page.waitForURL('**/products/9');
  await page.getByText('SKU: DYNAMIC-9', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  await page.getByRole('dialog', { name: 'Giỏ hàng của bạn' }).waitFor();
  assert.deepEqual(cartRequests.at(-1), { product_id: 9, quantity: 1 });
  await page.getByRole('dialog', { name: 'Giỏ hàng của bạn' }).getByRole('button', { name: 'Đóng giỏ hàng' }).click();
  await page.goto('http://localhost:5184/products/10');
  await page.getByText('SKU: DYNAMIC-10', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Vàng', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Chọn SKU phù hợp', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: '256GB', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Chọn SKU phù hợp', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Ngắn', exact: true }).click();
  await page.waitForURL('**/products/11');
  await page.getByText('SKU: DYNAMIC-11', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  await page.getByRole('dialog', { name: 'Giỏ hàng của bạn' }).waitFor();
  assert.deepEqual(cartRequests.at(-1), { product_id: 11, quantity: 1 });
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log(
    'Product family browser: shared deduplicated gallery, stable photo across SKU changes, independent-family reset, zoom/keyboard/responsive/empty gallery, COLOR/SIZE and exact Cart product_id guard: PASS.',
  );
} finally {
  await browser.close();
  await server.close();
}
