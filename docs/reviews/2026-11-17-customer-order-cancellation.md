# Customer cancellation of pending orders — verification

Base: `b3cc16bb8b1dd4be54460278106a710c4f8fec07`, branch `demo1`.

**Task / approved behavior:** Authenticated owners may cancel their own PENDING Orders. This implements the owner's accepted proposal and supersedes the earlier customer-cancellation exclusion in API/P1.7. Later states remain operator-managed.

**API / modules:** Order owns `POST /api/v1/me/orders/{orderId}/cancel`, bodyless, returning `{data: OrderCustomerDetailDto}`. Add customer `allowed_actions` (`["CANCEL"]` or `[]`). Inventory and promotion contracts stay owned by their modules. No schema/migration or dependency change.

**Implementation:** A customer-scoped pessimistic Order query locks and verifies ownership together. Customer eligibility requires PENDING Order, clean UNPAID Payment with matching amount, PENDING Shipping and no deduction/reversal. State is rechecked under the same Order lock used by administrator confirmation. Missing/foreign IDs return 404; repeats/ineligible state return 409 without side effects.

OrderActionService retains separate customer/admin authorization entry points, sharing handler execution and audit. CancelOrderHandler changes Order/Shipping status, releases Voucher usage once, and never changes inventory for PENDING. Audit failure rolls all changes back. Existing admin lifecycle/permissions remain covered by regressions.

**Frontend:** Customer detail displays server-provided status/actions; cancellation requires a confirmation dialog. Busy UI plus an immediate in-flight guard stop duplicate submission. A 409 reloads current state. Late responses after switching Orders are ignored. Returning to history triggers a fresh list read. Native dialog supports Escape/focus return and stays open while busy; layout was checked at 375/1280px.

## Local checks before push

| Check | Result |
| --- | --- |
| Java production/test compile + Java format check | PASS, Java 17 / Gradle 9.3.1 |
| Focused backend tests on isolated MySQL 8.4.7 | PASS: 64 tests, 11 classes, zero failures/errors/skips |
| New customer cancellation cases within that total | PASS: 17 cases |
| Frontend lint + typecheck/production build | PASS |
| API integration, architecture and render smoke | PASS |
| Customer cancellation browser regression | PASS: 7 checks, mobile and desktop |
| Canonical SQL/ERD/dictionary consistency and workflow YAML | PASS |
| Diff whitespace and structural review | PASS |

Backend coverage: ownership/authentication, no admin privilege widening, all non-PENDING states, invalid payment/shipping facts, an inconsistent existing deduction, repeated/concurrent cancellation, cancellation racing confirmation, audit rollback, one-time Voucher release, unchanged money/history, stock quantity and exact ledger counts. Shared admin action/state/query regression classes are included; no full suite is run.

Browser coverage: confirmation dismissal, focus return, two immediate clicks, disabled/busy controls, successful detail/history refresh, action-driven visibility, 409 refresh, safe server errors with explicit retry, missing Order, stale response after route change and centered responsive dialog.

## CI scope

`[customer-cancel-focus]` selects the same 11 backend classes and `test:order-cancel-browser`, using existing focused-check conventions. CI keeps compile/format, frontend lint/build, API/architecture/render checks and canonical baseline verification. Unrelated selection/report/browser suites are not invoked for this candidate. Default suites remain for other commits.

**Architecture / quality review:** Controller derives actor only from JWT and delegates; Service owns transaction/authorization/rules; repositories contain only persistence; no foreign repository access or Entity API response. No new tables/states/generic framework.

**Remaining blockers:** None for the approved PENDING-only scope. Remote CI is observed on the published commit separately from these local results. No deployed/shared database is modified.
