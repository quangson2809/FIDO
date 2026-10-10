import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
import { storefrontFixture, product } from './helpers/storefrontFixture.mjs';
const server = await createServer({ server: { port: 5184, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const fixture = storefrontFixture();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text()); });
await page.addInitScript(() => sessionStorage.setItem('fido.accessToken', 'fixture'));
await page.route('**/api/v1/**', fixture.handler);
const go = path => page.goto('http://localhost:5184'+path);
const cartTrigger = page.getByRole('button', { name: /^Giỏ hàng \(/ });
const cartDialog = page.getByRole('dialog', { name: 'Giỏ hàng của bạn' });
const quoteButton = page.getByRole('button', { name: /Kiểm tra & báo giá|Cập nhật báo giá/ });
const orderButton = page.getByRole('button', { name: /^Đặt hàng COD/ });
const quoteCount = () => fixture.state.requests.filter(request => request.path === '/checkout/quote').length;
try {
  await mkdir('.browser-evidence', { recursive: true });
  await go('/products/1');
  await cartTrigger.click();
  await cartDialog.getByRole('button', { name: 'Giảm số lượng' }).waitFor();
  assert.equal(await cartDialog.getByRole('button', { name: 'Giảm số lượng' }).isDisabled(), true);
  await cartDialog.getByRole('button', { name: 'Tăng số lượng' }).click();
  await page.getByText('Đã cập nhật giỏ hàng.', { exact: true }).waitFor();
  assert.equal(fixture.state.quantity, 2);
  for (let i=0;i<15;i++) { await page.keyboard.press('Tab'); assert.equal(await cartDialog.evaluate(el => el.contains(document.activeElement)), true, 'cart focus contained'); }
  await page.keyboard.press('Escape');
  await cartDialog.waitFor({ state: 'detached' });
  assert.equal(await cartTrigger.evaluate(el => document.activeElement === el), true);
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  await cartTrigger.click();
  await cartDialog.getByRole('button', { name: 'Xóa sản phẩm', exact: true }).click();
  await cartDialog.getByRole('button', { name: 'Giữ sản phẩm' }).click();
  assert.equal(fixture.state.quantity, 2);
  // Both mutation and reconciliation fail: the last confirmed cart must remain visible.
  fixture.state.failures.set('/cart/items/1', 500); fixture.state.failures.set('/cart', 500);
  await cartDialog.getByRole('button', { name: 'Tăng số lượng' }).click();
  await cartDialog.getByRole('alert').waitFor();
  assert.match(await cartDialog.innerText(), /Chưa thể xác nhận thay đổi/);
  assert.match(await cartDialog.innerText(), /480|440\.000/);
  assert.equal(await cartDialog.getByRole('button', { name: 'Tiếp tục đặt hàng' }).isDisabled(), true);
  fixture.state.failures.clear();
  await cartDialog.getByRole('button', { name: 'Thử lại' }).click();
  await cartDialog.getByRole('alert').waitFor({ state: 'detached' });
  await cartDialog.getByRole('button', { name: 'Xóa sản phẩm', exact: true }).click();
  await cartDialog.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await cartDialog.getByText('Giỏ hàng đang trống', { exact: true }).waitFor();
  assert.equal(fixture.state.quantity, 0);
  await page.keyboard.press('Tab');
  assert.equal(await cartDialog.evaluate(el => el.contains(document.activeElement)), true, 'focus stays in drawer after deletion');
  await page.keyboard.press('Escape');
  fixture.state.quantity = 1;
  await go('/checkout');
  await page.getByLabel('Chọn địa chỉ nhận hàng').waitFor();
  assert.equal(await page.getByLabel('Chọn địa chỉ nhận hàng').inputValue(), 'new');
  assert.equal(await page.getByLabel('Địa chỉ nhận hàng *').inputValue(), '', 'never select first saved address implicitly');
  const quotesBefore = quoteCount();
  await page.getByLabel('Số điện thoại người nhận *').fill('bad');
  await quoteButton.click();
  assert.equal(await page.getByLabel('Số điện thoại người nhận *').getAttribute('aria-invalid'), 'true');
  assert.equal(quoteCount(), quotesBefore);
  await page.getByLabel('Số điện thoại người nhận *').fill('0900000000');
  await page.getByLabel('Email người nhận').fill('bad');
  await quoteButton.click();
  assert.equal(await page.getByLabel('Email người nhận').getAttribute('aria-invalid'), 'true');
  await page.getByLabel('Email người nhận').fill('user@example.test');
  await page.getByLabel('Địa chỉ nhận hàng *').fill('Địa chỉ mới giữ lại');
  await page.getByLabel('Chọn địa chỉ nhận hàng').selectOption('2');
  await page.getByLabel('Mã voucher').fill('INVALID');
  await quoteButton.click();
  await page.getByRole('alert').filter({ hasText: 'Mã ưu đãi không hợp lệ' }).waitFor();
  assert.equal(fixture.state.orders, 0);
  assert.equal(await page.getByLabel('Mã voucher').inputValue(), 'INVALID');
  await page.getByLabel('Mã voucher').fill('VALID');
  await quoteButton.click(); await orderButton.waitFor();
  const request = fixture.state.requests.filter(request => request.path === '/checkout/quote').at(-1);
  assert.equal(request.body.recipient_address, 'Nghệ An');
  await page.getByText('Đã áp dụng VALID: giảm 20.000₫', { exact: true }).waitFor();
  await page.getByLabel('Chọn địa chỉ nhận hàng').selectOption('new');
  assert.equal(await page.getByLabel('Địa chỉ nhận hàng *').inputValue(), 'Địa chỉ mới giữ lại');
  assert.equal(await orderButton.count(), 0, 'address invalidates quote');
  fixture.state.expiresAt = new Date(Date.now()+1500).toISOString();
  await quoteButton.click(); await orderButton.waitFor();
  await orderButton.click();
  const confirmation = page.getByRole('dialog', { name: 'Xác nhận đặt hàng', exact: true });
  await confirmation.getByRole('button', { name: 'Xác nhận đặt hàng COD' }).waitFor();
  await confirmation.getByRole('alert').filter({ hasText: 'Báo giá đã hết hạn.' }).waitFor();
  assert.equal(await confirmation.getByRole('button', { name: 'Xác nhận đặt hàng COD' }).isDisabled(), true);
  assert.equal(fixture.state.orders, 0);
  await confirmation.getByRole('button', { name: 'Quay lại chỉnh sửa' }).click();
  fixture.state.expiresAt = undefined;
  await quoteButton.click(); await orderButton.waitFor();
  assert.equal(fixture.state.requests.filter(request => /addresses/.test(request.path) && request.method !== 'GET').length, 0, 'checkout never persists a new address');
  // Customer status/payment/date presentation uses real fields, not fabricated transition dates.
  const labels = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang chuẩn bị', SHIPPING: 'Đang giao', COMPLETED: 'Hoàn tất', DELIVERY_FAILED: 'Giao thất bại', CANCELLED: 'Đã hủy', RETURNED: 'Đã trả hàng' };
  for (const [status, label] of Object.entries(labels)) {
    fixture.state.orderStatus = status;
    await go('/orders/1');
    await page.getByRole('heading', { name: 'FIDO-001', exact: true }).waitFor();
    assert.match(await page.locator('#storefront-main').innerText(), new RegExp(label));
    const edits = await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).count();
    assert.equal(edits > 0, ['PENDING','CONFIRMED','PREPARING'].includes(status));
    assert.ok(!(await page.locator('#storefront-main').innerText()).includes('UNPAID'));
    assert.ok(!(await page.locator('#storefront-main').innerText()).includes('2026-10-10T03:00:00Z'));
  }
  for (const [status, label] of [['PAID','Đã thanh toán'],['REFUNDED','Đã hoàn tiền']]) {
    fixture.state.paymentStatus = status; await go('/orders'); await page.getByText(label, { exact: true }).waitFor();
  }
  fixture.state.paymentStatus = 'UNPAID'; fixture.state.orderStatus = 'PENDING';
  fixture.state.emptyOrders = true; await go('/orders');
  await page.getByText('Không có đơn hàng', { exact: true }).waitFor();
  await page.getByRole('button', { name:'Khám phá sản phẩm', exact:true }).click(); await page.waitForURL('**/products');
  fixture.state.emptyOrders = false;
  // Recovery branches: read retries must never perform a mutation or display internal errors.
  for (const [path, failedEndpoint, ready] of [
    ['/products/1','/catalog/products/1','Áo FIDO'], ['/orders','/me/orders','Đơn hàng của tôi'], ['/orders/1','/me/orders/1','FIDO-001'], ['/checkout/success/1','/me/orders/1','Đơn hàng đã được ghi nhận'],
  ]) {
    fixture.state.failures.set(failedEndpoint,500); await go(path); await page.getByRole('button',{ name: 'Thử lại', exact: true }).waitFor();
    assert.ok(!(await page.locator('body').innerText()).includes('SQLException'));
    fixture.state.failures.clear(); await page.getByRole('button',{ name: 'Thử lại', exact: true }).click(); await page.getByRole('heading',{ name:ready, exact:true }).waitFor();
  }
  // Profile error is introduced after the existing session check, so retry tests the screen itself.
  await go('/orders'); await page.getByRole('heading', { name:'Đơn hàng của tôi' }).waitFor();
  fixture.state.failures.set('/me',500); await page.getByRole('button', { name:'Tài khoản', exact:true }).click();
  await page.getByRole('button', { name:'Thử lại', exact:true }).waitFor(); fixture.state.failures.clear();
  await page.getByRole('button', { name:'Thử lại', exact:true }).click(); await page.getByRole('heading', { name:'Hồ sơ của tôi' }).waitFor();
  fixture.state.failures.set('/catalog/products',500); await go('/');
  await page.getByRole('button', { name:'Thử lại', exact:true }).first().waitFor(); fixture.state.failures.clear();
  await page.getByRole('button', { name:'Thử lại', exact:true }).first().click(); await page.getByText('Áo FIDO', { exact:true }).waitFor();
  fixture.state.failures.set('/content-pages/return-policy',500); await go('/policies');
  await page.getByRole('button', { name:'Thử lại', exact:true }).waitFor();
  await page.getByRole('heading', { name:'Chính sách giao hàng', exact:true }).waitFor();
  fixture.state.failures.clear(); await page.getByRole('button', { name:'Thử lại', exact:true }).click(); await page.getByRole('heading', { name:'Chính sách trả hàng', exact:true }).waitFor();
  await page.route('**/api/v1/catalog/products/1', route => route.abort('failed'));
  await go('/products/1'); await page.getByRole('button', { name:'Thử lại', exact:true }).waitFor();
  await page.unroute('**/api/v1/catalog/products/1');
  await page.getByRole('button', { name:'Thử lại', exact:true }).click(); await page.getByRole('heading', { name:'Áo FIDO', exact:true }).waitFor();
  // Gallery order, keyboard enlargement, and broken media.
  product.images = [{image_id:2,image_url:'/images/about/palette.svg',alt_text:'Ảnh thứ hai',sort_order:2},{image_id:1,image_url:'/images/about/wardrobe.svg',alt_text:'Ảnh thứ nhất',sort_order:1}];
  await go('/products/1'); await page.getByRole('button', { name:'Phóng to ảnh' }).waitFor();
  assert.equal(await page.getByRole('img', { name:'Ảnh thứ nhất', exact:true }).last().getAttribute('src'), '/images/about/wardrobe.svg');
  await page.getByRole('button', { name:'Xem ảnh 2', exact:true }).click();
  assert.equal(await page.getByRole('button', { name:'Xem ảnh 2', exact:true }).getAttribute('aria-pressed'),'true');
  await page.getByRole('button', { name:'Phóng to ảnh' }).click(); await page.getByRole('dialog', { name:'Ảnh sản phẩm' }).waitFor(); await page.keyboard.press('Escape');
  product.images = [{image_id:1,image_url:'/broken-fixture.png',alt_text:'Ảnh lỗi',sort_order:1}];
  await page.route('**/broken-fixture.png', route => route.fulfill({status:404,body:''}));
  await go('/products/1'); await page.getByRole('img',{name:'Ảnh lỗi: ảnh chưa khả dụng'}).waitFor();
  product.images = [{image_id:1,image_url:'/images/about/wardrobe.svg',alt_text:'Ảnh thứ nhất',sort_order:1},{image_id:2,image_url:'/images/about/palette.svg',alt_text:'Ảnh thứ hai',sort_order:2}];
  await go('/products/1');
  const selectedSize = page.getByRole('button', { name:'M', exact:true });
  await selectedSize.waitFor();
  const contrast = await selectedSize.evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = value => value.match(/[\d.]+/g).slice(0,3).map(Number).map(channel => channel/255).map(channel => channel<=0.04045 ? channel/12.92 : ((channel+0.055)/1.055)**2.4).reduce((sum,channel,index) => sum+channel*[0.2126,0.7152,0.0722][index],0);
    const foreground = luminance(style.color), background = luminance(style.backgroundColor);
    return (Math.max(foreground,background)+0.05)/(Math.min(foreground,background)+0.05);
  });
  assert.ok(contrast>=4.5, `selected purchase control contrast ${contrast}`);
  await selectedSize.focus(); await page.keyboard.press('Tab');
  const focusOutline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.equal(focusOutline, 'solid', 'keyboard focus is visible');
  const touchTargets = await page.locator('button').evaluateAll(elements => elements.filter(element => getComputedStyle(element).display !== 'none' && element.getClientRects().length).map(element => ({name:element.getAttribute('aria-label') || element.textContent, width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})).filter(target => target.width<43.5 || target.height<43.5));
  assert.deepEqual(touchTargets,[], 'visible buttons have 44px touch targets');
  // Responsive review on every customer page and drawer, including reduced motion.
  for (const width of [375,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    for (const [path, name] of [['/','home'],['/products','catalog'],['/products/1','product'],['/checkout','checkout'],['/orders','orders'],['/orders/1','order'],['/checkout/success/1','success'],['/account','profile'],['/about','about'],['/policies','policies']]) {
      await go(path); await page.locator('main h1').first().waitFor();
      if (['home','catalog'].includes(name)) await page.getByText('Áo FIDO', { exact:true }).waitFor();
      if (name === 'checkout') await page.getByLabel('Chọn địa chỉ nhận hàng').waitFor();
      if (name === 'orders') await page.getByText('FIDO-001', { exact:true }).waitFor();
      if (name === 'policies') await page.getByRole('heading', { name:'Chính sách trả hàng', exact:true }).waitFor();
      await page.screenshot({ animations: 'disabled',path:`.browser-evidence/after-${name}-${width}.png`,fullPage:true});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),true,`${name} overflow ${width}`);
    }
    await cartTrigger.click(); await cartDialog.waitFor();
    await page.screenshot({ animations: 'disabled',path:`.browser-evidence/after-cart-${width}.png`});
    assert.equal(await cartDialog.evaluate(el => el.scrollWidth<=el.clientWidth),true);
    await page.keyboard.press('Escape');
  }
  await page.emulateMedia({reducedMotion:'reduce'}); await go('/');
  assert.equal(await page.locator('main > div').first().evaluate(el => parseFloat(getComputedStyle(el).animationDuration)<=0.001),true);
  // Protected checkout redirects to login and resumes the requested checkout after login.
  const guest = await browser.newPage(); await guest.route('**/api/v1/**',fixture.handler);
  await guest.goto('http://localhost:5184/checkout'); await guest.waitForURL('**/login');
  await guest.getByLabel('Số điện thoại *',{exact:true}).fill('0900000000'); await guest.getByLabel('Mật khẩu *').fill('fixture-password');
  fixture.state.failures.set('/auth/login',401);
  await guest.getByRole('button',{name:'Đăng nhập',exact:true}).last().click();
  await guest.getByRole('alert').filter({hasText:'Số điện thoại hoặc mật khẩu chưa đúng'}).waitFor();
  assert.equal(await guest.getByLabel('Số điện thoại *',{exact:true}).inputValue(),'0900000000');
  assert.equal(await guest.evaluate(() => sessionStorage.getItem('fido.accessToken')),null);
  fixture.state.failures.clear();
  await guest.getByRole('button',{name:'Đăng nhập',exact:true}).last().click(); await guest.waitForURL('**/checkout'); await guest.getByLabel('Chọn địa chỉ nhận hàng').waitFor(); await guest.close();
  // One continuous purchase journey through real route transitions, with fixture-backed HTTP.
  fixture.state.quantity = 0;
  const ordersBeforeJourney = fixture.state.orders;
  await go('/products?category_id=1');
  await page.getByRole('button', { name:/Áo FIDO/ }).click(); await page.waitForURL('**/products/1');
  await page.getByRole('button', { name:'Thêm vào giỏ hàng', exact:true }).click();
  await cartDialog.getByRole('button', { name:'Tiếp tục đặt hàng', exact:true }).click(); await page.waitForURL('**/checkout');
  const addRequest = fixture.state.requests.filter(request => request.path === '/cart/items' && request.method === 'POST').at(-1);
  assert.equal(addRequest.body.variant_id, 1); assert.equal(addRequest.body.quantity, 1);
  await page.getByLabel('Chọn địa chỉ nhận hàng').selectOption('2');
  await quoteButton.click(); await orderButton.click();
  await confirmation.getByRole('button', { name:'Xác nhận đặt hàng COD', exact:true }).click(); await page.waitForURL('**/checkout/success/1');
  await page.getByRole('heading', { name:'Đơn hàng đã được ghi nhận', exact:true }).waitFor();
  assert.equal(fixture.state.orders, ordersBeforeJourney+1); assert.equal(fixture.state.quantity, 0);
  assert.equal(await cartTrigger.getAttribute('aria-label'), 'Giỏ hàng (0 sản phẩm)');
  await page.locator('#storefront-main').getByRole('button', { name:'Đơn hàng của tôi', exact:true }).click(); await page.waitForURL('**/orders');
  await page.getByRole('button', { name:'Chi tiết', exact:true }).click(); await page.waitForURL('**/orders/1');
  await page.getByRole('heading', { name:'FIDO-001', exact:true }).waitFor();
  // Backend commits an order but the response is lost: preserve the quote for its idempotent retry.
  fixture.state.quantity = 1; fixture.state.loseOrderResponse = true;
  const ordersBeforeLostResponse = fixture.state.orders;
  await go('/checkout'); await page.getByLabel('Chọn địa chỉ nhận hàng').selectOption('2');
  await quoteButton.click(); await orderButton.click();
  await confirmation.getByRole('button', { name:'Xác nhận đặt hàng COD', exact:true }).click();
  await page.getByRole('alert').filter({ hasText:'Chưa nhận được xác nhận đặt hàng' }).waitFor();
  await page.getByRole('button', { name:'Kiểm tra đơn hàng của tôi', exact:true }).waitFor();
  assert.equal(fixture.state.orders,ordersBeforeLostResponse+1);
  assert.ok(page.url().endsWith('/checkout'), 'no success navigation without an order response');
  assert.equal(await cartTrigger.getAttribute('aria-label'),'Giỏ hàng (1 sản phẩm)', 'do not clear cart when response is uncertain');
  await orderButton.click(); await confirmation.getByRole('button', { name:'Xác nhận đặt hàng COD', exact:true }).click();
  await page.waitForURL('**/checkout/success/1');
  assert.equal(fixture.state.orders,ordersBeforeLostResponse+1,'retry reuses the backend order');
  const attempts = fixture.state.requests.filter(request => request.path === '/orders' && request.method === 'POST').slice(-2);
  assert.equal(attempts[0].body.quote_id,attempts[1].body.quote_id);
  assert.equal(await cartTrigger.getAttribute('aria-label'),'Giỏ hàng (0 sản phẩm)');
  // Startup /me read failures retain credentials but never expose protected content before verification.
  for (const path of ['/checkout','/account','/orders']) {
    const sessionPage = await browser.newPage();
    await sessionPage.addInitScript(() => sessionStorage.setItem('fido.accessToken','fixture'));
    await sessionPage.route('**/api/v1/**',fixture.handler);
    fixture.state.failures.set('/me',500);
    await sessionPage.goto('http://localhost:5184'+path);
    await sessionPage.getByRole('button',{name:'Thử lại',exact:true}).waitFor();
    assert.ok(sessionPage.url().endsWith(path));
    assert.equal(await sessionPage.evaluate(() => sessionStorage.getItem('fido.accessToken')),'fixture');
    assert.equal(await sessionPage.locator('main h1').count(),0,'guard remains closed');
    fixture.state.failures.clear();
    await sessionPage.getByRole('button',{name:'Thử lại',exact:true}).click();
    await sessionPage.locator('main h1').waitFor(); await sessionPage.close();
  }
  for (const status of [401,403]) {
    const rejectedSession = await browser.newPage();
    await rejectedSession.addInitScript(() => sessionStorage.setItem('fido.accessToken','fixture'));
    await rejectedSession.route('**/api/v1/**',fixture.handler);
    fixture.state.failures.set('/me',status); await rejectedSession.goto('http://localhost:5184/checkout');
    await rejectedSession.waitForURL('**/login');
    assert.equal(await rejectedSession.evaluate(() => sessionStorage.getItem('fido.accessToken')),null);
    fixture.state.failures.clear(); await rejectedSession.close();
  }
  const adminGuard = await browser.newPage();
  await adminGuard.addInitScript(() => sessionStorage.setItem('fido.accessToken','fixture'));
  await adminGuard.route('**/api/v1/**',fixture.handler);
  fixture.state.failures.set('/me',500); await adminGuard.goto('http://localhost:5184/admin/dashboard');
  await adminGuard.getByRole('button',{name:'Thử lại',exact:true}).waitFor();
  fixture.state.failures.clear(); await adminGuard.getByRole('button',{name:'Thử lại',exact:true}).click();
  await adminGuard.waitForURL('**/account');
  await adminGuard.getByRole('heading',{name:'Hồ sơ của tôi',exact:true}).waitFor(); await adminGuard.close();
  const staleSession = await browser.newPage();
  await staleSession.addInitScript(() => sessionStorage.setItem('fido.accessToken','fixture'));
  await staleSession.route('**/api/v1/**',fixture.handler);
  let releaseMe;
  const delayedMe = new Promise(resolve => { releaseMe = resolve; });
  await staleSession.route('**/api/v1/me', async route => { await delayedMe; return fixture.handler(route); });
  fixture.state.failures.set('/cart',401); await staleSession.goto('http://localhost:5184/checkout');
  await staleSession.waitForURL('**/login'); fixture.state.failures.clear(); releaseMe();
  await staleSession.waitForResponse(response => new URL(response.url()).pathname.endsWith('/me'));
  await staleSession.locator('header').getByRole('button',{name:'Đăng nhập',exact:true}).waitFor();
  assert.ok(staleSession.url().endsWith('/login'));
  assert.equal(await staleSession.evaluate(() => sessionStorage.getItem('fido.accessToken')),null);
  await staleSession.close();
  assert.deepEqual(errors,[]);
  console.log('Storefront browser: PASS — cart keyboard/quantity/delete/failure recovery, saved/new addresses, validation/voucher/expiry, all order/payment statuses, empty/retry/network recovery, gallery/fallback, login and fail-closed session retry, continuous purchase/lost response journey, 10 pages × 4 viewports, touch/contrast/reduced motion, no unexpected console errors.');
} finally { await browser.close(); await server.close(); }
