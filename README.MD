# AeroRail

AeroRail is a next-generation passenger transit and booking system built with a high-performance, microservices-oriented monorepo architecture. 

This repository utilizes **pnpm workspaces** for package management, **Express 5** for API services, and **TypeScript** for end-to-end type safety and developer productivity.

---

## ✨ Key Features

- **API Gateway (Kong)**: Centralized routing and high-performance RS256 JWT validation.
- **Auth Service**: Secure registration/login flows with refresh token rotation and Redis blacklisting.
- **Search Service**: High-speed train routing via **Neo4j** graph queries, fully parallelized availability checks, and Redis caching to prevent N+1 query bottlenecks.
- **Next.js PWA Frontend**: A visually stunning, mobile-responsive web client with offline service workers and dynamic data fetching.
- **Monorepo Boilerplate**: Production-ready shared packages (`@aerorail/server`, `@aerorail/db`, etc.) providing built-in rate limiting, security headers (`helmet`), standardized error handling, and graceful shutdown out of the box.

---

## 🏗️ Repository Architecture

The codebase is organized as follows:

```
aerorail/
├── apps/                    # Front-end applications and Gateways (Next.js, API-Gateway)
│   └── web/                 # Next.js 15 PWA Client Search application
├── services/                # Core backend microservices
│   ├── auth-service/        # JWT Authentication Service (Neon DB, Redis Cloud)
│   └── search-service/      # Search and Routing Service (Neo4j Graph Database, Redis Cache)
├── service-template/        # Standard boilerplate template for creating new services
├── packages/                # Shared packages consumed by services
│   ├── errors/              # Uniform HTTP error classes
│   ├── logger/              # Shared Pino JSON logger configuration
│   ├── middleware/          # Common Express middlewares (Request ID, Logging, Errors)
│   └── types/               # Type definitions introspected from database schema
├── infra/                   # Local infrastructure orchestrators (Docker Compose, Kong)
├── docs/                    # Architecture Decision Records (ADRs) & documentation
└── package.json             # Root monorepo workspace configuration
```

---

## 🛠️ Shared Packages

To prevent code duplication across microservices, shared utilities are placed in `/packages` and linked via pnpm workspaces:

1. **`@aerorail/errors`**:
   - Defines custom, serializable API errors inheriting from a base `CustomError`.
   - Supports: `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, and `InternalServerError`.
2. **`@aerorail/logger`**:
   - A fast JSON logger using `pino`.
   - Includes developer-friendly colorized outputs with `pino-pretty` in local development (`NODE_ENV=development`).
3. **`@aerorail/middleware`**:
   - `requestId`: Injects/attaches `x-request-id` headers for distributed tracing.
   - `requestLogger`: Measures request-response round-trip durations and logs requests structured.
   - `errorHandler`: Centrally catches and formats exceptions, standardizing JSON error outputs.
4. **`@aerorail/types`**:
   - Shared Type definitions introspected directly from the Neon PostgreSQL schema (such as `User`, `Train`, `Booking`, `Passenger`, `Payment`, etc.).

---

## 🚀 Service Template

The `service-template` folder serves as a blueprint for initializing new microservices. Every service built with this template inherits:
- **Express 5** runtime environment.
- Zod-based **environment variable validation** so the service crashes instantly on launch if configured incorrectly.
- Integrated **OpenTelemetry stub** for distributed tracing.
- Global request logging and tracing middleware out-of-the-box.
- Clean **graceful shutdown** mechanisms listening to `SIGTERM` and `SIGINT` signals to prevent dropping hanging connections.

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (Supports v11 workspaces)

### Installation
Run the following command in the root of the repository to install dependencies across the workspace:
```bash
pnpm install
```

### Building the Workspace
To build all shared packages and the service template:
```bash
pnpm --filter "*" build
```

### Running in Development
To run all applications and templates in parallel in development mode:
```bash
pnpm dev
```
To seed the databases (Neo4j and PostgreSQL) with train schedules:
```bash
pnpm --filter @aerorail/search-service run seed
```
To run services individually:
*   **Auth Service:** `pnpm --filter @aerorail/auth-service dev`
*   **Search Service:** `pnpm --filter @aerorail/search-service dev`
*   **Next.js Web Frontend:** `pnpm --filter web dev`

---
