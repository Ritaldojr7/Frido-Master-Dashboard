# Dashboard links (Postgres / Supabase)

Phase 1 link trees (`isd_nm`, `staff_experience_store`) live in Postgres via `dashboard_defs`, `dashboard_sections`, and `dashboard_links`. The SPA loads them through `GET /api/dashboards?slugs=isd_nm,staff_experience_store` with a static fallback in `dashboardData.js` if the API is empty or errors.

## Deploy order

1. **Deploy backend** — ensure the server boots with an updated schema so migrations run (`server/schema/pgStatements.js` defines the dashboard tables on startup).
2. **Seed dashboard rows** once per environment:

   ```bash
   DATABASE_URL="<supabase-uri>" npm run seed:dashboard-links -- --force
   ```

   Omit `--force` the first time; use `--force` to replace Phase 1 slugs after config changes.

3. **Smoke test** — open Retail Staff / ISD NM while signed in; links should match DB after seed.

There is nothing to toggle for rollback: clearing or not seeding the DB keeps the bundled static snapshots as the rendered source via `DashboardDataProvider`.

---

## Feedback department products (`feedback_products`)

The Feedback Department page loads **`GET /api/feedback/products`** (admin + feedback roles). Rows are stored as JSON payloads in **`feedback_products`** (`stable_id`, `sort_order`, `payload`).

1. Deploy backend so `feedback_products` is created on boot.
2. Seed from the bundled catalog:

   ```bash
   DATABASE_URL="<supabase-uri>" npm run seed:feedback-products -- --force
   ```

   First run without `--force` skips if any rows exist; use `--force` after editing `feedbackDatabase.js` to refresh all rows.

3. Static **`src/config/feedbackDatabase.js`** remains the fallback when the API returns nothing or fails.

---

## One-shot Supabase seed (service role, no `DATABASE_URL`)

When `.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` but not `DATABASE_URL`, seed dashboards, feedback products, and HR policy PDFs in one command:

```bash
npm run seed:supabase-all -- --force
```

Omit `--force` on first run; use `--force` after editing `dashboardData.js` or `feedbackDatabase.js`. Pass `--skip-pdfs` to skip Storage uploads.

**Runtime tables** (`notices`, `notice_attachments`, `notice_receipts`, `invite_tokens`) are populated by app usage, not this script.

---

## Order Dispute (Google Sheet → Supabase → Dashboard)

The Order Dispute page loads **`GET /api/order-disputes`** from Postgres snapshots. A background job on the API server pulls both Google Sheet tabs via the **Sheets API** and writes to:

- `order_dispute_tabs` — tab metadata (gid, title, sort order)
- `order_dispute_tab_snapshots` — latest headers + rows per tab (JSON)
- `order_dispute_sync_runs` — sync audit log

Tables are created on server boot via [`server/schema/pgStatements.js`](../server/schema/pgStatements.js).

### Data flow

1. **Sync** (every 60s by default): `fetchOrderDisputeSheets()` → upsert snapshots in Supabase
2. **Dashboard read**: `GET /api/order-disputes` reads DB only (no Google call per user request)

### Render environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Yes | Full service account key JSON (one line) |
| `ORDER_DISPUTE_SPREADSHEET_ID` | No | Defaults to the shared dispute spreadsheet id |
| `ORDER_DISPUTE_SHEET_GID_1` | No | First tab gid (default `1178023285`) |
| `ORDER_DISPUTE_SHEET_GID_2` | Yes (2 tabs) | Second tab gid from sheet URL `#gid=…` |
| `ORDER_DISPUTE_SYNC_MS` | No | Sync interval in ms (default `60000`) |
| `ORDER_DISPUTE_SYNC_SECRET` | No | Bearer/query token for `POST /api/order-disputes/sync/cron` |

### Google Cloud setup

1. Enable **Google Sheets API** on the GCP project.
2. Create a service account and download the JSON key.
3. Share the spreadsheet with the service account `client_email` as **Viewer** (uncheck “Notify people”).

### Manual / cron sync

- **Admin (Clerk session):** `POST /api/order-disputes/sync`
- **External cron:** `POST /api/order-disputes/sync/cron` with header `Authorization: Bearer <ORDER_DISPUTE_SYNC_SECRET>`

After deploy, open `/order-dispute` — two tab buttons should appear once the first sync completes (within one sync interval).
