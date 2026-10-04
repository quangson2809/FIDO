# 18 — Phase 8 Cart / Checkout image integration — 2026-10-04

## Scope

This refinement integrates the current Product cover into Cart and Checkout presentation without changing Cart persistence or historical Order image semantics.

## Locked behavior

- `CartItemDto` adds nullable `thumbnail`.
- `CheckoutItemDto` adds nullable `thumbnail`.
- `CartItemDto.image_url` is retained for backward compatibility; `image_url` and `thumbnail` resolve from the same current Product cover.
- Cover resolution follows `ProductVariant -> Product -> ProductImage(sort_order = 0)`.
- A Product with no current cover returns `thumbnail = null`.
- Cart and checkout quote are live views: Product cover changes are visible on the next read/quote.
- Cart does not persist or snapshot an image URL.
- Checkout quote does not create an image snapshot; it uses the current cover while recalculating the live Cart view.
- Historical OrderItem image behavior is unchanged and remains snapshot-based.

## Required verification

- current cover exists -> Cart and Checkout return it as `thumbnail`;
- no Product image -> `thumbnail = null`;
- changing the Product cover -> the next Cart read and Checkout quote return the new cover;
- deleting the previous cover and promoting the next image to `sort_order = 0` -> the next Cart read and Checkout quote return the promoted cover.

## Architecture boundary

- `product` owns Product/Image persistence and resolves the current cover through its read contract.
- `cart` consumes the Product read contract; it does not access Product repositories directly.
- `order` receives the recalculated checkout Cart view and exposes the same current-cover thumbnail in the quote response.
- No Cart/Checkout schema change, cache, snapshot column, new endpoint or cross-module Repository dependency is introduced.
