# 20 — Phase 11 Image retention policy — 2026-10-05

## Scope

Phase 11 locks the lifecycle boundary for ProductImage removal. It does not introduce remote-asset cleanup infrastructure.

## Locked MVP behavior

```text
REMOVE ProductImage
-> delete the ProductImage catalog/DB association
-> normalize remaining ProductImage sort_order where applicable
-> do not delete the remote asset
```

This applies to the dedicated image removal flow and to existing catalog replacement flows that remove ProductImage rows. Remote storage is not part of the ProductImage removal transaction.

## Rationale

OrderItem image URLs are historical snapshots. An Order created while a Product image URL is current may continue to expose that same URL after the Product gallery is reordered, replaced or the ProductImage association is removed.

Deleting the remote asset during catalog removal would therefore make an otherwise valid historical snapshot point at a missing resource. Catalog cleanup and historical media retention are separate concerns.

## Architecture boundary

- `product_images` owns the current catalog association only.
- `order_items.image_url_snapshot` owns the historical URL captured at Order creation.
- `ProductImageAdminService.removeImage(...)` removes only catalog persistence and reorders the remaining gallery.
- `ImageStorageGateway` remains upload-only in this phase; no remote delete capability is exposed to catalog removal code.
- ImgBB/provider delete tokens or provider asset IDs are not persisted for cleanup.
- No new table, migration, scheduler, background job or cross-module reference tracker is introduced.

The existing Order image snapshot regression test proves that removing an image from the current Product gallery does not rewrite historical Order detail/list image URLs. The Product image admin tests separately prove that the ProductImage DB association is actually removed and the remaining gallery order is normalized.

## Deferred by YAGNI

Do not implement these until cleanup becomes a real requirement with an approved lifecycle:

- asset registry;
- reference tracking;
- retention period;
- garbage-collection job;
- remote provider deletion workflow.

A future cleanup phase must first define what constitutes an unreferenced asset, how historical references are tracked, the retention window, failure/retry behavior and provider deletion semantics. Phase 11 intentionally makes none of those decisions.

## Compatibility

- No API contract change.
- No schema change.
- No Order snapshot/backfill change.
- No remote provider contract change.
- Existing ProductImage delete authorization and transaction boundary remain unchanged.
