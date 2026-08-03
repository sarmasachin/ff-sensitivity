# FF Sensitivity Ops — API

NestJS + Prisma + PostgreSQL.

## Docker kya hai / kyun?

Docker **sirf Postgres database** chalane ke liye hai.

| Cheez | Docker? |
|--------|---------|
| Postgres (DB) | Haan — `docker compose up -d` |
| NestJS API | Nahi — `npm run start:dev` |
| Next.js admin | Nahi — `npm run dev` (port 3002) |

**Fayda:** Windows pe alag se Postgres install nahi karna padta. Ek container = ready database.

**Zaroori:** pehle **Docker Desktop** app open/running hona chahiye.

Agar Docker nahi chahiye to apna Postgres install karke `.env` mein `DATABASE_URL` change karo.

## Setup

```bash
cd api
cp .env.example .env   # already present locally
docker compose up -d   # start Postgres
npx prisma migrate dev --name init_auth
npm run prisma:seed
npm run start:dev
```

API: http://localhost:4000

### Auth endpoints

- `POST /api/v1/auth/login` `{ "email", "password" }`
- `GET  /api/v1/auth/me` (Bearer access token)
- `POST /api/v1/auth/logout`

Default Super Admin (change after first login):

- email: `superadmin@ffops.local`
- password: `ChangeMeNow123!`
