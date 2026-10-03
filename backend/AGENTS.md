# FIDO Backend Java — Codex Rules

## 1. Mission

Implement the FIDO backend from the approved Analyst Docs while preserving the agreed **Modular Monolith + Package by Feature** architecture. Correctness, traceability, transactional integrity and minimal scope take precedence over code volume.

## 2. Mandatory read order before coding

Read these files first:

1. `docs/00-source-of-truth.md`
2. `docs/01-architecture-package-structure.md`
3. `docs/02-module-ownership.md`
4. the domain-specific sections in `docs/03` through `docs/10`
5. `docs/11-implementation-phases.md`
6. `docs/12-tbd-out-of-scope.md`
7. `docs/15-technical-decisions.md`

Never infer a missing **business rule** from common e-commerce practice. Do not confuse an unresolved technical implementation choice with a business blocker.

## 3. Decision classification — mandatory before blocking

Every unresolved point must be classified into exactly one category.

### A. HARD BLOCK

Stop only the affected slice when proceeding would require inventing or changing one of:

- business behavior or policy;
- public API semantics/contract;
- security guarantee;
- persistent business data meaning or irreversible schema;
- state machine;
- money or stock semantics;
- external integration contract.

A HARD BLOCK does **not** automatically stop the entire phase. Continue all independent work in the same phase.

### B. TECHNICAL DECISION

Do **not** block for ordinary implementation choices when source semantics are already clear, including:

- Java class/method/private-helper naming;
- repository method naming;
- JPQL vs Specification/query implementation;
- mapper implementation;
- exception class organization;
- package decomposition inside an approved module;
- technical enum/literal names when business states/semantics are already fixed;
- permission capability code names when the required authorization behavior is already fixed.

For a TECHNICAL DECISION: choose the smallest conventional solution compatible with the repo, record it in `docs/15-technical-decisions.md`, test it, and continue.

### C. DEFERRED FEATURE

If the source explicitly defers a feature (for example guest verification details, voucher rules, Notification, detailed size guide), skip only that feature/slice and continue the rest of the phase.

## 4. Architecture invariants

- Base package: `com.fido`.
- Entry point: `com.fido.FidoApplication`.
- Global technical packages only:
  - `com.fido.config.{security,web,documentation}`
  - `com.fido.common.{exception,response}`
- Business code must live under `com.fido.modules.<module>`.
- Baseline modules: `account`, `product`, `cart`, `promotion`, `order`, `inventory`, `audit`, `report`, `content`.
- Inside a module create only needed packages from: `controller`, `service`, `repository`, `entity`, `dto.request`, `dto.response`, `mapper`.
- Do not create fake classes just to make a folder non-empty.
- Do not create system-wide root `controller/service/repository/entity/dto` packages.
- Do not introduce Hexagonal/Clean/DDD ports, generic base services, generic repositories, mediator buses, event buses, CQRS, outbox, microservices, or abstractions only to appear “SOLID” unless the existing repository already requires them.
- Use constructor injection.
- Controller: HTTP binding, request validation, authentication context extraction, call Service, return DTO.
- Service: business rules, orchestration, authorization checks when domain-specific, transactions.
- Repository: persistence/query only; no business state machine.
- Entity: persistence model; never return Entity directly from Controller.
- DTO: API contract only.
- Mapper: explicit transformation; do not add a mapping library only for convenience.

## 5. Module boundary rules

- A module must not call another module's Repository directly.
- Cross-module write behavior goes through that module's Service/contract.
- Cross-module read aggregation may use a dedicated query service/projection but must not leak foreign JPA entities across modules.
- `order` owns checkout, order lifecycle, COD/payment, shipping info and after-sales command.
- `inventory` owns supplier, goods receipt, current sellable availability and immutable inventory ledger.
- `account` owns account/address/RBAC persistence.
- `product` owns all catalog/master/product/variant persistence.
- `report` is read/query logic and has no baseline aggregate table.

## 6. Source discipline

- Do not add a business column, endpoint, state, request field, response field, lifecycle, table or business rule unless supported by the source hierarchy.
- Technical names may be introduced when needed to encode already-approved semantics; record them in `docs/15-technical-decisions.md`.
- Preserve Analyst terminology for locked state machines.
- Where only the technical enum name is TBD but the semantics are locked, choose a minimal literal set and continue; do not use that as a reason to stop a phase.
- Keep genuine blocked/TBD behavior visibly blocked.

