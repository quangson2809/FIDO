# FIDO

FIDO is a Spring Boot backend and React/TypeScript frontend in one repository. The backend uses a modular monolith organized by feature. This branch has implemented the documented backend phases through Phase 7; Phase 8 hardening and delivery readiness have not been completed. Phase gates and remaining deferred slices are tracked in `docs/11-implementation-phases.md`, `docs/12-tbd-out-of-scope.md` and `docs/16-phase-7-gate.md`.

## Repository

- `backend/`: Java 17, Spring Boot 4.0.3, Gradle Kotlin DSL, Spring Data JPA, Spring Security and Flyway.
- `frontend/`: React, TypeScript and Vite.
- `docs/`: source precedence, architecture, API/data contracts, phase plan and implementation decisions.
- `reference/`: machine-readable API, transitions and table ownership.
- `.github/workflows/backend-verification.yml`: backend H2/MySQL verification.

The nine backend business modules are `account`, `product`, `cart`, `promotion`, `order`, `inventory`, `audit`, `report` and `content`. Read `backend/AGENTS.md` and `docs/00-source-of-truth.md` before changing backend behavior. The original Phase 0 snapshot in `backend/ARCHITECTURE.md` is historical, not a description of the present implementation.

## Local backend

Use JDK 17 and MySQL 8+. Supply database settings through the environment using `backend/.env.example` as a template; do not commit secrets. From `backend/`:

```powershell
./gradlew.bat bootRun
./gradlew.bat clean build
```

On Unix-like shells use `./gradlew`. Flyway owns schema changes. The default H2 test suite runs with `clean build`; CI additionally tests migration/mapping against MySQL 8.4. For the MySQL test setup, see `.github/workflows/backend-verification.yml`.

Admin routes remain authenticated. For a local database without an administrator, choose one explicit initialization path in `backend/.env`: enable the deterministic development seed with `DEV_SEED_ENABLED=true`, or enable the idempotent superadmin bootstrap with `SUPERADMIN_BOOTSTRAP_ENABLED=true` and provide `SUPERADMIN_PHONE` plus `SUPERADMIN_PASSWORD`. Do not enable either path automatically against an existing shared database.

## Local frontend

From `frontend/`, configure its `.env.example`, then:

```powershell
npm install
npm run dev
npm run lint
npm run build
```

The frontend stores the current bearer token in browser `sessionStorage`, so authenticated routes survive refreshes in the same browser session. A `401 Unauthorized` response clears the stored token. The backend remains the authorization boundary and still validates roles/permissions for every protected operation.

## Review and delivery

For changed code, use Codex `/review` against the intended base branch and the evidence-based design rules in `backend/AGENTS.md`. A whole-backend architecture assessment needs its own stated coverage. `docs/13-codex-prompts.md` contains implementation and review prompts. A passing build alone does not establish architectural or behavioral correctness.

The backend API has documented partial slices: guest identity, voucher behavior, create-order retry guarantees and size-exchange automation remain unresolved/deferred as described in `docs/12-tbd-out-of-scope.md`. Do not assume the green phase gate means production readiness.