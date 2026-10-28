import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { storefrontFixture } from './helpers/storefrontFixture.mjs';
import { mkdir } from 'node:fs/promises';
const server = await createServer({ server: { port: 5183, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const fixture = storefrontFixture();
  await page.route('**/api/v1/**', fixture.handler);
  await mkdir('.browser-evidence', { recursive: true });
  await page.goto('http://localhost:5183/products');
  const open = page.getByRole('button', { name: /^Bộ lọc/ });
  await page.getByRole('heading', { name: 'Khám phá sản phẩm' }).waitFor();
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Bộ lọc sản phẩm' });
  await dialog.getByLabel('Danh mục', { exact: true }).selectOption('1');
  await dialog.getByRole('button', { name: 'Đặt lại', exact: true }).click();
  assert.equal(
    await dialog.getByLabel('Danh mục', { exact: true }).inputValue(),
    '',
    'reset works before applying the first filter',
  );
  await dialog.getByLabel('Danh mục', { exact: true }).selectOption('1');
  await dialog.getByLabel('Thương hiệu').selectOption('1');
  await dialog.getByLabel('Giá từ').fill('100');
  await dialog.getByLabel('Giá đến').fill('300000');
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
  }
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await open.evaluate((el) => el === document.activeElement), true);
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  await open.click();
  assert.equal(await dialog.getByLabel('Danh mục', { exact: true }).inputValue(), '1');
  await page.screenshot({
    animations: 'disabled',
    path: '.browser-evidence/after-filters-375.png',
  });
  await dialog.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await page.waitForURL(
    '**/products?category_id=1&brand_id=1&min_price=100&max_price=300000',
  );
  await page.getByText('25 sản phẩm', { exact: true }).waitFor();
  // Route update and the mobile badge render asynchronously; assert the same contract after it settles.
  await page.getByRole('button', { name: /Bộ lọc [(]4[)]/ }).waitFor();
  assert.match(await open.innerText(), /4/);
  await page.reload();
  await page.getByText('25 sản phẩm', { exact: true }).waitFor();
  await open.click();
  assert.equal(await dialog.getByLabel('Danh mục', { exact: true }).inputValue(), '1');
  assert.equal(await dialog.getByLabel('Thương hiệu', { exact: true }).inputValue(), '1');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Xóa Giá đến/ }).click();
  await page.waitForURL((url) => !url.searchParams.has('max_price'));
  await page.goBack();
  await page.waitForURL((url) => url.searchParams.get('max_price') === '300000');
  await page.goForward();
  await page.waitForURL((url) => !url.searchParams.has('max_price'));
  await page.getByRole('button', { name: 'Xóa tất cả', exact: true }).click();
  await page.waitForURL('**/products');
  await page.getByRole('button', { name: 'Trang sau' }).click();
  await page.waitForURL('**/products?page=2');
  await page.reload();
  await page.getByText('25 sản phẩm', { exact: true }).waitFor();
  assert.match(await page.getByRole('region', { name: 'Kết quả sản phẩm' }).innerText(), /2 \/ 3/);
  assert.equal(
    await page.locator('.catalog-browse form[role="search"]').count(),
    0,
    'all-products page has no duplicate search form',
  );
  await page.getByLabel('Từ khóa tìm kiếm toàn cửa hàng').fill('missing');
  await page.getByLabel('Từ khóa tìm kiếm toàn cửa hàng').press('Enter');
  await page.getByRole('button', { name: 'Xóa tất cả bộ lọc' }).click();
  await page.waitForURL('**/products');
  await page.goto(
    'http://localhost:5183/products?category_id=-2&page=NaN&color_id=999&min_price=bad&gender=bad',
  );
  await page.waitForURL('**/products');
  fixture.state.failures.set('/catalog/products', 500);
  await page.reload();
  await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('SQLException'));
  fixture.state.failures.clear();
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await page.getByText('25 sản phẩm', { exact: true }).waitFor();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      animations: 'disabled',
      path: `.browser-evidence/after-catalog-${width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `no overflow ${width}`,
    );
    if (width >= 1024) {
      await page.getByLabel('Danh mục', { exact: true }).selectOption('2');
      await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
      await page.getByText('0 sản phẩm', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Xóa tất cả bộ lọc' }).click();
      await page.getByText('25 sản phẩm', { exact: true }).waitFor();
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    'Catalog browser: PASS — supported category/brand/price filters, apply/reset/draft, focus/Escape, URL/refresh/history/pagination, unsupported URL parameter cleanup, retry, 375/768/1024/1440.',
  );
} finally {
  await browser.close();
  await server.close();
}
