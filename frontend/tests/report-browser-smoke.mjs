// Actual app UI with HTTP fixtures; not live Backend E2E certification.
// Requires Vite and an external Playwright installation (see environment paths).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE_PATH || "playwright"
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const vite = process.env.BROWSER_BASE_URL
  ? null
  : await (
      await import("vite")
    ).createServer({ server: { host: "127.0.0.1", port: 5173 } });
await vite?.listen();
const base = process.env.BROWSER_BASE_URL || "http://127.0.0.1:5173";
const statuses = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPING",
  "COMPLETED",
  "DELIVERY_FAILED",
  "CANCELLED",
  "RETURNED",
];
const counts = Object.fromEntries(
  statuses.map((s) => [s, s === "PENDING" ? 2 : 0]),
);
await mkdir(".browser-evidence", { recursive: true });
async function fixture(
  permissions = ["REPORT_READ", "ORDER_READ", "CATALOG_READ"],
  role = "ADMIN",
) {
  const context = await browser.newContext();
  await context.addInitScript(() =>
    sessionStorage.setItem("fido.accessToken", "browser-test-token"),
  );
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  const options = { error: false, empty: false, slow: false };
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const send = (data) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data }),
      });
    if (path === "/api/v1/me")
      return send({
        account: {
          account_id: 1,
          phone: "0900000000",
          email: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        roles: [{ role_id: 1, code: role, name: role, description: null }],
        permissions: permissions.map((code, i) => ({
          permission_id: i + 1,
          code,
          name: code,
        })),
        addresses: [],
      });
    if (path === "/api/v1/cart")
      return send({
        cart_id: 1,
        account_id: 1,
        items: [],
        subtotal: 0,
        created_at: null,
        updated_at: null,
      });
    if (path.includes("/reports/")) {
      requests.push(path + url.search);
      if (options.error)
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"error":"Test report failure"}',
        });
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (options.slow && from === "2026-09-01")
        await new Promise((r) => setTimeout(r, 600));
      const common = {
        from,
        to,
        granularity: url.searchParams.get("granularity") || "DAY",
        timezone: "Asia/Ho_Chi_Minh",
      };
      const money = options.empty ? 0 : from === "2026-09-01" ? 990000 : 123000;
      const statusCounts = options.empty
        ? Object.fromEntries(statuses.map((s) => [s, 0]))
        : counts;
      if (path.endsWith("/overview"))
        return send({
          from,
          to,
          completed_sales: money,
          returned_adjustment: 0,
          net_sales: money,
          orders_by_status: statusCounts,
        });
      if (path.endsWith("/sales-trend"))
        return send({
          ...common,
          points: [
            {
              period_start: from,
              completed_sales: money,
              returned_adjustment: 0,
              net_sales: money,
            },
          ],
        });
      if (path.endsWith("/orders-trend"))
        return send({
          ...common,
          points: [
            {
              period_start: from,
              total_orders: options.empty ? 0 : 2,
              orders_by_status: statusCounts,
            },
          ],
        });
      return send({
        from,
        to,
        items: options.empty
          ? []
          : [
              {
                product_id: 5,
                product_name:
                  "Sản phẩm kiểm thử với tên dài để kiểm tra bố cục trên màn hình nhỏ",
                thumbnail: null,
                completed_units: 8,
                returned_units: 1,
                net_units: 7,
              },
            ],
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [],
        meta: { page: 1, page_size: 20, total: 0, total_pages: 0 },
      }),
    });
  });
  return { context, page, requests, errors, options };
}
const path =
  "/admin/reports?tab=sales&from=2026-10-01&to=2026-10-10&granularity=DAY";
