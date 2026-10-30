import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const { chromium } = createRequire(import.meta.url)('playwright');
const server = await createServer({ server: { port: 5181, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
const requests = [];
const date = '2026-10-28T00:00:00Z';
const profile = {
  account: {
    id: 1,
    full_name: 'Admin test',
    phone: '0900000000',
    email: null,
    status: 'ACTIVE',
    created_at: date,
    updated_at: date,
  },
  addresses: [],
  roles: [{ id: 1, code: 'SUPERADMIN', name: 'Quản trị', description: null, status: 'ACTIVE' }],
  permissions: [],
};
let metadata = {
  attribute_types: [
    { id: 1, code: 'OPTION', name: 'Lựa chọn', data_type: 'OPTION' },
    { id: 2, code: 'TEXT', name: 'Văn bản', data_type: 'TEXT' },
    { id: 3, code: 'NUMBER', name: 'Số', data_type: 'NUMBER' },
    { id: 4, code: 'BOOLEAN', name: 'Có/Không', data_type: 'BOOLEAN' },
  ],
  attributes: [
    {
      id: 10,
      code: 'COLOR',
      name: 'Màu sắc',
      data_type: 'OPTION',
      is_required: false,
      is_variant_defining: false,
      sort_order: 0,
      options: [{ id: 100, attribute_id: 10, value: 'BLACK', label: 'Đen', sort_order: 0 }],
    },
    {
      id: 11,
      code: 'MATERIAL',
      name: 'Chất liệu',
      data_type: 'TEXT',
      is_required: true,
      is_variant_defining: false,
      sort_order: 1,
      options: [],
    },
  ],
};
let failMetadata = false;

const send = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
    headers: { 'access-control-allow-origin': '*' },
  });

await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture-token'));
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace('/api/v1', '');
  const method = request.method();
  const rawBody = request.postData();
  const body = rawBody ? JSON.parse(rawBody) : null;
  requests.push({ method, path, body });

  if (method === 'OPTIONS') {
    return route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      },
    });
  }
  if (method === 'GET' && path === '/me') return send(route, { data: profile });
  if (method === 'GET' && path === '/admin/catalog/meta') {
    if (failMetadata) return send(route, { message: 'Metadata unavailable' }, 503);
    return send(route, { data: metadata });
  }
  if (method === 'POST' && path === '/admin/catalog/attributes') {
    const created = {
      id: Math.max(0, ...metadata.attributes.map((item) => item.id)) + 1,
      code: body.code,
      name: body.name,
      data_type: metadata.attribute_types.find((item) => item.id === body.attribute_type_id).data_type,
      is_required: body.is_required,
      is_variant_defining: body.is_variant_defining ?? false,
      sort_order: body.sort_order ?? 0,
      options: [],
    };
    metadata = { ...metadata, attributes: [...metadata.attributes, created] };
    return send(route, { data: created }, 201);
  }
  const attributeMatch = path.match(/^\/admin\/catalog\/attributes\/(\d+)$/);
  if (method === 'PATCH' && attributeMatch) {
    const attributeId = Number(attributeMatch[1]);
    const existing = metadata.attributes.find((item) => item.id === attributeId);
    if (!existing) return send(route, { message: 'Attribute not found' }, 404);
    const updated = { ...existing, ...body };
    metadata = {
      ...metadata,
      attributes: metadata.attributes.map((item) => item.id === attributeId ? updated : item),
    };
    return send(route, { data: updated });
  }
  const createOptionMatch = path.match(/^\/admin\/catalog\/attributes\/(\d+)\/options$/);
  if (method === 'POST' && createOptionMatch) {
    const attributeId = Number(createOptionMatch[1]);
    const parent = metadata.attributes.find((item) => item.id === attributeId);
    if (!parent || parent.data_type !== 'OPTION') return send(route, { message: 'Invalid parent' }, 400);
    const created = {
      id: Math.max(0, ...metadata.attributes.flatMap((item) => item.options.map((option) => option.id))) + 1,
      attribute_id: attributeId,
      value: body.value,
      label: body.label,
      sort_order: body.sort_order ?? 0,
    };
    metadata = {
      ...metadata,
      attributes: metadata.attributes.map((item) => item.id === attributeId
        ? { ...item, options: [...item.options, created] }
        : item),
    };
    return send(route, { data: created }, 201);
  }
  const updateOptionMatch = path.match(/^\/admin\/catalog\/attributes\/(\d+)\/options\/(\d+)$/);
  if (method === 'PATCH' && updateOptionMatch) {
    const attributeId = Number(updateOptionMatch[1]);
    const optionId = Number(updateOptionMatch[2]);
    const parent = metadata.attributes.find((item) => item.id === attributeId);
    const option = parent?.options.find((item) => item.id === optionId);
    if (!parent || !option) return send(route, { message: 'Option not found' }, 404);
    const updated = { ...option, ...body };
    metadata = {
      ...metadata,
      attributes: metadata.attributes.map((item) => item.id === attributeId
        ? { ...item, options: item.options.map((itemOption) => itemOption.id === optionId ? updated : itemOption) }
        : item),
    };
    return send(route, { data: updated });
  }
  return send(route, { message: `Unhandled request: ${method} ${path}` }, 404);
});

