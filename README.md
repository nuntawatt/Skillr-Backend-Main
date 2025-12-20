<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p><br>

# Skillr Backend (NestJS Monorepo)

NestJS monorepo แยก 5 services: `auth`, `course`, `media`, `learning`, `payment` และมี `libs/` สำหรับโค้ดที่ใช้ร่วมกัน.

## โครงสร้างย่อ

```
skillr/
  apps/ (5 services)
  libs/ (common, config, auth, shared)
```

## Ports

| Service | Command | Port |
|---|---|---:|
| auth | `npm run start:auth` | 3000 |
| course | `npm run start:course` | 3001 |
| media | `npm run start:media` | 3002 |
| learning | `npm run start:learning` | 3003 |
| payment | `npm run start:payment` | 3004 |

## Roles

มี 2 role: `ADMIN`, `STUDENT`

## Quickstart

```bash
cd skillr
npm install
npm run build:all
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
npx nest g module modules/example --project course
npx nest g controller modules/example --project course
npx nest g service modules/example --project course
```
