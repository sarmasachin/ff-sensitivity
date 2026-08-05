# FF Ops deploy — app.sensitivitysettings.com

Isolated from BGMI / `sensitivitysettings.com`. Never touch `/var/www/bgmi`, PM2 `bgmi`, or existing Nginx site files.

## Public URLs

| URL | Role |
|-----|------|
| `https://app.sensitivitysettings.com` | Admin (Next.js) |
| `https://api.sensitivitysettings.com` | Nest API |
| `https://sensitivitysettings.com` | Existing site — do not modify |

## Isolation

| | FF Ops (new) | Existing BGMI |
|--|--------------|---------------|
| Path | `/var/www/ff-sensitivity` | `/var/www/bgmi` |
| Admin port | **3010** (or next free from audit) | usually **3001** |
| API port | **4010** (or next free) | n/a |
| PM2 | `ff-ops-admin`, `ff-ops-api` | `bgmi` |
| Nginx | **new** conf files only | never edit |
| DB | new `ff_sensitivity_ops` | untouched |

## Phase 0 — audit (read-only)

```bash
pm2 list
ss -lntp
ls -la /var/www/
ls -la /etc/nginx/sites-enabled/
sudo nginx -T 2>/dev/null | grep -E 'server_name|listen |proxy_pass'
curl -sI https://sensitivitysettings.com/ | head -n 3
curl -sI http://127.0.0.1:3001/ | head -n 3
```

Confirm **3010** and **4010** are free before continuing. If not, pick other free ports and use those everywhere below.

## DNS

- `A` `app` → VPS IP  
- `A` `api` → same VPS IP  
- Do not change apex / www records  

SSL: certbot only for `app.` + `api.` (or panel SSL already on `app.` — still need a working `A` record).

## Install (one-time) — confirmed VPS audit

- Node `v20` / npm OK  
- Ports **3010** (admin) + **4010** (api) **free**  
- Existing: bgmi `:3001`, mocktest `:3000`, livehospital `:5006` — never touch  
- Nginx `app.sensitivitysettings.com` currently static `root .../html` — replace with proxy to `:3010` only in **that** file  

Repo path: `/var/www/ff-sensitivity` (monorepo). Nginx domain folder `/var/www/app.sensitivitysettings.com` can stay; we don't run Node from `html/`.


```bash
mkdir -p /var/www/ff-sensitivity
cd /var/www/ff-sensitivity
git clone https://github.com/sarmasachin/ff-sensitivity.git .
```

### Postgres (new DB only)

```bash
sudo -u postgres psql -c "CREATE USER ffops WITH PASSWORD 'CHANGE_ME_STRONG';"
sudo -u postgres psql -c "CREATE DATABASE ff_sensitivity_ops OWNER ffops;"
```

### API (`ff-ops-api` → 4010)

```bash
cd /var/www/ff-sensitivity/api
cp .env.example .env
# edit .env: PORT=4010, CORS_ORIGIN=https://app.sensitivitysettings.com,
# DATABASE_URL, JWT secrets, GOOGLE_WEB_CLIENT_ID, SUPERADMIN_*

npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start dist/main.js --name ff-ops-api
pm2 save
```

### Admin (`ff-ops-admin` → 3010)

```bash
cd /var/www/ff-sensitivity/admin
# create .env.production with:
# NEXT_PUBLIC_API_URL=https://api.sensitivitysettings.com

npm ci
npm run build
pm2 start npm --name ff-ops-admin -- start -- -p 3010
pm2 save
```

### Nginx (ADD-only)

Create `/etc/nginx/sites-available/app.sensitivitysettings.com`:

```nginx
server {
    listen 80;
    server_name app.sensitivitysettings.com;
    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Create `/etc/nginx/sites-available/api.sensitivitysettings.com`:

```nginx
server {
    listen 80;
    server_name api.sensitivitysettings.com;
    location / {
        proxy_pass http://127.0.0.1:4010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/app.sensitivitysettings.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.sensitivitysettings.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
# If SSL not already on both:
# sudo certbot --nginx -d app.sensitivitysettings.com -d api.sensitivitysettings.com
```

Never edit the existing BGMI / apex Nginx file.

## Update (later)

```bash
cd /var/www/ff-sensitivity
git fetch && git reset --hard origin/main

cd api && npm ci && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 reload ff-ops-api
cd ../admin && npm ci && npm run build && pm2 reload ff-ops-admin
```

Build fail → **stop** (do not reload). Never `pm2 kill`.

## Verify

```bash
curl -sI https://app.sensitivitysettings.com/ | head -n 3
curl -sI https://api.sensitivitysettings.com/ | head -n 3
curl -sI https://sensitivitysettings.com/ | head -n 3
pm2 list
ss -lntp | grep -E '3001|3010|4010'
```
