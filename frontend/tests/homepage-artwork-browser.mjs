import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { storefrontFixture } from './helpers/storefrontFixture.mjs';

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

  assert.deepEqual(
    await page.locator('svg[data-benefit-artwork]').evaluateAll(
      (nodes) => nodes.map((node) => node.getAttribute('data-benefit-artwork')),
    ),
    ['categories', 'fit', 'details', 'cod'],
  );
  assert.equal(
    await page.locator('img[src="/images/about/palette.svg"]').evaluate((img) => img.complete && img.naturalWidth > 0),
    true,
    'editorial illustration should be loaded',
  );
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

  await categoryCards.first().click();
  await page.waitForURL('**/categories/1');
  assert.deepEqual(pageErrors, []);
  console.log('Homepage artwork browser: PASS — contextual cards, API category links, editorial image and responsive widths.');
} finally {
  await browser.close();
  await server.close();
}
