import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { storefrontFixture, meta } from './helpers/storefrontFixture.mjs';

// HTTP fixtures exercise unusual trees and failures; live API evidence is captured separately.
const categories = [
  { category_id: 1, parent_category_id: null, name: 'Áo' },
  { category_id: 2, parent_category_id: null, name: 'Quần' },
  { category_id: 3, parent_category_id: null, name: 'Phụ kiện' },
  { category_id: 4, parent_category_id: 1, name: 'Áo sơ mi' },
  { category_id: 5, parent_category_id: 1, name: 'Áo thun' },
  { category_id: 6, parent_category_id: 2, name: 'Quần dài' },
  { category_id: 7, parent_category_id: 2, name: 'Quần short' },
  { category_id: 8, parent_category_id: 3, name: 'Thắt lưng' },
  { category_id: 9, parent_category_id: 3, name: 'Túi' },
  { category_id: 10, parent_category_id: 4, name: 'Áo công sở' },
];
const server = await createServer({ server: { port: 5191, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = [];
const evidence = '.browser-evidence';
await mkdir(evidence, { recursive: true });

async function check(name, test, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const fixture = storefrontFixture();
  const state = { categories, failure: false, delay: null, metadataReads: 0 };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', async route => {
    if (new URL(route.request().url()).pathname === '/api/v1/catalog/meta') {
      state.metadataReads++;
      if (state.delay) await state.delay;
      return route.fulfill(state.failure ? { status: 503, json: { message: 'java.sql.SQLException: private detail' } }
        : { json: { data: { ...meta, categories: state.categories } } });
    }
    return fixture.handler(route);
  });
  const go = path => page.goto(`http://localhost:5191${path}`);
  const panel = page.getByRole('navigation', { name: 'Danh mục phân cấp', exact: true });
  const link = page.getByRole('navigation', { name: 'Điều hướng chính', exact: true }).getByRole('link', { name: 'Sản phẩm', exact: true });
  const toggle = page.getByRole('button', { name: 'Danh mục sản phẩm', exact: true });
  const closed = async () => {
    await page.waitForFunction(() => document.querySelector('button[aria-controls="storefront-category-menu"]')?.getAttribute('aria-expanded') === 'false');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await panel.count(), 0, 'closed panel is absent from the accessibility tree');
    assert.equal(await page.locator('#storefront-category-menu').evaluate(element => element.inert), true);
  };
  try {
    await test({ page, state, go, panel, link, toggle, closed });
    assert.deepEqual(errors, [], 'no runtime errors');
    results.push(name);
    console.log(`PASS: ${name}`);
  } catch (error) {
    await page.screenshot({ path: `${evidence}/mega-failure.png`, fullPage: true });
    throw error;
  } finally { await context.close(); }
}

async function noOverflow(page) {
  const geometry = await page.locator('#storefront-category-menu').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: innerWidth, panelOverflow: element.scrollWidth - element.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - innerWidth };
  });
  assert.ok(geometry.left >= 0 && geometry.right <= geometry.width, JSON.stringify(geometry));
  assert.ok(geometry.panelOverflow <= 1 && geometry.documentOverflow <= 1, JSON.stringify(geometry));
  return geometry;
}

