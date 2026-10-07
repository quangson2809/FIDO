# FIDO

FIDO is a monorepo for a fashion e-commerce system with a Spring Boot backend and a React + TypeScript frontend.

## Stack

### Backend

- Java 17
- Spring Boot 4
- Gradle Kotlin DSL
- Spring Web MVC
- Spring Data JPA
- Spring Security + JWT
- Flyway
- MySQL
- Springdoc OpenAPI

### Frontend

- React 19
- TypeScript 6
- Vite 8
- React Router
- Axios
- Tailwind CSS 4
- DaisyUI 5

## Repository layout

```text
FIDO/
├── backend/
│   ├── src/main/java/com/fido/modules/
│   │   ├── account/
│   │   ├── audit/
│   │   ├── cart/
│   │   ├── content/
│   │   ├── inventory/
│   │   ├── order/
│   │   ├── product/
│   │   └── report/
│   ├── src/main/resources/
│   └── AGENTS.md
├── frontend/
│   ├── src/
│   │   ├── app/routes/
│   │   ├── features/
│   │   ├── routes/
│   │   ├── screens/
│   │   └── services/
│   └── tests/
├── docs/
└── reference/
```

## Frontend architecture

Frontend routing is URL-driven. React Router owns navigation state; product, order, customer, checkout-success and admin detail identifiers come from route parameters instead of a parallel global navigation state.

The intended dependency direction is:

```text
Route / Screen
    ↓
Feature component / feature hook
    ↓
Feature API service
    ↓
Shared HTTP client
```

Authentication/session state is owned by the auth feature, cart state is owned by the cart feature, and transient notifications are owned by shared UI. There is no global AppProvider that owns routing, auth, cart and toast together.

Admin navigation uses the effective roles/permissions returned by the backend for UX visibility. Backend authorization remains the security boundary.

## Prerequisites

For the recommended Docker development workflow:

- Docker Desktop or Docker Engine
- Docker Compose v2.24+ (required for optional `env_file` support)

For manual execution without Docker:

- JDK 17
- Node.js 22+
- npm
- MySQL 8+

## One-command development with Docker Compose

The development stack contains MySQL 8.4, Spring Boot and the Vite frontend. No local JDK, Node.js or MySQL process is required for this mode.

Start everything from the repository root:

```powershell
docker compose up --build
```

Then use:

```text
Frontend:    http://localhost:5173
Backend API: http://localhost:8080/api/v1
Swagger:     http://localhost:8080/swagger-ui.html
```

Compose uses persistent named volumes for MySQL, the Gradle cache, npm cache and container-only `node_modules`. MySQL is intentionally not published to the host; the backend reaches it through the Compose network.

The frontend source is bind-mounted and Vite HMR remains active. Backend source is also bind-mounted; after changing Java code, restart only the backend service so Gradle recompiles it:

```powershell
docker compose restart backend
```

Useful commands:

```powershell
# Follow logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop containers but keep the database volume
docker compose down

# Reset the complete Docker development state, including MySQL data
docker compose down -v

# Open a MySQL shell inside the DB container
docker compose exec db mysql -uroot -p
```

The stack boots with development defaults, so copying an environment file is not required. To override Compose ports/passwords, copy the root `.env.example` to `.env`. If `backend/.env` already exists, Compose loads it automatically for optional backend settings such as JWT, seed/bootstrap configuration and ImgBB credentials; Compose still owns the DB host and internal service ports.

## Backend

Prepare local environment variables from the backend template:

```powershell
cd backend
Copy-Item .env.example .env
```

Run the backend:

```powershell
./gradlew bootRun
```

On Windows PowerShell, use:

```powershell
.\gradlew.bat bootRun
```

Default API base URL:

```text
http://localhost:8080/api/v1
```

Swagger UI:

```text
http://localhost:8080/swagger-ui.html
```

## Frontend

Prepare the frontend environment and install dependencies:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

The Vite development server uses port 5173 by default.

## Verification

### Backend

```powershell
cd backend
./gradlew compileJava
./gradlew test
./gradlew check
```

### Frontend

```powershell
cd frontend
npm ci
npm run test:api
npm run test:architecture
npm run test:render
npm run lint
npm run build
```

The frontend CI workflow runs the same smoke, lint, typecheck and production-build checks and uploads the generated `dist` artifact after a successful run.

## Notes

- Frontend DTOs remain handwritten. Runtime validation is applied selectively at high-impact trust boundaries; `POST /auth/login` and `GET /me` are validated before token/session/RBAC state is accepted. No OpenAPI client generation is introduced.
- Product image upload/reorder/delete use the dedicated backend image APIs; frontend code does not call the external image provider directly.
- Frontend permission checks are for navigation/UX only. Authorization must continue to be enforced by backend Spring Security.
