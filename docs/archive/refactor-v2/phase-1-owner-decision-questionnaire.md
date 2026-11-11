# Historical owner decision questionnaire — superseded

**Status:** This questionnaire is retained only as the record of questions that led to the owner decisions dated 2026-10-23. Its earlier multiple-choice options are not current design alternatives and must not be used to implement the target model.

## Current authority

- [Owner approval record](../../refactor-v2/p1/P1-owner-approval-2026-10-23.md) — approved target business and physical defaults.
- [P1 decision log](../../refactor-v2/p1/P1-decision-log.md) — approval status and implementation evidence still required.
- [Owner-approved ERD v2](../../refactor-v2/target/erd-v2-approved.mmd) — canonical 31-table logical model.
- [P1 physical data dictionary](../../refactor-v2/p1/P1-data-dictionary.csv) — canonical physical contract.

## Decisions no longer open

The owner approved Clean Schema Reset for verified disposable development/test data; Product-ID cart/order/receipt/inventory relationships; one explicit parent-child Product level; descriptive typed attributes that do not generate Products; integer-VND money and approved rounding/allocation; stateless quote; account-scoped order idempotency; inventory source/dedupe/reversal/concurrency behavior; global non-stacking voucher quota; COD/manual shipping and the approved refund boundary; Account soft-delete/active-phone uniqueness; and lifecycle/FK defaults.

In particular, Size and Color do **not** define or automatically generate saleable Product combinations. The target does not use ProductVariant, SizeSystem, SizeValue or Color master tables. Each saleable item is an explicit Product row; attributes are descriptive and a selected option must belong to its Attribute.

Do not re-open an approved decision by selecting an old A/B/C proposal. A future change requires an explicit dated owner amendment and matching ERD, API/DTO, data dictionary and acceptance-test updates.

## Remaining owner input

Only the numeric retention periods for audit records, image assets and personal/business data, and any legally required anonymization/deletion exceptions, remain TBD in the recorded approval. Do not implement scheduled purging until approved.

## Implementation status

Owner decisions are recorded, but P1 remains **PARTIAL** until target Entity/Repository/Service/API/DTO/frontend mappings, fresh-target schema checks, and security/business/transaction/concurrency acceptance tests pass on the exact candidate SHA. No database reset is performed by this document.
