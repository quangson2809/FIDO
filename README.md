# FIDO

FIDO is currently bootstrapped as a single Git repository containing a Spring Boot Web API and a React + TypeScript frontend.

## Current scope

This repository is intentionally at the **setup/bootstrap** stage only. It contains framework dependencies, database configuration, development environment configuration, CORS/security bootstrap, and a frontend-to-backend health check.

It does **not** define business architecture yet: no domain modules, entities, repositories, services, use cases, business controllers, feature folders, or authentication flow have been introduced.

## Stack

### Backend

- Java 17
- Spring Boot 4.0.3
- Gradle Kotlin DSL
- Spring Web MVC
- Spring Data JPA
- Spring Security
- Spring Validation
- Spring Boot Actuator
- Springdoc OpenAPI
- MySQL Connector/J
- Lombok

### Frontend

- React 19
- TypeScript 6
- Vite 8
- Axios
- React Router
- Tailwind CSS 4
- DaisyUI 5

## Repository layout

```text
FIDO/
├── backend/   # Spring Boot application bootstrap
├── frontend/  # React + TypeScript application bootstrap
├── .gitignore
├── .editorconfig
└── README.md
```

The folders under `backend/src` and `frontend/src` are only the minimum framework-required scaffold. Application architecture has not been designed yet.

## Prerequisites

- JDK 17
- Gradle 9.3.1 or a compatible Gradle 9.x installation
- Node.js 22+
- npm
- MySQL 8+

## 1. Prepare MySQL

Create an empty database:

```sql
CREATE DATABASE fido CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Copy the backend environment template:

```powershell
cd backend
Copy-Item .env.example .env
```

Update `.env` when your local MySQL credentials differ from the defaults.

## 2. Run the backend

From `backend/`:

```powershell
gradle bootRun
```

The backend runs at `http://localhost:8080` by default.

Technical smoke-test endpoint:

```text
GET http://localhost:8080/actuator/health
```

Swagger UI is available at:

```text
http://localhost:8080/swagger-ui.html
```

## 3. Run the frontend

Copy the frontend environment template and install dependencies:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` by default and checks the backend health endpoint through Axios.

## 4. Verification

Backend compile/test:

```powershell
cd backend
gradle test
gradle build
```

Frontend verification:

```powershell
cd frontend
npm run lint
npm run build
```

## Setup completion boundary

Once both applications build, MySQL connectivity succeeds, and the frontend reports backend status `UP`, the bootstrap phase is complete.

Do not introduce business packages or feature structure until the architecture/design phase starts.
