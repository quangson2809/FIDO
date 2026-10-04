# 19 — Phase 9 Order image snapshot — 2026-10-04

## Scope

Order item images are historical data. This phase connects the existing `order_items.image_url_snapshot` persistence column to Order creation and Order detail reads.

## Locked behavior

- Order creation snapshots the Product cover that is current for the Variant at creation time.
- The snapshot source is the recalculated checkout Cart view: `ProductVariant -> Product -> ProductImage(sort_order = 0)`.
- `OrderItem.imageUrlSnapshot` is nullable. A Product with no cover at Order creation stores `null`.
- Customer and admin Order detail expose the stored snapshot through `OrderItemDto.image_url`.
- Order detail must not query the current Product gallery to reconstruct historical images.
- Reordering, replacing or removing Product images after Order creation must not change an existing OrderItem image.
- Existing historical OrderItems with `image_url_snapshot = null` remain null; do not backfill them from the current catalog because that would fabricate history.

## Regression invariant

```text
create Order while cover = A
-> order_items.image_url_snapshot = A
-> admin changes current cover to B
-> admin removes A from Product gallery
-> customer/admin GET Order detail
-> OrderItem.image_url = A
```

## Architecture boundary

- `product` owns current Product/Image presentation state.
- `cart` exposes the current cover in the recalculated checkout view.
- `order` owns the historical snapshot from the moment Order creation persists the OrderItem.
- Historical Order reads depend only on Order-owned persistence and do not call Product read services.
- No new schema migration is required because Flyway V4 already introduced `order_items.image_url_snapshot`.

## Order list

The current `OrderSummaryDto` contract remains summary-only and does not contain Order items. The current frontend API type also models it as summary-only. This phase therefore does not invent a new list-preview shape. If the server-backed list is later required to render item previews, that API refinement must define whether the summary returns all item previews or a bounded representative preview before changing the public contract.
