# 19 — Phase 9 Order image snapshot — 2026-10-04

## Scope

Order item images are historical data. This phase connects the existing `order_items.image_url_snapshot` persistence column to Order creation, Order detail reads, and the representative image returned by Order list summaries.

## Locked behavior

- Order creation snapshots the Product cover that is current for the Variant at creation time.
- The snapshot source is the recalculated checkout Cart view: `ProductVariant -> Product -> ProductImage(sort_order = 0)`.
- `OrderItem.imageUrlSnapshot` is nullable. A Product with no cover at Order creation stores `null`.
- Customer and admin Order detail expose the stored snapshot through `OrderItemDto.image_url`.
- Customer and admin Order list expose one nullable preview through `OrderSummaryDto.image_url`.
- The list preview is the `imageUrlSnapshot` of the OrderItem with the smallest `order_item_id` for that Order.
- If that first OrderItem has a null snapshot, the summary preview is null; do not fall through to a later item or the current Product gallery.
- Order reads must not query the current Product gallery to reconstruct historical images.
- Reordering, replacing or removing Product images after Order creation must not change an existing OrderItem image or Order summary preview.
- Existing historical OrderItems with `image_url_snapshot = null` remain null; do not backfill them from the current catalog because that would fabricate history.

## Regression invariant

```text
create Order while cover = A
-> order_items.image_url_snapshot = A
-> admin changes current cover to B
-> admin removes A from Product gallery
-> customer/admin GET Order detail: OrderItem.image_url = A
-> customer/admin GET Order list: OrderSummaryDto.image_url = A
```

## Architecture boundary

- `product` owns current Product/Image presentation state.
- `cart` exposes the current cover in the recalculated checkout view.
- `order` owns the historical snapshot from the moment Order creation persists the OrderItem.
- Historical Order reads depend only on Order-owned persistence and do not call Product read services.
- Order list preview images are loaded in one OrderItem batch query for the current page rather than one query per Order.
- No new schema migration is required because Flyway V4 already introduced `order_items.image_url_snapshot`.

## Order list preview contract

`GET /api/v1/me/orders` and `GET /api/v1/admin/orders` return the existing `OrderSummaryDto` plus nullable `image_url`.

The preview rule is deterministic and intentionally narrow:

```text
Order
-> OrderItem with minimum order_item_id
-> image_url_snapshot
-> OrderSummaryDto.image_url
```

The summary does not embed `items[]` and does not depend on Product/Catalog state. This keeps list payloads bounded while preserving historical image semantics.
