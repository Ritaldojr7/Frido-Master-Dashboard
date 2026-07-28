import db, { shutdownDb } from '../db.js';

async function clearAll() {
    try {
        const result = await db.run('DELETE FROM dashboard_notifications');
        const count = result?.changes ?? result?.rowCount ?? 0;
        console.log(`✓ Cleared ${count} notification(s) from database.`);
    } catch (err) {
        console.error('Error clearing notifications:', err.message);
    } finally {
        await shutdownDb();
    }
}

clearAll();
