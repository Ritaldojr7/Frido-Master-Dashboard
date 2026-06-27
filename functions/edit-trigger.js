// Cloudflare Pages Function. Lives at functions/edit-trigger.js and is served at /edit-trigger.
// Checks the shared password, then wakes the GitHub Actions agent.
// The GitHub token stays server-side (Cloudflare env var) - it never reaches the browser.
export async function onRequestPost(context) {
  const { request, env } = context;
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }

  const pass = env.EDIT_PASS;
  if (!pass) return json({ error: 'Server not configured (EDIT_PASS missing)' }, 500);
  if (String(body.password || '') !== pass) return json({ error: 'Wrong password' }, 401);

  const instruction = String(body.instruction || '').trim();
  if (!instruction || instruction.length > 500) return json({ error: 'Instruction must be 1-500 characters' }, 400);

  const repo = env.GH_REPO, token = env.GH_TOKEN;
  if (!repo || !token) return json({ error: 'Server not configured (GH_REPO / GH_TOKEN missing)' }, 500);

  const gh = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'frido-edit-trigger',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: 'dashboard-edit', client_payload: { instruction } }),
  });
  if (!gh.ok) return json({ error: 'GitHub dispatch failed', detail: (await gh.text()).slice(0, 200) }, 502);
  return json({ ok: true }, 202);
}
