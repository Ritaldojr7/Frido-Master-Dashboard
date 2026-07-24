/**
 * Retail module — public surface.
 *
 * The shared app shell composes retail into the app exclusively through these
 * exports (routes + sidebar fragments). See ./README.md for the module's shared
 * dependencies and the steps to extract it into a standalone repo.
 */
export { retailRoutes } from './routes.jsx';
export { retailAnalyticsNavGroup, retailAggregatorNavItems } from './sidebar.js';
export { staffExperienceStoreData, retailAdminData } from './config/retailData.js';
