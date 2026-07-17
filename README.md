# Frido Master Dashboard

Internal dashboard for Frido: links to Shopify, stores, tooling, feedback, and a small admin area for users/notices.

---

## What it does

**Access** — Sign-in goes through Clerk. Invites decide who gets in; permissions split admin vs staff (see `src/config/permissions.js`).

Rough overview by area:

- **Analytics** — Quick links/metrics hooked to your Shopify (and related) workflows; specifics live in-app.
- **Retail / ops** — Store and admin shortcuts (CRM, after-sales, etc.) in one place.
- **Feedback** — Product feedback views and leaderboard-style summaries where configured.

---

## Stack


| Layer    | Choices                                               |
| -------- | ----------------------------------------------------- |
| Frontend | React 19, Vite, React Router 7                        |
| Auth     | Clerk                                                 |
| Styles   | Plain CSS (shared tokens / layout in `src/`)          |
| API      | Express 5                                             |
| Database | PostgreSQL via Supabase in production; SQLite locally |
| Email    | Microsoft Graph where invites/transactions need it    |

<p align="center">
  <img src="docs/screenshots/login.png" alt="Login" width="800" />
</p>

---

## What it does

**Access** — Sign-in goes through Clerk. Invites decide who gets in; permissions split admin vs staff (see `src/config/permissions.js`).

<p align="center">
  <img src="docs/screenshots/analytics.png" alt="Dashboard / analytics view" width="800" />
</p>

Rough overview by area:

- **Analytics** — Quick links/metrics hooked to your Shopify (and related) workflows; specifics live in-app.
- **Retail / ops** — Store and admin shortcuts (CRM, after-sales, etc.) in one place.

<p align="center">
  <img src="docs/screenshots/retail-admin.png" alt="Retail and admin shortcuts" width="800" />
</p>

- **Feedback** — Product feedback views and leaderboard-style summaries where configured.

<p align="center">
  <img src="docs/screenshots/feedback.png" alt="Feedback" width="800" />
</p>

---

## Stack

| Layer        | Choices |
|-------------|---------|
| Frontend    | React 19, Vite, React Router 7 |
| Auth        | Clerk |
| Styles      | Plain CSS (shared tokens / layout in `src/`) |
| API         | Express 5 |
| Database    | PostgreSQL via Supabase in production; SQLite locally |
| Email       | Microsoft Graph where invites/transactions need it |

---

## Run it locally

You’ll need Node 18+ and npm.

```bash
git clone https://github.com/Ritaldojr7/Frido-Master-Dashboard.git
cd Frido-Master-Dashboard
npm install
cp .env.example .env
# fill Clerk keys and anything else from .env.example
npm run dev:all
```

Handy scripts:

- `npm run dev` — Vite only  
- `npm run dev:server` — API only  
- `npm run dev:all` — both  
- `npm run build` — production build
- `npm run build` — production build  

Production deploy details (Render, env vars, DB ping for Supabase) are in `.env.example` comments and hosting config—not duplicated here unless you ask.

**Continuous deployment** — On every push to `main`, the [CI workflow](.github/workflows/ci.yml) runs lint, tests, and a production build; when those succeed it POSTs to a Render [deploy hook](https://render.com/docs/deploy-hooks), so you can keep **auto-deploy off** in Render and still deploy from GitHub only. Add the repository secret `RENDER_DEPLOY_HOOK_URL` (the full hook URL from Render: **Dashboard → Web Service → Settings → Deploy Hooks**).

---

## Look & feel

Yellow accent (`#FFE100`), dark mode, and lightweight glass-style panels are intentional; tweaks are mostly in `src/App.css` and page CSS alongside components.

---

## License

© 2026 Frido. Proprietary—all rights reserved.

---

## Manpower Attendance & Performance Dashboard Setup

The **Manpower Attendance & Performance** dashboard is a live dashboard showing real-time agent attendance grids, monthly analytics, and productivity leaderboards populated directly by Slack check-in/checkout workflows and Google Form submissions.

Data flows **Google Sheets → Supabase Postgres → dashboard API**. The server syncs sheet tabs on a schedule, stores normalized attendance rows in Postgres (via `DATABASE_URL`), and serves the dashboard from the database — not from in-memory cache.

### Environment Variables
You must set the following environment variables on the Render dashboard:
* `DATABASE_URL` — Supabase Postgres connection string (same as the rest of the app).
* `MANPOWER_SPREADSHEET_ID` — The ID of the live Google Sheet (e.g. `1FpDhylMH8vnAEF0KSObiTiZaCWNeFb6EuLyNix-HG54`).
* `MANPOWER_SYNC_SECRET` — A secure token to authorize manual or external sync webhook requests (e.g., in headers `Authorization: Bearer <SECRET>`).
* `MANPOWER_SYNC_MS` — Optional. Background sync interval in milliseconds (default is `300000` or 5 minutes).

### Supabase tables
After deploy, attendance data is stored in:
* `manpower_attendance` — one row per agent per date (queryable in Supabase Table Editor).
* `manpower_sync_runs` — sync audit log (status, row counts, warnings).

Trigger a sync manually: `POST /api/manpower/sync` (admin or sync secret), or externally via `POST /api/manpower/sync/cron` with `MANPOWER_SYNC_SECRET`.

### Google Sheets Permission
The dashboard reuses the existing `GOOGLE_SERVICE_ACCOUNT_JSON` credential. Ensure the Google Sheet is shared as **Viewer** with the `client_email` specified in that JSON service account key.
