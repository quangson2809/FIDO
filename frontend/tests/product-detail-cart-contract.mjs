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
  description: 'Thiết kế tối giản',
  category,
  brand,
  selling_price: 199000,
  status: 'ACTIVE',
  images: [],
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
let detail = product;
const cartRequests = [];
let cartQuantity = 0;

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
  if (path === '/catalog/products') {
    return send({ data: [], meta: { page: 1, page_size: 4, total: 0, total_pages: 0 } });
  }
  if (path === '/cart') {
    if (!cartQuantity) return send({ data: emptyCart });
    return send({
      data: {
        ...emptyCart,
        cart_id: 1,
        items: [{
          cart_item_id: 1,
          product_id: product.product_id,
          quantity: cartQuantity,
          product_name: product.name,
          image_url: null,
          thumbnail: null,
          sku: product.sku,
          unit_price: product.selling_price,
          line_total: cartQuantity * product.selling_price,
          available_quantity: 5,
        }],
        subtotal: cartQuantity * product.selling_price,
      },
    });
  }
  if (path === '/cart/items' && request.method() === 'POST') {
    const body = request.postDataJSON();
    cartRequests.push(body);
    assert.deepEqual(Object.keys(body).sort(), ['product_id', 'quantity']);
    assert.equal(body.product_id, product.product_id);
    cartQuantity += body.quantity;
    return send({
      data: {
        cart_id: 1,
        account_id: 1,
        items: [{
          cart_item_id: 1,
          product_id: body.product_id,
          quantity: cartQuantity,
          product_name: product.name,
          image_url: null,
          thumbnail: null,
          sku: product.sku,
          unit_price: product.selling_price,
          line_total: cartQuantity * product.selling_price,
          available_quantity: 5,
        }],
        subtotal: cartQuantity * product.selling_price,
        created_at: date,
        updated_at: date,
      },
    });
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
  await page.getByRole('button', { name: 'Tăng số lượng' }).click();
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  await page.getByRole('dialog', { name: 'Giỏ hàng của bạn' }).waitFor();
  assert.deepEqual(cartRequests, [{ product_id: 1, quantity: 2 }]);
  const cartDialog = page.getByRole('dialog', { name: 'Giỏ hàng của bạn' });
  await cartDialog.getByRole('article').getByText('398.000₫', { exact: true }).waitFor();
  await cartDialog.locator('footer').getByText('398.000₫', { exact: true }).waitFor();

  detail = { ...product, status: 'INACTIVE' };
  await page.reload();
  await page.getByRole('heading', { name: 'Áo FIDO', exact: true }).waitFor();
  await page.getByText('Sản phẩm hiện chưa khả dụng để mua.', { exact: true }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Không khả dụng', exact: true }).isDisabled(),
    true,
  );
  assert.deepEqual(cartRequests, [{ product_id: 1, quantity: 2 }], 'inactive product is not added');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log(
    'Product detail/cart browser: current ProductDto, attribute values, ACTIVE purchase, product_id + quantity cart request, and inactive-product guard.',
  );
} finally {
  await browser.close();
  await server.close();
}
