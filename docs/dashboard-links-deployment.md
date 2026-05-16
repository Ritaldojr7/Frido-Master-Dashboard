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
