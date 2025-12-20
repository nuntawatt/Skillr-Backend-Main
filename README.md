<div align="center">
  <a href="http://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</div>

<br />

# Skillr Backend (NestJS Monorepo)

NestJS monorepo แยก 5 services: `auth`, `course`, `media`, `learning`, `payment` และมี `libs/` สำหรับโค้ดที่ใช้ร่วมกัน.

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

## โครงสร้างย่อ

```
skillr/
  apps/ (5 services)
  libs/ (common, config, auth, shared)
```

## Ports

| Service | Command | Port |
|---|---|---:|
| auth | `pnpm run start:auth` | 3000 |
| course | `pnpm run start:course` | 3001 |
| media | `pnpm run start:media` | 3002 |
| learning | `pnpm run start:learning` | 3003 |
| payment | `pnpm run start:payment` | 3004 |

## Roles

มี 2 role: `ADMIN`, `STUDENT`

## Quickstart

```bash
cd skillr
pnpm install
pnpm run build:all
```

Env ที่ต้องมีอย่างน้อย (ที่ `skillr/.env`):

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://<USER>:<PASSWORD>@local:5432/dbname
JWT_ACCESS_SECRET=change-me
```

## Nest CLI: generate

```powershell
cd .\skillr
pnpm exec nest g module modules/example --project course
pnpm exec nest g controller modules/example --project course
pnpm exec nest g service modules/example --project course
```
