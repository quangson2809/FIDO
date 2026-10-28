import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  storefrontFixture,
  me as customer,
  meta as baseMeta,
  product as baseProduct,
} from './helpers/storefrontFixture.mjs';

const server = await createServer({
  server: { port: 5187, strictPort: true },
  define: {
    'import.meta.env.VITE_SUPPORT_EMAIL': JSON.stringify('cskh@example.test'),
    'import.meta.env.VITE_SUPPORT_HOTLINE': JSON.stringify('0900 111 222'),
  },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const fixture = storefrontFixture();
const metadata = {
  ...baseMeta,
  categories: [
    ...baseMeta.categories,
    { category_id: 3, parent_category_id: 1, name: 'Áo sơ mi', slug: 'ao-so-mi', status: 'ACTIVE' },
    { category_id: 4, parent_category_id: 3, name: 'Áo công sở', slug: 'ao-cong-so', status: 'ACTIVE' },
  ],
  brands: [
    ...baseMeta.brands,
    { brand_id: 2, name: 'Nhãn khác', slug: 'nhan-khac', status: 'ACTIVE' },
  ],
  attributes: [
    {
      ...baseMeta.attributes[0],
      id: 1,
      code: 'MATERIAL',
      name: 'Chất liệu',
      data_type: 'TEXT',
      is_required: false,
      is_variant_defining: false,
      sort_order: 0,
      options: [],
    },
    {
      id: 2,
      code: 'FABRIC_TYPE',
      name: 'Loại vải',
      data_type: 'OPTION',
      is_required: false,
      is_variant_defining: false,
      sort_order: 1,
      options: [{ id: 42, attribute_id: 2, value: 'COTTON', label: 'Cotton', sort_order: 0 }],
    },
  ],
};
let profile = {
  ...customer,
  roles: [{ role_id: 2, code: 'SUPERADMIN', name: 'Quản trị', description: null }],
};
const detail = {
  ...baseProduct,
  category: metadata.categories[3],
  attribute_values: baseProduct.attribute_values.map((value) => ({
    ...value,
    text_value: 'Cotton; giặt nhẹ',
  })),
};
const summary = {
  product_id: detail.product_id,
  parent_product_id: detail.parent_product_id,
  sku: detail.sku,
  name: detail.name,
  slug: detail.slug,
  category: detail.category,
  brand: detail.brand,
  selling_price: detail.selling_price,
  status: detail.status,
  thumbnail: null,
};
const access = {
  roles: [
    { role_id: 1, code: 'SUPERADMIN', name: 'Quản trị', description: null, permissions: [] },
    {
      role_id: 2,
      code: 'STAFF',
      name: 'Nhân viên',
      description: 'Nhân viên cửa hàng',
      permissions: [],
    },
  ],
  permissions: [
    { permission_id: 1, code: 'CATALOG_READ', name: 'Xem danh mục' },
    { permission_id: 2, code: 'CONTENT_WRITE', name: 'Sửa nội dung' },
  ],
};
const pages = [
  {
    page_id: 1,
    page_code: 'shipping-policy',
    title: 'Giao hàng',
    content: 'Nội dung giao hàng',
    updated_by_account_id: 1,
  },
  {
    page_id: 2,
    page_code: 'return-policy',
    title: 'Trả hàng',
    content: 'Nội dung trả hàng',
    updated_by_account_id: 1,
  },
];
const requests = [];
let detailFailure = false;
let metadataFailure = false;
let attributeFailure = false;
await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
await page.route('**/api/v1/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace('/api/v1', '');
  const send = (body, status = 200) => route.fulfill({ status, json: body });
  if (request.method() === 'OPTIONS') return send({});
  requests.push({
    path,
    method: request.method(),
    query: url.searchParams,
    body: request.postData() ? request.postDataJSON() : null,
  });
  if (path === '/me') return send({ data: profile });
  if (path === '/catalog/meta') return metadataFailure ? send({}, 503) : send({ data: metadata });
  if (path === '/admin/catalog/meta') return send({ data: metadata });
  if (path === '/catalog/products/1') return detailFailure ? send({}, 503) : send({ data: detail });
  if (path === '/catalog/products') {
    const empty = url.searchParams.get('category_id') === '2';
    return send({
      data: empty ? [] : [summary],
      meta: {
        page: Number(url.searchParams.get('page') || 1),
        page_size: 12,
        total: empty ? 0 : 25,
        total_pages: empty ? 0 : 3,
      },
    });
  }
  if (path === '/admin/access-control') return send({ data: access });
  if (path === '/admin/content-pages') return send({ data: pages });
  if (path === '/admin/catalog/attributes/1' && request.method() === 'PATCH') {
    if (attributeFailure) return send({}, 409);
    metadata.attributes[0] = { ...metadata.attributes[0], ...request.postDataJSON() };
    return send({ data: metadata.attributes[0] });
  }
  if (path === '/admin/catalog/attributes/2/options/42' && request.method() === 'PATCH') {
    if (attributeFailure) return send({}, 409);
    const option = { ...metadata.attributes[1].options[0], ...request.postDataJSON() };
    metadata.attributes[1].options[0] = option;
    return send({ data: option });
  }
  return fixture.handler(route);
});
const go = (path) => page.goto(`http://localhost:5187${path}`);
const main = page.locator('main');
try {
  await mkdir('.browser-evidence', { recursive: true });
  await go('/');
  const homepageParents = main.locator('[data-home-parent-category]');
  await main.locator('[data-home-parent-category="1"] a[href="/categories/1"]').first().waitFor();
  assert.deepEqual(
    await homepageParents.evaluateAll((nodes) =>
      nodes.map((node) => Number(node.dataset.homeParentCategory)),
    ),
    [1],
    'homepage showcases only top-level parent categories',
  );
  assert.equal(
    await main
      .locator(
        '[data-home-parent-category="2"], [data-home-parent-category="3"], [data-home-parent-category="4"]',
      )
      .count(),
    0,
    'root leaves, nested parents and nested leaves do not own independent showcases',
  );
  assert.deepEqual(
    [
      ...new Set(
        requests
          .filter((request) => request.path === '/catalog/products')
          .map((request) => request.query.get('category_id'))
          .filter(Boolean),
      ),
    ],
    ['1'],
    'homepage product requests use only the root category and rely on the API for its descendants',
  );
  assert.equal(await page.locator('footer a[href="mailto:cskh@example.test"]').count(), 1);
  assert.equal(await page.locator('footer a[href="tel:0900111222"]').count(), 1);
  const menuButton = page.getByRole('button', { name: 'Danh mục sản phẩm', exact: true });
  const productLink = page
    .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
    .getByRole('link', { name: 'Sản phẩm', exact: true });
  await productLink.hover();
  const menu = page.getByRole('navigation', { name: 'Danh mục phân cấp' });
  await menu.getByRole('link', { name: 'Áo công sở', exact: true }).waitFor();
  assert.equal(await menu.locator('ul ul ul').count(), 1, 'three category levels');
  await menu.getByRole('link', { name: 'Áo sơ mi', exact: true }).focus();
  await page.keyboard.press('Escape');
  assert.equal(await menu.count(), 0);
  assert.equal(await productLink.evaluate((el) => document.activeElement === el), true);
  await page.keyboard.press('ArrowDown');
  await menu.getByRole('link', { name: 'Áo', exact: true }).click();
  await main.getByRole('heading', { name: 'Áo', exact: true, level: 1 }).waitFor();
  await main.getByRole('button', { name: /Xem thuộc tính/ }).waitFor();
  assert.equal(
    await main.getByRole('searchbox').count(),
    1,
    'category products share catalog search',
  );
  assert.equal(
    await main.getByRole('region', { name: 'Lọc sản phẩm', exact: true }).count(),
    1,
    'category products share catalog filters',
  );
  assert.equal(
    await main.getByLabel('Danh mục', { exact: true }).count(),
    0,
    'category route keeps its scope fixed',
  );
  assert.equal(
    requests
      .filter((r) => r.path === '/catalog/products')
      .at(-1)
      .query.get('category_id'),
    '1',
  );
  await main.getByRole('link', { name: 'Áo sơ mi', exact: true }).click();
  await main.getByRole('heading', { name: 'Áo sơ mi', exact: true, level: 1 }).waitFor();
  await main.getByRole('button', { name: 'Trang sau' }).click();
  await page.waitForURL('**/categories/3?page=2');
  await page.goBack();
  await page.waitForURL('**/categories/3');

  // Acceptance AUD-06: full ancestry, links, history and malformed metadata.
  const breadcrumb = page.getByRole('navigation', { name: 'Đường dẫn danh mục' });
  const checkBreadcrumb = async (path, hierarchy) => {
    await go(path);
    await main.getByRole('heading', { name: hierarchy.at(-1), exact: true, level: 1 }).waitFor();
    assert.deepEqual(
      await breadcrumb.getByRole('link').allTextContents(),
      ['Trang chủ', 'Sản phẩm', ...hierarchy.slice(0, -1)],
      `breadcrumb for ${path}`,
    );
    assert.equal(await breadcrumb.locator('[aria-current="page"]').innerText(), hierarchy.at(-1));
  };
  await checkBreadcrumb('/categories/1', ['Áo']);
  await checkBreadcrumb('/categories/3', ['Áo', 'Áo sơ mi']);
  await checkBreadcrumb('/categories/4', ['Áo', 'Áo sơ mi', 'Áo công sở']);
  assert.equal(
    await breadcrumb.getByRole('link', { name: 'Áo sơ mi', exact: true }).getAttribute('href'),
    '/categories/3',
  );
  await breadcrumb.getByRole('link', { name: 'Áo sơ mi', exact: true }).click();
  await page.waitForURL('**/categories/3');
  await page.goBack();
  await page.waitForURL('**/categories/4');
  assert.equal(await breadcrumb.locator('[aria-current="page"]').innerText(), 'Áo công sở');

  const originalCategoryCount = metadata.categories.length;
  try {
    metadata.categories.push(
      { category_id: 5, parent_category_id: 999, name: 'Thiếu danh mục cha' },
      { category_id: 6, parent_category_id: 5, name: 'Nhánh không đầy đủ' },
      { category_id: 7, parent_category_id: 8, name: 'Vòng A' },
      { category_id: 8, parent_category_id: 7, name: 'Vòng B' },
    );
    await checkBreadcrumb('/categories/5', ['Thiếu danh mục cha']);
    await checkBreadcrumb('/categories/6', ['Nhánh không đầy đủ']);
    await checkBreadcrumb('/categories/7', ['Vòng A']);
    await checkBreadcrumb('/categories/8', ['Vòng B']);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      true,
    );
  } finally {
    metadata.categories.splice(originalCategoryCount);
  }

  metadataFailure = true;
  await go('/categories/1');
  await main.getByRole('alert').waitFor();
  assert.equal(await main.getByRole('button', { name: /Xem thuộc tính/ }).count(), 0);
  metadataFailure = false;
  await main.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await main.getByRole('button', { name: /Xem thuộc tính/ }).waitFor();
  await go('/categories/2');
  await main.getByText('Chưa có sản phẩm đang bán trong danh mục này.', { exact: true }).waitFor();
  const beforeInvalid = requests.filter((r) => r.path === '/catalog/products').length;
  await go('/categories/999');
  await main.getByRole('heading', { name: 'Không tìm thấy danh mục' }).waitFor();
  assert.equal(
    requests.filter((r) => r.path === '/catalog/products').length,
    beforeInvalid,
    'invalid category does not browse unfiltered products',
  );
  await go('/products?category_id=1');
  const productInfo = main.getByRole('button', { name: /Xem thuộc tính/ }).first();
  await productInfo.waitFor();
  assert.equal(
    requests.filter((r) => r.path === '/catalog/products/1').length,
    0,
    'no eager detail request per card',
  );
  detailFailure = true;
  await productInfo.click();
  const productDialog = page.getByRole('dialog', { name: `Thuộc tính ${detail.name}` });
  await productDialog.getByRole('alert').waitFor();
  detailFailure = false;
  await productDialog.getByRole('button', { name: 'Thử lại' }).click();
  await productDialog.getByText('Cotton; giặt nhẹ', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await productInfo.evaluate((el) => document.activeElement === el), true);
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).first().click();
  await page.waitForURL('http://localhost:5187/login');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('fido.accessToken')), null);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor();
  await go('/account');
  await main.getByRole('button', { name: 'Đăng xuất' }).click();
  await page.waitForURL('http://localhost:5187/login');

  await go('/admin/catalog/categories');
  await main.getByLabel('Tìm tên hoặc mã thuộc tính').fill('công sở');
  await main.getByRole('cell', { name: 'Áo công sở', exact: true }).waitFor();
  assert.equal(await main.locator('tbody tr').count(), 1);
  await main.getByRole('button', { name: 'Xóa tìm kiếm' }).click();
  await main.getByLabel('Cấp danh mục').selectOption('root');
  assert.equal(await main.locator('tbody tr').count(), 2);
  await go('/admin/catalog/brands');
  await main.getByLabel('Tìm tên hoặc mã thuộc tính').fill('nhãn');
  await main.getByRole('cell', { name: 'Nhãn khác', exact: true }).waitFor();
  assert.equal(await main.locator('tbody tr').count(), 1);

  await go('/admin/catalog/attributes');
  await main.getByRole('heading', { name: 'Chất liệu', exact: true }).waitFor();
  await main.getByRole('button', { name: 'Sửa thuộc tính', exact: true }).first().click();
  const attributeName = main.getByLabel('Tên thuộc tính MATERIAL');
  await attributeName.fill('Chất liệu sợi');
  attributeFailure = true;
  await main.getByRole('button', { name: 'Lưu thuộc tính', exact: true }).click();
  await main.getByRole('alert').waitFor();
  assert.equal(await attributeName.inputValue(), 'Chất liệu sợi', 'failed write preserves attribute draft');
  attributeFailure = false;
  await main.getByRole('button', { name: 'Lưu thuộc tính', exact: true }).click();
  await main.getByRole('heading', { name: 'Chất liệu sợi', exact: true }).waitFor();
  assert.deepEqual(
    requests.filter((request) => request.path === '/admin/catalog/attributes/1' && request.method === 'PATCH').at(-1)?.body,
    { name: 'Chất liệu sợi', is_required: false, is_variant_defining: false, sort_order: 0 },
  );

  const optionArticle = main.locator('article').filter({
    has: main.getByRole('heading', { name: 'Loại vải', exact: true }),
  });
  await optionArticle.getByRole('button', { name: 'Sửa', exact: true }).click();
  await optionArticle.getByLabel('Nhãn option COTTON').fill('Cotton hữu cơ');
  await optionArticle.getByLabel('Thứ tự option COTTON').fill('1');
  await optionArticle.getByRole('button', { name: 'Lưu', exact: true }).click();
  await optionArticle.getByText('Cotton hữu cơ', { exact: true }).waitFor();
  assert.deepEqual(
    requests.filter((request) => request.path === '/admin/catalog/attributes/2/options/42' && request.method === 'PATCH').at(-1)?.body,
    { label: 'Cotton hữu cơ', sort_order: 1 },
  );
  await go('/admin/roles');
  await main.getByLabel('Tìm vai trò').fill('Nhân viên');
  assert.equal(await main.getByRole('heading', { name: 'STAFF', exact: true }).count(), 1);
  assert.equal(await main.getByRole('heading', { name: 'SUPERADMIN', exact: true }).count(), 0);
  await main.getByLabel('Tìm quyền').fill('nội dung');
  assert.equal(await main.getByText('Sửa nội dung', { exact: true }).count(), 1);
  await main.getByLabel('Tìm quyền').fill('missing');
  await main.getByText('Không có quyền khớp tìm kiếm.', { exact: true }).waitFor();
  await go('/admin/content');
  await main.getByLabel('Tìm trang nội dung').fill('return');
  assert.equal(await main.getByRole('button', { name: /Trả hàng.*return-policy/ }).count(), 1);
  await main.getByRole('button', { name: /Trả hàng.*return-policy/ }).click();
  await main.getByLabel('Tiêu đề', { exact: true }).fill('Bản chưa lưu');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('fido.accessToken')), 'fixture');
  let prompts = 0;
  const accept = (dialog) => {
    prompts++;
    void dialog.accept();
  };
  page.on('dialog', accept);
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await page.waitForURL('**/admin/login');
  page.off('dialog', accept);
  assert.equal(prompts, 1, 'confirm dirty logout once');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('fido.accessToken')), null);
  profile = {
    ...customer,
    roles: [{ role_id: 2, code: 'ADMIN', name: 'Nhân viên', description: null }],
    permissions: [access.permissions[0]],
  };
  await go('/admin/catalog/sizes');
  await page.waitForURL('**/admin/catalog/attributes');
  await main.getByRole('heading', { name: 'Chất liệu sợi', exact: true }).waitFor();
  assert.equal(await main.getByRole('button', { name: 'Sửa thuộc tính', exact: true }).count(), 0);
  assert.equal(await main.getByRole('button', { name: 'Sửa', exact: true }).count(), 0);
  profile = customer;
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await go('/categories/1');
    await main.getByRole('button', { name: /Xem thuộc tính/ }).waitFor();
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `category overflow ${width}`,
    );
    await page.screenshot({
      path: `.browser-evidence/audit-category-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 375, height: 1000 });
  await go('/');
  await page.getByRole('button', { name: 'Danh mục sản phẩm', exact: true }).click();
  await menu.getByRole('link', { name: 'Áo công sở', exact: true }).waitFor();
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'mobile menu overflow',
  );
  await page.screenshot({ path: '.browser-evidence/audit-menu-375.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'PASS audit: contact links, category tree/page/history/errors, shared cards/detail retry, logout/dirty guard, category/brand search, attribute/option update failure recovery, legacy catalog route redirect, read-only and responsive checks',
  );
} catch (error) {
  console.error('Audit failure URL:', page.url());
  await page.screenshot({ path: '.browser-evidence/audit-failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
  await server.close();
}
