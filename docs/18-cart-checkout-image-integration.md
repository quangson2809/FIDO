# 18 — Cart / Checkout Product Image Contract

> This target-aligned document supersedes the original Phase 8 implementation notes wherever they depended on ProductVariant or the legacy quote contract. The owner-approved ERD v2 stores Cart lines by Product ID and includes ORDER_ITEMS.image_url_snapshot. See docs/00, docs/03–07 and docs/19–20 for the controlling target rules.

## 1. Cart and quote image behavior

- CART_ITEMS.product_id identifies the Product directly. An image lookup must not pass through a variant/option-combination identity.
- Cart and stateless checkout quote read the current primary image from Product/Image data. They do not snapshot images, reserve stock or persist quote records.
- If no current primary image is available, the response follows the nullable primary-image contract in docs/05; do not synthesize a variant-specific image.
- Image projection fields in Cart/quote must match the target response DTO. Do not preserve old image_url/thumbnail fields solely as legacy compatibility fields without adding them to the target DTO contract.

## 2. Order-time image snapshot

- When an Order is placed, target ORDER_ITEMS.image_url_snapshot records the image reference used at that point according to DB-07.
- The saved reference must resolve to immutable object/version content for the required history window. A URL pointing at mutable/overwriteable content is not an immutable snapshot.
- Later Product cover edits, image reordering or asset replacement must not change what an existing Order displays.
- Numeric retention duration and legal deletion/anonymization exceptions remain TBD under DB-12. No scheduled asset purge is allowed before approval.

## 3. Verification

- Product has a primary image -> Cart and quote expose the target Product image projection.
- Product has no primary image -> target nullable behavior is returned without inventing a placeholder.
- Updating the current primary image affects the next Cart/quote read but not an existing Order snapshot.
- Replacing/deleting a referenced current asset must not break the history window of a placed Order.
- Cross-account Cart/Order access is rejected, and image selection does not bypass Product visibility or permission checks.

## 4. Architecture boundary

- product owns Product/Image persistence and primary-image resolution.
- cart reads the Product contract and owns Cart lines.
- order owns quote orchestration and Order-time image snapshot writes.
- Cross-module writes call the owning service; no direct cross-module Repository access.
