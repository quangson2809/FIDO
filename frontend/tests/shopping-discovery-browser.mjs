import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { meta, storefrontFixture } from './helpers/storefrontFixture.mjs';

const categories = [
  ...meta.categories,
  {
    category_id: 3,
    parent_category_id: 1,
    name: 'Áo công sở',
    slug: 'ao-cong-so',
    status: 'ACTIVE',
  },
  {
    category_id: 4,
    parent_category_id: 3,
    name: 'Áo sơ mi',
    slug: 'ao-so-mi',
    status: 'ACTIVE',
  },
];
const server = await createServer({ server: { port: 5198, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const checks = [];
const evidence = '.browser-evidence/shopping-journey';
try {
  await mkdir(evidence, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 900 }, hasTouch: true });
  page.setDefaultTimeout(10000);
  const fixture = storefrontFixture();
  const requests = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.pathname.endsWith('/catalog/meta'))
      return route.fulfill({ json: { data: { ...meta, categories } } });
    return fixture.handler(route);
  });
  const go = (path) => page.goto('http://localhost:5198' + path);
  const productReads = () =>
    requests.filter((url) => url.pathname.endsWith('/catalog/products')).length;
  const lastProductRead = () =>
    requests.filter((url) => url.pathname.endsWith('/catalog/products')).at(-1);
  const result = () => page.getByText('25 sản phẩm', { exact: true }).waitFor();
  await go('/');
  await page.getByRole('heading', { name: 'DANH MỤC SẢN PHẨM', exact: true }).waitFor();
  await page.getByLabel('Từ khóa tìm kiếm toàn cửa hàng', { exact: true }).fill('  Áo  ');
  await page.getByLabel('Từ khóa tìm kiếm toàn cửa hàng', { exact: true }).press('Enter');
  await page.waitForURL(
    (url) => url.pathname === '/products' && url.searchParams.get('q') === 'Áo',
  );
  await result();
  assert.equal(lastProductRead().searchParams.get('q'), 'Áo');
  await page.getByRole('button', { name: /^Bộ lọc/ }).click();
  const searchFilters = page.getByRole('dialog', { name: 'Bộ lọc sản phẩm', exact: true });
  await searchFilters.getByLabel('Thương hiệu', { exact: true }).selectOption('1');
  const filteredSearch = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.endsWith('/catalog/products') &&
      url.searchParams.get('q') === 'Áo' &&
      url.searchParams.get('brand_id') === '1'
    );
  });
  await searchFilters.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
  await filteredSearch;
  await page.waitForURL(
    (url) => url.searchParams.get('q') === 'Áo' && url.searchParams.get('brand_id') === '1',
  );
  await result();
  await page
    .getByRole('region', { name: 'Kết quả sản phẩm' })
    .getByRole('button', { name: /^Xem chi tiết/ })
    .click();
  await page.waitForURL('**/products/1');
  await page.getByRole('heading', { name: 'Áo FIDO', exact: true }).waitFor();
  checks.push(
    'Home → Header search → Catalog → Apply filter → Product detail, with trimmed API search',
  );

  await go('/categories/1');
  await result();
  await page.getByRole('button', { name: /^Bộ lọc/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Bộ lọc sản phẩm', exact: true });
  assert.equal(
    await dialog.getByLabel('Danh mục', { exact: true }).count(),
    0,
    'route owns category scope',
  );
  const readsBeforeDraft = productReads();
  await dialog.getByLabel('Thương hiệu', { exact: true }).selectOption('1');
  await dialog.getByRole('status').filter({ hasText: 'Lựa chọn chưa áp dụng.' }).waitFor();
  assert.equal(productReads(), readsBeforeDraft, 'draft does not issue product requests');
  const apply = dialog.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true });
  const inViewport = async () => {
    const rect = await apply.boundingBox();
    assert.ok(rect.y >= 0 && rect.y + rect.height <= 900, 'apply remains reachable in viewport');
  };
  await inViewport();
  await dialog.locator('.filter-dialog-body').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await inViewport();
  await dialog.getByLabel('Giá từ').fill('300');
  await dialog.getByLabel('Giá đến').fill('100');
  await apply.click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(productReads(), readsBeforeDraft, 'invalid price draft never calls the API');
  await dialog.getByLabel('Giá từ').fill('');
  await dialog.getByLabel('Giá đến').fill('');
  const appliedResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.endsWith('/catalog/products') &&
      url.searchParams.get('category_id') === '1' &&
      url.searchParams.get('brand_id') === '1'
    );
  });
  await apply.click();
  await appliedResponse;
  await page.waitForURL((url) => url.searchParams.get('brand_id') === '1');
  await result();
  assert.equal(lastProductRead().searchParams.get('category_id'), '1');
  assert.equal(lastProductRead().searchParams.get('brand_id'), '1');
  assert.equal(new URL(page.url()).searchParams.has('category_id'), false);
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get('page') === '2');
  const childResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.endsWith('/catalog/products') && url.searchParams.get('category_id') === '3'
    );
  });
  await page
    .getByRole('navigation', { name: 'Danh mục con', exact: true })
    .getByRole('link', { name: 'Áo công sở', exact: true })
    .click();
  await childResponse;
  await page.waitForURL(
    (url) =>
      url.pathname === '/categories/3' &&
      url.searchParams.get('brand_id') === '1' &&
      !url.searchParams.has('page'),
  );
  await result();
  assert.equal(lastProductRead().searchParams.get('category_id'), '3');
  const breadcrumbs = page.getByRole('navigation', { name: 'Đường dẫn danh mục', exact: true });
  assert.equal(
    await breadcrumbs.getByRole('link', { name: 'Áo', exact: true }).getAttribute('href'),
    '/categories/1?brand_id=1',
  );
  await page.goBack();
  await page.waitForURL(
    (url) => url.pathname === '/categories/1' && url.searchParams.get('page') === '2',
  );
  await result();
  await page.goForward();
  await page.waitForURL((url) => url.pathname === '/categories/3');
  await result();
  await page.getByRole('button', { name: 'Xóa tất cả', exact: true }).click();
  await page.waitForURL('**/categories/3');
  await result();
  assert.equal(
    lastProductRead().searchParams.get('category_id'),
    '3',
    'clear never broadens beyond route',
  );
  await go('/categories/3?category_id=2&brand_id=1');
  await page.waitForURL('**/categories/3?brand_id=1');
  await result();
  assert.equal(lastProductRead().searchParams.get('category_id'), '3');
  checks.push(
    'Scoped category filters: draft/apply/price validation, reset, child navigation, pagination, Back/Forward and hostile category parameter',
  );

  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await go('/products');
    await result();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `catalog overflow ${width}`,
    );
    if ([375, 768, 1440].includes(width))
      await page.screenshot({
        path: `${evidence}/after-discovery-catalog-${width}.png`,
        animations: 'disabled',
        fullPage: true,
      });
    if (width < 1024) {
      await page.getByRole('button', { name: /^Bộ lọc/ }).click();
      await inViewport();
      if ([375, 768].includes(width))
        await page.screenshot({
          path: `${evidence}/after-discovery-filters-${width}.png`,
          animations: 'disabled',
        });
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button', { name: 'Danh mục sản phẩm', exact: true }).click();
    const menu = page.getByRole('navigation', { name: 'Danh mục phân cấp', exact: true });
    await menu.getByRole('link', { name: 'Áo công sở', exact: true }).waitFor();
    if ([375, 768, 1440].includes(width))
      await page.screenshot({
        path: `${evidence}/after-discovery-menu-${width}.png`,
        animations: 'disabled',
      });
    await menu.getByRole('link', { name: 'Áo', exact: true }).click();
    await result();
    await page
      .getByRole('navigation', { name: 'Danh mục con', exact: true })
      .getByRole('link', { name: 'Áo công sở', exact: true })
      .click();
    await result();
    if ([375, 768, 1440].includes(width))
      await page.screenshot({
        path: `${evidence}/after-discovery-category-${width}.png`,
        animations: 'disabled',
        fullPage: true,
      });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `category overflow ${width}`,
    );
    await page
      .getByRole('region', { name: 'Kết quả sản phẩm' })
      .getByRole('button', { name: /^Xem chi tiết/ })
      .click();
    await page.waitForURL('**/products/1');
    await page.getByRole('heading', { name: 'Áo FIDO', exact: true }).waitFor();
  }
  checks.push(
    'Header → Parent → Child → Product at all 8 widths; sticky mobile apply; catalog/category overflow and screenshots',
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${evidence}/discovery-results.json`,
    JSON.stringify(
      {
        status: 'PASS',
        checks,
        source: 'Controlled HTTP contract fixtures, Chromium. No live Backend proof.',
      },
      null,
      2,
    ),
  );
  console.log(
    'Shopping discovery browser: PASS (Journeys A/B; 8 responsive widths; draft/scoped filters and navigation)',
  );
} finally {
  await browser.close();
  await server.close();
}