try {
  const app = await fixture();
  const { page } = app;
  await page.goto(base + path);
  await page.getByText("Doanh số theo kỳ hoàn tất", { exact: true }).waitFor();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      `sales overflow ${width}`,
    );
    await page.screenshot({
      path: `.browser-evidence/reports-sales-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByLabel("Chu kỳ", { exact: true }).selectOption("WEEK");
  assert.equal(new URL(page.url()).searchParams.get("granularity"), "WEEK");
  await page.reload();
  await page.getByText("Doanh số theo kỳ hoàn tất", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Chu kỳ", { exact: true }).inputValue(),
    "WEEK",
  );
  await page
    .getByLabel("Loại báo cáo")
    .getByRole("button", { name: "Đơn hàng", exact: true })
    .click();
  await page
    .getByText("Phân bố trạng thái hiện tại", { exact: true })
    .waitFor();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      `orders overflow ${width}`,
    );
    await page.screenshot({
      path: `.browser-evidence/reports-orders-${width}.png`,
      fullPage: true,
    });
  }
  await page.locator('a[href*="status=PENDING"]').first().click();
  const orderUrl = new URL(page.url());
  assert.equal(orderUrl.pathname, "/admin/orders");
  assert.equal(
    orderUrl.searchParams.get("created_from"),
    "2026-09-30T17:00:00Z",
  );
  assert.equal(
    orderUrl.searchParams.get("created_to"),
    "2026-10-10T16:59:59.999999Z",
  );
  await page.goBack();
  await page
    .getByLabel("Loại báo cáo")
    .getByRole("button", { name: "Sản phẩm", exact: true })
    .click();
  await page.getByText("Top sản phẩm bán thuần", { exact: true }).waitFor();
  assert.equal(await page.locator('a[href="/admin/products/5"]').count(), 1);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      `products overflow ${width}`,
    );
    await page.screenshot({
      path: `.browser-evidence/reports-products-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByLabel("Loại báo cáo")
    .getByRole("button", { name: "Doanh số", exact: true })
    .click();
  await page.getByLabel("Từ ngày", { exact: true }).fill("2026-10-02");
  await page.getByLabel("Đến ngày", { exact: true }).fill("2026-10-08");
  await page.getByRole("button", { name: "Áp dụng khoảng tùy chỉnh" }).click();
  assert.equal(new URL(page.url()).searchParams.get("from"), "2026-10-02");
  await page.locator('svg rect[tabindex="0"]').first().focus();
  await page.keyboard.press("Tab");
  await page.getByText("Bảng doanh số chính xác", { exact: true }).click();
  assert.equal(await page.locator(".report-table").isVisible(), true);
  app.options.error = true;
  await page.getByRole("button", { name: "7 ngày", exact: true }).click();
  await page
    .getByText("Không thể hoàn thành yêu cầu.", { exact: true })
    .waitFor();
  app.options.error = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await page.getByText("Doanh số theo kỳ hoàn tất", { exact: true }).waitFor();
  app.options.empty = true;
  await page.getByRole("button", { name: "30 ngày", exact: true }).click();
  await page
    .getByText("Chưa có doanh số trong khoảng này.", { exact: false })
    .waitFor();
  app.options.empty = false;
  app.options.slow = true;
  await page.goto(
    base +
      "/admin/reports?tab=sales&from=2026-09-01&to=2026-09-10&granularity=DAY",
  );
  await page.getByLabel("Đang tải báo cáo", { exact: true }).waitFor();
  await page.getByRole("button", { name: "7 ngày", exact: true }).click();
  await page.getByText("Doanh số theo kỳ hoàn tất", { exact: true }).waitFor();
  await page.waitForTimeout(800);
  assert.equal(
    await page.getByText("990.000₫", { exact: true }).count(),
    0,
    "stale response",
  );
  assert.deepEqual(app.errors, []);
  await page.goto(base + "/admin/dashboard");
  await page.getByText("Top 5 sản phẩm", { exact: true }).waitFor();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      `dashboard overflow ${width}`,
    );
    await page.screenshot({
      path: `.browser-evidence/dashboard-${width}.png`,
      fullPage: true,
    });
  }
  await app.context.close();
  const readOnly = await fixture(["REPORT_READ"]);
  await readOnly.page.goto(base + path.replace("tab=sales", "tab=products"));
  await readOnly.page
    .getByText("Top sản phẩm bán thuần", { exact: true })
    .waitFor();
  assert.equal(
    await readOnly.page.locator('a[href="/admin/products/5"]').count(),
    0,
  );
  await readOnly.page
    .getByLabel("Loại báo cáo")
    .getByRole("button", { name: "Đơn hàng", exact: true })
    .click();
  await readOnly.page
    .getByText("Phân bố trạng thái hiện tại", { exact: true })
    .waitFor();
  assert.equal(
    await readOnly.page.locator('a[href*="/admin/orders"]').count(),
    0,
  );
  await readOnly.context.close();
  const denied = await fixture(["ORDER_READ"]);
  await denied.page.goto(base + "/admin/dashboard");
  await denied.page
    .getByRole("heading", { name: "Tổng quan hệ thống" })
    .waitFor();
  await denied.page.waitForTimeout(200);
  assert.deepEqual(denied.requests, []);
  assert.equal(
    await denied.page.getByText("Doanh số thuần", { exact: true }).count(),
    0,
  );
  await denied.page.goto(base + path);
  await denied.page
    .getByRole("heading", { name: "Không có quyền truy cập" })
    .waitFor();
  assert.deepEqual(denied.requests, []);
  await denied.context.close();
  const customer = await fixture(["REPORT_READ"], "CUSTOMER");
  await customer.page.goto(base + path);
  await customer.page.waitForURL("**/account");
  assert.deepEqual(customer.requests, []);
  await customer.context.close();
  console.log(
    "Report browser smoke: PASS (HTTP fixtures; viewports, deep link, filters, tabs, keyboard, drilldown, retry, empty, RBAC, stale responses)",
  );
} finally {
  await browser.close();
  await vite?.close();
}
