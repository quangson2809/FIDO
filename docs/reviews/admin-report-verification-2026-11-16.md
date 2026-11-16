# Admin calculations and reporting review

Reviewed branch: refactor/backend-pattern-safe-v2, baseline 33bf548.

## Contract and fixes

- Four report GET endpoints use REPORT_READ/SUPERADMIN. ReportService is read-only/repeatable-read. Sales use order totals including shipping, only delivered orders with consistent collected/refunded payment facts; returns restate their original completion period. Status counts instead use creation date and current status. Zero-filled DAY/WEEK/MONTH buckets and ranking tie-breaks remain unchanged.
- Product.name is optional. The ranking SQL previously returned null, while FE requires a display string, breaking the entire product report/dashboard. Use the same Product SKU as the display fallback. Add a repository regression with a nameless child Product.
- FE previously accepted fractional, negative and unsafe integer money, and trusted inconsistent net totals. Reject those responses with recoverable report errors rather than displaying rounded or contradictory metrics. Retain the existing numeric API; supporting exact figures above JavaScript's safe integer range would require an explicit wire-format/BigInt change.
- Correct the product-report description: each independently sellable Product/SKU has its own units; the current approved contract does not group a family into one row.
- Development-stack verification exposed an incompatible shipping-fee example: `30000.00` cannot bind to the required whole-VND `Long`. Correct the supplied `.env.example` to `30000`; the monetary amount and policy stay unchanged. Docker Compose boot/health checks verify the example in the real runtime. Existing local environments copied from the old example should update this value too.
- Keep current price/catalog edits separate from historical order quantity/money. No new metrics, database fields, permissions, routes or accounting policy introduced.

## Targeted verification

The opt-in [admin-report-focus] commit/PR-title marker selects only report API/repository tests, pricing arithmetic and voucher-discount unit tests on backend; FE runs report contract/calculation tests plus the existing report browser scenarios. Build/lint and Java format checks still run. All unmarked runs retain their existing full-regression behavior. This matches this task's explicit request to avoid the entire test suite.

The report API tests cover payment/refund cohort rules, start/end microseconds in Vietnam time, access/revocation, all statuses, invalid input, and DAY/WEEK/MONTH reconciliation. Repository tests cover historical units despite catalog changes, independent parent/child records, deterministic ranking/limit, name fallback and actual MySQL EXPLAIN queries. Browser uses controlled HTTP fixtures, not proof against a deployed production database.

## Proposed additions (not implemented)

| Priority | Feature | Existing data and decision needed |
| --- | --- | --- |
| P1 | AOV and comparable-period growth | Delivered/collected order cohort and existing totals; show unavailable for zero baseline and distinguish zero from missing data. Define whether AOV includes shipping to match the current total definition. |
| P1 | Cancellation, delivery-failure and return ratios | Existing Order states and creation/completion cohorts. Label current-state snapshots; true transition rates over time need durable event history. |
| P1 | Stock-cover and slow-moving SKU alerts | Current warehouse stock and recent net units. Define lookback and thresholds; exclude zero-demand division and new-product bias. |
| P2 | Repeat-customer/cohort and RFM analysis | Account-owned orders, completed net amounts and dates. Agree on cohorts, anonymization and access to customer-level output. |
| P2 | Voucher effectiveness | Existing voucher snapshots and Order outcomes. Descriptive usage/discount/net sales are feasible; causal uplift and per-customer attribution are not proven by current schema. |
| P2 | Family/category contribution | Agree whether grouping follows current catalog relationships or historical classification. Current Product-level reports must remain available. |
| Deferred | Historical gross margin and funnel conversion | Current cost price is not historical COGS; page/cart events are not stored. Require approved cost snapshots/event instrumentation before reporting these as accurate. |
