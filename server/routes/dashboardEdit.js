/**
 * "Edit with Claude" — dispatches a GitHub workflow that opens a PR against a static
 * dashboard. Triggering CI in the repo is a privileged action, so it requires an
 * authenticated admin.
 *
 * NOTE ON MOUNTING: this router is mounted at bare `/api` in app.js, *before* the health
 * routes are registered. Auth is therefore applied per-route rather than via `router.use`
 * — a router-level middleware here would also run for `/api/health`, `/api/health/db`, and
 * every unmatched `/api/*` path, breaking Render's health check and turning 404s into 401s.
 */
import express from 'express';
import { requireAdminSession } from '../middleware/resolveUser.js';
import { editTriggerLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

async function dispatchEdit(req, res, { eventType }) {
    const instruction = String(req.body?.instruction || '').trim();
    if (!instruction || instruction.length > 500) {
        return res.status(400).json({ error: 'Instruction must be 1-500 characters' });
    }

    const repo = process.env.GH_REPO;
    const token = process.env.GH_TOKEN;
    if (!repo || !token) {
        return res.status(500).json({ error: 'Server not configured (GH_REPO / GH_TOKEN missing)' });
    }

    console.warn(
        `[dashboardEdit] ${eventType} dispatched by ${req.user.email} (${req.user.id}): ${instruction.slice(0, 80)}`
    );

    const gh = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'frido-dashboard-edit-trigger',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event_type: eventType,
            client_payload: { instruction, requested_by: req.user.email },
        }),
    });

    if (!gh.ok) {
        return res
            .status(502)
            .json({ error: 'GitHub dispatch failed', detail: (await gh.text()).slice(0, 200) });
    }
    return res.status(202).json({ ok: true });
}

router.post('/exec-edit-trigger', requireAdminSession, editTriggerLimiter, async (req, res) => {
    await dispatchEdit(req, res, { eventType: 'exec-dashboard-edit' });
});

// `/ist-edit-trigger` was removed: no caller existed anywhere in the codebase (the
// ist-console dashboard ships no edit UI), and it was an unauthenticated path to a GitHub
// dispatch. The ist-console-edit workflow remains runnable via workflow_dispatch.

export default router;
