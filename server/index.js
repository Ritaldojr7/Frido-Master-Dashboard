/**
 * Frido Master Dashboard — Express API Server
 * Handles auth, user management, and Azure email integration.
 */
import 'dotenv/config';
import { createApp } from './app.js';
import { startOrderDisputeSyncScheduler } from './services/orderDisputeSync.js';
import { startManpowerSyncScheduler } from './services/manpowerSync.js';

if (process.env.NODE_ENV === 'production' && process.env.VITE_DEMO_MODE === 'true') {
    console.error(
        '[Frido Dashboard] FATAL: VITE_DEMO_MODE must not be set in production. Remove it from Render env vars and rebuild.'
    );
    process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY && process.env.NODE_ENV === 'production') {
    console.warn(
        '[Frido Dashboard] CLERK_SECRET_KEY is not set — /api/users and /api/notices will reject tokens.'
    );
}

const app = createApp();
const PORT = process.env.PORT || process.env.API_PORT || 4000;

app.listen(PORT, () => {
    console.log(`\n⚡ Frido API Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   DB ping (if DB_PING_SECRET set): http://localhost:${PORT}/api/health/db\n`);
    startOrderDisputeSyncScheduler();
    startManpowerSyncScheduler();
});

export default app;