## 7. Data and transaction rules that must never be violated

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

## 8. API rules

- Implement only the current 77 green baseline endpoints in `docs/04-api-contract.md`, subject to yellow/TBD exclusions.
- JSON field naming: `snake_case`.
- Object response: `{ "data": <Dto> }`.
- Paginated list response: `{ "data": [<Dto>], "meta": <PaginationMeta> }`.
- Specific endpoint contracts override the generic list convention; API #66 permissions and API #73 content-page list are unpaginated `{ "data": [...] }` responses.
- Default page = 1, page_size = 20, max page_size = 100 where pagination applies.
- `/api/v1/me/**` and `/api/v1/admin/**` require Bearer JWT.
- JWT minimum claims: `sub=account_id`, `iat`, `exp`.
- Never accept client-controlled totals, actor IDs, generated IDs, timestamps or workflow states where server-derived.
- Do not add refresh-token API.
- Do not invent a global error-envelope schema.

## 9. Security and permissions

- Store only `password_hash`, never clear passwords.
- Backend authorization is mandatory; UI hiding is not authorization.
- Do not log credentials, tokens or unnecessary PII.
- The employee **role-to-permission matrix** is business TBD; do not invent which employee role receives which capability.
- Capability code names themselves are technical identifiers and may be defined when an implemented endpoint requires authorization. Record them in `docs/15-technical-decisions.md`.
- SUPERADMIN is the highest technical administrator per approved repository decision.
- Do not finalize guest order lookup with a weak phone-only mechanism.

## 10. Testing requirements

For every behavior changed:

- unit-test pure state/rule logic;
- integration-test persistence and transaction behavior;
- controller/API-test contract and authorization;
- concurrency-test stock confirmation and receipt/payment idempotency where relevant;
- verify no negative stock, duplicate ledger movement or partial commit.

At minimum preserve Analyst acceptance criteria AC-01..AC-10 in `docs/10-testing-strategy.md`.

## 11. Execution protocol

For each phase/task:

1. Inspect current branch HEAD and existing code.
2. Identify affected modules, source IDs, APIs and tables.
3. Classify every unresolved point as HARD BLOCK / TECHNICAL DECISION / DEFERRED FEATURE.
4. Continue all work not genuinely blocked.
5. Record technical decisions in `docs/15-technical-decisions.md`.
6. Implement the smallest coherent vertical slice.
7. Run compile + relevant tests.
8. Review diff for boundary violations, speculative business fields/rules and accidental API changes.
9. Report changed files, rules implemented, tests, technical decisions, deferred items and remaining hard blockers.
10. Do not start a later phase before the current phase gate passes.

A phase must never be reported BLOCKED solely because of a naming choice or another ordinary implementation detail.

## Code Review Rules

### Review scope and evidence

- Record the reviewed head SHA and diff/base. Inspect relevant surrounding code and source documents; distinguish changed-code findings from pre-existing issues. Do not claim whole-backend coverage from a branch diff.
- Report a finding only with file/line, a concrete scenario or change-cost impact, the applicable source rule or design principle, and the smallest feasible correction. Prioritize correctness, security, data integrity and maintainability over style. CI passing does not establish architectural quality.

### Design quality without ceremony

- Apply KISS, YAGNI, Boy Scout Rule, Separation of Concerns, Low Coupling, High Cohesion, Law of Demeter, Curly's Law, Principle of Least Astonishment and Least Privilege in context. Flag tangled ownership, hidden side effects, unnecessary dependencies, repeated business rules, accidental privilege or gratuitous abstractions when their impact is demonstrable.
- Do not require one interface per service, a fixed number of classes/methods, or Query/Command splitting in every module. Commands may read for validation or response; queries must remain free of persistence mutations. Judge a proposed split by whether it improves a real responsibility, dependency or transaction boundary without disproportionate complexity.
- Use `docs/13-codex-prompts.md` for optional review prompts. Review output is evidence for engineering decisions, not a CI/Work gate.
