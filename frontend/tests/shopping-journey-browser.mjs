import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { meta, product, storefrontFixture } from './helpers/storefrontFixture.mjs';

const evidence = '.browser-evidence/shopping-journey';
const phase = process.env.JOURNEY_BASELINE
  ? 'before'
  : process.env.JOURNEY_BATCH
    ? `after-${process.env.JOURNEY_BATCH.toLowerCase()}`
    : 'after';
const categories = [
  ...meta.categories,
  { category_id: 3, parent_category_id: 1, name: 'Áo công sở' },
  { category_id: 4, parent_category_id: 3, name: 'Áo sơ mi' },
];
const detail = {
  ...product,
  category: categories[3],
  images: [
    { image_id: 1, image_url: '/images/about/wardrobe.svg', alt_text: 'Ảnh một', sort_order: 0 },
    { image_id: 2, image_url: '/images/about/details.svg', alt_text: 'Ảnh hai', sort_order: 1 },
  ],
};
const server = await createServer({ server: { port: 5197, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  let captureCount = 0;
  const homeMeasurements = [];
  await mkdir(evidence, { recursive: true });
  const widths = process.env.JOURNEY_BASELINE
    ? [375, 768, 1440]
    : [320, 375, 390, 430, 768, 1024, 1280, 1440];
  for (const width of widths) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
    const fixture = storefrontFixture();
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/catalog/meta'))
        return route.fulfill({ json: { data: { ...meta, categories } } });
      if (path.endsWith('/catalog/products/1')) return route.fulfill({ json: { data: detail } });
      return fixture.handler(route);
    });
    const capture = async (name) => {
      if (!process.env.JOURNEY_BASELINE)
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
          `${name} overflow ${width}`,
        );
      const overlay = ['menu', 'filters', 'zoom', 'cart', 'confirmation'].includes(name);
      await page.screenshot({
        path: `${evidence}/${phase}-${name}-${width}.png`,
        animations: 'disabled',
        fullPage: !overlay,
      });
      captureCount++;
    };
    await page.goto('http://localhost:5197/');
    await page.getByRole('heading', { name: 'DANH MỤC SẢN PHẨM', exact: true }).waitFor();
    if (!process.env.JOURNEY_BASELINE && !process.env.JOURNEY_BATCH) {
      const homeLayout = await page.evaluate(() => {
        const top = (selector) =>
          document.querySelector(selector).getBoundingClientRect().top + scrollY;
        return {
          categories: top('#danh-muc'),
          products: top('#san-pham-noi-bat'),
          benefits: top('section[aria-label="Điểm nổi bật khi mua sắm tại FIDO"]'),
        };
      });
      assert.ok(
        homeLayout.categories < 900,
        `category discovery within first screen and a short scroll: ${width} ${JSON.stringify(homeLayout)}`,
      );
      assert.ok(
        homeLayout.products < homeLayout.benefits,
        'real products precede descriptive benefit cards',
      );
      assert.equal(
        await page.getByRole('heading', { name: 'SẢN PHẨM NỔI BẬT', exact: true }).count(),
        0,
        'no unsupported product ranking',
      );
      homeMeasurements.push({ width, ...homeLayout });
    }
    await capture('home');
    await page.getByRole('button', { name: 'Danh mục sản phẩm', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Danh mục phân cấp', exact: true })
      .getByRole('link', { name: 'Áo sơ mi', exact: true })
      .waitFor();
    await capture('menu');
    await page.goto('http://localhost:5197/products');
    await page.getByText('25 sản phẩm', { exact: true }).waitFor();
    await capture('catalog');
    await page
      .locator('.product-summary-card')
      .first()
      .screenshot({ path: `${evidence}/${phase}-card-${width}.png`, animations: 'disabled' });
    captureCount++;
    if (width < 1024) {
      await page.getByRole('button', { name: /^Bộ lọc/ }).click();
      await page.getByRole('dialog', { name: 'Bộ lọc sản phẩm' }).waitFor();
      await capture('filters');
      await page.keyboard.press('Escape');
    } else await capture('filters');
    await page.goto('http://localhost:5197/categories/3');
    await page.getByRole('heading', { name: 'Áo công sở', exact: true }).waitFor();
    await page
      .getByRole('region', { name: 'Kết quả sản phẩm' })
      .getByRole('button', { name: /^Xem chi tiết/ })
      .waitFor();
    await capture('category');
    await page.goto('http://localhost:5197/products/1');
    await page.getByRole('heading', { name: product.name, exact: true }).waitFor();
    await capture('product');
    if (!process.env.JOURNEY_BASELINE) {
      assert.equal(
        await page
          .getByRole('navigation', { name: 'Đường dẫn sản phẩm', exact: true })
          .getByRole('link', { name: 'Áo sơ mi', exact: true })
          .getAttribute('href'),
        '/categories/4',
      );
      assert.equal(
        await page
          .getByRole('img', { name: 'Ảnh một', exact: true })
          .last()
          .evaluate((el) => getComputedStyle(el).objectFit),
        'contain',
        'main gallery retains whole photo',
      );
      const zoomTrigger = page.getByRole('button', { name: 'Phóng to ảnh', exact: true });
      await zoomTrigger.click();
      const zoom = page.getByRole('dialog', { name: 'Ảnh sản phẩm', exact: true });
      await zoom.getByRole('img', { name: 'Ảnh một', exact: true }).waitFor();
      await zoom.getByRole('button', { name: 'Ảnh tiếp theo', exact: true }).click();
      await zoom.getByRole('img', { name: 'Ảnh hai', exact: true }).waitFor();
      await zoom.getByRole('button', { name: 'Đóng ảnh', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      await zoom.getByRole('img', { name: 'Ảnh một', exact: true }).waitFor();
      await page.keyboard.press('ArrowLeft');
      await zoom.getByRole('img', { name: 'Ảnh hai', exact: true }).waitFor();
      await capture('zoom');
      await page.keyboard.press('Escape');
      assert.equal(
        await zoomTrigger.evaluate((el) => document.activeElement === el),
        true,
        'zoom returns focus',
      );
      await page.getByRole('button', { name: 'Xem ảnh 1', exact: true }).click();
      assert.equal(
        await page
          .getByRole('button', { name: 'Xem ảnh 1', exact: true })
          .getAttribute('aria-pressed'),
        'true',
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
        `product overflow ${width}`,
      );
    }
    await page.getByRole('button', { name: /^Giỏ hàng \(/ }).click();
    await page
      .getByRole('dialog', { name: 'Giỏ hàng của bạn' })
      .getByRole('button', { name: 'Tăng số lượng' })
      .waitFor();
    await capture('cart');
    await page.keyboard.press('Escape');
    await page.goto('http://localhost:5197/checkout');
    await page.getByLabel('Địa chỉ nhận hàng *').fill('Nghệ An');
    await page.getByRole('button', { name: 'Kiểm tra & báo giá', exact: true }).click();
    await page.getByRole('button', { name: /^Đặt hàng COD/ }).waitFor();
    await capture('checkout');
    await page.getByRole('button', { name: /^Đặt hàng COD/ }).click();
    await page.getByRole('dialog', { name: 'Xác nhận đặt hàng', exact: true }).waitFor();
    await capture('confirmation');
    await page.close();
  }
  if (!process.env.JOURNEY_BASELINE && process.env.JOURNEY_BATCH !== 'B') {
    const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
    await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
    const fixture = storefrontFixture();
    await page.route('**/api/v1/**', fixture.handler);
    await page.clock.install();
    fixture.state.expiresAt = new Date(Date.now() + 30000).toISOString();
    fixture.state.loseOrderResponse = true;
    await page.goto('http://localhost:5197/checkout');
    await page.getByLabel('Địa chỉ nhận hàng *').fill('Địa chỉ cần giữ nguyên');
    await page.getByLabel('Mã voucher', { exact: true }).fill('VALID');
    await page.getByRole('button', { name: 'Kiểm tra & báo giá', exact: true }).click();
    await page.getByRole('button', { name: /^Đặt hàng COD/ }).click();
    const confirmation = page.getByRole('dialog', { name: 'Xác nhận đặt hàng', exact: true });
    const confirm = () =>
      confirmation.getByRole('button', {
        name: /^(Xác nhận đặt hàng COD|Xác minh đơn COD đã gửi)$/,
      });
    const confirmBounds = await confirm().boundingBox();
    assert.ok(
      confirmBounds.y >= 0 && confirmBounds.y + confirmBounds.height <= 640,
      'confirmation action reachable at 320 × 640',
    );
    await confirm().click();
    await page.getByRole('button', { name: 'Kiểm tra đơn hàng của tôi', exact: true }).waitFor();
    assert.equal(fixture.state.orders, 1);
    assert.equal(
      await page.getByLabel('Địa chỉ nhận hàng *').inputValue(),
      'Địa chỉ cần giữ nguyên',
    );
    for (const label of [
      'Số điện thoại người nhận *',
      'Email người nhận',
      'Địa chỉ nhận hàng *',
      'Mã voucher',
    ]) {
      assert.equal(
        await page.getByLabel(label).isDisabled(),
        true,
        'uncertain submission preserves recipient/voucher snapshot',
      );
    }
    const quoteButton = page.getByRole('button', { name: 'Cập nhật báo giá', exact: true });
    const beforeQuotes = fixture.state.requests.filter(
      (request) => request.path === '/checkout/quote',
    ).length;
    assert.equal(await quoteButton.isDisabled(), true);
    await quoteButton.evaluate((el) => el.click());
    assert.equal(
      fixture.state.requests.filter((request) => request.path === '/checkout/quote').length,
      beforeQuotes,
    );
    await page.clock.fastForward(60000);
    await page.getByRole('button', { name: 'Xác minh lại đơn đã gửi', exact: true }).click();
    assert.equal(
      await confirm().isEnabled(),
      true,
      'consumed quote may be replayed even after expiry, per Backend contract',
    );
    await page.screenshot({
      path: `${evidence}/${phase}-uncertain-replay-320.png`,
      animations: 'disabled',
    });
    captureCount++;
    await confirm().evaluate((el) => {
      el.click();
      el.click();
    });
    await page.waitForURL('**/checkout/success/1');
    const attempts = fixture.state.requests.filter(
      (request) => request.path === '/orders' && request.method === 'POST',
    );
    assert.equal(attempts.length, 2, 'two user attempts, double click causes no third request');
    assert.deepEqual(
      attempts[1].body,
      attempts[0].body,
      'replay uses exactly the original request and quote ID',
    );
    assert.equal(fixture.state.orders, 1, 'Backend replay fixture creates only one order');
    await page.close();
  }
  await writeFile(
    `${evidence}/${phase}-results.json`,
    JSON.stringify(
      {
        status: 'PASS',
        widths,
        screenshots: captureCount,
        homeMeasurements,
        source: 'Controlled HTTP contract fixtures, Chromium. No live Backend proof.',
      },
      null,
      2,
    ),
  );
  console.log(
    `Shopping journey ${phase}: PASS — ${captureCount} screenshots, ${widths.length} widths (controlled HTTP fixtures)`,
  );
} finally {
  await browser.close();
  await server.close();
}
