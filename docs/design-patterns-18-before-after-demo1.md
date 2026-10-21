# FIDO demo1 — 18 Design Patterns: Before/After, Evidence and Adoption Decisions

- Repository: https://github.com/quangson2809/FIDO
- Target branch: `demo1`
- Baseline inspected: `af1af690b91f4ba3cfbc70f9f67a21f9d888996f`
- Scope: Java/Spring backend; package-by-feature modular monolith.
- Evidence policy: current snippets/links describe code that exists at the baseline. “After (candidate)” is an illustrative design unless explicitly labelled “already present”. It must not be read as a production change. No business behavior is changed by this document.
- Important: “use 18 patterns” is interpreted as fully evaluate and demonstrate all 18, not force all 18 into production. Adding a pattern without a distinct problem would violate FIDO's architecture constraints and make the code worse.

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

## 1. Factory Method

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

### After — candidate only if a second implementation is introduced
```java
public interface ImageStorageClientFactory {
    ImageStorageGateway create(ImageStorageProvider provider);
}
```

This is not a complete production implementation: provider selection, configuration, credential validation, fallback behavior, and operational requirements have not been specified. A factory with one provider adds indirection and therefore is **not applied**.

### Acceptance test if justified later
For every supported provider, verify the selected adapter and configuration; verify unknown provider configuration fails fast; verify credentials never appear in logs.

**Decision: NOT NEEDED** — one implementation is not a family.

---

## 2. Abstract Factory

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

## 3. Builder

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

### After — candidate
```java
public record CheckoutTotals(
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal shippingFee,
        BigDecimal total) {

    public CheckoutTotals {
        if (subtotal.signum() < 0 || discount.signum() < 0
                || shippingFee.signum() < 0 || total.signum() < 0) {
            throw new IllegalArgumentException("Checkout amounts must be non-negative");
        }
    }
}
```

This record is an example of enforcing an invariant, not a Builder implementation. It must not be introduced without confirming whether negative totals are already ruled out by domain rules and where those invariants belong. A Builder is not needed merely because a DTO has many constructor arguments.

### Acceptance test if justified later
Test every valid construction path and ensure required values cannot be omitted. Ensure total/discount invariants match current checkout rules and API contract.

**Decision: NOT NEEDED currently** — construction is explicit; no demonstrated invalid-state or readability problem requiring a Builder.

---

## 4. Prototype

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
                source.getProductName(),
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

## 5. Adapter — ALREADY PRESENT

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

## 6. Facade

### Problem evaluated
Expose a simple application operation while hiding coordination across several subsystem services.

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

### After — candidate anti-duplication rule
Do not wrap this in another `CheckoutFacade` that merely calls `CheckoutQuoteService.quote(...)`. The current service is already the use-case entry point. A facade becomes useful only if a real external caller needs a simpler stable API over multiple distinct subsystem operations.

### Acceptance tests
If a facade is introduced, verify that it does not duplicate authorization, transactions, quote-expiry rules, or error mapping; integration tests must still cover quote creation and cart locking.

**Decision: NO EXTRA FACADE** — the orchestration role already exists.

---

## 7. Decorator

### Problem evaluated
Compose optional behaviors (metrics, tracing, caching) around a client without changing its implementation and without subclass proliferation.

### Before — actual baseline
The image client logs provider result and elapsed duration internally:

```java
logProviderResult("success", startedAt);
return new UploadedImage(response.data().url());
```

Evidence: [ImgBbImageStorageClient.java](../backend/src/main/java/com/fido/modules/product/service/ImgBbImageStorageClient.java).

### After — candidate only if multiple clients need the same wrapper
```java
public final class TimedImageStorageGateway implements ImageStorageGateway {
    private final ImageStorageGateway delegate;

    public TimedImageStorageGateway(ImageStorageGateway delegate) {
        this.delegate = delegate;
    }

    @Override
    public UploadedImage upload(MultipartFile image) {
        return delegate.upload(image);
    }
}
```

This skeleton intentionally omits metrics dependencies and failure semantics; it is not production-ready code. A wrapper that measures nothing is not a useful Decorator. If the provider already owns timing, adding another layer would duplicate responsibility.

### Acceptance tests if justified
Delegate receives the same input; result and exceptions pass through unchanged; timing is recorded for success and failure; no image bytes or secrets are logged.

**Decision: NOT NEEDED** — no cross-client wrapper requirement is evidenced.

---

## 8. Proxy

### Problem evaluated
Intercept a call for authorization, transaction boundaries, lazy access, or remote access.

### Before — actual baseline
Spring already provides transaction/security interception; repositories provide locked reads. For example:

```java
@Service
@Transactional
public class OrderActionService { /* ... */ }
```

and the action method uses `@PreAuthorize`.

Evidence: [OrderActionService.java](../backend/src/main/java/com/fido/modules/order/service/OrderActionService.java).

### After — actual design decision
Keep Spring's managed proxies and method security. Do not add a custom `OrderActionProxy` around a Spring service. Custom proxies risk bypassing or duplicating framework advice. Also remember that Spring proxy advice generally does not apply to self-invocation; do not move transaction annotations casually.

### Acceptance tests
Integration tests must verify unauthorized calls are rejected, transaction rollback occurs after a downstream inventory/audit failure, and locking protects concurrent state changes.

**Decision: FRAMEWORK PROXY ALREADY USED; NO CUSTOM PROXY.**

---

## 9. Composite

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

## 10. Bridge

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

## 11. Strategy

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

## 12. State — PARTIALLY REPRESENTED BY EXISTING POLICY

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

**Decision: STATE POLICY ALREADY PRESENT; FULL GOF STATE CLASSES NOT JUSTIFIED.**

---

## 13. Command — COMMAND-LIKE DISPATCH ALREADY PRESENT

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

**Decision: COMMAND-LIKE DISPATCH PRESENT; GENERIC COMMAND FRAMEWORK NOT JUSTIFIED.**

---

## 14. Template Method

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

## 15. Chain of Responsibility

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

## 16. Observer

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

## 17. Mediator

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

## 18. Memento

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

This report covers all 18 patterns with a concrete FIDO problem, baseline evidence, an after-design/code illustration, acceptance criteria, and an adoption decision. Only Adapter and the existing State/Command-like order policy/dispatch are evidenced as present in the current code; Facade/Proxy responsibilities are already covered by application services and Spring infrastructure. Other patterns remain deferred or not justified until the system has a real distinct requirement.

**No pattern should be counted as newly implemented based on an illustrative snippet.** A production pattern is accepted only after a code diff, relevant automated tests, compile/build evidence, and architecture review.
