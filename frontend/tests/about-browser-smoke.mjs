// Actual public Vite app; API requests on destination pages are blocked.
// External Playwright/Chromium tooling; no production dependency added.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE_PATH || 'playwright'
);
const server = await createServer({
  server: { host: '127.0.0.1', port: 5173 },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-gpu'],
});
await mkdir('.browser-evidence', { recursive: true });
try {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const apis = [],
      errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/v1/**', (route) => {
      apis.push(route.request().url());
      return route.abort();
    });
    await page.goto('http://127.0.0.1:5173/about');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page
      .locator('.about-hero-art img')
      .evaluate((image) => image.decode());
    assert.equal(new URL(page.url()).pathname, '/about');
    assert.equal(apis.length, 0, 'No About content/auth/cart API');
    assert.equal(await page.getByRole('heading', { level: 2 }).count(), 5);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}`,
    );
    if (width < 1280) {
      await page.getByRole('button', { name: 'Mở menu', exact: true }).focus();
      await page.keyboard.press('Enter');
      const mobile = page.getByRole('navigation', {
        name: 'Điều hướng mobile',
      });
      assert.equal(
        await mobile
          .getByRole('link', { name: 'Giới thiệu' })
          .getAttribute('aria-current'),
        'page',
      );
      await mobile.getByRole('link', { name: 'Giới thiệu' }).focus();
      await page.keyboard.press('Escape');
      assert.ok(
        await page
          .getByRole('button', { name: 'Mở menu', exact: true })
          .evaluate((el) => el === document.activeElement),
      );
      await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      await mobile.getByRole('link', { name: 'Giới thiệu' }).click();
      assert.equal(await mobile.count(), 0);
    } else
      assert.equal(
        await page
          .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
          .getByRole('link', { name: 'Giới thiệu' })
          .getAttribute('aria-current'),
        'page',
      );
    for (const image of await page.locator('.fido-about img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((el) => el.decode());
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `.browser-evidence/about-${width}.png`,
      fullPage: true,
    });
    await page.reload();
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.equal(apis.length, 0);
    for (const name of ['Khám phá sản phẩm', 'Mua sắm ngay']) {
      await page.getByRole('link', { name, exact: false }).click();
      await page.waitForURL('**/products');
      await page.goBack();
      await page.getByRole('heading', { level: 1 }).waitFor();
    }
    await page.getByRole('link', { name: 'Xem chính sách' }).click();
    await page.waitForURL('**/policies');
    await page.getByRole('link', { name: 'Về FIDO', exact: true }).click();
    await page.waitForURL('**/about');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `About ${width}px public/refresh/navigation/keyboard/CTAs/footer/no overflow/API PASS`,
    );
  }
  const page = await browser.newPage();
  await page.route('**/images/about/wardrobe.svg', (route) => route.abort());
  await page.goto('http://127.0.0.1:5173/about');
  await page.locator('.about-art-fallback').waitFor();
  assert.equal(
    await page.locator('.about-art-fallback').getAttribute('role'),
    'img',
  );
  console.log('Illustration failure fallback PASS');
} finally {
  await browser.close();
  await server.close();
}
