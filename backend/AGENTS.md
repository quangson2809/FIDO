# FIDO Backend Java — Codex Rules

## 1. Mission

Implement the FIDO backend from the approved Analyst Docs while preserving the agreed **Modular Monolith + Package by Feature** architecture. Correctness, traceability, transactional integrity and minimal scope take precedence over code volume.

## 2. Mandatory read order before coding

Read these files first:

1. `docs/00-source-of-truth.md`
2. `docs/01-architecture-package-structure.md`
3. `docs/02-module-ownership.md`
4. the domain-specific sections in `docs/03` through `docs/10`
5. `docs/12-tbd-out-of-scope.md`

Never infer a missing business rule from common e-commerce practice.

## 3. Architecture invariants

- Base package: `com.fido`.
- Entry point: `com.fido.FidoApplication`.
- Global technical packages only:
  - `com.fido.config.{security,web,documentation}`
  - `com.fido.common.{exception,response}`
- Business code must live under `com.fido.modules.<module>`.
- Baseline modules: `account`, `product`, `cart`, `promotion`, `order`, `inventory`, `audit`, `report`, `content`.
- Inside a module create only needed packages from: `controller`, `service`, `repository`, `entity`, `dto.request`, `dto.response`, `mapper`.
- Do not create fake classes just to make a folder non-empty. `package-info.java` is allowed when a package must be reserved.
- Do not create system-wide root `controller/service/repository/entity/dto` packages.
- Do not introduce Hexagonal/Clean/DDD ports, generic base services, generic repositories, mediator buses, event buses, CQRS, outbox, microservices, or abstractions only to appear “SOLID” unless the existing repository already requires them.
- Use constructor injection.
- Controller: HTTP binding, request validation, authentication context extraction, call Service, return DTO.
- Service: business rules, orchestration, authorization checks when domain-specific, transactions.
- Repository: persistence only; no business state machine.
- Entity: persistence model; never return Entity directly from Controller.
- DTO: API contract only.
- Mapper: explicit transformation; follow the mapper technology already present in repo. Do not add MapStruct/Lombok only for convenience.

## 4. Module boundary rules

- A module must not call another module's Repository directly.
- Cross-module write behavior goes through that module's Service/contract.
- Cross-module read aggregation may use a dedicated query service/projection owned by the API feature, but must not leak foreign JPA entities across modules.
- `order` owns checkout, order lifecycle, COD/payment, shipping info and after-sales command.
- `inventory` owns supplier, goods receipt, current sellable availability and immutable inventory ledger.
- `account` owns account/address/RBAC persistence.
- `product` owns all catalog/master/product/variant persistence.
- `report` is read/query logic and has no baseline aggregate table.

## 5. Source discipline

- Do not add a column, endpoint, state, request field, response field, permission code, lifecycle, table or business rule unless supported by the source-of-truth hierarchy.
- Preserve Analyst terminology: `PENDING`, `CONFIRMED`, `PREPARING`, `SHIPPING`, `COMPLETED`, `DELIVERY_FAILED`, `CANCELLED`, `RETURNED`; Payment `UNPAID`, `PAID`, `REFUNDED`.
- Where technical enum names are explicitly TBD, do not invent extra values. Existing documented labels may be represented in code only as needed for the locked state machine.
- Keep all blocked/TBD items visibly blocked. A TODO is not permission to implement speculative behavior.

## 6. Data and transaction rules that must never be violated

- Cart and PENDING Order do not reserve/deduct stock.
- PENDING -> CONFIRMED is the stock check/deduction boundary.
- Stock cannot become negative.
- Confirm Order is all-or-nothing across all OrderItems.
- Every stock mutation creates an `inventory_transactions` row in the same business transaction.
- Repeated confirmation/cancellation/receipt/payment requests must not apply the side effect twice.
- `DELIVERY_FAILED` does not automatically restock.
- `RETURNED` does not automatically restock; restock only after actual receipt/inspection says sellable.
- GoodsReceipt CONFIRMED is immutable for stock-affecting items.
- Order/OrderItem snapshots are historical and must not be rewritten by later catalog edits.
- PaymentStatus is not duplicated onto `orders`.
- Important historical records are not hard-deleted.

## 7. API rules

- Implement only the 77 green baseline endpoints in `docs/04-api-contract.md`, subject to the yellow/TBD exclusions.
- JSON field naming: `snake_case`.
- Object response shape: `{ "data": <Dto> }`.
- List response shape: `{ "data": [<Dto>], "meta": <PaginationMeta> }`.
- Default page = 1, page_size = 20, max page_size = 100.
- `/api/v1/me/**` and `/api/v1/admin/**` require Bearer JWT.
- JWT minimum claims: `sub=account_id`, `iat`, `exp`.
- Never accept client-controlled totals, actor IDs, generated IDs, timestamps or workflow states where the source says server-derived.
- Do not add a refresh-token endpoint; it is not in the baseline contract.
- Do not invent a global error-envelope schema if the existing repository has not already locked one. Use centralized exception handling, but preserve the public contract decision point.

## 8. Security

- Store only `password_hash`, never clear passwords.
- Backend authorization is mandatory; UI hiding is not authorization.
- Do not log credentials, tokens or unnecessary PII.
- Do not hardcode a detailed employee permission matrix: source marks it TBD.
- Administrator has highest business privilege, but do not invent a technical role code if the repo/seed data has not locked one.
- Guest order lookup security mechanism is TBD; do not implement a weak phone-only lookup as a final solution.

## 9. Testing requirements

For every behavior changed:

- add/update unit tests for pure state/rule logic;
- add service/repository integration tests for persistence and transaction behavior;
- add controller/API tests for contract and authorization;
- add concurrency tests for stock confirmation and receipt/payment idempotency where relevant;
- verify no negative stock, duplicate ledger movement or partial commit.

At minimum preserve the Analyst acceptance criteria AC-01..AC-10 in `docs/10-testing-strategy.md`.

## 10. Execution protocol

For each task:

1. Inspect the current repository tree, build files, configuration and existing code.
2. Identify affected module(s), source requirement IDs and DB tables.
3. State any unresolved material decision before changing architecture/dependencies/schema.
4. Implement the smallest coherent vertical slice.
5. Run compile + relevant tests.
6. Review diff for boundary violations, speculative fields/rules and accidental API changes.
7. Report: files changed, rules implemented, tests run, remaining blockers/TBD.

Do not silently “finish” a TBD requirement by inventing behavior.
