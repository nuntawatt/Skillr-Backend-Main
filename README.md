<div align="center">
  <a href="http://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</div>

<br />

# Skillr Backend (NestJS Monorepo)

Skllr backend is a NestJS monorepo with multiple services and shared libraries.

## Prerequisites

- **Node.js**: 22.x
- **pnpm**: 10.x
- **PostgreSQL**: 16 (for local DB) or use Docker Compose below
- **Docker** (optional): for running Postgres + service containers

## Setup (Local)

```bash
pnpm install
```

Environment files used by TypeORM migrations:

- `apps/auth-service/.env` (primary for auth migrations)
- `apps/course-service/.env` (primary for course migrations)
- `apps/reward-service/.env` (primary for reward migrations)
- `.env` (optional fallback for some apps)

Minimum required env variables (examples):

```dotenv
DATABASE_URL=postgresql://<USER>:<PASSWORD>@localhost:5432/<DB_NAME>
JWT_ACCESS_SECRET=change_me
JWT_ACCESS_EXPIRES_IN=15m
```

Optional (Google OAuth):

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

## Tools

![pnpm](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![TypeORM](https://img.shields.io/badge/TypeORM-0.3-262627?logo=typeorm&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-auth-000000?logo=jsonwebtokens&logoColor=white)
![Passport](https://img.shields.io/badge/Passport-auth-34E27A?logo=passport&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-test-C21325?logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-lint-4B32C3?logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-format-F7B93E?logo=prettier&logoColor=black)

## Project Layout

```
skillr/
  apps/   # auth, course, media, learning, payment
  libs/   # common, config, auth, shared
```

## Services & Ports

Ports are set per service in `skillr/package.json` scripts (so you can run multiple services without port conflicts).

| Service | Command | Port |
|---|---|---:|
| auth | `pnpm run start:auth` | 3001 |
| course | `pnpm run start:course` | 3002 |
| reward | `pnpm run start:reward` | 3003 |

## Roles

This project uses 2 roles:
- `ADMIN`
- `STUDENT`

## Build Project

```bash
pnpm install
pnpm run build:all
```

## Quick Start (Dev)

```bash
pnpm install

# run migrations (เลือก service ที่ต้องการ)
pnpm run migration:run:auth
pnpm run migration:run:course

# start service
pnpm run start:auth
pnpm run start:course
pnpm run start:reward
```

## Environment Setup

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://<USER>:<PASSWORD>@localhost:5432/db_name?schema=public
```

Optional (Google OAuth):

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=localhost:Port/auth/google/callback
```

## Docker / Compose

Each service has its own `docker-compose.yaml` under `apps/<service>/`.

Auth service:

```bash
docker compose -f apps/auth-service/docker-compose.yaml up -d --build
```

- Postgres: `localhost:5430`
- API: `http://localhost:3001/api`

Course service:

```bash
docker compose -f apps/course-service/docker-compose.yaml up -d --build
```

- Postgres: `localhost:5435`
- API: `http://localhost:3002/api`

Reward service:

```bash
docker compose -f apps/reward-service/docker-compose.yaml up -d --build
```

- Postgres: `localhost:5445`
- API: `http://localhost:3003/api`

Stop containers:

```bash
docker compose -f apps/auth-service/docker-compose.yaml down
docker compose -f apps/course-service/docker-compose.yaml down
docker compose -f apps/reward-service/docker-compose.yaml down
```

## API / Swagger

All services set `GlobalPrefix = /api` and expose Swagger at `/docs`.

- Auth
  - Base URL: `http://localhost:3001/api`
  - Swagger: `http://localhost:3001/docs`
- Course
  - Base URL: `http://localhost:3002/api`
  - Swagger: `http://localhost:3002/docs`
- Reward
  - Base URL: `http://localhost:3003/api`
  - Swagger: `http://localhost:3003/docs`

## Migrations

Run migrations:

```bash
pnpm run migration:run:auth
pnpm run migration:run:course
```

Generate migration (course service):

```bash
pnpm run migration:generate:course
```

## Common Commands

```bash
pnpm run build:all
pnpm run lint
pnpm run test
pnpm run test:e2e
```

## Testing

Unit tests (runs all `*.spec.ts`):

```bash
pnpm run test
```

Run a specific spec file:

```bash
pnpm jest apps/auth-service/src/.../something.spec.ts
```

E2E tests:

```bash
pnpm run test:e2e
```