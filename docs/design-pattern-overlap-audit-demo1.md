# FIDO demo1 — Design Pattern Overlap & Architecture Audit

- Repository: https://github.com/quangson2809/FIDO
- Branch audited: demo1
- Code baseline reviewed: 78f6d0f015abae7a4f5afc1fb0180cab3a029e2a
- Scope: the **18 specifically requested patterns** against the actual Java/Spring backend.
- Reference: [Refactoring.Guru — Design Patterns catalog](https://refactoring.guru/design-patterns). Its classic catalog contains 22 patterns; this audit covers the requested subset of 18, excluding Singleton, Flyweight, Iterator and Visitor.
- Method: inspect the source implementation and classify it as an actual pattern, a related mechanism, a candidate or not justified. A similar outcome or a class name alone is not proof of GoF structure.

## Executive result

**Design conclusion: the current modular monolith should be preserved.** Do not force 18 new pattern implementations into the backend. The clearest existing GoF-style example is the Adapter-style image-storage boundary. The order module has state-transition policy and command-like dispatch, but those are not the full GoF State and Command structures. Spring-managed transaction/security proxies are framework mechanisms. Use-case services do orchestration but are not automatically GoF Facades or Mediators.

**CI evidence:** the backend verification workflow ran on the audited code baseline 78f6d0f015abae7a4f5afc1fb0180cab3a029e2a and completed successfully: [GitHub Actions run 39571635536](https://github.com/quangson2809/FIDO/actions/runs/39571635536). This result applies to that commit; it is not evidence that a later documentation-correction branch has been tested.

## 1. Corrected 18-pattern matrix

| # | Pattern and canonical intent | FIDO evidence | Classification | Decision |
|---:|---|---|---|---|
| 1 | [Factory Method](https://refactoring.guru/design-patterns/factory-method) — delegate product creation to a method that concrete creators can specialize | ImageStorageGateway has one implementation, ImgBbImageStorageClient | Not currently present; one implementation | Do not add a creator hierarchy yet. A provider-keyed switch is Simple Factory, not automatically GoF Factory Method. |
| 2 | [Abstract Factory](https://refactoring.guru/design-patterns/abstract-factory) — create a compatible family of related products | Only one image-storage provider and one upload capability are evidenced | Not present | No family of provider clients exists that warrants an Abstract Factory. |
| 3 | [Builder](https://refactoring.guru/design-patterns/builder) — construct a complex object step by step while enforcing construction invariants | Checkout DTO construction is explicit; CheckoutCalculation is a focused value/result type | Not present; candidate only if complexity grows | Do not replace a clear short constructor with a Builder. Builder examples must implement an actual builder, not merely show a record or factory. |
| 4 | [Prototype](https://refactoring.guru/design-patterns/prototype) — create objects by copying an existing prototype | JPA entities carry database identity and relations; historical order snapshots have distinct semantics | Not present | Do not clone managed JPA entities. A ProductDraft.from(source) projection is an explicit copy/mapping helper, not itself GoF Prototype. |
| 5 | [Adapter](https://refactoring.guru/design-patterns/adapter) — convert an external/incompatible interface to the interface the application expects | ImageStorageGateway + ImgBbImageStorageClient encapsulate provider HTTP details and normalize the response to UploadedImage | **Present as an Adapter-style integration boundary** | Keep this boundary. Do not add a second adapter layer unless another distinct contract requires it. |
| 6 | [Facade](https://refactoring.guru/design-patterns/facade) — provide a simplified interface over a complex subsystem | CheckoutQuoteService coordinates cart locking/calculation/quote storage; GoodsReceiptService coordinates receipt/inventory/audit | Application-service orchestration, not proof of a separate GoF Facade | Keep the use-case services. Do not count them as a separately implemented Facade or add a forwarding-only facade class. |
| 7 | [Decorator](https://refactoring.guru/design-patterns/decorator) — wrap an object with the same contract to add behavior compositionally | The image client currently logs provider outcome/duration directly; no common wrapper requirement is evidenced | Not present; possible future wrapper | Consider only when multiple implementations need shared metrics/tracing. An empty delegating wrapper is not a Decorator because it adds no behavior. |
| 8 | [Proxy](https://refactoring.guru/design-patterns/proxy) — stand in for a subject to control access or intercept invocation | Spring uses proxy-based mechanisms for declarative transactions and method security, including @Transactional and @PreAuthorize under the configured proxy model | Framework-provided mechanism; no custom domain Proxy | Reuse Spring infrastructure. Repository row locking is concurrency control, not itself the Proxy pattern. Preserve the self-invocation caveat for proxy advice. |
| 9 | [Composite](https://refactoring.guru/design-patterns/composite) — treat individual objects and compositions uniformly through a common component interface | Categories are hierarchical in relational storage; current code does not establish a recursive domain operation requiring uniform category-group/leaf treatment | Not justified by storage hierarchy alone | Revisit only for a concrete recursive catalog operation. Avoid recursive JPA graphs without bounded query behavior. |
| 10 | [Bridge](https://refactoring.guru/design-patterns/bridge) — separate abstraction from an independently varying implementation axis | Image storage shows a single provider and upload capability | Not present | No two independent variation axes are evidenced. Do not introduce interfaces purely to resemble a Bridge. |
| 11 | [Strategy](https://refactoring.guru/design-patterns/strategy) — encapsulate interchangeable algorithms behind a common contract | VoucherRedemptionService.discount(...) distinguishes percentage from fixed amount in one bounded method | Algorithmic variation exists; GoF Strategy classes are not present | Keep the current simple calculation until algorithms or selection rules materially grow. Verify unknown discount_type behavior independently; do not let an unknown type silently act as fixed discount. |
| 12 | [State](https://refactoring.guru/design-patterns/state) — delegate behavior to state objects so behavior changes with internal state | OrderPolicy owns the transition graph; OrderActionPolicy checks action preconditions; OrderActionService executes side effects | **State-related policy, not full GoF State** | Keep state rules centralized. Per-state objects are not justified unless state-dependent behavior becomes materially complex. |
| 13 | [Command](https://refactoring.guru/design-patterns/command) — encapsulate a request as an object separate from the object that invokes it | OrderActionService dispatches named action strings to methods in an explicit switch | **Command-like dispatch, not full GoF Command** | No command object hierarchy/bus is needed for the current action set. Revisit only if action objects must be queued, scheduled, persisted, composed or independently reused. |
| 14 | [Template Method](https://refactoring.guru/design-patterns/template-method) — define an algorithm skeleton in a superclass with controlled overridable steps | Goods receipt and order lifecycle have different authorization, stock, voucher and rollback semantics | Not justified | Similar step names do not establish a common invariant algorithm. Prefer composition and use-case-specific transactions. |
| 15 | [Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility) — pass a request through independent handlers until handled or rejected | Checkout and receipt validations are currently explicit invariants in their services | Not present | Do not turn each validation into a handler. A chain requires explicit ordering, pass/stop semantics and a reason for independent composition. |
| 16 | [Observer](https://refactoring.guru/design-patterns/observer) — notify subscribers when an event occurs without coupling the producer to every subscriber | AuditService.record uses Propagation.MANDATORY and persists synchronously inside the caller transaction | Not the Observer pattern | Do not replace mandatory transactional audit with best-effort/asynchronous events. Future post-commit notifications need an explicit delivery contract; durable delivery may require an outbox design. |
| 17 | [Mediator](https://refactoring.guru/design-patterns/mediator) — centralize communication among peer objects to remove many-to-many dependencies | Checkout and receipt use-case services coordinate their own collaborators | No separate GoF Mediator evidenced | An application service coordinating its dependencies is not automatically a Mediator. No extra mediator/bus is warranted by current evidence. |
| 18 | [Memento](https://refactoring.guru/design-patterns/memento) — capture and restore an object's state without exposing its internals | Order/item snapshots preserve historical business facts; cancellation explicitly executes stock/voucher compensation rules | Not present | Historical snapshots are not Mementos. Only introduce a Memento-style draft undo if product requirements define allowed fields, actors, staleness, expiry and audit behavior. |

## 2. Focused architecture review against the source

### Image-storage integration

- ImageStorageGateway is the product-owned application contract.
- ImgBbImageStorageClient implements the contract while handling provider-specific HTTP requests, response validation, timeout/error mapping and safe logging.
- The contract is upload-only. The source intentionally avoids remote asset deletion because historical order snapshots may reference image URLs.

**Conclusion:** retaining the Adapter-style boundary is justified. Factory Method, Abstract Factory, Decorator and Bridge should not be added unless the actual supported integration model grows.

Evidence: [ImageStorageGateway.java](../backend/src/main/java/com/fido/modules/product/service/ImageStorageGateway.java), [ImgBbImageStorageClient.java](../backend/src/main/java/com/fido/modules/product/service/ImgBbImageStorageClient.java).

### Checkout and Goods Receipt orchestration

- CheckoutQuoteService coordinates cart locking, checkout calculation, quote persistence and result mapping.
- CheckoutCalculationService owns checkout readiness and calculation.
- CheckoutQuoteStore owns quote persistence, expiry and fingerprint matching.
- GoodsReceiptService coordinates receipt validation/persistence, inventory commands and audit.
- InventoryCommandService centralizes stock mutation and immutable ledger writes under Propagation.MANDATORY.
- AuditService.record also requires an existing transaction.

**Conclusion:** these are coherent application-service, module-ownership and transaction boundaries. Facade/Mediator are useful comparison concepts, not proof that separate GoF classes should be added. Do not move stock or transactional audit into a generic event pipeline.

Evidence: [CheckoutQuoteService.java](../backend/src/main/java/com/fido/modules/order/service/CheckoutQuoteService.java), [GoodsReceiptService.java](../backend/src/main/java/com/fido/modules/inventory/service/GoodsReceiptService.java), [InventoryCommandService.java](../backend/src/main/java/com/fido/modules/inventory/service/InventoryCommandService.java), [AuditService.java](../backend/src/main/java/com/fido/modules/audit/service/AuditService.java).

### Order lifecycle

- OrderPolicy defines legal status edges.
- OrderActionPolicy computes action availability and checks preconditions/idempotent repeats.
- OrderActionService coordinates order/payment state with inventory, voucher restoration and audit.

**Conclusion:** state transition policy and command-like dispatch complement one another but are not textbook GoF State/Command implementations. Keep the separation. A refactor should not add per-state classes or a generic command bus just to match pattern names.

Evidence: [OrderPolicy.java](../backend/src/main/java/com/fido/modules/order/service/OrderPolicy.java), [OrderActionPolicy.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionPolicy.java), [OrderActionService.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionService.java).

## 3. Corrections and review rules applied to the companion study

The companion file, [design-patterns-18-before-after-demo1.md](design-patterns-18-before-after-demo1.md), should follow these accuracy rules:

1. Mark that the list is 18 requested patterns from the 22-pattern Refactoring.Guru classic catalog, not the full catalog.
2. Link each section to its official pattern definition.
3. Do not describe a provider-keyed simple factory as Factory Method without the creator/product structure.
4. A Builder example must contain a builder API; a record/constructor alone is not Builder.
5. A DTO projection/copy helper is not automatically Prototype.
6. A forwarding service is not automatically a GoF Facade or Mediator.
7. Spring transaction/security proxies are framework mechanisms; repository locks are not Proxy.
8. Order transition tables are not the full State pattern, and a switch over action names is not the full Command pattern.
9. A chain interface, a delegating wrapper with no extra behavior, or a snapshot DTO alone does not constitute Chain of Responsibility, Decorator or Memento.
10. Mark all illustrative snippets as candidates—not as implemented code—and require real diffs/tests before claiming production adoption.

## 4. Architecture guardrails

- Preserve the modular monolith and package-by-feature ownership.
- No module may directly call another module's repository.
- Keep public DTO/API contracts separate from JPA entities.
- Preserve authorization, transaction boundaries, inventory invariants, voucher accounting, order transitions and money calculation in their owning modules.
- Do not add custom proxies, generic command/event buses, per-state classes, generic base services or abstractions solely to demonstrate a pattern.
- Do not infer notification delivery, create-order retry/deduplication, voucher stacking or return/restock behavior from a pattern name.
- For the ERD v2 refactor, reassess pattern applicability after schema/domain decisions are approved; Product parent/child alone does not automatically mean Composite is needed.

## 5. Verification ledger

- [x] Inspected the 18-pattern study and the overlap audit.
- [x] Compared the 18 pattern intents/structures with the official Refactoring.Guru catalog and individual pattern pages.
- [x] Inspected the cited Java/Spring source paths at the code baseline identified above.
- [x] Confirmed that the demo1 backend workflow trigger exists and the workflow run for the audited baseline succeeded.
- [ ] Run compile/tests specifically for the documentation-correction branch; the branch is intentionally excluded from the backend push allowlist and contains documentation-only changes.
- [ ] Review the resulting documentation diff and final branch SHA.

No production source code, database schema, API contract or business behavior is changed by this documentation audit.

## Final assessment

The prior audit was directionally correct in advising against force-fitting patterns, but its matrix did not consistently match the requested 18 patterns: it included Singleton/Flyweight and omitted Mediator/Memento, and it sometimes treated framework/application-layer similarities as stronger pattern evidence than warranted. This revised audit uses the exact requested list and clearly distinguishes real implementations, framework mechanisms, pattern-adjacent designs and deferred candidates.

**Acceptance rule:** a pattern is considered implemented only when the code has the defining collaboration structure, an actual diff and relevant verification—not merely a class name, a similar responsibility or an illustrative snippet.
