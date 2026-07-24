# Retail module

All retail-owned code lives here (frontend) and in `server/modules/retail/` (backend).
The shared app shell composes retail through this module's public surface instead of
hard-coding retail routes, nav, or data — so retail can be reasoned about, and eventually
extracted, as one unit.

## What this module owns

### Frontend — `src/modules/retail/`
| File | Contents |
|------|----------|
| `index.js` | Public surface: `retailRoutes`, `retailAnalyticsNavGroup`, `retailAggregatorNavItems`, `staffExperienceStoreData`, `retailAdminData` |
| `routes.jsx` | `retailRoutes` — `<Route>`s for `/retail-staff`, `/retail-staff/analytics-console`, `/retail-admin`, with their role guards |
| `sidebar.js` | Sidebar fragments: the "Retail Analytics" group + the Aggregator "Retail Staff"/"Retail Admin" items |
| `pages/` | `StaffDashboard`, `StoreAnalyticsConsole`, `RetailAdminDashboard` |
| `config/retailData.js` | `staffExperienceStoreData` (Retail Staff portal) + `retailAdminData` link trees |

### Backend — `server/modules/retail/`
| File | Contents |
|------|----------|
| `constants.js` | `RETAIL_DASHBOARD_SLUG`, `NOTICE_AUDIENCE_RETAIL`, `RETAIL_NOTICE_ROLES`, `RETAIL_STATIC_PREFIX` |
| `organization.js` | `DEFAULT_RETAIL_STRUCTURE_CONTACTS` |

## How it plugs into the shared shell (the seams)

- `src/App.jsx` renders `{retailRoutes}` inside its top-level `<Routes>`.
- `src/components/Layout/Layout.jsx` splices `retailAnalyticsNavGroup(ICONS)` into the Analytics
  section and `...retailAggregatorNavItems(ICONS)` into the Aggregator section.
- `src/context/DashboardDataContext.jsx` imports `staffExperienceStoreData` from this module.
- `src/config/dashboardData.js` re-exports `staffExperienceStoreData` / `retailAdminData` for
  backward-compatible importers (e.g. server seed scripts).
- Server: `server/constants/dashboardSlugs.js`, `server/constants/notices.js`, and
  `server/utils/organizationEnv.js` import the retail constants from `server/modules/retail`.

## Shared dependencies retail still relies on

Retail is a module, **not** a standalone app. It depends on the shared foundation, which any
extraction must bring along:

- **App shell & providers** — `src/context/*` (Auth, Theme, DashboardData, OrgConfig), `src/App.jsx`
- **UI chrome & components** — `src/components/Layout`, `SectionGroup`, `NoticeAttachmentList`,
  `Typewriter`, `RoleGuard`
- **RBAC** — `src/config/permissions.js` (owns `ROLES`, `RETAIL_STAFF_ACCESS_ROLES`, `ADMIN_ONLY`,
  the retail route→role entries, and `defaultHomePath`). This is centralized shared infra by design.
- **Org config** — `src/config/organizationConfig.js` (client) / `server/utils/organizationEnv.js`
  (server), including the store-email map used by the Store Analytics Console.
- **Static assets** — `public/retail-staff/` (brochure + CX PDFs) and `public/fes-sm-dashboard/`
  (Store Analytics Console iframe).
- **Server infrastructure that is intentionally NOT split** (multi-section, security-sensitive):
  - `server/constants/notices.js` — the notices audience SQL serves both `retail_staff` and `isd_nm`.
  - The `notices.audience` DB column (`'retail_staff'` / `'isd_nm'`) — one shared table.
  - `server/middleware/protectStaticDashboards.js` — centralized static-dashboard auth; the retail
    prefix is `RETAIL_STATIC_PREFIX` (`/fes-sm-dashboard`), but its policy lives with the others.
  - `server/routes/dashboards.js`, `server/routes/notices.js`, seed scripts.

## Extracting retail into a standalone repo

1. Copy `src/modules/retail/` and `server/modules/retail/` into the new repo.
2. Copy the **shared foundation** listed above (context, Layout + shared components, permissions,
   organizationConfig/organizationEnv, the notices + dashboards backend, `public/retail-staff/` and
   `public/fes-sm-dashboard/`, and the build config).
3. In the new repo's `App.jsx`, render only `{retailRoutes}` (drop the ISD/ORM/Feedback/LMS/DOP routes).
4. In `Layout.jsx`, keep only the retail sidebar fragments (drop the non-retail sections).
5. Trim `src/config/permissions.js` to the retail route entries and roles (`admin`, `staff`).
6. Trim the backend: `PHASE_ONE_DASHBOARD_SLUGS` to `[RETAIL_DASHBOARD_SLUG]`, and the notices
   audience logic to the retail branch only.
7. Run `npm run lint` and `npm run test:run`, then verify the app boots (see the repo root).

The module boundary makes steps 3–6 a matter of deleting the non-retail entries the shared files
enumerate, rather than hunting retail logic scattered across every file.
