# P1 Exit Gate — ERD v2 & Data Contract Freeze

**STATUS: PARTIAL — static schema/dictionary alignment is being gated; business decisions, application mapping and MySQL runtime evidence remain open. P2 is NOT AUTHORIZED.**

- Branch: demo1
- Inspected initial baseline SHA: c08a8c0c89019e19fd597b70a22eb2e10e38b834
- Canonical schema: docs/refactor/phase-1-erd-v2-approved.mmd
- Clean-reset SQL remains isolated from active backend/src/main/resources/db/migration.
- Target database engine for verification: MySQL 8.4 (CI service mysql:8.4).

## Static contract inventory

| Gate | Evidence | Status |
|---|---|---|
| Exact table set | ERD and SQL both declare the same 31 table names | PASS — static inventory only |
| Field count | ERD 228 logical fields; SQL 229 physical columns; one SQL-only column is generated ACCOUNTS.phone_active_key | PASS — static inventory only |
| Receipt warehouse | GOODS_RECEIPTS.warehouse_id plus FK to WAREHOUSES exists in ERD and SQL; WAREHOUSES is created first | PASS — static source inspection |
| SQL ↔ Dictionary | Dictionary has one row per 229 physical columns with explicit type/nullability/default/generated-expression fields | PENDING script/CI result |
| Constraints | SQL has PK/FK/UNIQUE/CHECK/index definitions for the candidate target schema | PENDING script plus MySQL information_schema evidence |
| Entity/Repository | Existing code still includes legacy account_id, ProductVariant/size/color, variant-keyed Inventory and BigDecimal monetary mappings | FAIL — implementation not migrated |
| API/DTO | P1 API map records target/current differences; endpoints still implement legacy shapes | FAIL / NOT_VERIFIED by endpoint |
| Frontend | Breaking changes identified but no full target FE integration proof | NOT_VERIFIED |
| Automated tests | Test matrix provides required cases; acceptance cases are not execution evidence | NOT_VERIFIED pending CI |
| MySQL clean install | CI workflow has been changed to run schema tests on MySQL 8.4 and trigger on demo1 pushes | PENDING fresh run |

## Remaining blockers

1. DB-03 inventory/ledger/concurrency proposal is NOT owner-approved. Field presence does not settle same-source/different-key de-duplication, opening balances, reason vocabulary, reversal policy or concurrent update semantics.
2. DB-05 quote/idempotency proposal is NOT owner-approved. Current target Order Entity/Repository/API/DTO/frontend are not yet mapped to request_fingerprint; replay/conflict, retention, and atomic transaction semantics are not verified.
3. Product hierarchy depth and inheritance/null semantics for name, slug, description, selling_price, category_id and brand_id require a deliberate recorded decision. Nullable columns do not automatically mean inherit.
4. Voucher usage_count needs an accepted contract for global/per-account quota, atomic redemption, cancellation/restoration and idempotent retry.
5. ORDER_ITEMS.image_url_snapshot exists in the schema draft, but the asset itself must remain addressable/immutable under an explicit retention/versioning policy.
6. Payment columns store refund metadata, but partial/full refund rules, authorized transitions, duplicate refund protection, return/restock and rollback behavior are unresolved.
7. Account.deleted_at and generated phone_active_key are a candidate MySQL strategy, not yet MySQL-verified; current Account Entity still has a global unique phone constraint and no soft-delete mapping.
8. Integer VND is represented in target ERD/SQL, while current Java/API/frontend money contracts have not been aligned. Compile and arithmetic/property tests are still required.
9. DB-11 seed/bootstrap needs fresh-install and secret-source evidence; DB-12 delete/restrict/cascade/history retention requires an approved per-entity decision matrix.
10. The DB IDs in the user-provided detailed subsection headings are inconsistent with the initial choice table (for example, later DB headings reuse identifiers for different topics). The initial explicit DB-01..DB-11 choice table remains the authority; normalize IDs in the remaining P1 documents before freeze.

## Verification policy

- Run python scripts/p1/check_contract_consistency.py; nonzero exit means static alignment fails.
- Run ./gradlew test --tests com.fido.persistence.CleanResetSchemaTests against a disposable MySQL 8.4 database through .github/workflows/clean-reset-schema-verification.yml.
- H2 must not execute the MySQL-specific generated-column DDL; skipping the schema suite under non-MySQL runs is not MySQL verification.
- Record the real post-change Actions conclusion and test log. No source inspection or historical CI result can be substituted for fresh runtime evidence.
- Do not execute clean reset against production/shared or any database containing data that must be retained.

## P2 authorization

**NOT AUTHORIZED.** DB-03/DB-05 are not approved; Product inheritance and DB-12 policy remain unresolved; legacy application/API/FE contracts do not match the target schema; and fresh MySQL 8.4 execution plus the static checker have not yet been evidenced as passing.
