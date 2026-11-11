# 19 — Order-Time Product Image Snapshot

> This document defines the target snapshot invariant and supersedes prior Phase 9 implementation notes where they depend on the legacy ProductVariant path or claim the target lacks an image snapshot column.

## 1. Target contract

- A placed OrderItem records its Product ID and approved order-time facts, including the image reference in ORDER_ITEMS.image_url_snapshot.
- The snapshot refers to immutable object/version content, not merely a mutable Product image URL. The referenced content must remain resolvable for the approved history/retention window.
- Product images are resolved from the Product identified by product_id. ProductVariant is not a target persistence concept.
- Changing the Product's primary image, ordering, metadata or current URL after placement must not rewrite a saved OrderItem snapshot.
- The snapshot is written in the same order-placement transaction as the OrderItem and other approved order-time snapshots. A failed placement must not leave partial snapshots.

## 2. Source-image selection

- Use the Product's approved primary-image selection contract from docs/03 and docs/18; do not infer an image from a variant/option combination.
- When a Product has no eligible primary image, follow the nullability/fallback behavior in the target DDL and DTO contract. Do not fabricate a placeholder or persist a non-versioned URL unless explicitly approved.
- Reordering or replacing current Product images affects future Cart/quote views; it does not change prior OrderItems.

## 3. Retention and deletion boundary

- Preserve the content addressed by an OrderItem image snapshot until the applicable retention requirement expires.
- Numeric retention periods for image assets, audit logs and personal/business data, and legally required anonymization/deletion exceptions, remain TBD under DB-12.
- Until those decisions are approved, do not schedule automatic purging or delete a referenced object/version in a way that breaks Order history.
- Clean Schema Reset applies only to verified disposable development/test databases and does not authorize deleting persistent production/shared history.

## 4. Acceptance tests

- Place an Order using a Product with a primary image and confirm ORDER_ITEMS.image_url_snapshot identifies the selected immutable version.
- Change/reorder/replace the Product's current image and assert the existing Order snapshot remains unchanged.
- Simulate asset read of a placed Order after the Product image changes; verify the snapshot's version remains resolvable.
- Inject an order-placement failure and verify the OrderItem/snapshot does not commit partially.
- Verify no target route, Entity or query requires ProductVariant to resolve the snapshot.
