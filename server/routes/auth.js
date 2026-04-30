/**
 * Auth routes — now handled by Clerk.
 *
 * Login, forgot-password, reset-password, and accept-invite flows
 * are all managed by Clerk's hosted/embedded UI. This router is kept
 * as a placeholder in case you need to add custom auth-adjacent endpoints.
 */
import { Router } from 'express';

const router = Router();

/**
 * GET /api/auth/status — simple check that auth service is configured
 */
router.get('/status', (_req, res) => {
    res.json({
        provider: 'clerk',
        message: 'Authentication is managed by Clerk. Use the Clerk UI to sign in.',
    });
});

export default router;
