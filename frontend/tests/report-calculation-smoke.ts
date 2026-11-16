import assert from 'node:assert/strict';
import { parseOverview, parseSales, parseProducts, parseOrders } from '../src/features/report/api/parseReport';
import { precedingReportRange, orderDrilldown, readReportFilters } from '../src/features/report/model/reportFilters';
import { reportStatuses } from '../src/features/report/types';
const range = { from: '2026-01-01', to: '2026-01-31' };
const counts = Object.fromEntries(reportStatuses.map(status => [status, 0]));
const totals = { completed_sales: 355, returned_adjustment: 235, net_sales: 120 };
assert.equal(parseOverview({ ...range, ...totals, orders_by_status: counts }).net_sales, 120);
for (const bad of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
  assert.throws(() => parseOverview({ ...range, ...totals, completed_sales: bad, orders_by_status: counts }));
}
assert.throws(() => parseOverview({ ...range, ...totals, net_sales: 121, orders_by_status: counts }));
const trend = { ...range, granularity: 'DAY', timezone: 'Asia/Ho_Chi_Minh' };
assert.equal(parseSales({ ...trend, points: [{ period_start: range.from, ...totals }] }).points[0].net_sales, 120);
assert.throws(() => parseSales({ ...trend, points: [{ period_start: range.from, ...totals, net_sales: 0 }] }));
const product = { product_id: 1, product_name: 'SKU-NAMELESS', thumbnail: null, completed_units: 5, returned_units: 2, net_units: 3 };
assert.equal(parseProducts({ ...range, items: [product] }).items[0].product_name, 'SKU-NAMELESS');
assert.throws(() => parseProducts({ ...range, items: [{ ...product, net_units: 4 }] }));
assert.equal(parseOrders({ ...trend, points: [{ period_start: range.from, total_orders: 0, orders_by_status: counts }] }).points[0].total_orders, 0);
assert.throws(() => parseOrders({ ...trend, points: [{ period_start: range.from, total_orders: 1, orders_by_status: counts }] }));
assert.equal(readReportFilters(new URLSearchParams('from=2026-02-30')).valid, false);
assert.deepEqual(precedingReportRange({ from: '2026-03-01', to: '2026-03-03', granularity: 'DAY' }), { from: '2026-02-26', to: '2026-02-28', granularity: 'DAY' });
const drill = new URL(orderDrilldown({ from: '2026-10-01', to: '2026-10-10', granularity: 'WEEK' }, 'PENDING', '2026-09-28'), 'http://test');
assert.equal(drill.searchParams.get('created_from'), '2026-09-30T17:00:00Z');
assert.equal(drill.searchParams.get('created_to'), '2026-10-04T16:59:59.999999Z');
console.log('Report calculation/contract checks: PASS');
