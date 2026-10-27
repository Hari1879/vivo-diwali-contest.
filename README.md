# vivo Diwali Contest Microsite

A mobile-first contest site with three customer pages, a NestJS API and an admin panel.

| Part | Tech | Folder |
|---|---|---|
| Customer site + admin panel | Angular 20 (standalone, zoneless, signals) | `frontend/` |
| API | NestJS 11 + TypeORM | `backend/` |
| Database | PostgreSQL 16 | — |
| Hosting | Nginx + pm2 on the VPS | `deploy/` |

## What's included

**Customer flow (QR code → phone)**
1. **Register** (`/`): the Diwali banner and the form. Name; Contact Number (10 digits); Branch (14, taken from the store list); Shop Code → **Shop Name auto-fills**; Mobile Number (with a "same as contact" tick box); IMEI (15 digits); Mobile Model (dropdown + "Other"); Mobile Price (min ₹20,000); T&C tick box. The **Next** button is disabled until the T&C box is ticked.
2. **Scratch card** (`/play`): a canvas scratch card that shows a Diwali wish (engagement only, no prize). It opens after about 45% is scratched, and there is a "tap to reveal" fallback.
3. **Thank you** (`/thank-you`): the same message for everyone.

**Server-side rules** (the server enforces these even if someone bypasses the form)
- The shop code must exist, and it must belong to the selected branch. The form offers a one-tap fix.
- Price ≥ `MIN_PRICE` (20000).
- **One entry per IMEI**: a unique index in the database plus a friendly "already registered" message.
- The IMEI must be in the uploaded list. `IMEI_MISMATCH_MODE=block` rejects an IMEI that isn't, and `review` saves the entry as **review** for the vivo team to check.
- Rate limits: 10 registrations per minute per IP, and 5 admin login attempts per minute.
- Helmet security headers, input validation and whitelisting. Admin passwords are hashed with bcrypt, and admin sessions use a JWT that lasts 12 hours.

**Admin panel** (`/admin`)
- **Dashboard**: totals, today's count, entries needing review, games played, IMEIs uploaded, entries by branch and by day.
- **Entries**: search by name, phone, IMEI or shop; filter by branch, status and date (IST); change an entry's status (valid / review / rejected); **export to Excel or CSV**. IMEI and phone numbers stay exact in Excel.
- **IMEI List**: upload the daily list (.xlsx/.csv); see the upload history; check a single IMEI.
- **Settings**: manage the mobile model dropdown; re-upload the store list.

## Run locally

```bash
# 1. Database
docker compose up -d            # or use any local PostgreSQL

# 2. API
cd backend
cp .env.example .env            # set DB_*, JWT_SECRET, ADMIN_PASSWORD
npm install
npm run build
npm run seed                    # creates admin + loads data/stores.xlsx (6,400 stores) + data/models.txt
npm run start:dev               # http://127.0.0.1:3100/api

# 3. Frontend (new terminal)
cd frontend
npm install
npx ng serve                    # http://localhost:4200  (proxies /api to :3100)
```

To load a test IMEI list from the command line: `npm run seed -- --imeis path/to/imeis.xlsx`.

## Deploy on the VPS (Ubuntu, Nginx, pm2)

```bash
# One-time: database and user
sudo -u postgres psql -c "CREATE USER vivo WITH PASSWORD 'strong-password';"
sudo -u postgres psql -c "CREATE DATABASE vivo_diwali OWNER vivo;"

# Code
git clone <your-repo> /opt/vivo-diwali && cd /opt/vivo-diwali
cp backend/.env.example backend/.env && nano backend/.env   # DB_USER=vivo, strong JWT_SECRET + ADMIN_PASSWORD

bash deploy/deploy.sh                    # builds both, copies frontend to /var/www/vivo-diwali, starts pm2
cd backend && npm run seed && cd ..      # first time only

# Nginx + free SSL
sudo cp deploy/nginx.conf /etc/nginx/sites-available/vivo-diwali   # replace YOUR_DOMAIN inside
sudo ln -s /etc/nginx/sites-available/vivo-diwali /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN
```

The API runs on port **3100**, so it won't clash with another app on 3000. Change `PORT` in `.env` and in `deploy/nginx.conf` together.

**QR code:** `cd backend && npm run build && npm run qr -- https://YOUR_DOMAIN` writes `qr/contest-qr.png` (2000 px) and `qr/contest-qr.svg` (for print).

**Backups:** add a daily cron job, for example
`0 2 * * * pg_dump -U vivo vivo_diwali | gzip > /var/backups/vivo_diwali_$(date +\%F).sql.gz`

## Things vivo hands over

| Item | Where it goes |
|---|---|
| Diwali banner (1080 × 600 px, < 300 KB) | `frontend/public/assets/`; update `BANNER_URL` in `frontend/src/app/contest/contest.config.ts` |
| Terms & Conditions | `TERMS_HTML` in the same file |
| Scratch card wish text | `SCRATCH_MESSAGE` in the same file |
| Mobile model list | Admin → Settings (or `backend/data/models.txt` before the first seed) |
| Daily IMEI list | Admin → IMEI List |
| Store list updates | Admin → Settings |

## Open points (from the requirement document)

- **Contact Number vs Mobile Number:** both fields are kept. The "same as contact number" box makes this quick if vivo says they're the same number.
- **IMEI not in the list:** switch between `block` and `review` with `IMEI_MISMATCH_MODE` in `.env`, then restart with `pm2 restart vivo-diwali-api`.
- **Price below ₹20,000:** always blocked, as the form requirement says "Minimum Rs. 20,000".
- **Contest dates:** optional `CONTEST_START` / `CONTEST_END` in `.env` (e.g. `2026-10-28T00:00:00+05:30`) open and close the form automatically.

## API reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/config` | – | branches, models, min price, open/closed |
| GET | `/api/stores/:code` | – | shop name + branch for auto-fill |
| POST | `/api/entries` | – | register (all checks) |
| POST | `/api/entries/:id/played` | play token | mark scratch card played |
| POST | `/api/admin/login` | – | admin token |
| GET | `/api/admin/stats` | admin | dashboard numbers |
| GET | `/api/admin/entries` | admin | list with filters + paging |
| GET | `/api/admin/entries/export?format=xlsx\|csv` | admin | export with same filters |
| PATCH | `/api/admin/entries/:id/status` | admin | valid / review / rejected |
| POST | `/api/admin/imeis/upload` | admin | daily IMEI file |
| GET | `/api/admin/imeis/uploads` | admin | upload history |
| GET | `/api/admin/imeis/:imei` | admin | check one IMEI |
| POST | `/api/admin/stores/upload` | admin | update store list |
| GET/POST/DELETE | `/api/admin/models` | admin | mobile model dropdown |
