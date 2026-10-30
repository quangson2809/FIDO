import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const { chromium } = createRequire(import.meta.url)('playwright');
const server = await createServer({ server: { port: 5182, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10000);
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

const timestamp = '2026-10-28T00:00:00Z';
const profile = {
  account: { id: 1, full_name: 'Product admin regression', phone: '0900000000', email: null, status: 'ACTIVE', created_at: timestamp, updated_at: timestamp },
  addresses: [],
  roles: [{ id: 1, code: 'SUPERADMIN', name: 'Quản trị', description: null, status: 'ACTIVE' }],
  permissions: [],
};
const catalogMeta = {
  categories: [
    { category_id: 1, parent_category_id: null, name: 'Áo', slug: 'ao', status: 'ACTIVE' },
    { category_id: 2, parent_category_id: null, name: 'Danh mục ngừng', slug: 'ngung', status: 'INACTIVE' },
  ],
  brands: [{ brand_id: 7, name: 'FIDO', slug: 'fido', status: 'ACTIVE' }],
  attribute_types: [
    { id: 1, code: 'OPTION', name: 'Lựa chọn', data_type: 'OPTION' },
    { id: 2, code: 'TEXT', name: 'Văn bản', data_type: 'TEXT' },
    { id: 3, code: 'NUMBER', name: 'Số', data_type: 'NUMBER' },
    { id: 4, code: 'BOOLEAN', name: 'Có/Không', data_type: 'BOOLEAN' },
  ],
  attributes: [],
};
const adminMeta = {
  attribute_types: catalogMeta.attribute_types,
  attributes: [
    { id: 11, code: 'COLOR', name: 'Màu sắc', data_type: 'OPTION', is_required: false, is_variant_defining: true, sort_order: 0, options: [
      { id: 111, attribute_id: 11, value: 'BLACK', label: 'Đen', sort_order: 0 },
      { id: 112, attribute_id: 11, value: 'WHITE', label: 'Trắng', sort_order: 1 },
    ] },
    { id: 12, code: 'MATERIAL', name: 'Chất liệu', data_type: 'TEXT', is_required: true, is_variant_defining: false, sort_order: 1, options: [] },
    { id: 13, code: 'WEIGHT', name: 'Trọng lượng', data_type: 'NUMBER', is_required: false, is_variant_defining: false, sort_order: 2, options: [] },
    { id: 14, code: 'WATERPROOF', name: 'Chống nước', data_type: 'BOOLEAN', is_required: false, is_variant_defining: false, sort_order: 3, options: [] },
  ],
};
const initialValues = [
  { attribute_id: 11, attribute_code: 'COLOR', attribute_name: 'Màu sắc', data_type: 'OPTION', option_id: 111, option_value: 'BLACK', option_label: 'Đen', text_value: null, number_value: null, boolean_value: null },
  { attribute_id: 12, attribute_code: 'MATERIAL', attribute_name: 'Chất liệu', data_type: 'TEXT', option_id: null, option_value: null, option_label: null, text_value: 'Cotton', number_value: null, boolean_value: null },
  { attribute_id: 13, attribute_code: 'WEIGHT', attribute_name: 'Trọng lượng', data_type: 'NUMBER', option_id: null, option_value: null, option_label: null, text_value: null, number_value: 0.5, boolean_value: null },
  { attribute_id: 14, attribute_code: 'WATERPROOF', attribute_name: 'Chống nước', data_type: 'BOOLEAN', option_id: null, option_value: null, option_label: null, text_value: null, number_value: null, boolean_value: false },
];
const initialProduct = {
  product_id: 101, parent_product_id: null, child_product_ids: [], sku: 'TEE-101',
  name: 'Áo thử nghiệm', slug: 'ao-thu-nghiem', description: 'Mô tả gốc',
  category: catalogMeta.categories[0], brand: catalogMeta.brands[0], category_id: 1, brand_id: 7,
  selling_price: 200000, cost_price: 120000, status: 'DRAFT',
  images: [
    { id: 51, image_url: 'https://cdn.example.test/51.png', is_primary: true, sort_order: 0 },
    { id: 52, image_url: 'https://cdn.example.test/52.png', is_primary: false, sort_order: 1 },
  ],
  created_at: timestamp, updated_at: timestamp, attribute_values: initialValues,
  parent_product: null, children: [],
};
const clone = (value) => structuredClone(value);
let products = new Map([[101, clone(initialProduct)]]);
let nextProductId = 202;
let failNextUpload = false;
const requests = [];
const valuesFromInputs = (inputs) => (inputs ?? []).map((input) => {
  const attribute = adminMeta.attributes.find((item) => item.id === input.attribute_id);
  const option = input.option_id == null ? null : attribute?.options.find((item) => item.id === input.option_id);
  return {
    attribute_id: input.attribute_id, attribute_code: attribute?.code ?? 'UNKNOWN',
    attribute_name: attribute?.name ?? 'Unknown', data_type: attribute?.data_type ?? 'TEXT',
    option_id: input.option_id ?? null, option_value: option?.value ?? null, option_label: option?.label ?? null,
    text_value: input.text_value ?? null, number_value: input.number_value ?? null, boolean_value: input.boolean_value ?? null,
  };
});
const summary = (product) => ({
  product_id: product.product_id, parent_product_id: product.parent_product_id, sku: product.sku,
  name: product.name, thumbnail: product.images.find((image) => image.is_primary)?.image_url ?? null,
  category_id: product.category_id, brand_id: product.brand_id, selling_price: product.selling_price,
  cost_price: product.cost_price, status: product.status, created_at: product.created_at, updated_at: product.updated_at,
});
const send = (route, body, status = 200) => route.fulfill({
  status, contentType: 'application/json', body: JSON.stringify(body),
  headers: { 'access-control-allow-origin': '*' },
});
await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'product-regression-token'));
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace('/api/v1', '');
  const method = request.method();
  const contentType = request.headers()['content-type'] ?? '';
  const rawBody = request.postData();
  const body = rawBody && contentType.includes('application/json') ? JSON.parse(rawBody) : null;
  requests.push({ method, path, query: Object.fromEntries(url.searchParams.entries()), body, contentType, rawBody });
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: {
    'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*',
  } });
  if (method === 'GET' && path === '/me') return send(route, { data: profile });
  if (method === 'GET' && path === '/catalog/meta') return send(route, { data: catalogMeta });
  if (method === 'GET' && path === '/admin/catalog/meta') return send(route, { data: adminMeta });
  if (method === 'GET' && path === '/admin/products') {
    const all = [...products.values()].map(summary);
    return send(route, { data: all, meta: {
      page: Number(url.searchParams.get('page') || 1), page_size: Number(url.searchParams.get('page_size') || 20),
      total: all.length, total_pages: 1,
    } });
  }
  if (method === 'POST' && path === '/admin/products') {
    const id = nextProductId++;
    const product = {
      ...clone(initialProduct), product_id: id, parent_product_id: body.parent_product_id ?? null,
      child_product_ids: [], sku: body.sku, name: body.name ?? null, slug: body.slug ?? null,
      description: body.description ?? null,
      category: body.category_id == null ? null : catalogMeta.categories.find((item) => item.category_id === body.category_id) ?? null,
      brand: body.brand_id == null ? null : catalogMeta.brands.find((item) => item.brand_id === body.brand_id) ?? null,
      category_id: body.category_id ?? null, brand_id: body.brand_id ?? null,
      selling_price: body.selling_price, cost_price: body.cost_price ?? null, status: body.status ?? 'DRAFT',
      images: [], attribute_values: valuesFromInputs(body.attribute_values), parent_product: null, children: [],
    };
    products.set(id, product);
    return send(route, { data: clone(product) }, 201);
  }
  const uploadMatch = path.match(/^\/admin\/products\/(\d+)\/images$/);
  if (method === 'POST' && uploadMatch) {
    const id = Number(uploadMatch[1]);
    if (failNextUpload) { failNextUpload = false; return send(route, { message: 'storage temporarily unavailable' }, 502); }
    const product = products.get(id);
    if (!product) return send(route, { message: 'Product not found' }, 404);
    assert.ok(contentType.includes('multipart/form-data'), 'image upload uses multipart form data');
    assert.ok(rawBody?.includes('filename="shirt.png"') || rawBody?.includes('filename="retry-shirt.png"'), 'upload contains selected image');
    const start = product.images.length;
    product.images = [...product.images, { id: id * 10 + start + 1, image_url: 'https://cdn.example.test/upload.png', is_primary: start === 0, sort_order: start }]
      .map((image, index) => ({ ...image, sort_order: index, is_primary: index === 0 }));
    return send(route, { data: clone(product) }, 201);
  }
  const reorderMatch = path.match(/^\/admin\/products\/(\d+)\/images$/);
  if (method === 'PATCH' && reorderMatch) {
    const product = products.get(Number(reorderMatch[1]));
    if (!product) return send(route, { message: 'Product not found' }, 404);
    const byId = new Map(body.images.map((image) => [image.image_id, image.sort_order]));
    product.images = product.images.map((image) => ({ ...image, sort_order: byId.get(image.id) ?? image.sort_order }))
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((image, index) => ({ ...image, sort_order: index, is_primary: index === 0 }));
    return send(route, { data: clone(product) });
  }
  const imageDeleteMatch = path.match(/^\/admin\/products\/(\d+)\/images\/(\d+)$/);
  if (method === 'DELETE' && imageDeleteMatch) {
    const product = products.get(Number(imageDeleteMatch[1]));
    if (!product) return send(route, { message: 'Product not found' }, 404);
    product.images = product.images.filter((image) => image.id !== Number(imageDeleteMatch[2]))
      .map((image, index) => ({ ...image, sort_order: index, is_primary: index === 0 }));
    return route.fulfill({ status: 204, body: '', headers: { 'access-control-allow-origin': '*' } });
  }
  const detailMatch = path.match(/^\/admin\/products\/(\d+)$/);
  if (method === 'GET' && detailMatch) {
    const product = products.get(Number(detailMatch[1]));
    return product ? send(route, { data: clone(product) }) : send(route, { message: 'Product not found' }, 404);
  }
  if (method === 'PATCH' && path === '/admin/products/101') {
    const product = products.get(101);
    Object.assign(product, body);
    if (Object.hasOwn(body, 'category_id')) {
      product.category_id = body.category_id;
      product.category = body.category_id == null ? null : catalogMeta.categories.find((item) => item.category_id === body.category_id) ?? null;
    }
    if (Object.hasOwn(body, 'brand_id')) {
      product.brand_id = body.brand_id;
      product.brand = body.brand_id == null ? null : catalogMeta.brands.find((item) => item.brand_id === body.brand_id) ?? null;
    }
    if (Object.hasOwn(body, 'attribute_values')) product.attribute_values = valuesFromInputs(body.attribute_values);
    product.updated_at = timestamp;
    return send(route, { data: clone(product) });
  }
  if (method === 'DELETE' && detailMatch) {
    products.delete(Number(detailMatch[1]));
    return route.fulfill({ status: 204, body: '', headers: { 'access-control-allow-origin': '*' } });
  }
  return send(route, { message: 'Unhandled request: ' + method + ' ' + path }, 404);
});

