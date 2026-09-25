# Backend package structure

The backend uses a modular monolith: domain modules live under the root package
`com.fido`, and each module owns its controller, service, repository, entity,
DTO, and mapper packages.

Current module skeletons on this branch:

- `product`
- `order`

Each module is organized as:

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

The skeleton defines package locations only. It does not add domain classes,
business rules, endpoints, database tables, or authentication behavior.
Add further modules when the project requirements and data design identify them.
