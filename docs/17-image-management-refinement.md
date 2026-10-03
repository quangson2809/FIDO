# 17 — Product Image Management Refinement — 2026-10-04

## Scope

This refinement supersedes the Product-image transport/read decisions recorded on 2026-10-03 wherever they conflict with the rules below. It does not change unrelated Catalog, Variant, Cart, Order, RBAC or inventory semantics.

## Locked behavior

- Admin manages the Product image collection by **add, remove, reorder and cover selection**.
- Product create/update does not accept client-provided image URLs.
- Image files are uploaded to the backend through a dedicated Product child-resource endpoint; the backend owns validation and storage-provider integration.
- Provider-specific behavior is an infrastructure concern. BRD/SRS/API/domain contracts do not depend on ImgBB or any named provider.
- Product cover is the image at `sort_order = 0`; no separate `is_cover` field is introduced.
- Product detail returns the gallery ordered by `sort_order ASC`.
- Product/admin summaries return the current cover.
- Cart reads the current cover; Cart does not snapshot it.
- Order creation snapshots the current cover URL into `OrderItem.image_url_snapshot`; later Product gallery changes must not change historical orders.
- Removing a ProductImage removes it from the active catalog collection and normalizes ordering. It does not automatically delete the remote asset because historical OrderItem snapshots may reference the URL.

## Schema delta

`product_images` adds:

- `sort_order`
- check `sort_order >= 0`
- unique `(product_id, sort_order)`

`order_items` adds:

- `image_url_snapshot`

Existing Product images are backfilled deterministically by `image_id ASC`, starting at `0`, so the previous representative image remains the cover after migration. Existing historical OrderItems are not backfilled from the current catalog because doing so would fabricate historical state.

## API delta

- `POST /api/v1/admin/products` — Product + Variant + metadata only.
- `POST /api/v1/admin/products/{productId}/images` — multipart add/upload.
- `PATCH /api/v1/admin/products/{productId}/images` — reorder and supported image metadata.
- `DELETE /api/v1/admin/products/{productId}/images/{imageId}` — remove from active catalog collection.
- No dedicated GET image endpoints. Product detail remains the gallery read boundary.

The three Product-image commands extend the previous 77-endpoint baseline to the synchronized target of 80 endpoints.

## Architecture boundary

- Controller: HTTP/multipart binding + request validation only.
- Image command/application service: ownership checks, orchestration, order normalization and transaction boundary.
- `ProductImageStorage`: provider-neutral upload boundary.
- Provider adapter such as `ImgBbImageStorage`: external API integration only.
- Repository: ProductImage persistence/query only.
- Order creation owns OrderItem snapshot creation; order reads use stored snapshot rather than calling Product for historical presentation.
- Security remains backend-enforced through existing catalog-write authorization; no new `permitAll` path is introduced.

## Compatibility

This is a breaking contract change for clients that still:

- send `images[].image_url` in Product create/update;
- send multipart files to `POST /api/v1/admin/products`;
- assume representative image = smallest `image_id`;
- render Order images from current catalog data.

The backend implementation phase must update route/DTO/schema contract tests and coordinate the frontend migration.