try {
  await page.goto('http://localhost:5181/admin/catalog/attributes', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Quản lý thuộc tính', exact: true }).waitFor();
  await page.getByText('Màu sắc', { exact: true }).waitFor();
  await page.getByText('OPTION', { exact: true }).first().waitFor();
  await page.getByText('Chất liệu', { exact: true }).waitFor();
  await page.getByText('Giá trị: BLACK · Thứ tự 0', { exact: true }).waitFor();

  // Attribute create reads type IDs from admin metadata and submits only the backend request fields.
  await page.getByLabel('Mã thuộc tính').fill('WEIGHT');
  await page.getByLabel('Tên thuộc tính mới').fill('Trọng lượng');
  await page.getByLabel('Kiểu dữ liệu').selectOption('3');
  await page.getByRole('button', { name: 'Tạo thuộc tính', exact: true }).click();
  await page.getByText('Trọng lượng', { exact: true }).waitFor();
  assert.deepEqual(
    requests.find((item) => item.method === 'POST' && item.path === '/admin/catalog/attributes')?.body,
    {
      attribute_type_id: 3,
      code: 'WEIGHT',
      name: 'Trọng lượng',
      is_required: false,
      is_variant_defining: false,
      sort_order: 2,
    },
  );

  const colorCard = page.locator('article').filter({ hasText: 'COLOR' }).first();
  await colorCard.getByRole('button', { name: 'Sửa thuộc tính', exact: true }).click();
  const attributeEditor = colorCard.locator('form').first();
  assert.equal(await attributeEditor.getByLabel('Mã thuộc tính').count(), 0, 'attribute code is immutable');
  assert.equal(await attributeEditor.getByLabel('Kiểu dữ liệu').count(), 0, 'attribute data type is immutable');
  await colorCard.getByLabel('Tên thuộc tính COLOR').fill('Màu chính');
  await colorCard.getByLabel('Thứ tự thuộc tính COLOR').fill('2');
  await colorCard.getByLabel('Bắt buộc COLOR').check();
  await colorCard.getByLabel('Phân biệt COLOR').check();
  await colorCard.getByRole('button', { name: 'Lưu thuộc tính', exact: true }).click();
  await page.getByText('Màu chính', { exact: true }).waitFor();
  assert.deepEqual(
    requests.find((item) => item.method === 'PATCH' && item.path === '/admin/catalog/attributes/10')?.body,
    {
      name: 'Màu chính',
      is_required: true,
      is_variant_defining: true,
      sort_order: 2,
    },
  );

  // Option create uses immutable value as input once, but the edit form exposes only label/order.
  await colorCard.getByLabel('Mã option COLOR').fill('BLUE');
  await colorCard.getByLabel('Nhãn option mới COLOR').fill('Xanh dương');
  await colorCard.getByRole('button', { name: 'Thêm option COLOR', exact: true }).click();
  await page.getByText('Giá trị: BLUE · Thứ tự 1', { exact: true }).waitFor();
  assert.deepEqual(
    requests.find((item) => item.method === 'POST' && item.path === '/admin/catalog/attributes/10/options')?.body,
    { value: 'BLUE', label: 'Xanh dương', sort_order: 1 },
  );

  const blackOption = colorCard.locator('[data-option-id="100"]');
  await blackOption.getByRole('button', { name: 'Sửa', exact: true }).click();
  assert.equal(await blackOption.getByLabel('Mã option BLACK').count(), 0, 'option value is immutable');
  await blackOption.getByLabel('Nhãn option BLACK').fill('Đen nhám');
  await blackOption.getByLabel('Thứ tự option BLACK').fill('2');
  await blackOption.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('Đen nhám', { exact: true }).waitFor();
  assert.deepEqual(
    requests.find((item) => item.method === 'PATCH' && item.path === '/admin/catalog/attributes/10/options/100')?.body,
    { label: 'Đen nhám', sort_order: 2 },
  );

  const responsiveWidths = [375, 1440];
  for (const width of responsiveWidths) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, `attribute management must not overflow at ${width}px`);
  }

  assert.equal(requests.some((item) => item.method === 'DELETE'), false, 'Attribute/Option delete APIs are unsupported');
  assert.equal(requests.some((item) => item.path === '/catalog/meta'), false, 'Attribute screen must not depend on public catalog metadata');
  assert.equal(requests.some((item) => item.path.includes('attribute-types')), false, 'AttributeType CRUD must not be called');
  assert.equal(await page.getByRole('button', { name: /Xóa|Delete/i }).count(), 0, 'no fake delete controls');

  failMetadata = true;
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByText('Màu chính', { exact: true }).count(), 1, 'refresh failure must not turn existing data into a false empty state');

  process.stdout.write('Admin Attribute/Option browser regression: PASS\n');
} catch (failure) {
  console.error(await page.locator('body').innerText());
  throw failure;
} finally {
  await browser.close();
  await server.close();
}
