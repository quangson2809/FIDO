# FIDO demo1 — Design Pattern Overlap & Architecture Audit

- Branch: `demo1`
- Audited baseline: `6bbf5145179cf4ec395132fd74da2543bcd3fa00`
- Audit scope: proposed 18-pattern mapping; backend architecture guidance; Goods Receipt/Inventory, Checkout/Quote, Order lifecycle, Audit, image-storage integration; CI trigger configuration.
- Principle: apply a pattern only when it resolves a demonstrated problem. This report does not treat all 18 GoF patterns as a production checklist.

## Executive result

**Result: PARTIAL pending CI execution.** The reviewed code supports the existing Modular Monolith + package-by-feature + layered architecture. The reviewed use cases already have focused orchestration/policy/integration components. No new GoF class hierarchy is justified by the available evidence. One concrete verification gap was found and fixed: the backend verification workflow did not run on pushes to `demo1`.

The audit is a code/design review from repository content. Build/test execution is not claimed here; the workflow change should trigger GitHub Actions after push and its actual run must be checked.

## 1. Confirmed finding

### MAJOR — backend verification was not configured for `demo1`

**Evidence:** `.github/workflows/backend-verification.yml` had an explicit push branch allowlist that omitted `demo1`. Its pull-request trigger targets `main`; therefore ordinary backend commits pushed directly to `demo1` did not trigger the H2 build/test and MySQL migration/mapping/test job.

**Impact:** backend changes on the requested working branch could be merged or evaluated without the repository's declared backend verification being triggered automatically.

**Correction applied:** added `demo1` to the existing push branch allowlist. Existing commands, permissions, database service, and other branch triggers were preserved. This is a CI configuration correction, not a change to business behavior.

**Verification:** the workflow file was updated on `demo1`; the resulting commit is `c993cf110baebddc581aa22b26a1710cf65f9e4f`. The actual Actions run must still be checked after GitHub schedules it.

## 2. Pattern overlap and complementarity

| Pattern(s) | Existing implementation/evidence | Assessment | Decision |
|---|---|---|---|
| Singleton | Spring-managed services such as checkout and catalog services | Spring already manages the default singleton scope. Request-specific state is passed as method data. | Do not hand-roll Singleton. Keep beans stateless across requests. |
| Builder | `CheckoutCalculation`, quote DTOs and snapshot-oriented order data | The reviewed construction is explicit and bounded. No evidence that constructor/factory readability or invariants require a builder. | Do not add Builder by default. Revisit only if construction becomes materially hard to read or can create invalid states. |
| Factory Method | No demonstrated family of interchangeable implementations in the reviewed flows | A factory with one implementation would add indirection without solving a current problem. | Not currently justified. |
| Facade | `GoodsReceiptService` orchestrates receipt validation, persistence, inventory command and audit; `CheckoutQuoteService` coordinates cart locking, calculation and quote storage | These are application/use-case orchestration roles already present. Adding another facade above them risks duplicate orchestration. | Keep current service entry points; review cohesion before splitting or wrapping them. |
| Adapter | `ImageStorageGateway` isolates the product module from `ImgBbImageStorageClient` and provider-specific response types | This is a real integration boundary and the abstraction has a concrete implementation/use. | Keep it. Do not add a second adapter layer without a second contract or integration need. |
| Proxy | Spring `@Transactional`, `@PreAuthorize` and repository locking | Framework proxies already provide transaction/security interception. Self-invocation remains a general risk to check when transaction annotations are moved or called internally. | Do not implement custom Proxy. Preserve public service transaction boundaries and verify them with integration tests. |
| Strategy | Voucher discount calculation selects between fixed and percentage calculation; checkout currently has one shipping-fee configuration | The discount alternatives are a small bounded calculation, not evidence of a changing algorithm family requiring separate classes. Shipping strategy would be speculative. | Keep the simple calculation until more policies exist or variation becomes complex. |
| Chain of Responsibility | Checkout and receipt flows perform ordered validations in service methods | These validations are not shown to be dynamically extensible handlers. Turning every condition into a handler would increase indirection and fragment invariant enforcement. | Keep direct validation methods unless a genuine configurable pipeline is required. |
| State + Command | `OrderPolicy` owns transition graph; `OrderActionPolicy` maps named actions to target statuses and evaluates prerequisites/idempotent repeat; `OrderActionService` executes side effects | Complementary: state policy answers whether a transition/action is legal; the service executes the command and coordinates stock, voucher and audit effects. | Keep these boundaries. Do not create one class per state or queue every command. |
| Composite | Catalog has relational category data, but the reviewed evidence does not establish that domain behavior requires recursive uniform treatment of category/product nodes | A hierarchy in storage alone does not require Composite. Recursive entity graphs may worsen query/N+1 behavior. | Defer unless an actual tree operation/API needs recursive domain behavior. |
| Decorator | Image client has bounded provider-result logging and duration measurement inside the integration implementation | No demonstrated need for multiple interchangeable wrappers or cross-cutting metrics abstraction. | Do not add Decorator solely to log/measure. Consider only if the same concern must wrap multiple clients consistently. |
| Template Method | Goods receipt and order lifecycles have distinct rules and side effects | Similar high-level sequencing is not enough to justify inheritance; the workflows differ in transaction and stock semantics. | Prefer existing composition and focused services. No template superclass. |
| Observer | `AuditService.record` is invoked synchronously under `Propagation.MANDATORY`; notifications are explicitly deferred in project docs | Audit is currently part of the same transaction contract, not a best-effort event subscriber. In-memory events could obscure failure/commit semantics. | Do not replace audit calls with Observer. Revisit only with an approved event-delivery contract; durable delivery may require a separately designed outbox. |
| Abstract Factory | Reviewed image storage has one provider implementation, and no compatible product family is demonstrated | There is no family of implementations to construct. | Not justified. |
| Flyweight | No profiling or memory-allocation evidence supplied | Optimization would be speculative. | Do not implement without measurement. |
| Prototype | Orders and inventory entities have identity, relations and historical semantics; order-item snapshots are explicit | Cloning JPA entities risks identity and association errors. | Do not clone entities. Build explicit snapshot data where required. |
| Bridge | No demonstrated pair of independently varying abstraction and implementation dimensions | Could overlap with Strategy/Adapter/Factory and increase type count. | Not justified for current code. |

