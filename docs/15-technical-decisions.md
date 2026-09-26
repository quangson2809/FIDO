# Implementation decisions — 2026-09-26

This file contains **technical implementation decisions** approved by the project owner or safely chosen to encode already-approved source semantics. It must not be used to invent new business rules.

## Explicitly approved by project owner

- Preserve Java 17, Spring Boot 4.0.3, Gradle and MySQL from the repository.
- Use Flyway to version the schema. Hibernate validates mappings; it does not create or update the schema.
- Login uses the account phone number. Login does not require phone verification.
- `ADMIN` identifies employees; `SUPERADMIN` is the highest administrator. Lowercase `admin` is not privileged. Phone values are unique.
- Bootstrap the initial account with role `SUPERADMIN` from external credentials.
- JWT library: Spring Security Resource Server with Nimbus JOSE/JWT, versions managed by Boot.

## Decision policy

Unresolved points are classified before implementation:
- HARD BLOCK — missing business/API/security/schema/state/money/stock/external-contract meaning.
- TECHNICAL DECISION — semantics fixed; implementation naming/organization remains. Decide here and continue.
- DEFERRED FEATURE — explicitly phase-later/TBD; skip only that slice.

Ordinary technical decisions do not require stakeholder confirmation when they preserve approved semantics and public contracts.

## Foundation conventions

- UTC timestamps stored as TIMESTAMP(6).
- Entity lifecycle callbacks assign UTC creation/update times. No actor or timestamp comes from request data.
- Flyway V1 maps DD-DB-01 v1.3.0.
- Foreign references are scalar IDs in JPA; SQL FKs enforce integrity.
- Composite junction keys use explicit ID classes.
- History repositories expose no delete method.
- Audit, inventory ledger and order-item snapshots are immutable records/entities where appropriate.
- Existing Spring Boot `/error` rendering remains; no custom public error envelope has been introduced.
- CI tests H2 in MySQL mode and MySQL 8.4.
- V1 targets an empty schema; populated production databases require a separate reviewed migration plan.

## Phase 2 decisions already implemented

- Flyway V2 adds UNIQUE(phone) and seeds ADMIN/SUPERADMIN roles.
- JWT uses HS256 with externally configured Base64 secret; role/permission data is reloaded from DB rather than trusted from JWT claims.
- System roles cannot be deleted.
- RBAC writes protect the last SUPERADMIN assignment.
- Staff means an account currently assigned ADMIN or SUPERADMIN.
- Staff creation without explicit role_ids assigns ADMIN; explicit assignments must include ADMIN or SUPERADMIN.
- Permission rows are managed data.
- API #58–69 currently require SUPERADMIN.
- Mutations use service transactions including audit where implemented.
- Validation/auth/error status mapping follows existing Boot behavior.
- No refresh API/account lifecycle/status/guest identity/voucher behavior was introduced.

## Phase 3 technical decisions

### Catalog sale-state encoding

The data/requirements already distinguish:
- an item that is allowed to be sold;
- an item that is stopped from sale;
- an item that is still on sale but has zero available inventory.

The source leaves the **technical enum/literal names** open. Encode the two sale-state meanings as:

- `ON_SALE`
- `STOPPED`

These literals apply to both Product and ProductVariant `sale_status`.

This is not a new business lifecycle. Do not add DRAFT/ARCHIVED/DELETED/etc.

Sellable/purchasable availability remains derived from:
- Product sale status;
- Variant sale status;
- `inventories.available_quantity`.

Zero inventory must not mutate sale status.

### Catalog authorization capabilities

Define technical permission capabilities:

- `CATALOG_READ` — admin/back-office read endpoints #27, #28, #33.
- `CATALOG_WRITE` — catalog mutations #29–32 and #34–45.

`SUPERADMIN` may perform both capabilities as the highest technical administrator.

Do **not** automatically grant either capability to `ADMIN` or another employee role. The employee role-to-permission matrix remains business configuration/TBD. Assignment occurs only through RBAC data/configuration.

Public catalog #11–13 remains public according to the API contract.

## Canonical source notes

- Schema authority: `07_Thiet_ke_du_lieu_CSDL_Website_Ban_Quan_Ao_v1.3.0_catalog_final.docx`.
- Current API authority: consolidated `DANH MỤC API TINH GỌN THEO CSDL` with 77 baseline APIs and Appendix A.
- Older API v5/phase snapshots may provide history but do not override the current consolidated contract.
- Modeling Class/Sequence diagrams guide responsibility/order of interaction; they do not override the current physical schema or force Java framework method names.

## Still deferred/unresolved

- Employee role-to-permission assignment matrix.
- Guest session identity/TTL/merge.
- Guest order lookup verification/security details.
- Voucher business rules.
- Detailed size guide.
- Notification/provider/template/retry/retention.
- Create-order retry/dedupe mechanism.
- Order timeline resource.
- Structured/item-level after-sales case.
- GoodsReceipt unit_cost.
- Performance/SLA/RPO/RTO/retention numeric targets.

Administrative bootstrap credentials must remain external; never hardcode shared secrets.


## Phase 3 implementation details recorded during coding

- Public Catalog list includes only Product `ON_SALE` rows that have at least one Variant `ON_SALE`; zero inventory does not mutate or replace sale status.
- Public size/color/price filters are evaluated against sale-enabled Variants. Price range uses effective price: Variant override when present, otherwise Product base price.
- Direct detail lookup does not invent redirect/tombstone behavior for a stopped Product; it returns the existing record with explicit Product/Variant `sale_status` and current `available_quantity`. Purchase flows must still enforce purchasability.
- Catalog metadata returns the existing relational masters; gender/season/style values are derived from stored Product values.
- Catalog writes are audited in the same service transaction.
- Product/Variant creation does not create or mutate Inventory. A missing Inventory row is read as available quantity 0; Phase 4 owns stock mutation/upsert behavior.


## Phase 4 technical decisions

### Supplier usage-state encoding

The approved source fixes two Supplier usage meanings: usable for new receiving work and stopped from further use while historical GoodsReceipt references remain intact. Encode the technical literals as:

- `ACTIVE`
- `INACTIVE`

This is only a literal naming decision. No Supplier delete lifecycle is added. A new GoodsReceipt may use only an `ACTIVE` Supplier; historical receipts remain readable after that Supplier becomes `INACTIVE`.

### Inventory authorization capabilities

Define technical capabilities for APIs #46–57:

- `INVENTORY_READ` — read APIs #46, #47, #50, #51, #55 and #57.
- `INVENTORY_WRITE` — mutation APIs #48, #49, #52–54 and #56.

`SUPERADMIN` may perform both capabilities. Do not automatically grant either capability to `ADMIN` or any employee role.

### Receipt code generation

The API contract requires the server to generate `receipt_code`, while the business sources do not lock a human numbering scheme. Use an opaque unique code `GR-<UUID>` within the existing 40-character column.

No date, sequence, branch, supplier or accounting meaning is inferred from that code.

### Inventory row invariant

DD-DB-01 defines exactly one `inventories` row per ProductVariant for the one-warehouse baseline.

Phase 4 therefore:
- backfills a zero-quantity row for a pre-existing Variant that has none;
- initializes a zero-quantity row when Catalog creates a new Variant;
- keeps ordinary stock changes behind inventory business services so each non-zero movement has its matching ledger entry.

Creating the zero row is initialization, not a stock movement; it does not create an InventoryTransaction.