try {
  await page.goto('http://localhost:5182/admin/products', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Sản phẩm', level: 1, exact: true }).waitFor();
  await page.getByText('TEE-101', { exact: true }).waitFor();

  await page.getByLabel('Tìm sản phẩm').fill('TEE');
  await page.getByLabel('Lọc danh mục').selectOption('1');
  await page.getByLabel('Lọc thương hiệu').selectOption('7');
  await page.getByLabel('Lọc trạng thái').selectOption('DRAFT');
  await page.getByLabel('Lọc Product cha ID').fill('101');
  await page.getByLabel('Kích thước trang').selectOption('50');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  const listRequest = requests.filter((item) => item.method === 'GET' && item.path === '/admin/products').at(-1);
  assert.deepEqual(listRequest?.query, { q: 'TEE', category_id: '1', brand_id: '7', parent_product_id: '101', status: 'DRAFT', page: '1', page_size: '50' });

  await page.getByRole('button', { name: 'Thêm Product', exact: true }).click();
  await page.getByLabel('SKU *').fill('TEE-NEW');
  await page.getByLabel('Tên Product').fill('Áo mới');
  await page.getByLabel('Slug').fill('ao-moi');
  await page.getByLabel('Product cha ID', { exact: true }).fill('101');
  await page.getByLabel('Danh mục Product').selectOption('1');
  await page.getByLabel('Thương hiệu Product').selectOption('7');
  await page.getByLabel('Giá bán (VND) *').fill('320000');
  await page.getByLabel('Giá vốn (VND, tùy chọn)').fill('190000');
  await page.getByLabel('Trạng thái Product').selectOption('ACTIVE');
  await page.getByLabel('Mô tả').fill('Sản phẩm độc lập theo Product contract');
  await page.getByLabel('Giá trị thuộc tính COLOR').selectOption('112');
  await page.getByLabel('Giá trị thuộc tính MATERIAL').fill('Cotton');
  await page.getByLabel('Giá trị thuộc tính WEIGHT').fill('0.75');
  await page.getByLabel('Giá trị thuộc tính WATERPROOF').selectOption('true');
  await page.getByLabel('Ảnh Product mới').setInputFiles({ name: 'shirt.png', mimeType: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]) });
  failNextUpload = true;
  await page.getByRole('button', { name: 'Tạo Product', exact: true }).click();
  await page.getByText('Chỉ còn bước tải ảnh', { exact: false }).waitFor();
  assert.equal(requests.filter((item) => item.method === 'POST' && item.path === '/admin/products').length, 1);
  assert.deepEqual(requests.find((item) => item.method === 'POST' && item.path === '/admin/products')?.body, {
    sku: 'TEE-NEW', name: 'Áo mới', slug: 'ao-moi', description: 'Sản phẩm độc lập theo Product contract',
    parent_product_id: 101, category_id: 1, brand_id: 7, selling_price: 320000, cost_price: 190000, status: 'ACTIVE',
    attribute_values: [
      { attribute_id: 11, option_id: 112 }, { attribute_id: 12, text_value: 'Cotton' },
      { attribute_id: 13, number_value: 0.75 }, { attribute_id: 14, boolean_value: true },
    ],
  });
  await page.getByLabel('Ảnh Product mới').setInputFiles({ name: 'retry-shirt.png', mimeType: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]) });
  await page.getByRole('button', { name: 'Thử tải ảnh lại', exact: true }).click();
  await page.getByText('Product #202 đã được tạo.', { exact: true }).waitFor();
  assert.equal(requests.filter((item) => item.method === 'POST' && item.path === '/admin/products').length, 1, 'retry must not create duplicate Product');

  await page.goto('http://localhost:5182/admin/products/101?edit=1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Chỉnh sửa Product', exact: true }).waitFor();
  await page.getByLabel('Giá bán (VND)').fill('250000');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('250.000₫', { exact: true }).waitFor();
  assert.deepEqual(requests.filter((item) => item.method === 'PATCH' && item.path === '/admin/products/101').at(-1)?.body, { selling_price: 250000 });

  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page.getByLabel('Giá trị thuộc tính MATERIAL').fill('Linen');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  assert.deepEqual(requests.filter((item) => item.method === 'PATCH' && item.path === '/admin/products/101').at(-1)?.body?.attribute_values, [
    { attribute_id: 11, option_id: 111 }, { attribute_id: 12, text_value: 'Linen' },
    { attribute_id: 13, number_value: 0.5 }, { attribute_id: 14, boolean_value: false },
  ]);

  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page.getByLabel('Danh mục Product').selectOption('');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  assert.deepEqual(requests.filter((item) => item.method === 'PATCH' && item.path === '/admin/products/101').at(-1)?.body, { category_id: null });

  await page.getByRole('button', { name: 'Đưa ảnh 2 lên trước', exact: true }).click();
  assert.deepEqual(requests.filter((item) => item.method === 'PATCH' && item.path === '/admin/products/101/images').at(-1)?.body, {
    images: [{ image_id: 52, sort_order: 0 }, { image_id: 51, sort_order: 1 }],
  });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Xóa ảnh 51', exact: true }).click();
  assert.ok(requests.some((item) => item.method === 'DELETE' && item.path === '/admin/products/101/images/51'));
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Xóa Product', exact: true }).click();
  await page.getByRole('heading', { name: 'Sản phẩm', level: 1, exact: true }).waitFor();
  assert.ok(requests.some((item) => item.method === 'DELETE' && item.path === '/admin/products/101'));
  assert.deepEqual(pageErrors, [], 'no uncaught runtime errors');
  process.stdout.write('Admin Product management browser regression: PASS\n');
} catch (failure) {
  console.error(await page.locator('body').innerText());
  throw failure;
} finally {
  await browser.close();
  await server.close();
}
