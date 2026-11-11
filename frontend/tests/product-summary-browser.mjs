import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { storefrontFixture, meta, product } from './helpers/storefrontFixture.mjs';

// Fixtures mirror the current summary/detail DTOs rather than the removed variant model.
const summary = (overrides = {}) => ({
  product_id: 1,
  parent_product_id: null,
  sku: 'FIDO-TEE-001',
  name: 'Áo cotton FIDO',
  slug: 'ao-cotton-fido',
  thumbnail: '/images/about/wardrobe.svg',
  category: meta.categories[0],
  brand: meta.brands[0],
  selling_price: 200000,
  status: 'ACTIVE',
  ...overrides,
});
const summaries = [
  summary(),
  summary({
    product_id: 2,
    sku: 'FIDO-TROUSER-002',
    name: 'Quần FIDO',
    slug: 'quan-fido',
    category: meta.categories[1],
    brand: null,
    thumbnail: null,
    selling_price: 499000,
  }),
  summary({
    product_id: 3,
    sku: 'FIDO-LONG-NAME-003',
    name: 'Tên sản phẩm rất dài để kiểm tra hai dòng và sự thẳng hàng của giá trong cùng một lưới '.repeat(3),
    slug: 'ten-san-pham-dai',
    thumbnail: '/broken-summary.jpg',
    selling_price: 699000,
  }),
  summary({
    product_id: 4,
    sku: 'FIDO-EXTRA-004',
    name: 'Sản phẩm có SKU dài',
    slug: 'san-pham-co-sku-dai',
    selling_price: 999999999999,
    thumbnail: '/images/about/details.svg',
  }),
];
const detailForSummary = (item) => ({
  ...product,
  product_id: item.product_id,
  parent_product_id: item.parent_product_id,
  sku: item.sku,
  name: item.name,
  slug: item.slug,
  category: item.category,
  brand: item.brand,
  selling_price: item.selling_price,
  status: item.status,
  images: [],
  attribute_values:
    item.product_id === 1
      ? product.attribute_values.map((value) => ({ ...value, label: 'Cotton; giặt nhẹ.' }))
      : item.product_id === 3
        ? product.attribute_values.map((value) => ({ ...value, label: 'Vải mềm' }))
        : [],
});
const fixture = storefrontFixture();
const requests = [];
let detailFailure = false;
function catalogRoute(route) {
  const url = new URL(route.request().url());
  requests.push(url.pathname);
  if (url.pathname === '/api/v1/catalog/products') {
    return route.fulfill({
      json: { data: summaries, meta: { page: 1, page_size: 12, total: 4, total_pages: 1 } },
    });
  }
  const match = url.pathname.match(/^\/api\/v1\/catalog\/products\/(\d+)$/);
  if (match) {
    const summary = summaries.find((item) => item.product_id === Number(match[1]));
    if (detailFailure) return route.fulfill({ status: 503, json: {} });
    return route.fulfill({
      json: {
        data: {
          ...detailForSummary(summary),
        },
      },
    });
  }
  return fixture.handler(route);
}
const server = await createServer({
  root: process.env.SUMMARY_BASELINE_ROOT || process.cwd(),
  server: { port: 5188, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/broken-summary.jpg', (route) => route.fulfill({ status: 404, body: '' }));
  await page.route('**/api/v1/**', catalogRoute);
  await mkdir('.browser-evidence', { recursive: true });
  await page.goto('http://localhost:5188/products');
  const region = page.getByRole('region', { name: 'Kết quả sản phẩm' });
  await page.getByText('Áo cotton FIDO', { exact: true }).waitFor();
  if (process.env.SUMMARY_BASELINE_ROOT) {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.mouse.move(0, 0);
      await page.screenshot({
        animations: 'disabled',
        path: `.browser-evidence/summary-before-fixture-${width}.png`,
        fullPage: true,
      });
    }
    console.log('Summary baseline screenshots captured (controlled fixtures).');
  } else {
    const cards = page.locator('.product-summary-card');
    const first = cards.first();
    assert.equal(await cards.count(), 4);
    assert.equal(
      requests.filter((path) => /\/catalog\/products\/\d+$/.test(path)).length,
      0,
      'rendering cards does not call detail APIs',
    );
    assert.ok(
      requests.filter((path) => path === '/api/v1/catalog/products').length <= 2,
      'one list query per mount, independent of card count',
    );
    assert.equal(
      await first.locator('.product-summary-metadata').getAttribute('aria-label'),
      'Thương hiệu: FIDO',
    );
    assert.match(await first.innerText(), /SKU FIDO-TEE-001/);
    assert.match(await first.innerText(), /200\.000/);
    assert.match(await cards.nth(1).innerText(), /DANH MỤC: QUẦN/);
    assert.match(await cards.nth(1).innerText(), /SKU FIDO-TROUSER-002/);
    assert.match(await cards.nth(2).innerText(), /SKU FIDO-LONG-NAME-003/);
    assert.doesNotMatch(await region.innerText(), /HÀNG MỚI|WOOL BLEND|Giá cơ bản\n/);
    assert.equal(await page.getByRole('button', { name: /yêu thích/i }).count(), 0);
    assert.equal(await first.locator('button button').count(), 0);
    await cards
      .nth(2)
      .getByRole('img', { name: /ảnh chưa khả dụng/ })
      .waitFor();

    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.mouse.move(0, 0);
      await page.screenshot({
        animations: 'disabled',
        path: `.browser-evidence/summary-after-fixture-${width}.png`,
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
        `page overflow ${width}`,
      );
      const measurements = await cards.evaluateAll((elements) =>
        elements.map((card) => {
          const photo = card.querySelector('.product-summary-photo').getBoundingClientRect();
          const title = card.querySelector('.product-summary-title');
          const footer = card.querySelector('.product-summary-footer');
          return {
            ratio: photo.width / photo.height,
            titleHeight: title.offsetHeight,
            footerTop: footer.offsetTop,
            cardTop: card.offsetTop,
            cardHeight: card.offsetHeight,
            overflow: card.scrollWidth > card.clientWidth,
            infoWidth: card.querySelector('.product-summary-info').offsetWidth,
          };
        }),
      );
      for (const measurement of measurements) {
        assert.ok(Math.abs(measurement.ratio - 0.75) < 0.005, `3:4 image at ${width}`);
        assert.equal(measurement.overflow, false, `card overflow at ${width}`);
        assert.equal(measurement.infoWidth, 44, 'touch target');
      }
      for (const measurement of measurements) {
        const peers = measurements.filter((other) => other.cardTop === measurement.cardTop);
        assert.ok(
          peers.every((other) => Math.abs(other.footerTop - measurement.footerTop) <= 1),
          `price rows align at ${width}: ${JSON.stringify(measurements)}`,
        );
      }
      assert.equal(
        await first
          .locator('.product-summary-image')
          .evaluate((el) => getComputedStyle(el).objectFit),
        'cover',
      );
    }
    const geometry = await first.evaluate((el) => ({
      top: el.offsetTop,
      left: el.offsetLeft,
      height: el.offsetHeight,
    }));
    await first.hover();
    await page.waitForFunction(() => {
      const card = document.querySelector('.product-summary-card');
      return new DOMMatrix(getComputedStyle(card).transform).m42 < -2.9;
    });
    assert.deepEqual(
      await first.evaluate((el) => ({
        top: el.offsetTop,
        left: el.offsetLeft,
        height: el.offsetHeight,
      })),
      geometry,
      'hover does not change document layout',
    );
    const zoom = await first
      .locator('.product-summary-image')
      .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m11);
    assert.ok(zoom >= 1.03 && zoom <= 1.05);
    await page.screenshot({
      animations: 'disabled',
      path: '.browser-evidence/summary-hover-fixture-1440.png',
      fullPage: true,
    });

    const info = first.getByRole('button', {
      name: 'Xem thuộc tính: Áo cotton FIDO',
      exact: true,
    });
    await info.focus();
    assert.equal(await info.evaluate((el) => getComputedStyle(el).outlineStyle), 'solid');
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Thuộc tính Áo cotton FIDO' });
    await dialog.getByText('Cotton; giặt nhẹ.', { exact: true }).waitFor();
    assert.ok(page.url().endsWith('/products'), 'information action does not navigate');
    for (let index = 0; index < 4; index++) {
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
    }
    await page.keyboard.press('Escape');
    assert.equal(await info.evaluate((el) => document.activeElement === el), true);
    detailFailure = true;
    await info.click();
    await dialog.getByRole('alert').waitFor();
    detailFailure = false;
    await dialog.getByRole('button', { name: 'Thử lại' }).click();
    await dialog.getByText('Cotton; giặt nhẹ.', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await first.hover();
    assert.equal(await first.evaluate((el) => getComputedStyle(el).transform), 'none');
    assert.equal(
      await first
        .locator('.product-summary-image')
        .evaluate((el) => getComputedStyle(el).transform),
      'none',
    );
    const open = first.getByRole('button', { name: 'Xem chi tiết: Áo cotton FIDO', exact: true });
    await open.focus();
    assert.equal(
      await open.evaluate((el) => getComputedStyle(el, '::after').outlineStyle),
      'solid',
    );
    await page.keyboard.press('Enter');
    await page.waitForURL('**/products/1');
    await page.getByRole('heading', { name: 'Áo cotton FIDO', exact: true }).waitFor();

    const touch = await browser.newPage({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    touch.on('pageerror', (error) => errors.push(error.message));
    await touch.route('**/broken-summary.jpg', (route) => route.fulfill({ status: 404, body: '' }));
    await touch.route('**/api/v1/**', catalogRoute);
    await touch.goto('http://localhost:5188/products');
    const touchCard = touch.locator('.product-summary-card').first();
    await touchCard
      .getByRole('button', { name: 'Xem thuộc tính: Áo cotton FIDO', exact: true })
      .tap();
    const touchDialog = touch.getByRole('dialog', { name: 'Thuộc tính Áo cotton FIDO' });
    await touchDialog.getByText('Cotton; giặt nhẹ.', { exact: true }).waitFor();
    assert.ok(touch.url().endsWith('/products'));
    await touchDialog.getByRole('button', { name: 'Đóng thông tin sản phẩm' }).tap();
    await touchCard
      .getByRole('heading', { name: 'Áo cotton FIDO', exact: true })
      .scrollIntoViewIfNeeded();
    const titleBox = await touchCard.locator('.product-summary-title').boundingBox();
    await touch.touchscreen.tap(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
    await touch.waitForURL('**/products/1');
    await touch.getByRole('heading', { name: 'Áo cotton FIDO', exact: true }).waitFor();
    await touch.close();
    assert.deepEqual(errors, []);
    console.log(
      'Product summary browser: PASS — current ProductSummaryDto mapping, no per-card fetch, 8 viewports, ratio/alignment/overflow, missing/broken image, long name, brand/category metadata, SKU, hover/layout, keyboard/touch/dialog/retry/navigation and reduced motion.',
    );
  }
} finally {
  await browser.close();
  await server.close();
}
