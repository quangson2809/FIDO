# Frontend contract-alignment baseline

Branch: `feature/frontend-contract-alignment`
Base: `main` @ `cdc04a7d3743dd1d9cc47c755acafd202fa33b32`

## Source of truth

For frontend integration work, use this order:

1. Actual backend Controller + request/response DTO + current state literals.
2. `docs/04-api-contract.md` and domain docs when the backend implementation is incomplete or a behavior is explicitly deferred.
3. Frontend types/services.
4. UI presentation.

Do not add fields, workflows, payment methods, shipping capabilities, loyalty behavior, showroom behavior, or state transitions because a screen/template expects them.

## Current architecture inventory

- HTTP boundary exists at `src/services/http/apiClient.ts`.
- Feature API modules exist for auth, catalog, cart, orders and content.
- API contract types are partly feature-scoped under `src/features/*/types`.
- Legacy UI/domain models remain in `src/types/index.ts` and contain fields/states not supported by FIDO.
- `AppProvider` mixes navigation, cart, voucher, order, wishlist and profile state and contains local fallbacks that can bypass backend behavior.
- Several feature services still switch to hard-coded mock implementations through `VITE_API_MODE`; the code default is currently `mock` while `.env.example` says `real`.
- Large screens still contain static business content and local business rules. `HomeScreen`, `AdminScreen`, `CheckoutScreen`, `ProfileScreen` and several admin views require domain-by-domain cleanup.

## Contract matrix — implemented frontend feature APIs

| Slice | Frontend service | Backend/API contract | Initial finding |
|---|---|---|---|
| Auth | `features/auth/api/service.ts` | `/auth/register`, `/auth/login`, `/me` | DTO shape broadly matches; mock path is not an integration source of truth. |
| Catalog | `features/catalog/api/service.ts` | `/catalog/products`, `/catalog/products/{id}`, `/catalog/meta` | Real API exists; legacy view model injects unsupported rating/review/hex/category-parent assumptions. |
| Cart | `features/cart/api/service.ts` | `/cart`, `/cart/items*` | Real API exists; `AppProvider` can create local cart items when variants are absent, bypassing server contract. |
| Customer orders | `features/orders/api/service.ts` | `/me/orders`, `/me/orders/{id}` | Real read API exists; legacy global `Order` model contains unsupported states/payment methods/tracking fields. |
| Content | `features/content/api/service.ts` | baseline content is `/content-pages/{pageCode}` | Current `/showrooms` service is not in the 77-endpoint baseline and must not be treated as a supported API. |

## Confirmed FIDO boundaries relevant to cleanup

- Payment baseline is COD; do not expose `CARD`/`VNPAY` as supported payment methods.
- Shipping is manual; there is no automatic carrier tracking API in baseline.
- Order statuses use the locked backend/domain state machine; lowercase legacy template states are not contract values.
- Guest identity/security remains TBD. Do not invent guest tokens/cookies to make cart/order calls work.
- Voucher rule details remain deferred; frontend must not implement discount rules independently.
- Product/variant availability and effective price are server/domain data; frontend may derive presentation selection but must not invent inventory or price.

## Migration rule

Refactor vertical slices. A phase is allowed to keep a legacy type temporarily only when all consumers in that slice cannot yet be migrated safely. New code must use feature contract types and feature services. Remove legacy/mock/out-of-domain code only after its consumers are migrated and verification passes.
