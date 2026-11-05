import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
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
  brands: [{ brand_id: 7, name: 'FIDO', slug: 'fido', status: 'ACTIVE' },
    { brand_id: 8, name: 'Old brand', slug: 'old-brand', status: 'INACTIVE' }],
  attributes: [],
};
const attributes = [
  { id: 11, code: 'COLOR', name: 'Màu sắc', is_required: false, is_variant_defining: true, sort_order: 0, options: [
    { id: 111, attribute_id: 11, value: 'BLACK', label: 'Đen', sort_order: 0 },
    { id: 112, attribute_id: 11, value: 'WHITE', label: 'Trắng', sort_order: 1 },
  ] },
  { id: 12, code: 'MATERIAL', name: 'Chất liệu', is_required: true, is_variant_defining: false, sort_order: 1, options: [
    { id: 121, attribute_id: 12, value: 'COTTON', label: 'Cotton', sort_order: 0 },
    { id: 122, attribute_id: 12, value: 'LINEN', label: 'Linen', sort_order: 1 },
  ] },
  { id: 13, code: 'WEIGHT', name: 'Định lượng', is_required: false, is_variant_defining: false, sort_order: 2, options: [
    { id: 131, attribute_id: 13, value: '180GSM', label: '180 GSM', sort_order: 0 },
    { id: 132, attribute_id: 13, value: '220GSM', label: '220 GSM', sort_order: 1 },
  ] },
  { id: 14, code: 'WATERPROOF', name: 'Chống nước', is_required: false, is_variant_defining: false, sort_order: 3, options: [
    { id: 141, attribute_id: 14, value: 'YES', label: 'Có', sort_order: 0 },
    { id: 142, attribute_id: 14, value: 'NO', label: 'Không', sort_order: 1 },
  ] },
];
const adminMeta = { attributes, image_upload: { max_files: 10, max_file_bytes: 32 * 1024 * 1024, max_request_bytes: 64 * 1024 * 1024, content_types: ['image/jpeg', 'image/png', 'image/webp'] } };
catalogMeta.attributes = attributes;
const initialValues = [
  { attribute_id: 11, attribute_code: 'COLOR', attribute_name: 'Màu sắc', attribute_value_id: 111, value: 'BLACK', label: 'Đen' },
  { attribute_id: 12, attribute_code: 'MATERIAL', attribute_name: 'Chất liệu', attribute_value_id: 121, value: 'COTTON', label: 'Cotton' },
  { attribute_id: 13, attribute_code: 'WEIGHT', attribute_name: 'Định lượng', attribute_value_id: 131, value: '180GSM', label: '180 GSM' },
  { attribute_id: 14, attribute_code: 'WATERPROOF', attribute_name: 'Chống nước', attribute_value_id: 142, value: 'NO', label: 'Không' },
];
const valuesFromIds = (ids) => (ids ?? []).map((optionId) => {
  const attribute = attributes.find((item) =>
    item.options.some((option) => option.id === optionId));
  const option = attribute?.options.find((item) => item.id === optionId);
  if (!attribute || !option) throw new Error('Unknown attribute_value_id: ' + optionId);
  return {
    attribute_id: attribute.id,
    attribute_code: attribute.code,
    attribute_name: attribute.name,
    attribute_value_id: option.id,
    value: option.value,
    label: option.label,
  };
});
const initialProduct = {
  product_id: 101, parent_product_id: null, child_product_ids: [], sku: 'TEE-101',
  name: 'Áo thử nghiệm', slug: 'ao-thu-nghiem', description: 'Mô tả gốc',
  category: catalogMeta.categories[1], brand: catalogMeta.brands[1], category_id: 2, brand_id: 8,
  selling_price: 200000, cost_price: 120000, status: 'DRAFT',
  images: [
    { id: 51, image_url: 'https://cdn.example.test/51.png', is_primary: true, sort_order: 0 },
    { id: 52, image_url: 'https://cdn.example.test/52.png', is_primary: false, sort_order: 1 },
  ],
  created_at: timestamp, updated_at: timestamp, attribute_values: initialValues,
  parent_product: null, children: [],
};
const clone = (value) => structuredClone(value);
const relation = (product) => ({
  product_id: product.product_id,
  parent_product_id: product.parent_product_id,
  sku: product.sku,
  name: product.name,
  slug: product.slug,
  description: product.description,
  category: product.category,
  brand: product.brand,
  category_id: product.category_id,
  brand_id: product.brand_id,
  selling_price: product.selling_price,
  cost_price: product.cost_price,
  status: product.status,
  attribute_values: product.attribute_values,
  images: product.images,
  created_at: product.created_at,
  updated_at: product.updated_at,
});
let products = new Map([[101, clone(initialProduct)]]);
let nextProductId = 202;
let failNextUpload = false;
let loseNextUploadResponse = false;
let failNextCreate = false;
let rejectNextCreateCode;
let loseNextCreateResponse = false;
let holdNextMeta = false;
let releaseMeta;
let notifyMetaStarted;
let holdNextCreate = false;
let releaseCreate;
let notifyCreateStarted;
const requests = [];
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
  if (method === 'GET' && path === '/admin/catalog/meta') {
    if (holdNextMeta) {
      holdNextMeta = false;
      await new Promise((resolve) => { releaseMeta = resolve; notifyMetaStarted?.(); });
    }
    return send(route, { data: adminMeta });
  }
  if (method === 'GET' && path === '/admin/products') {
    let all = [...products.values()].map(summary);
    if (url.searchParams.get('root_only') === 'true') {
      const search = (url.searchParams.get('q') ?? '').toLowerCase();
      all = all.filter((product) => product.parent_product_id === null && `${product.sku} ${product.name ?? ''}`.toLowerCase().includes(search));
      const page = Number(url.searchParams.get('page') || 1);
      const size = Number(url.searchParams.get('page_size') || 20);
      return send(route, { data: all.slice((page - 1) * size, page * size), meta: { page, page_size: size, total: all.length, total_pages: Math.ceil(all.length / size) } });
    }
    return send(route, { data: all, meta: {
      page: Number(url.searchParams.get('page') || 1), page_size: Number(url.searchParams.get('page_size') || 20),
      total: all.length, total_pages: 1,
    } });
  }
  if (method === 'POST' && path === '/admin/products') {
    if (rejectNextCreateCode) { const code = rejectNextCreateCode; rejectNextCreateCode = undefined; return send(route, { code, message: 'Product SKU already exists.' }, 409); }
    if (failNextCreate) { failNextCreate = false; return send(route, { message: 'create rejected' }, 400); }
    if (holdNextCreate) {
      holdNextCreate = false;
      await new Promise((resolve) => { releaseCreate = resolve; notifyCreateStarted(); });
    }
    const id = nextProductId++;
    const product = {
      ...clone(initialProduct), product_id: id, parent_product_id: body.parent_product_id ?? null,
      child_product_ids: [], sku: body.sku, name: body.name ?? null, slug: body.slug ?? null,
      description: body.description ?? null,
      category: body.category_id == null ? null : catalogMeta.categories.find((item) => item.category_id === body.category_id) ?? null,
      brand: body.brand_id == null ? null : catalogMeta.brands.find((item) => item.brand_id === body.brand_id) ?? null,
      category_id: body.category_id ?? null, brand_id: body.brand_id ?? null,
      selling_price: body.selling_price, cost_price: body.cost_price ?? null, status: body.status ?? 'DRAFT',
      images: [], attribute_values: valuesFromIds(body.attribute_value_ids), parent_product: null, children: [],
    };
    products.set(id, product);
    if (loseNextCreateResponse) { loseNextCreateResponse = false; return route.abort('failed'); }
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
    const uploadedNames = [...rawBody.matchAll(/filename="([^"]+)"/g)].map((match) => match[1]);
    product.images = [...product.images, ...uploadedNames.map((name, index) => ({ id: id * 10 + start + index + 1, image_url: 'https://cdn.example.test/' + name, is_primary: false, sort_order: start + index }))]
      .map((image, index) => ({ ...image, sort_order: index, is_primary: index === 0 }));
    if (loseNextUploadResponse) { loseNextUploadResponse = false; return route.abort('failed'); }
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
    if (!product) return send(route, { message: 'Product not found' }, 404);
    const parent = product.parent_product_id === null
      ? null : products.get(product.parent_product_id);
    const children = [...products.values()].filter((candidate) =>
      candidate.parent_product_id === product.product_id);
    return send(route, { data: {
      ...clone(product),
      parent_product: parent ? relation(parent) : null,
      child_product_ids: children.map((child) => child.product_id),
      children: children.map(relation),
    } });
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
    if (Object.hasOwn(body, 'attribute_value_ids')) product.attribute_values = valuesFromIds(body.attribute_value_ids);
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
  await page.getByText('Thông tin bổ sung (slug, giá vốn, mô tả)', { exact: true }).click();
  await page.getByLabel('Slug').fill('ao-moi');
  await page.getByRole('button', { name: 'Chọn sản phẩm cha', exact: true }).click();
  await page.getByRole('button', { name: /^Chọn TEE-101/ }).click();
  await page.getByLabel('Danh mục Product').selectOption('1');
  await page.getByLabel('Thương hiệu Product').selectOption('7');
  await page.getByLabel('Giá bán (VND) *').fill('320000');
  await page.getByLabel('Giá vốn (VND, tùy chọn)').fill('190000');
  await page.getByLabel('Trạng thái Product').selectOption('ACTIVE');
  await page.getByLabel('Mô tả').fill('Sản phẩm độc lập theo Product contract');
  await page.getByLabel('Giá trị thuộc tính COLOR').selectOption('112');
  await page.getByLabel('Giá trị thuộc tính MATERIAL').selectOption('121');
  await page.getByLabel('Giá trị thuộc tính WEIGHT').selectOption('132');
  await page.getByLabel('Giá trị thuộc tính WATERPROOF').selectOption('141');
  await page.getByLabel('Ảnh Product mới').setInputFiles({ name: 'shirt.png', mimeType: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]) });
  failNextUpload = true;
  await page.getByRole('button', { name: /^(Tạo Product|Lưu nháp)$/, exact: true }).click();
  await page.getByText('Chỉ còn bước tải ảnh', { exact: false }).waitFor();
  assert.equal(requests.filter((item) => item.method === 'POST' && item.path === '/admin/products').length, 1);
  assert.deepEqual(requests.find((item) => item.method === 'POST' && item.path === '/admin/products')?.body, {
    sku: 'TEE-NEW', name: 'Áo mới', slug: 'ao-moi', description: 'Sản phẩm độc lập theo Product contract',
    parent_product_id: 101, category_id: 1, brand_id: 7, selling_price: 320000, cost_price: 190000, status: 'ACTIVE',
    attribute_value_ids: [112, 121, 132, 141],
  });
  await page.getByLabel('Ảnh Product mới').setInputFiles({ name: 'retry-shirt.png', mimeType: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]) });
  await page.getByRole('button', { name: 'Thử tải ảnh lại', exact: true }).click();
  await page.getByRole('heading', { name: 'Thông tin Product mới', exact: true }).waitFor({ state: 'detached' });
  await page.getByText('Product #202 đã được tạo.', { exact: true }).waitFor();
  assert.equal(requests.filter((item) => item.method === 'POST' && item.path === '/admin/products').length, 1, 'retry must not create duplicate Product');

  // The parent detail must expose every direct child as a navigable Product,
  // and the child detail must provide a route back to its parent.
  await page.goto('http://localhost:5182/admin/products/101', { waitUntil: 'domcontentloaded' });
  const relations = page.getByRole('region', { name: 'Quan hệ Product' });
  await relations.getByText('TEE-NEW', { exact: true }).waitFor();
  await relations.getByText('Trắng', { exact: true }).waitFor();
  await relations.getByText('320.000₫', { exact: true }).waitFor();
  const childLoaded = page.waitForResponse((response) => response.url().endsWith('/admin/products/202')
    && response.request().method() === 'GET');
  await relations.getByRole('link', { name: 'Xem chi tiết Product #202' }).click();
  await childLoaded;
  await page.waitForURL('**/admin/products/202');
  await page.getByRole('heading', { name: 'Áo mới', exact: true }).waitFor();
  assert.ok(requests.some((item) =>
    item.method === 'GET' && item.path === '/admin/products/202'),
  'child navigation loads the independent Product detail');
  await page.getByRole('region', { name: 'Quan hệ Product' })
    .getByRole('link', { name: 'Xem Product cha #101' }).click();
  await page.waitForURL('**/admin/products/101');
  await page.getByRole('heading', { name: 'Áo thử nghiệm', exact: true }).waitFor();

  await page.goto('http://localhost:5182/admin/products/101?edit=1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Chỉnh sửa Product', exact: true }).waitFor();
  await page.getByLabel('Giá bán (VND)').fill('250000');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('250.000₫', { exact: true }).waitFor();
  assert.deepEqual(requests.filter((item) => item.method === 'PATCH' && item.path === '/admin/products/101').at(-1)?.body, { selling_price: 250000 });

  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page.getByLabel('Giá trị thuộc tính MATERIAL').selectOption('122');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  assert.deepEqual(requests.filter((item) => item.method === 'PATCH' && item.path === '/admin/products/101').at(-1)?.body?.attribute_value_ids, [111, 122, 131, 142]);

  // Partial metadata must preserve both an unavailable Option and an absent Attribute.
  adminMeta.attributes = attributes.filter((attribute) => attribute.id !== 14).map((attribute) =>
    attribute.id === 11 ? { ...attribute, options: attribute.options.filter((option) => option.id !== 111) } : attribute);
  await page.goto('http://localhost:5182/admin/products/101', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  assert.equal(await page.getByLabel('Giá trị thuộc tính COLOR').inputValue(), '111');
  assert.equal(await page.getByLabel('Giá trị thuộc tính MATERIAL').inputValue(), '122');
  await page.getByLabel('Giá bán (VND)').fill('260000');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  assert.deepEqual(requests.filter((item) => item.method === 'PATCH' && item.path === '/admin/products/101').at(-1)?.body,
    { selling_price: 260000 });
  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page.getByLabel('Giá trị thuộc tính MATERIAL').selectOption('121');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  assert.deepEqual(requests.filter((item) => item.method === 'PATCH' && item.path === '/admin/products/101').at(-1)?.body,
    { attribute_value_ids: [111, 121, 131, 142] });
  adminMeta.attributes = attributes;
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
  const createRequests = () => requests.filter((item) => item.method === 'POST' && item.path === '/admin/products');
  const prepareCreate = async (sku, withImage = false) => {
    await page.getByRole('button', { name: 'Thêm Product', exact: true }).click();
    await page.getByLabel('SKU *').fill(sku);
    await page.getByLabel('Giá bán (VND) *').fill('100000');
    if (withImage) await page.getByLabel('Ảnh Product mới').setInputFiles({
      name: 'shirt.png', mimeType: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]),
    });
  };
  const submitNew = async (label) => {
    const response = page.waitForResponse((reply) => reply.url().endsWith('/admin/products') && reply.request().method() === 'POST' && reply.status() === 201);
    await page.getByRole('button', { name: label, exact: true }).click();
    const id = (await (await response).json()).data.product_id;
    await page.getByText('Product #' + id + ' đã được tạo.', { exact: true }).waitFor();
    return id;
  };
  await prepareCreate('CREATE-REJECT');
  failNextCreate = true;
  const sizeBeforeFailure = products.size;
  await page.getByRole('button', { name: /^(Tạo Product|Lưu nháp)$/, exact: true }).click();
  await page.getByText('create rejected', { exact: true }).waitFor();
  assert.equal(products.size, sizeBeforeFailure, 'failed Create must not claim a new persisted Product');
  await page.getByLabel('SKU *').fill('NO-IMAGE');
  const beforeDoubleSubmit = createRequests().length;
  const createStarted = new Promise((resolve) => { notifyCreateStarted = resolve; });
  holdNextCreate = true;
  await page.getByRole('button', { name: /^(Tạo Product|Lưu nháp)$/, exact: true }).evaluate((button) => {
    button.form.requestSubmit();
    button.form.requestSubmit();
  });
  await page.getByRole('button', { name: 'Đang tạo Product...', exact: true }).waitFor();
  await createStarted;
  assert.equal(createRequests().length, beforeDoubleSubmit + 1, 'synchronous duplicate submit must send Create once');
  const createdResponse = page.waitForResponse((response) => response.url().endsWith('/admin/products')
    && response.request().method() === 'POST');
  releaseCreate();
  await createdResponse;
  const noImageId = nextProductId - 1;
  await page.getByText('Product #' + noImageId + ' đã được tạo.', { exact: true }).waitFor();
  assert.equal(products.get(noImageId).images.length, 0);

  await prepareCreate('WITH-IMAGE', true);
  const withImageId = nextProductId;
  await page.getByRole('button', { name: /^(Tạo Product|Lưu nháp)$/, exact: true }).click();
  await page.getByText('Product #' + withImageId + ' đã được tạo.', { exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Thông tin Product mới', exact: true }).waitFor({ state: 'detached' });
  assert.equal(products.get(nextProductId - 1).images.length, 1);

  for (const action of ['Hoàn tất, không tải thêm ảnh', 'Đóng form (Product đã lưu)', 'Mở Product đã tạo']) {
    await prepareCreate('RECOVER-' + action, true);
    failNextUpload = true;
    await page.getByRole('button', { name: /^(Tạo Product|Lưu nháp)$/, exact: true }).click();
    await page.getByText('Chỉ còn bước tải ảnh', { exact: false }).waitFor();
    const saved = nextProductId - 1;
    const posts = createRequests().length;
    assert.ok(products.has(saved));
    await page.getByRole('button', { name: action, exact: true }).click();
    if (action === 'Mở Product đã tạo') {
      await page.waitForURL('**/admin/products/' + saved);
      await page.getByRole('heading', { name: 'RECOVER-' + action, exact: true }).waitFor();
    } else {
      await page.getByText('Product #' + saved + ' đã được tạo.', { exact: true }).waitFor();
    }
    assert.equal(createRequests().length, posts);
    assert.ok(products.has(saved), 'closing or finishing must not delete the saved Product');
    assert.equal(products.get(saved).images.length, 0);
    assert.ok(!requests.some((item) => item.method === 'DELETE' && item.path === '/admin/products/' + saved));
  }
  // Creation starts from a root Product without inheriting its data.
  const parentId = nextProductId - 1;
  await page.getByRole('button', { name: 'Tạo sản phẩm con', exact: true }).click();
  await page.waitForURL('**/admin/products?parent_product_id=' + parentId);
  await page.getByText(products.get(parentId).sku, { exact: true }).first().waitFor();
  assert.equal(await page.getByLabel('SKU *').inputValue(), '');
  assert.equal(await page.getByLabel('Giá bán (VND) *').inputValue(), '');
  await page.getByLabel('SKU *').fill('CHILD-FROM-DETAIL');
  await page.getByLabel('Giá bán (VND) *').fill('0');
  await submitNew('Lưu nháp');
  const newChild = products.get(nextProductId - 1);
  assert.equal(newChild.parent_product_id, parentId);
  assert.equal(newChild.selling_price, 0);
  assert.equal(newChild.name, null);
  assert.equal(newChild.category_id, null);
  assert.deepEqual(newChild.attribute_values, []);
  await page.goto('http://localhost:5182/admin/products/' + newChild.product_id);
  await page.getByRole('heading', { name: 'CHILD-FROM-DETAIL', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Tạo sản phẩm con', exact: true }).count(), 0);

  // Basic fields remain usable while metadata is pending; minimal DRAFT needs no references.
  const metadataStarted = new Promise((resolve) => { notifyMetaStarted = resolve; });
  holdNextMeta = true;
  await page.goto('http://localhost:5182/admin/products');
  await metadataStarted;
  await prepareCreate('DRAFT-WITHOUT-META');
  await submitNew('Lưu nháp');
  const metadataReleased = page.waitForResponse((response) => response.url().endsWith('/admin/catalog/meta'));
  releaseMeta();
  await metadataReleased;
  await prepareCreate('ACTIVE-NEEDS-OPTIONS');
  await page.getByLabel('Giá trị thuộc tính MATERIAL').waitFor();
  await page.getByLabel('Trạng thái Product').selectOption('ACTIVE');
  const beforeRequired = createRequests().length;
  await page.getByRole('button', { name: 'Tạo Product', exact: true }).click();
  await page.locator('#product-create-attribute-12[aria-invalid="true"]').waitFor();
  assert.equal(createRequests().length, beforeRequired);
  await page.getByLabel('Giá trị thuộc tính MATERIAL').selectOption('121');
  await submitNew('Tạo Product');

  // A safe public server code is attached to SKU, without discarding the form.
  await prepareCreate('DUPLICATE-SKU');
  rejectNextCreateCode = 'PRODUCT_SKU_ALREADY_EXISTS';
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await page.locator('#product-create-sku[aria-invalid="true"]').waitFor();
  await page.waitForFunction(() => document.activeElement?.id === 'product-create-sku');
  assert.equal(await page.getByLabel('Giá bán (VND) *').inputValue(), '100000');
  await page.getByLabel('SKU *').fill('CORRECTED-SKU');
  await submitNew('Lưu nháp');

  // Metadata refresh must never erase an Option selection silently.
  await prepareCreate('METADATA-CHANGED');
  await page.getByLabel('Giá trị thuộc tính MATERIAL').selectOption('121');
  adminMeta.attributes = attributes.filter((attribute) => attribute.id !== 12);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/admin/catalog/meta')),
    page.getByRole('button', { name: 'Tải lại thuộc tính và danh mục', exact: true }).click(),
  ]);
  await page.getByRole('button', { name: 'Bỏ lựa chọn #12', exact: true }).waitFor();
  const beforeMissing = createRequests().length;
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await page.getByText('Một lựa chọn thuộc tính không còn trong metadata.', { exact: false }).waitFor();
  assert.equal(createRequests().length, beforeMissing);
  adminMeta.attributes = attributes;
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/admin/catalog/meta')),
    page.getByRole('button', { name: 'Tải lại thuộc tính và danh mục', exact: true }).click(),
  ]);
  await page.getByLabel('Giá trị thuộc tính MATERIAL').waitFor();
  assert.equal(await page.getByLabel('Giá trị thuộc tính MATERIAL').inputValue(), '121');
  await submitNew('Lưu nháp');
  assert.deepEqual(products.get(nextProductId - 1).attribute_values.map((value) => value.attribute_value_id), [121]);

  // Batch entry retains only explicitly chosen fields and always clears SKU, Options and images.
  await prepareCreate('BATCH-ONE', true);
  await page.getByLabel('Danh mục Product').selectOption('1');
  await page.getByLabel('Thương hiệu Product').selectOption('7');
  await page.getByRole('checkbox', { name: 'Giữ danh mục', exact: true }).check();
  await page.getByLabel('Giá trị thuộc tính MATERIAL').selectOption('121');
  await submitNew('Lưu và tạo tiếp');
  assert.equal(await page.getByLabel('SKU *').inputValue(), '');
  assert.equal(await page.getByLabel('Giá bán (VND) *').inputValue(), '');
  assert.equal(await page.getByLabel('Danh mục Product').inputValue(), '1');
  assert.equal(await page.getByLabel('Thương hiệu Product').inputValue(), '');
  assert.equal(await page.getByLabel('Giá trị thuộc tính MATERIAL').inputValue(), '');
  assert.equal(await page.getByRole('region', { name: 'Ảnh sản phẩm mới' }).getByRole('img').count(), 0);
  await page.getByRole('button', { name: 'Chọn sản phẩm cha', exact: true }).click();
  await page.getByRole('button', { name: 'Trang cha sau', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Trang cha sau', exact: true }).isEnabled(), true);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('root_only=true') && new URL(response.url()).searchParams.get('page') === '2'),
    page.getByRole('button', { name: 'Trang cha sau', exact: true }).click(),
  ]);
  assert.ok(requests.some((request) => request.query.root_only === 'true' && request.query.page === '2'));
  await page.getByRole('button', { name: 'Đóng form', exact: true }).click();

  // Invalid files cannot create a Product; selected image order controls the upload order.
  await prepareCreate('IMAGE-ORDER');
  const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  await page.getByLabel('Ảnh Product mới').setInputFiles(Array.from({ length: 11 }, (_, i) => ({ name: 'too-many-' + i + '.png', mimeType: 'image/png', buffer: png })));
  const beforeFiles = createRequests().length;
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await page.getByText('Mỗi lần tải tối đa 10 ảnh.', { exact: false }).waitFor();
  assert.equal(createRequests().length, beforeFiles);
  await page.getByRole('button', { name: 'Bỏ tất cả ảnh', exact: true }).click();
  assert.equal(await page.getByText('Mỗi lần tải tối đa 10 ảnh.', { exact: false }).count(), 0, 'file errors clear when the selection is fixed');
  await page.getByLabel('Ảnh Product mới').setInputFiles([{ name: 'shirt.png', mimeType: 'image/png', buffer: png }, { name: 'retry-shirt.png', mimeType: 'image/png', buffer: png }]);
  await page.getByRole('button', { name: 'Đưa ảnh 2 lên trước', exact: true }).click();
  assert.equal(await page.getByRole('region', { name: 'Ảnh sản phẩm mới' }).getByRole('img').first().getAttribute('alt'), 'retry-shirt.png');
  await page.getByRole('button', { name: 'Bỏ ảnh shirt.png', exact: true }).click();
  await page.getByLabel('Ảnh Product mới').setInputFiles({ name: 'shirt.png', mimeType: 'image/png', buffer: png });
  await submitNew('Lưu nháp');
  const uploaded = products.get(nextProductId - 1).images;
  assert.equal(uploaded.length, 2);
  assert.ok(uploaded[0].image_url.endsWith('retry-shirt.png'));
  assert.equal(uploaded[0].is_primary, true);
  assert.equal(uploaded[1].sort_order, 1);

  // Pending image retry does not depend on an in-flight metadata request or call Create again.
  await prepareCreate('RETRY-DURING-META', true);
  const retryMetadata = new Promise((resolve) => { notifyMetaStarted = resolve; });
  holdNextMeta = true;
  await page.getByRole('button', { name: 'Tải lại thuộc tính và danh mục', exact: true }).click();
  await retryMetadata;
  failNextUpload = true;
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await page.getByText('Chỉ còn bước tải ảnh', { exact: false }).waitFor();
  const retryPosts = createRequests().length;
  assert.equal(await page.getByRole('button', { name: 'Thử tải ảnh lại', exact: true }).isEnabled(), true);
  await page.getByRole('button', { name: 'Thử tải ảnh lại', exact: true }).click();
  await page.getByText('Product #' + (nextProductId - 1) + ' đã được tạo.', { exact: true }).waitFor();
  assert.equal(createRequests().length, retryPosts);
  const retryMetaReleased = page.waitForResponse((response) => response.url().endsWith('/admin/catalog/meta'));
  releaseMeta();
  await retryMetaReleased;

  // Upload may commit while its response is lost. Finishing preserves those images and sends no new upload.
  await prepareCreate('UPLOAD-RESPONSE-LOST', true);
  loseNextUploadResponse = true;
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await page.getByText('Chỉ còn bước tải ảnh', { exact: false }).waitFor();
  const committedUploadId = nextProductId - 1;
  assert.equal(products.get(committedUploadId).images.length, 1);
  const uploadsBeforeFinish = requests.filter((request) => request.method === 'POST' && request.path === '/admin/products/' + committedUploadId + '/images').length;
  const createsBeforeFinish = createRequests().length;
  await page.getByRole('button', { name: 'Hoàn tất, không tải thêm ảnh', exact: true }).click();
  await page.getByRole('heading', { name: 'Thông tin Product mới', exact: true }).waitFor({ state: 'detached' });
  assert.equal(createRequests().length, createsBeforeFinish);
  assert.equal(requests.filter((request) => request.method === 'POST' && request.path === '/admin/products/' + committedUploadId + '/images').length, uploadsBeforeFinish);
  assert.equal(products.get(committedUploadId).images.length, 1);

  // A lost Create response must not be treated as a definite failure or silently resubmitted.
  await prepareCreate('CREATE-RESPONSE-LOST');
  loseNextCreateResponse = true;
  const lostPosts = createRequests().length;
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await page.getByText('Chưa xác nhận được kết quả tạo sản phẩm.', { exact: false }).waitFor();
  assert.equal(createRequests().length, lostPosts + 1);
  assert.equal(await page.getByRole('button', { name: 'Lưu nháp', exact: true }).isDisabled(), true);
  assert.equal([...products.values()].filter((product) => product.sku === 'CREATE-RESPONSE-LOST').length, 1);
  await page.getByRole('button', { name: 'Kiểm tra sản phẩm theo SKU', exact: true }).click();
  await page.getByRole('row').filter({ hasText: 'CREATE-RESPONSE-LOST' }).waitFor();
  assert.equal(createRequests().length, lostPosts + 1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Đóng form', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareCreate('MOBILE-CREATE');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Create form fits mobile viewport');
  await mkdir('.browser-evidence', { recursive: true });
  await page.screenshot({ path: '.browser-evidence/admin-product-create-mobile.png', fullPage: true });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Đóng form', exact: true }).click();
  assert.deepEqual(pageErrors, [], 'no uncaught runtime errors');
  process.stdout.write('Admin Product management browser regression: PASS\n');
} catch (failure) {
  console.error(await page.locator('body').innerText());
  throw failure;
} finally {
  await browser.close();
  await server.close();
}
