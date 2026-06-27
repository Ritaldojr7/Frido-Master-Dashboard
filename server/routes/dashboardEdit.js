import express from 'express';

const router = express.Router();

async function dispatchEdit(req, res, { passEnvKey, eventType }) {
    let body = {};
    try {
        body = req.body;
    } catch {
        return res.status(400).json({ error: 'Bad request' });
    }

    const pass = process.env[passEnvKey];
    if (!pass) return res.status(500).json({ error: `Server not configured (${passEnvKey} missing)` });
    if (String(body.password || '') !== pass) return res.status(401).json({ error: 'Wrong password' });

    const instruction = String(body.instruction || '').trim();
    if (!instruction || instruction.length > 500) {
        return res.status(400).json({ error: 'Instruction must be 1-500 characters' });
    }

    const repo = process.env.GH_REPO;
    const token = process.env.GH_TOKEN;
    if (!repo || !token) return res.status(500).json({ error: 'Server not configured (GH_REPO / GH_TOKEN missing)' });

    const gh = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'frido-dashboard-edit-trigger',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_type: eventType, client_payload: { instruction } }),
    });

    if (!gh.ok) {
        return res.status(502).json({ error: 'GitHub dispatch failed', detail: (await gh.text()).slice(0, 200) });
    }
    return res.status(202).json({ ok: true });
}

router.post('/ist-edit-trigger', async (req, res) => {
    await dispatchEdit(req, res, { passEnvKey: 'IST_EDIT_PASS', eventType: 'ist-console-edit' });
});

router.post('/exec-edit-trigger', async (req, res) => {
    await dispatchEdit(req, res, { passEnvKey: 'EXEC_EDIT_PASS', eventType: 'exec-dashboard-edit' });
});

export default router;
