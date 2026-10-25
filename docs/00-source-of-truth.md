# FIDO — Source of Truth

## 1. Authority order

The [ERD v2 reconstruction index](refactor-v2/README.md) organizes target assets, P0 evidence and the ordered P1.1–P1.9 package. Archived reports are evidence only; they do not outrank current contracts.

Use the following artifacts as the current development contract, in this order:

1. **Owner decisions:** [P1 owner approval](refactor-v2/p1/P1-owner-approval-2026-10-23.md), the [P1.9 owner amendment](refactor-v2/p1/P1-owner-amendment-2026-10-25.md), and approved rows in [P1 Decision Log](refactor-v2/p1/P1-decision-log.md).
2. **Logical data model:** [Owner-approved ERD v2](refactor-v2/target/erd-v2-approved.mmd).
3. **Physical data contract:** [P1 Data Dictionary](refactor-v2/p1/P1-data-dictionary.csv), the single schema-and-seed baseline `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`.
4. **HTTP and wire contracts:** [API Contract](04-api-contract.md) and [DTO Contract](05-dto-contract.md).
5. **Business and transaction invariants:** [Business Rules](06-business-rules-state-machines.md) and [Transactions, Concurrency and Idempotency](07-transactions-concurrency-idempotency.md).
6. **Operations policy:** [P1.8 Operations, Audit, Content/Report and Seed Contract](refactor-v2/p1/P1.8-operations-seed-contract.md) plus its [operator runbook requirements](refactor-v2/p1/P1.8-operations-seed-runbook.md). It governs audit fields/correlation/redaction, content/report use cases, deletion/FK lifecycle, seed manifest and unresolved retention blockers; it does not override P1.2/P1.3/P1.5/P1.7 domain ownership.
7. **Cross-domain gate and implementation status:** [P1.9 consistency report](refactor-v2/p1/P1.9-contract-consistency-report.md), [P1 exit gate](refactor-v2/p1/P1-exit-gate.md), and P1 API/use-case mapping and traceability artifacts under `docs/refactor-v2/p1/`. These describe delivery status and gaps; they do not override approved behavior. The image-order and target Order permission decisions are recorded; the P1.9 contract/schema gate is PASS on the current PR head. Runtime implementation remains pending.
8. **Current code:** evidence of what must be aligned, never an automatic specification for the target design. The only fresh-install SQL is `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`; removed V1–V14 migration files are historical implementation artifacts, not a current schema authority.
9. **P0 reports and archived documents:** historical evidence only. Do not copy a superseded rule into a current contract.

The older decision questionnaire is superseded by the dated owner approval and later owner amendments. It is not a source of open choices. If an active document conflicts with an authority above, update that document; do not preserve both alternatives in the current contract.

## 2. Frozen target profile

- The target logical model is the approved **31-table ERD v2**.
- A sellable catalog record is a row in `PRODUCTS`. Parent and child Products are explicit, independently sellable records. v1 permits one parent-child level; each row owns its SKU, required selling price and stock. NULL never means “inherit from parent.”
- Catalog metadata uses `ATTRIBUTE_TYPES`, `ATTRIBUTES`, `ATTRIBUTE_OPTIONS` and `PRODUCT_ATTRIBUTE_VALUES`. Types are `OPTION`, `TEXT`, `NUMBER`, `BOOLEAN`. Attribute data is descriptive; it never creates Product records automatically. An option must belong to the Attribute that uses it.
- `CART_ITEMS`, `ORDER_ITEMS`, `GOODS_RECEIPT_ITEMS`, `INVENTORIES` and `INVENTORY_TRANSACTIONS` refer to Product IDs. Stock balance is keyed by warehouse and Product.
- Persisted Cart and order placement require an authenticated account. A quote is stateless/advisory and does not persist a quote identifier, reserve stock or consume a voucher.
- Monetary values are whole VND, stored as integer values. The approved discount rule is order-level HALF-UP rounding followed by largest-remainder allocation to lines, with ascending Product ID as the stable tie-break.
- v1 uses one operational warehouse, one COD Payment aggregate per Order and manual shipping. Approved stock, voucher, order, payment, snapshot and audit effects must be transactional.
- Preserve order-time Product, address, voucher and image facts. A URL alone is not proof that image content is immutable.
- The Clean Schema Reset policy applies only to a verified disposable development/test database. It never authorizes resetting production, staging, shared integration or persistent business data.

## 3. Document maintenance rules

- Current contracts describe the target model only. Do not embed superseded table layouts, old column definitions, old money types or old DTOs as alternative target designs.
- Where implementation still differs, record the mismatch as an implementation blocker in the P1 mapping/traceability artifacts, not as a competing schema or API contract.
- Historical baseline reports may retain evidence needed to understand past work, but must be clearly historical and must not be referenced as target requirements.
- Do not add tables, fields, routes or behavior absent from the approved target without an explicit owner-approved scope change.
- Mark unresolved retention duration/anonymization policy as TBD. Do not schedule deletion or purging until it is approved.

## 4. Acceptance status

The [P1.9 owner amendment](refactor-v2/p1/P1-owner-amendment-2026-10-25.md) records the gallery unique-index and target Order permission decisions; both are reflected in isolated target artifacts. The [P1.9 cross-domain gate](refactor-v2/p1/P1-exit-gate.md) is PASS for contract/schema consistency, with checker, isolated MySQL and backend evidence on the current PR head. P2.1's P1.9 entry restriction is cleared; runtime Entity/Repository/Service, API/DTO, frontend, authorization, transaction/concurrency and end-to-end acceptance remain separate implementation gates. No live database reset is implied.
