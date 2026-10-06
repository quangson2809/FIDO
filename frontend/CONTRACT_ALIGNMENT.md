# Frontend contract-alignment baseline

Branch: `feature/frontend-contract-alignment`
Base: `main` @ `cdc04a7d3743dd1d9cc47c755acafd202fa33b32`

## Source of truth

For frontend integration work, use this order:

1. Actual backend Controller + request/response DTO + current state literals.
2. Explicit project-owner decisions that intentionally supersede an older documented baseline.
3. `docs/04-api-contract.md` and domain docs when the backend implementation is incomplete or a behavior is explicitly deferred.
4. Frontend types/services.
5. UI presentation.

Do not add fields, workflows, payment methods, shipping capabilities, loyalty behavior, showroom behavior, or state transitions because a screen/template expects them.

## Presentation preservation rule

Contract alignment must not flatten or remove the visual identity of the storefront. The `main` branch remains the reference for the established FIDO presentation language: background treatments, hero/banner composition, typography, spacing, card treatment, icons, fixed editorial imagery and other decorative layout elements should be preserved or restored when they do not claim unsupported business behavior.

Hard-coded presentation is allowed when it is purely visual or brand/editorial content, for example hero images, background artwork, decorative labels, layout copy, typography and non-functional visual accents.

Hard-coded values must be removed or replaced by backend data when they represent domain or operational truth, including product/category lists, prices, inventory, availability, order/payment states, report metrics, account/role data, voucher rules, shipping SLA/tracking, return windows, hotline/showroom data or other capabilities that are expected to come from the system contract.

The goal is therefore **keep the designed experience, replace fake business data** — not reduce screens to minimal API demonstrations.

## Current architecture

- HTTP is centralized at `src/services/http/apiClient.ts`; feature code does not own Axios configuration.
- HTTP failures are normalized at `src/services/http/apiError.ts`; screens may choose presentation text but do not parse Axios response shapes directly.
- Feature API modules own auth/profile, catalog, cart, checkout/orders, inventory, admin access, reports and content calls.
- API DTOs are feature-scoped under `src/features/*/types`.
- `src/types/index.ts` contains app navigation and presentation models, not duplicate backend contracts.
- `AppProvider` owns navigation, selected IDs, authenticated cart presentation state and toast state. It does not become a generic server-state store.
- Real API mode is the default. Mock mode must be explicitly requested where a remaining development mock is intentionally supported.
- Unsupported showroom, voucher-admin, membership/loyalty, tailoring and development screen-switcher flows are not invented to satisfy UI templates.

## Environment boundary

Frontend code must not be edited when moving between local development and deployment.

- `VITE_API_BASE_URL=http://localhost:8080/api/v1` is the local default.
- A deployed frontend can set `VITE_API_BASE_URL=https://api.example.com/api/v1`.
- A reverse proxy can instead expose the backend under the same origin and use `VITE_API_BASE_URL=/api/v1`.
- `VITE_IMAGE_BASE_URL` stays empty when the backend returns absolute CDN/ImgBB URLs. It is only configured for relative image paths served from a separate static host.
- Bearer token attachment and 401 invalidation remain inside the shared HTTP client.

## Contract matrix

| Slice | Frontend service | Backend/API contract | Alignment |
|---|---|---|---|
| Auth/Profile | `features/auth/api/*` | `/auth/register`, `/auth/login`, `/me`, `/me/addresses*` | Uses backend DTOs; phone is login identifier. |
| Catalog | `features/catalog/api/*` | public catalog + admin product/master-data + product image APIs | Uses ProductVariant IDs, server effective price/availability, `image_id` and `sort_order`; product metadata creation and image upload are separate backend operations. |
| Cart | `features/cart/api/service.ts` | `/cart`, `/cart/items*` | Authenticated backend cart only; no local guest-cart fallback. |
| Checkout | `features/orders/api/checkoutService.ts` | `/checkout/quote`, `/orders` | Quote/order totals and workflow state are server-authoritative. |
| Customer orders | `features/orders/api/service.ts` | `/me/orders`, `/me/orders/{id}`, recipient update | Uses locked backend status/payment values. |
| Admin orders | `features/orders/api/adminService.ts` | `/admin/orders*` | State-changing commands go through backend actions/payment-actions/after-sales. |
| Inventory | `features/inventory/api/adminService.ts` | supplier, goods receipt and inventory APIs | Backend is authoritative for stock and receipt state. |
| Admin access | `features/adminAccess/api/service.ts` | customers, staff, roles, permissions, access-control, audit logs | Read and command APIs use backend DTOs; frontend permission checks remain UX only. |
| Reports | `features/report/api/service.ts` | `/admin/reports/overview` | Displays backend `completed_sales`, `returned_adjustment`, `net_sales`, `orders_by_status`. |
| Content | `features/content/api/service.ts` | `/content-pages/{pageCode}`, `/admin/content-pages*` | No generic settings or showroom API is invented. |

The current service boundary maps the 80 endpoints in `FIDO_API_Postman_Test_Matrix_updated.xlsx`, including the three product-image endpoints added after the 77-endpoint baseline. A route being represented in a service does not imply every screen must expose every operation; UI exposure follows actual feature scope and permissions.

## Product image transaction boundary

Product metadata creation and provider-backed image upload are intentionally separate requests in the backend contract. The frontend therefore:

1. Creates the product as JSON.
2. Uploads selected image files to `/admin/products/{productId}/images`.
3. If upload fails after product creation, it preserves and surfaces the created product instead of pretending the whole operation rolled back.
4. Uses the dedicated image reorder/delete APIs for gallery maintenance.

This avoids a false client-side transaction across database and external image storage boundaries.

## Locked frontend business boundary

Project-owner decision on 2026-10-05: **a user must be logged in to use the persisted cart and place an order**. The frontend therefore requires an access token before cart/checkout/order flows. Older documentation that describes guest cart/checkout is pending backend/documentation alignment; frontend must not implement guest identity, guest cookies, anonymous accounts or local guest-cart persistence as a workaround.

Other locked boundaries:

- Payment baseline is COD; do not expose `CARD`/`VNPAY` as supported payment methods.
- Shipping is manual; there is no automatic carrier tracking API in baseline.
- Order statuses use the locked backend/domain state machine; legacy lowercase template states are not contract values.
- Voucher rule details remain server/deferred logic; frontend must not calculate voucher discounts independently.
- Product/variant availability and effective price are server/domain data; frontend may derive selection state but must not invent inventory or price.

## Migration rule

Refactor vertical slices. New code uses feature contract types and feature services. Unsupported template behavior must be removed rather than preserved through fake data or local business-rule fallbacks. Visual presentation from the established storefront should be retained unless it is inseparable from unsupported business claims. A phase only passes after typecheck/build, lint and structural/behavioral review succeed.