try {
  await check('Pointer crosses the Header boundary without flicker, layout shift or extra metadata requests', async ({ page, state, go, panel, link, toggle, closed }) => {
    await go('/');
    await page.getByText('Áo FIDO', { exact: true }).waitFor();
    await closed();
    const before = await page.locator('header').boundingBox();
    const mainBefore = await page.locator('main').boundingBox();
    const reads = state.metadataReads;
    await link.hover();
    await panel.getByRole('link', { name: 'Áo công sở', exact: true }).waitFor();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#storefront-category-menu')).transform === 'none');
    const trigger = await link.boundingBox();
    const bounds = await panel.boundingBox();
    assert.ok(bounds.width > 1200 && Math.abs(bounds.y - (before.y + before.height)) < 2, JSON.stringify({ before, bounds }));
    // Test actual intermediate coordinates, including the one-pixel Header/panel boundary.
    for (let y = trigger.y + trigger.height / 2; y <= bounds.y + 25; y += 2) {
      await page.mouse.move(trigger.x + trigger.width / 2, y);
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true', `menu remains open at y=${y}`);
    }
    await panel.getByRole('link', { name: 'Quần short', exact: true }).hover();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await page.waitForFunction(() => {
      const item = document.querySelector('#storefront-category-menu a[href="/categories/7"]');
      return item.matches(':hover') && getComputedStyle(item).backgroundColor !== 'rgba(0, 0, 0, 0)';
    });
    const feedback = await panel.getByRole('link', { name: 'Quần short', exact: true }).evaluate(element => ({ background: getComputedStyle(element).backgroundColor, hovered: element.matches(':hover'), color: getComputedStyle(element).color }));
    assert.notEqual(feedback.background, 'rgba(0, 0, 0, 0)', JSON.stringify(feedback));
    assert.deepEqual(await page.locator('header').boundingBox(), before);
    assert.deepEqual(await page.locator('main').boundingBox(), mainBefore);
    await noOverflow(page);
    await page.screenshot({ path: `${evidence}/mega-hover-1440.png` });
    await link.focus(); // A focused trigger must not keep a pointer menu stuck open.
    await page.mouse.move(10, bounds.y + bounds.height + 30);
    await closed();
    await link.hover();
    await page.getByRole('navigation', { name: 'Điều hướng chính', exact: true }).getByRole('link', { name: 'Giới thiệu', exact: true }).hover();
    await closed();
    for (let count = 0; count < 3; count++) { await link.hover(); await page.mouse.move(10, 800); await closed(); }
    assert.equal(state.metadataReads, reads, 'hover never refetches metadata or requests category details');
  });
  await check('Products, parent/child links and route/history changes navigate and close the menu', async ({ page, go, panel, link, closed }) => {
    await go('/about');
    await link.hover();
    await panel.getByRole('link', { name: 'Áo', exact: true }).click();
    await page.waitForURL('**/categories/1');
    await closed();
    await link.hover();
    await panel.getByRole('link', { name: 'Áo công sở', exact: true }).click();
    await page.waitForURL('**/categories/10');
    await closed();
    await page.goBack();
    await page.waitForURL('**/categories/1');
    await closed();
    await link.hover(); await link.click();
    await page.waitForURL('**/products'); await closed();
    await page.mouse.move(10, 800); await link.focus(); await page.keyboard.press('ArrowDown');
    await page.goBack(); await page.waitForURL('**/categories/1'); await closed();
    await page.goForward(); await page.waitForURL('**/products'); await closed();
    await link.focus(); await page.keyboard.press('ArrowDown');
    // Route changes outside the Header also invalidate the open disclosure.
    await page.locator('footer a[href="/about"]').first().click();
    await page.waitForURL('**/about'); await closed();
  });
  await check('Keyboard disclosure, Tab exit, Escape focus restoration and native Products navigation', async ({ page, go, panel, link, toggle, closed }) => {
    await go('/about'); await page.mouse.move(10, 800);
    await toggle.focus(); await page.keyboard.press('Enter');
    await panel.getByRole('link', { name: 'Áo công sở', exact: true }).waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await panel.getByRole('link', { name: 'Tất cả sản phẩm', exact: true }).evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await panel.getByRole('link', { name: 'Áo', exact: true }).evaluate(element => element === document.activeElement), true);
    assert.notEqual(await panel.getByRole('link', { name: 'Áo', exact: true }).evaluate(element => getComputedStyle(element).outlineStyle), 'none');
    await page.keyboard.press('Escape'); await closed();
    assert.equal(await toggle.evaluate(element => element === document.activeElement), true);
    await link.focus(); await page.keyboard.press('ArrowDown');
    await panel.getByRole('link', { name: 'Áo', exact: true }).waitFor();
    await page.keyboard.press('Escape'); await closed();
    assert.equal(await link.evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Space');
    await panel.getByRole('link', { name: 'Khám phá sản phẩm', exact: true }).focus();
    await page.keyboard.press('Tab'); await closed();
    assert.equal(await page.getByRole('navigation', { name: 'Điều hướng chính', exact: true }).getByRole('link', { name: 'Giới thiệu', exact: true }).evaluate(element => element === document.activeElement), true);
    await link.focus(); await page.keyboard.press('Enter');
    await page.waitForURL('**/products'); await closed();
  });
  for (const width of [375, 768, 1024, 1440]) {
    await check(`Responsive ${width}px: readable hierarchy, valid visuals and no horizontal overflow`, async ({ page, go, panel, link, toggle }) => {
      await go('/'); await page.getByText('Áo FIDO', { exact: true }).waitFor();
      if (width < 1024) await toggle.tap(); else await link.hover();
      await panel.getByRole('link', { name: 'Áo công sở', exact: true }).waitFor();
      await noOverflow(page);
      assert.equal(await panel.getByRole('link').count(), width < 1024 ? categories.length + 1 : categories.length + 3);
      assert.equal(await panel.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
      await page.waitForFunction(() => {
        const styles = getComputedStyle(document.querySelector('#storefront-category-menu'));
        return styles.opacity === '1' && styles.transform === 'none';
      });
      await page.screenshot({ path: `${evidence}/mega-open-${width}.png` });
    }, { viewport: { width, height: width < 1024 ? 900 : 1000 }, hasTouch: width < 1024, isMobile: width < 1024 });
  }
  for (const width of [375, 768]) {
    await check(`Touch ${width}px: category and primary menus are mutually exclusive and links remain usable`, async ({ page, go, panel, toggle, closed }) => {
      await go('/about'); await toggle.tap();
      await panel.getByRole('link', { name: 'Áo công sở', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Mở menu', exact: true }).tap();
      await closed();
      await page.getByRole('navigation', { name: 'Điều hướng mobile', exact: true }).waitFor();
      await toggle.tap();
      assert.equal(await page.getByRole('navigation', { name: 'Điều hướng mobile', exact: true }).count(), 0);
      await panel.getByRole('link', { name: 'Áo công sở', exact: true }).tap();
      await page.waitForURL('**/categories/10'); await closed();
      await toggle.tap(); await toggle.tap(); await closed();
    }, { viewport: { width, height: 900 }, hasTouch: true, isMobile: true });
  }
  await check('1024px tablet opens the desktop category layout with touch, without hover', async ({ go, panel, toggle, closed }) => {
    await go('/about'); await toggle.tap();
    await panel.getByRole('link', { name: 'Áo công sở', exact: true }).waitFor();
    await toggle.tap(); await closed();
  }, { viewport: { width: 1024, height: 900 }, hasTouch: true, isMobile: true });
  await check('Loading, sanitized error, metadata-only retry and empty states do not invent categories', async ({ page, state, go, panel, toggle }) => {
    let release;
    state.delay = new Promise(resolve => { release = resolve; });
    await go('/about'); await toggle.focus(); await page.keyboard.press('Enter');
    await panel.getByRole('status').waitFor();
    assert.equal(await panel.getByRole('link', { name: 'Áo', exact: true }).count(), 0);
    release(); state.delay = null;
    await panel.getByRole('link', { name: 'Áo', exact: true }).waitFor();
    state.failure = true;
    await go('/about'); await toggle.focus(); await page.keyboard.press('Enter');
    await panel.getByRole('alert').waitFor();
    assert.doesNotMatch(await panel.textContent(), /SQLException|private detail/);
    assert.equal(await panel.getByRole('link', { name: 'Áo', exact: true }).count(), 0);
    const reads = state.metadataReads;
    state.failure = false;
    await panel.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await panel.getByRole('link', { name: 'Áo', exact: true }).waitFor();
    assert.equal(state.metadataReads, reads + 1);
    state.categories = [];
    await go('/about'); await toggle.focus(); await page.keyboard.press('Enter');
    await panel.getByText('Chưa có danh mục.', { exact: true }).waitFor();
    assert.equal(await panel.getByRole('link', { name: 'Áo', exact: true }).count(), 0);
    assert.equal(await panel.getByRole('link', { name: 'Tất cả sản phẩm', exact: true }).count(), 1);
  });
  for (const width of [375, 1024]) {
    await check(`Deep/many/long API categories ${width}px: every level remains reachable within a scrolling panel`, async ({ page, state, go, panel, toggle }) => {
      state.categories = [
        ...Array.from({ length: 20 }, (_, index) => ({ category_id: index + 100, parent_category_id: index === 0 ? null : index + 99, name: `Cấp ${index + 1} — ${'Danh mục tên dài '.repeat(5)}` })),
        ...Array.from({ length: 25 }, (_, index) => ({ category_id: index + 200, parent_category_id: null, name: `Nhóm ${index + 1}` })),
      ];
      await go('/about'); await toggle.focus(); await page.keyboard.press('Enter');
      const deepest = panel.getByRole('link', { name: state.categories[19].name, exact: true });
      await deepest.waitFor();
      assert.equal(await panel.getByRole('link').count(), width < 1024 ? 46 : 48, 'no category is truncated out of the tree');
      const scroll = await panel.evaluate(element => ({ height: element.clientHeight, content: element.scrollHeight }));
      assert.ok(scroll.content > scroll.height, 'large trees scroll inside the panel');
      await noOverflow(page);
      await deepest.scrollIntoViewIfNeeded();
      assert.ok((await deepest.boundingBox()).width > 100, 'indentation does not collapse deeply nested text');
      assert.equal(await deepest.getAttribute('href'), '/categories/119');
      await deepest.click();
      await page.waitForURL('**/categories/119');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    }, { viewport: { width, height: 900 } });
  }
  await check('Reduced motion removes transitions; opening and closing immediately allow/block interaction', async ({ page, go, panel, link, toggle, closed }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await go('/about'); await toggle.focus(); await page.keyboard.press('Enter');
    await panel.getByRole('link', { name: 'Áo', exact: true }).waitFor();
    const styles = await panel.evaluate(element => ({ duration: getComputedStyle(element).transitionDuration, transform: getComputedStyle(element).transform, pointer: getComputedStyle(element).pointerEvents }));
    assert.ok(parseFloat(styles.duration) <= 0.00002, 'existing global reduced-motion rule makes animation effectively instantaneous');
    assert.equal(styles.transform, 'none');
    assert.equal(styles.pointer, 'auto');
    await page.keyboard.press('Escape'); await closed();
    assert.equal(await page.locator('#storefront-category-menu').evaluate(element => getComputedStyle(element).pointerEvents), 'none');
    await link.hover();
    await panel.getByRole('link', { name: 'Tất cả sản phẩm', exact: true }).click();
    await page.waitForURL('**/products'); await closed();
  });
  await check('Normal opening accepts a pointer click during the fade/slide transition', async ({ page, go, toggle, closed }) => {
    await go('/about'); await page.mouse.move(10, 800);
    await toggle.focus(); await page.keyboard.press('Enter');
    const state = await page.locator('#storefront-category-menu').evaluate(element => ({
      pointer: getComputedStyle(element).pointerEvents, duration: getComputedStyle(element).transitionDuration, inert: element.inert,
    }));
    assert.equal(state.pointer, 'auto'); assert.equal(state.inert, false);
    assert.equal(state.duration, '0.18s, 0.18s, 0s');
    // Raw pointer input avoids Playwright's wait for a transition-stable target.
    await page.mouse.click(85, 150);
    await page.waitForURL('**/products'); await closed();
  });
  await writeFile(`${evidence}/mega-test-results.json`, JSON.stringify({ status: 'PASS', cases: results, source: 'controlled HTTP fixtures; separate live API evidence required' }, null, 2));
  console.log(`Header mega menu browser: PASS (${results.length} cases)`);
} finally { await browser.close(); await server.close(); }
