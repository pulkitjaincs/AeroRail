# AeroRail

AeroRail is a next-generation passenger transit and booking system built with a high-performance, microservices-oriented monorepo architecture. 

This repository utilizes **pnpm workspaces** for package management, **Express 5** for API services, and **TypeScript** for end-to-end type safety and developer productivity.

---

## 🏗️ Repository Architecture

The codebase is organized as follows:

```
aerorail/
├── apps/                    # Front-end applications and Gateways (Next.js, API-Gateway)
├── services/                # Core backend microservices
│   └── auth-service/        # JWT Authentication Service (Neon DB, Redis Cloud)
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
To run the Auth Service individually:
```bash
pnpm --filter @aerorail/auth-service dev
```
To run only the service template:
```bash
pnpm --filter @aerorail/service-template dev
```

---

## 📋 Roadmap Progress

Refer to `MONTH_1_ROADMAP.md` for detailed weekly deliverables. Currently, **Week 1**, **Week 2**, and **Week 3** have been successfully implemented, establishing a production-ready monorepo framework, shared packages, and the JWT Authentication Service with Redis token rotation and blacklisting.
