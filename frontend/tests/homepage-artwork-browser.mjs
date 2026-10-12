import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { meta, product, storefrontFixture } from './helpers/storefrontFixture.mjs';

const server = await createServer({ server: { port: 5196, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
const fixture = storefrontFixture();
const parentCategories = [
  ...meta.categories,
  { category_id: 3, parent_category_id: 1, name: 'Áo thun' },
  { category_id: 4, parent_category_id: 2, name: 'Quần jeans' },
  { category_id: 5, parent_category_id: 3, name: 'Áo polo' },
];
const showcaseReads = [];
await page.route('**/api/v1/**', route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/v1/catalog/meta') {
    return route.fulfill({ json: { data: { ...meta, categories: parentCategories } } });
  }
  if (url.pathname === '/api/v1/catalog/products' && url.searchParams.has('category_id')) {
    const id = Number(url.searchParams.get('category_id'));
    showcaseReads.push({ categoryId: id, pageSize: url.searchParams.get('page_size') });
    const products = [1, 2, 3].includes(id) ? Array.from({ length: 4 }, (_, index) => ({
      ...product,
      product_id: id * 10 + index,
      name: `${id === 2 ? 'Quần' : 'Áo'} FIDO ${id}-${index + 1}`,
      thumbnail: '/images/about/wardrobe.svg',
      category: parentCategories.find(item => item.category_id === id),
    })) : [];
    return route.fulfill({ json: {
      data: products,
      meta: { page: 1, page_size: 4, total: products.length, total_pages: products.length ? 1 : 0 },
    } });
  }
  return fixture.handler(route);
});
await page.clock.install();

try {
  await mkdir('.browser-evidence', { recursive: true });
  await page.goto('http://localhost:5196/');
  await page.getByRole('heading', { name: 'DANH MỤC SẢN PHẨM' }).waitFor();

  const showcases = page.locator('[data-home-parent-category]');
  await page.waitForFunction(() => document.querySelectorAll('[data-home-parent-category]').length === 2);
  assert.deepEqual(await showcases.evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('data-home-parent-category')))),
    [1, 2], 'only top-level categories with children; nested parents and leaves are excluded');
  assert.deepEqual(await showcases.locator('svg[data-artwork]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-artwork'))),
    ['tops', 'bottoms'], 'root category artwork tracks API category names');
  assert.deepEqual(await showcases.locator('a[href^="/categories/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))),
    ['/categories/1', '/categories/1', '/categories/2', '/categories/2']);
  await page.waitForFunction(() => [...document.querySelectorAll('[data-home-parent-category]')].every(section => section.querySelectorAll('.product-summary-card').length === 4));
  assert.equal(showcaseReads.every(read => read.pageSize === '4'), true, 'each root requests at most four products');
  assert.deepEqual([...new Set(showcaseReads.map(read => read.categoryId))], [1, 2], 'product requests are scoped to root categories only');
  for (const section of await showcases.all()) {
    assert.equal(await section.locator('.product-summary-card').count(), 4, 'each parent category owns four cards');
    const banner = section.locator('a[href^="/categories/"]').first();
    assert.ok((await banner.getAttribute('class')).includes('sm:min-h-52'), 'category banner fills its own row');
  }
  assert.equal((await showcases.nth(1).locator('a[href^="/categories/"]').first().getAttribute('class')).includes('sm:flex-row-reverse'), true, 'successive category banners alternate');
  assert.equal(await page.locator('[data-home-parent-category="3"], [data-home-parent-category="4"], [data-home-parent-category="5"]').count(), 0, 'nested parent and leaf categories never own a homepage showcase');

  const banner = page.getByRole('region', { name: 'Bộ ảnh thời trang FIDO' });
  const activeBannerImage = () => banner.locator('[data-slide-active="true"] img').getAttribute('src');
  assert.equal(await activeBannerImage(), '/images/about/wardrobe.svg');

  // A resting pointer must not disable autoplay.
  await banner.hover();
  await page.clock.fastForward(6100);
  await page.waitForFunction(() =>
    document.querySelector('[data-slide-active="true"] img')?.getAttribute('src') === '/images/about/palette.svg');
  assert.equal(await activeBannerImage(), '/images/about/palette.svg', 'autoplay advances without user click, including on hover');

  // Manual navigation retains autoplay even while its button has keyboard focus.
  await banner.getByRole('button', { name: 'Ảnh tiếp theo' }).click();
  assert.equal(await activeBannerImage(), '/images/about/details.svg');
  await page.clock.fastForward(6100);
  await page.waitForFunction(() =>
    document.querySelector('[data-slide-active="true"] img')?.getAttribute('src') === '/images/about/wardrobe.svg');
  assert.equal(await activeBannerImage(), '/images/about/wardrobe.svg', 'autoplay resumes after manual navigation with button focused');

  await banner.getByRole('button', { name: 'Tạm dừng tự động chuyển ảnh' }).click();
  await page.clock.fastForward(13000);
  assert.equal(await activeBannerImage(), '/images/about/wardrobe.svg', 'pause prevents automatic advancement');
  await banner.getByRole('button', { name: 'Tiếp tục tự động chuyển ảnh' }).click();
  await page.clock.fastForward(6100);
  await page.waitForFunction(() =>
    document.querySelector('[data-slide-active="true"] img')?.getAttribute('src') === '/images/about/palette.svg');

  await banner.getByRole('button', { name: 'Ảnh tiếp theo' }).click();
  assert.equal(await activeBannerImage(), '/images/about/details.svg');
  await banner.getByRole('button', { name: 'Hiển thị ảnh 3: Chú trọng từng chi tiết' }).click();
  assert.equal(await activeBannerImage(), '/images/about/details.svg');
  await banner.getByRole('button', { name: 'Ảnh trước' }).click();
  assert.equal(await activeBannerImage(), '/images/about/palette.svg');

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
    for (const section of await page.locator('[data-home-parent-category]').all()) {
      const box = await section.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 2, 'parent section spans available width without overflow');
      assert.equal(await section.locator('.product-summary-card').count(), 4);
    }
    await page.screenshot({
      path: `.browser-evidence/homepage-illustrations-${width}.png`,
      fullPage: true,
    });
  }

  const reducedMotionPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  await reducedMotionPage.route('**/api/v1/**', storefrontFixture().handler);
  await reducedMotionPage.clock.install();
  await reducedMotionPage.goto('http://localhost:5196/');
  const reducedBanner = reducedMotionPage.getByRole('region', { name: 'Bộ ảnh thời trang FIDO' });
  await reducedBanner.getByRole('button', { name: 'Tiếp tục tự động chuyển ảnh' }).waitFor();
  await reducedMotionPage.clock.fastForward(13000);
  assert.equal(await reducedBanner.locator('[data-slide-active="true"] img').getAttribute('src'),
    '/images/about/wardrobe.svg', 'autoplay defaults to paused for reduced-motion preference');
  await reducedBanner.getByRole('button', { name: 'Tiếp tục tự động chuyển ảnh' }).click();
  await reducedMotionPage.clock.fastForward(6100);
  await reducedMotionPage.waitForFunction(() =>
    document.querySelector('[data-slide-active="true"] img')?.getAttribute('src') === '/images/about/palette.svg');
  await reducedMotionPage.close();

  const nestedPage = await browser.newPage({ viewport: { width: 1280, height: 844 } });
  const nestedFixture = storefrontFixture();
  const nestedCategories = [
    ...meta.categories,
    { category_id: 3, parent_category_id: 1, name: 'Áo thun' },
    { category_id: 4, parent_category_id: 2, name: 'Quần jeans' },
    { category_id: 5, parent_category_id: 3, name: 'Áo polo' },
  ];
  await nestedPage.route('**/api/v1/**', (route) => {
    if (new URL(route.request().url()).pathname === '/api/v1/catalog/meta') {
      return route.fulfill({ json: { data: { ...meta, categories: nestedCategories } } });
    }
    return nestedFixture.handler(route);
  });
  await nestedPage.goto('http://localhost:5196/');
  await nestedPage.getByRole('heading', { name: 'DANH MỤC SẢN PHẨM' }).waitFor();
  const nestedLinks = nestedPage.locator('[data-home-parent-category] a[href^="/categories/"]');
  await nestedPage.waitForFunction(() => document.querySelectorAll('[data-home-parent-category]').length === 2);
  assert.deepEqual(await nestedPage.locator('[data-home-parent-category]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.homeParentCategory))),
    [1, 2], 'homepage promotes root parent categories only, not nested parents');
  assert.equal(await nestedPage.locator('[data-home-parent-category="3"], [data-home-parent-category="4"], [data-home-parent-category="5"]').count(), 0);
  await nestedLinks.first().click();
  await nestedPage.waitForURL('**/categories/1');
  await nestedPage.getByRole('navigation', { name: 'Danh mục con' }).getByRole('link', { name: 'Áo thun', exact: true }).click();
  await nestedPage.waitForURL('**/categories/3');
  await nestedPage.getByRole('heading', { name: 'Áo thun', exact: true, level: 1 }).waitFor();
  await nestedPage.close();

  await showcases.first().locator('a[href^="/categories/"]').first().click();
  await page.waitForURL('**/categories/1');
  assert.deepEqual(pageErrors, []);
  console.log('Homepage artwork browser: PASS — autoplay, pause/resume, reduced-motion, nested categories, routes and responsive widths.');
} finally {
  await browser.close();
  await server.close();
}
