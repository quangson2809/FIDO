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
│   │   ├── context/
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

Authentication/session state is owned by the auth feature. The application-level context is limited to cross-cutting UI/cart concerns rather than routing or authentication ownership.

Admin navigation uses the effective roles/permissions returned by the backend for UX visibility. Backend authorization remains the security boundary.

## Prerequisites

- JDK 17
- Node.js 22+
- npm
- MySQL 8+

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
npm run lint
npm run build
```

The frontend CI workflow runs the same smoke, lint, typecheck and production-build checks and uploads the generated `dist` artifact after a successful run.

## Notes

- API DTOs are typed in the frontend, but runtime DTO validation/OpenAPI client generation is not currently introduced.
- Product image upload/reorder/delete use the dedicated backend image APIs; frontend code does not call the external image provider directly.
- Frontend permission checks are for navigation/UX only. Authorization must continue to be enforced by backend Spring Security.
