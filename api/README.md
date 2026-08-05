# FF Sensitivity Ops — API

NestJS + Prisma + PostgreSQL (**local Postgres — Docker not required**).

## Setup (no Docker)

1. Install/start **PostgreSQL** Windows service (`postgresql-x64-16`).
2. Create DB + user (once):

```sql
CREATE USER ffops WITH PASSWORD 'ffops_dev_password';
CREATE DATABASE ff_sensitivity_ops OWNER ffops;
```

3. `.env` me:

```env
DATABASE_URL="postgresql://ffops:ffops_dev_password@localhost:5432/ff_sensitivity_ops?schema=public"
```

4. Then:

```bash
cd api
npx prisma db push
npm run prisma:seed
npm run start:dev
```

API: http://localhost:4000  
Phone (same Wi‑Fi): set `API_BASE_URL=http://<PC-LAN-IP>:4000` in `local.properties`.

### Auth endpoints

- `POST /api/v1/auth/login` `{ "email", "password" }` — admin
- `POST /api/v1/user/auth/google` `{ "idToken" }` — app user
- `GET  /api/v1/auth/me` (Bearer access token)
- `POST /api/v1/auth/logout`

### Community endpoints

- `GET  /api/v1/community/feed` (user JWT) — approved + featured
- `POST /api/v1/community/posts` (user JWT) — submit for review
- `POST /api/v1/community/posts/:id/report` (user JWT)
- `GET  /api/v1/admin/community/posts` (admin JWT + community module)
- `GET  /api/v1/admin/community/stats`
- `PATCH /api/v1/admin/community/posts/:id/status` `{ "status" }`

### Claims endpoints

- `GET  /api/v1/redeem/claims` (user JWT) — own claim history
- `GET  /api/v1/admin/claims` (admin JWT + claims module)
- `GET  /api/v1/admin/claims/stats`
- `PATCH /api/v1/admin/claims/:id/flag` `{ "flagged", "note?" }`
- `DELETE /api/v1/admin/claims/:id` — deletes row, does **not** restore stock

Default Super Admin (change after first login): see `.env` `SUPERADMIN_*`.
