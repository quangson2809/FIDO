import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { meta, storefrontFixture } from './helpers/storefrontFixture.mjs';

const server = await createServer({ server: { port: 5196, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.route('**/api/v1/**', storefrontFixture().handler);

try {
  await mkdir('.browser-evidence', { recursive: true });
  await page.goto('http://localhost:5196/');
  await page.getByRole('heading', { name: 'DANH MỤC SẢN PHẨM' }).waitFor();

  const categoryCards = page.locator('#danh-muc a[href^="/categories/"]');
  assert.equal(await categoryCards.count(), 2, 'only categories from the API should render');
  assert.deepEqual(
    await categoryCards.locator('svg[data-artwork]').evaluateAll(
      (nodes) => nodes.map((node) => node.getAttribute('data-artwork')),
    ),
    ['tops', 'bottoms'],
    'category art should reflect the API category name rather than card position',
  );
  assert.equal(await categoryCards.nth(0).getAttribute('href'), '/categories/1');
  assert.equal(await categoryCards.nth(1).getAttribute('href'), '/categories/2');

  const banner = page.getByRole('region', { name: 'Bộ ảnh thời trang FIDO' });
  assert.equal(await banner.locator('[data-slide-active="true"] img').getAttribute('src'), '/images/about/wardrobe.svg');
  await banner.getByRole('button', { name: 'Ảnh tiếp theo' }).click();
  assert.equal(await banner.locator('[data-slide-active="true"] img').getAttribute('src'), '/images/about/palette.svg');
  await banner.getByRole('button', { name: 'Hiển thị ảnh 3: Chú trọng từng chi tiết' }).click();
  assert.equal(await banner.locator('[data-slide-active="true"] img').getAttribute('src'), '/images/about/details.svg');
  await banner.getByRole('button', { name: 'Ảnh trước' }).click();
  assert.equal(await banner.locator('[data-slide-active="true"] img').getAttribute('src'), '/images/about/palette.svg');

  assert.deepEqual(
    await page.locator('svg[data-benefit-artwork]').evaluateAll(
      (nodes) => nodes.map((node) => node.getAttribute('data-benefit-artwork')),
    ),
    ['categories', 'fit', 'details', 'cod'],
  );
  await page.waitForFunction(() => {
    const image = document.querySelector('img[src="/images/about/palette.svg"]');
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  });
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const geometry = await page.evaluate(() => ({
      contentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    assert.ok(
      geometry.contentWidth <= geometry.viewportWidth + 2,
      `homepage overflows horizontally at ${width}px: ${JSON.stringify(geometry)}`,
    );
    await page.screenshot({
      path: `.browser-evidence/homepage-illustrations-${width}.png`,
      fullPage: true,
    });
  }

  const nestedPage = await browser.newPage({ viewport: { width: 1280, height: 844 } });
  const nestedFixture = storefrontFixture();
  const nestedCategories = [
    ...meta.categories,
    { category_id: 3, parent_category_id: 1, name: 'Áo thun' },
    { category_id: 4, parent_category_id: 2, name: 'Quần jeans' },
  ];
  await nestedPage.route('**/api/v1/**', (route) => {
    if (new URL(route.request().url()).pathname === '/api/v1/catalog/meta') {
      return route.fulfill({ json: { data: { ...meta, categories: nestedCategories } } });
    }
    return nestedFixture.handler(route);
  });
  await nestedPage.goto('http://localhost:5196/');
  await nestedPage.getByRole('heading', { name: 'DANH MỤC SẢN PHẨM' }).waitFor();
  const nestedLinks = nestedPage.locator('#danh-muc a[href^="/categories/"]');
  await nestedPage.waitForFunction(() => document.querySelectorAll('#danh-muc a[href^="/categories/"]').length === 4);
  assert.deepEqual(
    await nestedLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
    ['/categories/1', '/categories/2', '/categories/3', '/categories/4'],
    'homepage should link both root categories and actual child categories',
  );
  await nestedLinks.nth(2).click();
  await nestedPage.waitForURL('**/categories/3');
  assert.equal(await nestedPage.getByRole('heading', { name: 'Áo thun' }).count(), 1);
  await nestedPage.close();

  await categoryCards.first().click();
  await page.waitForURL('**/categories/1');
  assert.deepEqual(pageErrors, []);
  console.log('Homepage artwork browser: PASS — nested API categories, carousel controls, contextual art, routes and responsive widths.');
} finally {
  await browser.close();
  await server.close();
}
