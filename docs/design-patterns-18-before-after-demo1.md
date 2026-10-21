# FIDO demo1 — 18 Design Patterns: Before/After, Evidence and Adoption Decisions

- Repository: https://github.com/quangson2809/FIDO
- Target branch: `demo1`
- Baseline inspected: `af1af690b91f4ba3cfbc70f9f67a21f9d888996f`
- Scope: Java/Spring backend; package-by-feature modular monolith.
- Evidence policy: current snippets/links describe code that exists at the baseline. “After (candidate)” is an illustrative design unless explicitly labelled “already present”. It must not be read as a production change. No business behavior is changed by this document.
- Scope note: Refactoring.Guru's classic catalog lists 22 patterns. This document evaluates the specific 18 requested for FIDO; it does **not** claim to cover all 22. The four catalog patterns outside this request are Singleton, Flyweight, Iterator and Visitor. “Evaluate all 18” means assess applicability and demonstrate correct concepts, not force every pattern into production. Adding a pattern without a distinct problem would violate FIDO's architecture constraints and make the code worse.

## Reference and interpretation rules

The definitions and intended structures below are checked against the [Refactoring.Guru Design Patterns catalog](https://refactoring.guru/design-patterns) and its individual pages: [Factory Method](https://refactoring.guru/design-patterns/factory-method), [Abstract Factory](https://refactoring.guru/design-patterns/abstract-factory), [Builder](https://refactoring.guru/design-patterns/builder), [Prototype](https://refactoring.guru/design-patterns/prototype), [Adapter](https://refactoring.guru/design-patterns/adapter), [Facade](https://refactoring.guru/design-patterns/facade), [Decorator](https://refactoring.guru/design-patterns/decorator), [Proxy](https://refactoring.guru/design-patterns/proxy), [Composite](https://refactoring.guru/design-patterns/composite), [Bridge](https://refactoring.guru/design-patterns/bridge), [Strategy](https://refactoring.guru/design-patterns/strategy), [State](https://refactoring.guru/design-patterns/state), [Command](https://refactoring.guru/design-patterns/command), [Template Method](https://refactoring.guru/design-patterns/template-method), [Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility), [Observer](https://refactoring.guru/design-patterns/observer), [Mediator](https://refactoring.guru/design-patterns/mediator), and [Memento](https://refactoring.guru/design-patterns/memento).

A framework feature, a name, or a single switch is not automatically proof of a GoF pattern. Each “Applied” judgment requires matching roles and collaboration structure, not just a similar outcome. Candidate snippets are illustrations, not implemented production code.

## Architecture guardrails

Keep the existing dependency direction: Controller → Service/Application → owning module's repository. Cross-module writes go through the owning module service. Keep authorization, transaction boundaries, inventory invariants, voucher accounting, order status rules, and money calculations in their current owners. Do not add generic event/command buses, custom proxies, base services, per-state classes, or abstractions just to demonstrate GoF patterns.

## Executive matrix

| # | Pattern | Concrete FIDO problem evaluated | Baseline evidence | Decision |
|---:|---|---|---|---|
| 1 | Factory Method | Select among interchangeable implementations at object creation | Image storage currently has one configured provider implementation | Not justified yet |
| 2 | Abstract Factory | Create a compatible family of integration components | No second provider family / family of related components evidenced | Not justified |
| 3 | Builder | Construct complex immutable request/snapshot objects safely | Checkout calculation and DTO construction are explicit | Not justified by current evidence |
| 4 | Prototype | Copy an existing object while controlling identity/relations | JPA entities and historical order snapshots have identity and persistence semantics | Not justified; copying entities is risky |
| 5 | Adapter | Isolate product catalog from provider-specific image API | `ImageStorageGateway`, `ImgBbImageStorageClient` | Already present |
| 6 | Facade | Offer a simplified entry point over a subsystem | Checkout quote and goods receipt application services already orchestrate their use cases | No extra facade justified |
| 7 | Decorator | Compose optional behavior around clients without modifying them | Image provider logs result/duration directly; no shared wrapper requirement shown | Not justified yet |
| 8 | Proxy | Control access/lazy invocation/interception | Spring transaction/security proxies and repository locks already exist | Framework proxy already used; no custom proxy |
| 9 | Composite | Treat leaf and group nodes uniformly in recursive category operations | Category storage alone does not prove recursive domain operations are required | Not justified by current evidence |
| 10 | Bridge | Vary abstraction and implementation independently | Image storage has one integration dimension and one provider | Not justified yet |
| 11 | Strategy | Swap algorithms independently at runtime/configuration | Voucher discount calculation supports fixed and percentage rules in one bounded method | Candidate, but separate strategies may be needless indirection |
| 12 | State | Vary behavior and legal transitions based on lifecycle state | `OrderPolicy` and `OrderActionPolicy` | State rules already centralized; full GoF State classes not justified |
| 13 | Command | Represent a business request as an object separate from its invocation | Named order actions are dispatched in `OrderActionService` | Command-like dispatch already present; one class per action not justified |
| 14 | Template Method | Reuse a stable algorithm skeleton with controlled variable steps | Goods receipt and order lifecycle have different transaction/stock semantics | Not justified; inheritance would couple workflows |
| 15 | Chain of Responsibility | Route a request through independently composable handlers | Current validations are use-case invariants, not a configurable pipeline | Not justified |
| 16 | Observer | Notify independent subscribers about committed domain events | Audit is synchronously recorded inside the owning transaction | Do not replace transactional audit with asynchronous observer |
| 17 | Mediator | Reduce many-to-many component dependencies through one coordinator | Existing use-case services coordinate their own workflows | No separate mediator justified |
| 18 | Memento | Capture and restore an object's prior in-memory state | Order history/snapshots are persisted business records, not undo snapshots | Not justified |

---

## 1. [Factory Method](https://refactoring.guru/design-patterns/factory-method)

### Problem evaluated
Choose a storage implementation at construction time when FIDO supports multiple providers (for example, ImgBB and a second provider) without making catalog logic depend on provider details.

### Before — actual baseline
`ImageStorageGateway` has one implementation, `ImgBbImageStorageClient`. Spring dependency injection can resolve that single implementation without a factory.

```java
public interface ImageStorageGateway {
    UploadedImage upload(MultipartFile image);
    record UploadedImage(String url) {}
}
```

Evidence: [ImageStorageGateway.java](../backend/src/main/java/com/fido/modules/product/service/ImageStorageGateway.java), [ImgBbImageStorageClient.java](../backend/src/main/java/com/fido/modules/product/service/ImgBbImageStorageClient.java).

### After — valid GoF-shaped candidate, only if a second implementation is introduced
```java
interface ImageStorageCreator {
    ImageStorageGateway createStorage();
}

final class ImgBbStorageCreator implements ImageStorageCreator {
    @Override
    public ImageStorageGateway createStorage() {
        // Construct or obtain the configured ImgBB adapter here.
        return configuredImgBbGateway();
    }

    private ImageStorageGateway configuredImgBbGateway() {
        throw new UnsupportedOperationException("Illustrative pseudocode only");
    }
}
```

Factory Method delegates creation through a creator-level method so concrete creator implementations can select products behind a common interface. A factory that simply accepts a provider enum and switches on it is more accurately described as a **Simple Factory**; it is not automatically the GoF Factory Method. The snippet is illustrative pseudocode, not production Java. Spring @Bean methods or dependency injection alone do not prove that the application has implemented this GoF pattern. With only one storage provider, neither an explicit GoF creator hierarchy nor a provider selector is justified.

### Acceptance test if justified later
For every supported provider, verify the selected adapter and configuration; verify unknown provider configuration fails fast; verify credentials never appear in logs.

**Decision: NOT NEEDED** — one implementation is not a family.

---

## 2. [Abstract Factory](https://refactoring.guru/design-patterns/abstract-factory)

### Problem evaluated
Create a compatible family of related integration objects when a provider requires multiple coordinated clients (for example, upload and asset-management clients with shared credentials/endpoint/version).

### Before — actual baseline
`ImageStorageGateway.upload` is a single capability. The gateway explicitly documents upload-only behavior and defers deletion/reference tracking because order snapshots can retain image URLs.

Evidence: [ImageStorageGateway.java](../backend/src/main/java/com/fido/modules/product/service/ImageStorageGateway.java).

### After — candidate shape, not production code
```java
public interface ImageProviderFactory {
    ImageStorageGateway imageStorage();
    ImageMetadataClient metadataClient();
}
```

No second family or metadata client is established in the baseline. Adding this now would invent capabilities and couple unrelated concerns.

### Acceptance test if justified later
A provider factory must return clients using the same provider configuration and credentials, and integration tests must prove that incompatible client combinations cannot be assembled.

**Decision: NOT NEEDED** — no compatible family of products is evidenced.

---

## 3. [Builder](https://refactoring.guru/design-patterns/builder)

### Problem evaluated
Avoid invalid or unreadable construction when an object has many optional fields and invariants that must be enforced together.

### Before — actual baseline
Checkout explicitly maps calculation results into a response DTO and persists a quote:

```java
var saved = quotes.save(
    accountId,
    request.recipient_phone(),
    request.recipient_email(),
    request.recipient_address(),
    calculation);
return new CheckoutQuoteDto(
    quoteItems, calculation.subtotal(), calculation.discount(),
    calculation.shippingFee(), calculation.total(), voucherDto,
    saved.getQuoteId(), saved.getExpiresAt());
```

Evidence: [CheckoutQuoteService.java](../backend/src/main/java/com/fido/modules/order/service/CheckoutQuoteService.java).

### After — correct Builder shape, illustrative only if construction becomes genuinely complex
```java
public final class CheckoutTotals {
    private final BigDecimal subtotal;
    private final BigDecimal discount;
    private final BigDecimal shippingFee;
    private final BigDecimal total;

    private CheckoutTotals(Builder builder) {
        this.subtotal = Objects.requireNonNull(builder.subtotal);
        this.discount = Objects.requireNonNull(builder.discount);
        this.shippingFee = Objects.requireNonNull(builder.shippingFee);
        this.total = Objects.requireNonNull(builder.total);
        if (subtotal.signum() < 0 || discount.signum() < 0
                || shippingFee.signum() < 0 || total.signum() < 0) {
            throw new IllegalArgumentException("Checkout amounts must be non-negative");
        }
    }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {
        private BigDecimal subtotal;
        private BigDecimal discount;
        private BigDecimal shippingFee;
        private BigDecimal total;

        public Builder subtotal(BigDecimal value) { subtotal = value; return this; }
        public Builder discount(BigDecimal value) { discount = value; return this; }
        public Builder shippingFee(BigDecimal value) { shippingFee = value; return this; }
        public Builder total(BigDecimal value) { total = value; return this; }
        public CheckoutTotals build() { return new CheckoutTotals(this); }
    }
}
```

This is a valid Builder structure, but it is **not a proposed production change**. A four-field value object is probably too simple to benefit from it, and constructing a checkout value must not create a second pricing engine. If ever adopted, keep total calculation and its business invariant owned by the existing checkout calculation service; the Builder should only assemble a validated result. `Objects` would need `java.util.Objects` imported.

### Acceptance test if justified later
Test every valid construction path and ensure required values cannot be omitted. Ensure total/discount invariants match current checkout rules and API contract.

**Decision: NOT NEEDED currently** — construction is explicit; no demonstrated invalid-state or readability problem requiring a Builder.

---

## 4. [Prototype](https://refactoring.guru/design-patterns/prototype)

### Problem evaluated
Create a new object from an existing template while deliberately controlling which values and relationships are copied.

### Before — actual baseline
FIDO's inventory/order entities have database identity and business references. Order items also carry historical product/variant snapshots. Blindly cloning a JPA entity risks duplicating IDs, relationships, audit metadata, and historical values.

Evidence: [OrderActionService.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionService.java); the order action service reads persisted order items and creates typed stock lines rather than cloning entities.

```java
return orderItems(orderId).stream()
    .map(item -> new InventoryCommandService.StockLine(
        item.getVariantId(), item.getQuantity()))
    .toList();
```

### After — safe alternative for a future “duplicate product” use case
```java
public record ProductDraft(
        String name,
        String description,
        BigDecimal basePrice) {

    public static ProductDraft from(Product source) {
        return new ProductDraft(
                source.getName(),
                source.getDescription(),
                source.getBasePrice());
    }
}
```

This is an explicit draft projection, not an entity clone. It intentionally excludes database identity, inventory, images, and publication state; those fields must be selected by a real product-copy business rule before implementation.

### Acceptance test if justified later
Copied draft has no source ID, does not share mutable collections, and does not duplicate inventory/order history.

**Decision: NOT NEEDED** — no product-duplication use case is evidenced.

---

## 5. [Adapter](https://refactoring.guru/design-patterns/adapter) — ALREADY PRESENT

### Problem solved
Keep catalog code independent of the provider-specific HTTP request/response, timeouts, and provider error formats.

### Before — architectural problem this boundary prevents
Without an adapter, product service code would need to know ImgBB-specific request details, response fields, and provider exceptions. This is a contrast scenario, not a claim that the current baseline has that defect.

```java
// Anti-example only: provider details leak into a catalog use case.
var response = restClient.post()
        .uri("/1/upload?key=" + apiKey)
        .retrieve()
        .body(ImgBbUploadResponse.class);
```

### After — actual baseline
```java
public interface ImageStorageGateway {
    UploadedImage upload(MultipartFile image);
    record UploadedImage(String url) {}
}
```

`ImgBbImageStorageClient` implements the gateway and owns provider HTTP handling, response validation, timeouts and safe result logging. The contract deliberately does not expose provider response DTOs.

Evidence: [ImageStorageGateway.java](../backend/src/main/java/com/fido/modules/product/service/ImageStorageGateway.java), [ImgBbImageStorageClient.java](../backend/src/main/java/com/fido/modules/product/service/ImgBbImageStorageClient.java).

### Acceptance tests
Provider success maps to a validated URL; invalid response maps to an integration error; timeout maps to gateway timeout; missing API key fails as unavailable; logs do not contain the API key or uploaded content.

**Decision: APPLIED IN BASELINE** — concrete external integration boundary. This document does not claim new implementation or newly executed tests.

---

## 6. [Facade](https://refactoring.guru/design-patterns/facade)

### Problem evaluated
Expose a simplified interface to a complex subsystem so callers do not need to know the subsystem's internal collaboration.

### Before — actual baseline
The orchestration already sits in application services. Checkout quote locks the cart, calculates checkout, saves a quote and maps the response. Goods receipt coordinates receipt validation, inventory commands and audit.

Evidence: [CheckoutQuoteService.java](../backend/src/main/java/com/fido/modules/order/service/CheckoutQuoteService.java), [GoodsReceiptService.java](../backend/src/main/java/com/fido/modules/inventory/service/GoodsReceiptService.java).

```java
cart.lockForCheckout(accountId);
CheckoutCalculation calculation =
        checkout.calculate(accountId, request.voucher_code());
var saved = quotes.save(
        accountId, request.recipient_phone(),
        request.recipient_email(), request.recipient_address(),
        calculation);
```

### After — adoption decision
Do not count `CheckoutQuoteService` or `GoodsReceiptService` as the GoF Facade merely because each orchestrates a use case. They are application/use-case services. Their APIs may provide a facade-like simplification, but the evidence does not establish a separate GoF Facade over a subsystem. Do not add another class that only forwards to an existing service. Reconsider only if an external caller needs a deliberately simplified, stable interface over several distinct subsystem operations.

### Acceptance tests
If a facade is introduced, verify that it does not duplicate authorization, transactions, quote-expiry rules, or error mapping; integration tests must still cover quote creation and cart locking.

**Decision: NO EXTRA FACADE** — the orchestration role already exists.

---

## 7. [Decorator](https://refactoring.guru/design-patterns/decorator)

### Problem evaluated
Compose optional behaviors (metrics, tracing, caching) around a client without changing its implementation and without subclass proliferation.

### Before — actual baseline
The image client logs provider result and elapsed duration internally:

```java
logProviderResult("success", startedAt);
return new UploadedImage(response.data().url());
```

Evidence: [ImgBbImageStorageClient.java](../backend/src/main/java/com/fido/modules/product/service/ImgBbImageStorageClient.java).

### After — correct Decorator shape, only if a shared metrics wrapper is needed
```java
public final class TimedImageStorageGateway implements ImageStorageGateway {
    private final ImageStorageGateway delegate;
    private final MeterRegistry registry;

    public TimedImageStorageGateway(
            ImageStorageGateway delegate, MeterRegistry registry) {
        this.delegate = delegate;
        this.registry = registry;
    }

    @Override
    public UploadedImage upload(MultipartFile image) {
        Timer.Sample sample = Timer.start(registry);
        try {
            return delegate.upload(image);
        } finally {
            sample.stop(registry.timer("fido.image.upload"));
        }
    }
}
```

Illustrative code requires `io.micrometer.core.instrument.MeterRegistry` and `Timer`. The wrapper adds behavior around the same `ImageStorageGateway` contract and delegates success/failure semantics unchanged; it is therefore Decorator-shaped. It is not a proposed production change. If FIDO later requires common metrics across several providers, verify existing instrumentation first to avoid double-counting. A wrapper that adds no behavior is not a Decorator.

### Acceptance tests if justified
Delegate receives the same input; result and exceptions pass through unchanged; timing is recorded for success and failure; no image bytes or secrets are logged.

**Decision: NOT NEEDED** — no cross-client wrapper requirement is evidenced.

---

## 8. [Proxy](https://refactoring.guru/design-patterns/proxy)

### Problem evaluated
Intercept a call for authorization, transaction boundaries, lazy access, or remote access.

### Before — actual baseline
Spring already provides transaction/security interception; repositories provide locked reads. For example:

```java
@Service
@Transactional
public class OrderActionService { /* ... */ }
```

The service also uses method-security interception such as `@PreAuthorize`. Spring's transaction and method-security infrastructure can intercept calls through framework-managed proxies. Repository row locking is a concurrency-control technique, **not itself the Proxy pattern**.

Evidence: [OrderActionService.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionService.java).

### After — actual design decision
Keep Spring's managed proxies and method security. Do not add a custom `OrderActionProxy` around a Spring service. Custom proxies risk bypassing or duplicating framework advice. Also remember that Spring proxy advice generally does not apply to self-invocation; do not move transaction annotations casually.

### Acceptance tests
Integration tests must verify unauthorized calls are rejected, transaction rollback occurs after a downstream inventory/audit failure, and locking protects concurrent state changes.

**Decision: FRAMEWORK PROXY ALREADY USED; NO CUSTOM PROXY.**

---

## 9. [Composite](https://refactoring.guru/design-patterns/composite)

### Problem evaluated
Treat a category leaf and a category group uniformly during recursive operations (for example, calculate a tree summary or apply a policy recursively).

### Before — baseline limitation
The existence of relational category parent/child data alone does not prove that the domain needs a recursive object graph. The current repository evidence reviewed for this audit does not establish a requirement to treat category nodes and products as a common component type.

### After — candidate domain model only if recursive behavior is required
```java
public sealed interface CatalogNode
        permits CategoryNode, ProductNode {
    CatalogSummary summarize();
}
```

This is only a type sketch. A real implementation must define leaf/group semantics and query strategy. It must not create a recursive JPA graph that causes N+1 queries or cycles.

### Acceptance tests if justified
Nested categories and empty leaves produce correct summaries; cycles are rejected; query count is bounded; authorization is applied consistently at each level.

**Decision: NOT NEEDED** — no demonstrated recursive domain behavior; database hierarchy alone is insufficient.

---

## 10. [Bridge](https://refactoring.guru/design-patterns/bridge)

### Problem evaluated
Separate two independent axes of change, such as image-storage abstraction and independent image-processing pipeline, so each can vary without a cross-product of subclasses.

### Before — actual baseline
The current image integration has one provider implementation and one upload-only capability. The gateway is already the integration boundary.

Evidence: [ImageStorageGateway.java](../backend/src/main/java/com/fido/modules/product/service/ImageStorageGateway.java).

### After — candidate sketch if independent axes emerge
```java
public interface ImageStorageGateway {
    UploadedImage upload(MultipartFile image);
}
public interface ImageProcessor {
    ProcessedImage process(MultipartFile image);
}
```

These interfaces alone do not implement Bridge. A real Bridge requires a stable abstraction to hold a reference to an independently varying implementation. Adding image processing without an actual requirement would invent a feature.

### Acceptance tests if justified
Cross-product tests cover each supported storage implementation and processing implementation without provider-specific branching in catalog use cases.

**Decision: NOT NEEDED** — no two independent variation axes are evidenced.

---

## 11. [Strategy](https://refactoring.guru/design-patterns/strategy)

### Problem evaluated
Make algorithms interchangeable when there are multiple independently changing algorithms with meaningful selection rules.

### Before — actual baseline
Voucher discount calculation currently handles percentage and fixed amount in one bounded method:

```java
BigDecimal amount =
    "PERCENTAGE".equals(type)
        ? subtotal.multiply(value)
            .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP)
            .min(maximum)
        : value;
return amount.min(subtotal).setScale(2, RoundingMode.HALF_UP);
```

Evidence: [VoucherRedemptionService.java](../backend/src/main/java/com/fido/modules/promotion/service/VoucherRedemptionService.java).

### After — candidate only if policies grow
```java
public interface DiscountStrategy {
    BigDecimal calculate(
            BigDecimal value, BigDecimal maximum, BigDecimal eligibleSubtotal);
}
```

A Strategy implementation must preserve percentage rounding, maximum discount, and subtotal cap. The current `else` branch treats non-`PERCENTAGE` types as fixed; before refactoring, verify the database constraint/enum contract so an unknown type cannot silently become fixed discount. That is a validation concern independent of Strategy.

### Acceptance tests
Fixed and percentage results match existing outputs; percentage uses HALF_UP scale 2; discount never exceeds eligible subtotal or maximum; unknown persisted type is handled according to the actual schema contract.

**Decision: DEFER** — current method is small; first verify the persisted type constraint and tests. Do not create strategies only to split a few lines.

---

## 12. [State](https://refactoring.guru/design-patterns/state) — TRANSITION POLICY, NOT THE FULL GOF PATTERN

### Problem solved
Centralize legal order transitions and prerequisites so invalid transitions are rejected and action availability agrees with execution.

### Before — risk the current code is designed to prevent
If each controller independently changed `orderStatus`, allowed transitions and side effects could diverge. This is a contrast scenario, not a claim that current controllers do this.

```java
// Anti-example only
order.setOrderStatus(requestedStatus);
orders.save(order);
```

### After — actual baseline
`OrderPolicy` defines the transition graph; `OrderActionPolicy` maps action names to target states, checks prerequisites such as paid status and makes already-applied actions no-ops; `OrderActionService` executes inventory, voucher and audit effects.

Evidence: [OrderPolicy.java](../backend/src/main/java/com/fido/modules/order/service/OrderPolicy.java), [OrderActionPolicy.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionPolicy.java), [OrderActionService.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionService.java).

### After — desired acceptance boundary, not a new class hierarchy
Keep the state transition policy as the single source of legal transitions. A full GoF State implementation with one class per status should be considered only if state-specific behavior becomes sufficiently complex to justify that structure.

### Acceptance tests
Every allowed edge is accepted; disallowed edges conflict; COMPLETE requires paid status; repeated action does not repeat inventory/voucher effects; concurrent actions serialize on the order lock.

**Decision: TRANSITION POLICY IS PRESENT; THE FULL GOF STATE PATTERN IS NOT IMPLEMENTED OR JUSTIFIED YET.**

---

## 13. [Command](https://refactoring.guru/design-patterns/command) — COMMAND-LIKE DISPATCH, NOT THE FULL GOF PATTERN

### Problem evaluated
Separate named business actions from the code that coordinates their effects, with idempotency and authorization preserved.

### Before — risk the current structure avoids
A single arbitrary status setter would not encode action-specific inventory and audit effects.

```java
// Anti-example only
order.setOrderStatus(request.action());
```

### After — actual baseline
```java
Order result = switch (request.action()) {
    case "CONFIRM" -> confirm(actor, order, request.reason());
    case "PREPARE" -> simpleTransition(
            actor, order, OrderPolicy.CONFIRMED,
            OrderPolicy.PREPARING, AuditAction.ORDER_PREPARE);
    case "CANCEL" -> cancel(actor, order, request.reason());
    case "COMPLETE" -> complete(actor, order);
    default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
};
```

Evidence: [OrderActionService.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionService.java).

### After — decision
The switch is explicit and type-checkable enough for the current action set. Do not introduce one class per action or a generic command bus unless actions need independent composition, scheduling, queuing, or reuse. If that happens, a typed command must carry only validated input and must not bypass `OrderActionPolicy`.

### Acceptance tests
Unknown action returns bad request; invalid transition conflicts; repeated command does not repeat effects; inventory, voucher and audit changes roll back together on failure.

**Decision: EXPLICIT ACTION DISPATCH IS PRESENT; GOF COMMAND OBJECTS AND A GENERIC COMMAND FRAMEWORK ARE NOT JUSTIFIED YET.**

---

## 14. [Template Method](https://refactoring.guru/design-patterns/template-method)

### Problem evaluated
Reuse a stable algorithm skeleton while allowing a few controlled steps to vary.

### Before — actual baseline
Goods receipt confirmation validates the receipt, validates stored lines, updates receipt state, calls inventory, and records audit. Order confirmation/cancellation has different stock and voucher effects.

Evidence: [GoodsReceiptService.java](../backend/src/main/java/com/fido/modules/inventory/service/GoodsReceiptService.java), [OrderActionService.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionService.java).

### After — rejected candidate
```java
abstract class StockWorkflow {
    final void execute() {
        validate();
        mutateStock();
        recordAudit();
    }
    protected abstract void validate();
    protected abstract void mutateStock();
    protected abstract void recordAudit();
}
```

This would put different business workflows into an inheritance hierarchy and obscure their transaction/side-effect differences. Similar step names do not mean the semantics are identical.

### Acceptance tests if later justified
Each workflow's authorization, locking, rollback, stock ledger, and audit semantics remain distinct and verified.

**Decision: NOT NEEDED** — no stable invariant algorithm skeleton with safe extension points is evidenced.

---

## 15. [Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility)

### Problem evaluated
Run an extensible ordered pipeline of independent handlers where a request may be accepted, rejected, or passed to the next handler.

### Before — actual baseline
Checkout has explicit invariants for non-empty cart, purchasable items and sufficient inventory. Voucher evaluation has specific eligibility, usage limit, time window, scope and minimum amount checks.

Evidence: [CheckoutCalculationService.java](../backend/src/main/java/com/fido/modules/order/service/CheckoutCalculationService.java), [VoucherRedemptionService.java](../backend/src/main/java/com/fido/modules/promotion/service/VoucherRedemptionService.java).

### After — candidate only if validation is genuinely configurable
```java
public interface CheckoutRule {
    void validate(CheckoutContext context);
}
```

This interface alone is not a full Chain. A real chain needs ordering, short-circuit semantics, error contract and a reason rules may be independently added/reordered. Current invariants should not be fragmented just to make every check a class.

### Acceptance tests if justified
Handler order is deterministic; rejection short-circuits; errors preserve API semantics; all inventory/voucher invariants still execute before quote/order creation.

**Decision: NOT NEEDED** — validations are use-case rules, not a configurable pipeline.

---

## 16. [Observer](https://refactoring.guru/design-patterns/observer)

### Problem evaluated
Notify independent consumers when a domain event occurs without making the producer depend on all consumers.

### Before — actual baseline
Audit recording is synchronous and requires an existing transaction:

```java
@Transactional(propagation = Propagation.MANDATORY)
public void record(AuditEvent event) {
    AuditLog log = new AuditLog();
    log.setActorAccountId(event.actorAccountId());
    log.setAction(event.action().name());
    log.setTargetType(event.targetType().name());
    log.setTargetId(event.targetId().toString());
    log.setDescription(event.description());
    logs.save(log);
}
```

Evidence: [AuditService.java](../backend/src/main/java/com/fido/modules/audit/service/AuditService.java).

### After — decision
Do not replace transactional audit with an asynchronous in-memory observer: an order could commit without its audit record, or an event could be published for a transaction that later rolls back. If future requirements need post-commit notifications, define delivery guarantees and consider a transactional outbox with idempotent consumers; that is a separate architecture decision, not a reason to add a generic Observer today.

### Acceptance tests
Audit failure rolls back the business transaction; if asynchronous notification is introduced later, test commit/rollback publication and duplicate delivery.

**Decision: NOT NEEDED FOR CURRENT AUDIT FLOW.**

---

## 17. [Mediator](https://refactoring.guru/design-patterns/mediator)

### Problem evaluated
Reduce many-to-many dependencies when several peer components coordinate through a central mediator.

### Before — actual baseline
`CheckoutQuoteService` coordinates cart locking, checkout calculation and quote storage. `GoodsReceiptService` coordinates receipt persistence, inventory command and audit. Each is already an application service for one use case.

Evidence: [CheckoutQuoteService.java](../backend/src/main/java/com/fido/modules/order/service/CheckoutQuoteService.java), [GoodsReceiptService.java](../backend/src/main/java/com/fido/modules/inventory/service/GoodsReceiptService.java).

### After — rejected candidate
```java
public interface CheckoutMediator {
    CheckoutQuoteDto createQuote(Long accountId, CheckoutQuoteRequest request);
}
```

A mediator with one method that simply forwards to the existing service adds an extra hop but does not reduce many-to-many coupling. Do not introduce it unless there is a demonstrated coordination graph with multiple peers.

### Acceptance tests if justified
Mediator must prevent circular dependencies and own no duplicate business rules; all security and transaction boundaries remain explicit.

**Decision: NOT NEEDED** — existing use-case services already coordinate their flows.

---

## 18. [Memento](https://refactoring.guru/design-patterns/memento)

### Problem evaluated
Capture and restore an object's internal state for an explicit undo/rollback feature.

### Before — actual baseline
FIDO persists order/item snapshots for historical fidelity. These are durable business records, not an in-memory Memento object that restores arbitrary entity state. Cancellation has explicit stock/voucher restoration logic and a legal state transition.

Evidence: [OrderActionService.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionService.java), [InventoryCommandService.java](../backend/src/main/java/com/fido/modules/inventory/service/InventoryCommandService.java).

### After — candidate only if an audited draft-undo feature is specified
```java
public record OrderDraftSnapshot(
        String recipientName,
        String recipientPhone,
        String recipientAddress) {}
```

This DTO is only a snapshot shape, not a complete Memento implementation. A real feature must define what is restorable, who can restore it, expiration, audit trail, concurrency version, and whether restoration may change a confirmed order. Those business rules are not inferred here.

### Acceptance tests if justified
Restoration changes only permitted draft fields, rejects stale versions, preserves audit history and never rewinds inventory or payment side effects.

**Decision: NOT NEEDED** — no undo/restore-in-memory requirement is evidenced.

---

## Evidence and verification ledger

| Evidence item | Link | What it proves |
|---|---|---|
| Image storage contract | [ImageStorageGateway.java](../backend/src/main/java/com/fido/modules/product/service/ImageStorageGateway.java) | Product-owned provider boundary and upload-only contract |
| ImgBB adapter | [ImgBbImageStorageClient.java](../backend/src/main/java/com/fido/modules/product/service/ImgBbImageStorageClient.java) | Provider-specific HTTP, response validation, timeout/error mapping |
| Order transition graph | [OrderPolicy.java](../backend/src/main/java/com/fido/modules/order/service/OrderPolicy.java) | Central allowed transition map |
| Order action policy | [OrderActionPolicy.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionPolicy.java) | Action prerequisites and repeat-action handling |
| Order action execution | [OrderActionService.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionService.java) | Transactional orchestration of inventory/voucher/audit side effects |
| Checkout calculation | [CheckoutCalculationService.java](../backend/src/main/java/com/fido/modules/order/service/CheckoutCalculationService.java) | Checkout readiness, voucher evaluation and total calculation |
| Checkout quote | [CheckoutQuoteService.java](../backend/src/main/java/com/fido/modules/order/service/CheckoutQuoteService.java) | Cart locking, calculation, quote persistence and DTO mapping |
| Voucher calculation/redemption | [VoucherRedemptionService.java](../backend/src/main/java/com/fido/modules/promotion/service/VoucherRedemptionService.java) | Discount arithmetic and voucher eligibility/usage handling |
| Inventory write boundary | [InventoryCommandService.java](../backend/src/main/java/com/fido/modules/inventory/service/InventoryCommandService.java) | Stock mutation and immutable ledger recording |
| Goods receipt workflow | [GoodsReceiptService.java](../backend/src/main/java/com/fido/modules/inventory/service/GoodsReceiptService.java) | Receipt validation, stock command and audit orchestration |
| Transactional audit | [AuditService.java](../backend/src/main/java/com/fido/modules/audit/service/AuditService.java) | Audit must execute inside an existing transaction |

### Verification status

- Source inspection: performed for the files listed above at the baseline commit.
- New production code: none.
- Database/API/business rules: unchanged.
- Compile/tests/lint: **not run by this documentation-only change**. Do not infer PASS from source review.
- CI: the existing audit records a prior correction adding `demo1` to the backend verification workflow. Check the actual GitHub Actions run for the current commit before claiming CI PASS.

## Final assessment

This report covers all 18 patterns with a concrete FIDO problem, baseline evidence, an after-design/code illustration, acceptance criteria, and an adoption decision. Adapter is the clearest GoF-style pattern already evidenced by a concrete implementation. The order module has a centralized transition policy and command-like action dispatch, but these are not the full GoF State and Command structures. Spring supplies proxy-based transaction/method-security interception, while current application services provide use-case orchestration; neither fact justifies adding a custom Proxy or counting an application service as a separate GoF Facade. Other patterns remain deferred or not justified until a real distinct requirement exists.

**No pattern should be counted as newly implemented based on an illustrative snippet.** A production pattern is accepted only after a code diff, relevant automated tests, compile/build evidence, and architecture review.
