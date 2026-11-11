# 20 — Image Retention and Historical Access Policy

> This is the target image policy summary. Earlier Phase 11 notes are superseded where they conflict with the approved ERD v2 or owner decision DB-07/DB-12.

## 1. Required behavior

- ORDER_ITEMS.image_url_snapshot is part of the target order-time snapshot contract.
- A snapshot reference must identify immutable object/version content. A mutable URL alone is insufficient if the referenced content can be overwritten or deleted.
- Changing a Product's current primary image must not alter the image associated with an already-placed OrderItem.
- Asset access for placed Orders must follow the same Account ownership and administrative permission checks as the corresponding Order.

## 2. Retention status

The owner approved immutable order-time image snapshots and stable content/version access. The numeric retention duration for image assets remains TBD, as do numeric audit and personal/business data retention periods and legal anonymization/deletion exceptions.

Until those values are approved:
- do not schedule automatic asset deletion/purging;
- do not overwrite or delete a referenced object/version in a way that breaks an existing Order snapshot;
- do not invent retention durations in application configuration, background jobs or storage lifecycle rules;
- document any storage lifecycle policy and verify it cannot delete referenced Order snapshots prematurely.

## 3. Safe removal and cleanup

An image no longer referenced by a current Product is not automatically safe to delete: it may still be referenced by an OrderItem snapshot. A cleanup process, if introduced later, must prove that no retained Order snapshot depends on the object/version and must obey the approved DB-12 retention/anonymization policy.

Clean Schema Reset is independent from image retention and is permitted only for a verified disposable development/test database. It never authorizes resetting production, staging, shared integration or persistent business data.

## 4. Verification

- Snapshot version remains accessible after Product image replacement.
- Cleanup never removes an object/version referenced by a protected Order snapshot.
- Asset URL/object permissions do not expose another Account's Order.
- Retention behavior is tested only against approved policy values; until then, automatic purging remains disabled.
