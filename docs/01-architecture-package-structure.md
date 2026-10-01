# 01 — Architecture & Package Structure

## 1. Architecture already agreed

**Modular Monolith + Package by Feature + Layered Architecture inside each module.**

```text
src/main/java/com/fido/
├── FidoApplication.java
├── config/
│   ├── security/
│   ├── web/
│   └── documentation/
├── common/
│   ├── exception/
│   └── response/
└── modules/
    ├── account/
    ├── product/
    ├── cart/
    ├── promotion/
    ├── order/
    ├── inventory/
    ├── audit/
    ├── report/
    └── content/
```

A feature module may contain:

```text
<module>/
├── controller/
├── service/
├── repository/
├── entity/
├── dto/
│   ├── request/
│   └── response/
└── mapper/
```

Create only packages that have real code. Empty placeholders should use `package-info.java` only when needed during scaffolding.

## 2. Layer responsibilities

| Layer | Responsibility | Must not do |
|---|---|---|
| Controller | Route, HTTP binding, request validation, auth context, response DTO | business state machine, DB access |
| Service | Business rules, orchestration, authorization rule, transaction boundary | expose persistence entity to API |
| Repository | Query/persistence | choose business transition/permission |
| Entity | DB/JPA model | act as API DTO |
| DTO | External contract | contain persistence behavior |
| Mapper | Deterministic transformation | decide business rules |

## 3. Module dependency rules

- No module may call another module's repository directly.
- Cross-module command: call a public Service/contract in the owning module.
- Cross-module read: use an explicit read contract or purpose-built projection returning a DTO/read model, not foreign Entities. A separate query service is useful when it clarifies ownership, but is not mandatory for every read.
- Avoid circular dependencies. When one API needs data from several modules, orchestration belongs to the API-owning module.
- Shared `common` code must remain technical/generic. Do not move domain rules into `common` to bypass module boundaries.

## 4. Ownership-driven examples

- `order.service.OrderConfirmationService` may request an atomic stock deduction from `inventory.service.InventoryService`; it must not inject `InventoryRepository`.
- `order` may read Product/Variant identity/price through a public product query contract; it must not edit Product entities.
- `report` may run optimized read queries across order/payment tables but must not become owner of Order lifecycle.
- `audit` receives business audit commands; it must not control whether an Order transition is valid.

## 5. Technical decisions Codex must preserve from the repository

The Analyst sources do **not** lock these choices. Codex must inspect the current repository and preserve what is already configured:

- Java version;
- Spring Boot version/framework version;
- Maven vs Gradle;
- DBMS;
- Flyway vs Liquibase vs another migration approach;
- JPA/Hibernate version or alternative persistence layer;
- MapStruct/manual mapping/Lombok;
- JWT library;
- test stack and container strategy.

Use `docs/15-technical-decisions.md` to record the smallest conventional choice when approved semantics are fixed. Stop only the affected slice if the choice would invent or change business behavior, API/security guarantees, persistent meaning, stock/money semantics or an external contract.

## 6. SOLID without ceremony

Apply SOLID through clear module ownership, focused services, explicit contracts and dependency direction. Do not create one-interface-per-class, generic base CRUD services, excessive factories, or abstraction layers without a concrete change/testability reason.

## 7. Design review in context

Use KISS, YAGNI, Boy Scout Rule, Separation of Concerns, Low Coupling, High Cohesion, Law of Demeter, Curly's Law, Principle of Least Astonishment and Least Privilege to explain observable design consequences. Prefer a focused service and direct collaboration through owned contracts. Split responsibilities only when there is a concrete reason such as unrelated changes forcing the same service to change, a confusing transaction boundary, excessive dependencies, or a demonstrated testing problem. A command may read to validate and respond; a query must not persist mutations. Separate Query/Command services are a local organizational choice, not full CQRS and not a universal target.

A review finding needs a code location, reproducible scenario or credible change-cost/security impact, and a smaller corrective step. A principle name or class count alone is not evidence. Preserve the nine module boundaries and public contracts when refactoring.
