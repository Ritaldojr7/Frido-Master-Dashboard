import { Router } from 'express';
import { loadOrganizationConfigFromEnv } from '../utils/organizationEnv.js';

const router = Router();

/** Public runtime org config — read from server env (no rebuild required on Render). */
router.get('/', (_req, res) => {
    res.json(loadOrganizationConfigFromEnv());
});

export default router;