## 3. Focused responsibility review

### Goods Receipt → Inventory → Audit

- `GoodsReceiptService` owns the use case and locks the receipt for state-changing operations through its repository lookup.
- `InventoryCommandService` is the inventory-owned write boundary and requires an existing transaction with `Propagation.MANDATORY`. It updates inventory and records inventory transactions together.
- `AuditService.record` also requires an existing transaction, so audit persistence participates in the caller's transaction.
- `GoodsReceiptHttpTests` checks repeated confirmation does not duplicate receipt stock movement and checks confirmed receipts cannot be patched.

**Conclusion:** the current orchestration/ownership/transaction split is coherent in the reviewed path. Facade, Proxy and Command are useful explanatory lenses, but do not warrant additional classes. Concurrent receipt confirmation still depends on database locking and transaction tests; the inspected repository uses a pessimistic write lock, but this review did not execute a concurrent test.

### Checkout quote

- `CheckoutQuoteService` owns the quote use case and calls cart locking before calculation and quote storage.
- `CheckoutCalculationService` owns quote arithmetic and validates checkout readiness.
- `CheckoutQuoteStore` owns quote persistence, expiry and fingerprint matching.
- Voucher evaluation is delegated to the promotion module.

**Conclusion:** calculation, orchestration and persistence have distinct responsibilities. A Builder must not become a second pricing engine; a Strategy must not invent voucher/shipping policy. Voucher business behavior must follow the current technical/business decision documents rather than older deferred snapshots.

### Order actions

- `OrderPolicy` defines the allowed state transition graph and common state constants.
- `OrderActionPolicy` maps action names to target states, checks prerequisites such as paid status, and makes already-applied actions no-ops.
- `OrderActionService` coordinates the locked order, payment, inventory, voucher restoration and audit.

**Conclusion:** State and Command complement each other here. There is some repeated action vocabulary across the policy and service switch, but the mapping and execution switch serve different purposes; extracting a generic command bus or per-action class set is not justified without evidence that action growth is making this difficult to maintain. The current tests exercise allowed-action consistency across statuses and payment states.

### Image integration

- `ImageStorageGateway` is the product-owned contract.
- `ImgBbImageStorageClient` contains provider-specific HTTP details, response validation, timeout handling and safe result logging.
- The gateway's documented contract intentionally does not delete remote assets because historical order snapshots may reference their URLs.

**Conclusion:** Adapter is already used for a concrete boundary. Do not add Abstract Factory, Bridge or Decorator unless the system gains independent implementation dimensions or a shared wrapper requirement.

## 4. Architectural constraints preserved

- Keep Modular Monolith + package-by-feature + layered responsibilities.
- No cross-module repository access; writes go through the owning module's service.
- Keep entities separate from API DTOs.
- Keep transaction, authorization, stock and money semantics in their existing owners.
- Do not introduce custom proxy, generic command/event bus, CQRS, outbox, per-state classes, or generic base services merely to demonstrate patterns.
- Do not infer voucher stacking, retry deduplication, notification delivery or return/restock rules from pattern names. Follow the current source-of-truth and technical-decision documents.

## 5. Verification status and next checks

- [x] Confirmed `demo1` HEAD before change: `6bbf5145179cf4ec395132fd74da2543bcd3fa00`.
- [x] Reviewed backend architecture guidance and relevant implementation paths.
- [x] Identified and corrected the missing backend CI push trigger for `demo1`.
- [ ] Confirm the GitHub Actions backend workflow actually ran and passed after the workflow commit.
- [ ] Run backend H2 `clean compileJava test check build`.
- [ ] Run backend MySQL migration/mapping/tests.
- [ ] Run frontend lint/typecheck/build/browser checks if frontend code is changed.
- [ ] Review fresh commit status and final branch SHA.

No production business logic or API/schema was changed in this audit. The only source change so far is the backend CI trigger; this avoids refactoring healthy code merely to force pattern usage.
