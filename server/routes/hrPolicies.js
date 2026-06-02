import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { ISD_NM_ROLES } from '../../src/config/permissions.js';
import { resolveHrPolicyDocument } from '../constants/hrPolicyDocuments.js';
import { readHrPolicyBuffer } from '../services/hrPolicyDocuments.js';

const router = Router();

router.get('/:slug', verifyToken, requireRole(ISD_NM_ROLES), async (req, res) => {
    const doc = resolveHrPolicyDocument(req.params.slug);
    if (!doc) {
        return res.status(404).json({ error: 'Policy document not found' });
    }

    try {
        const buffer = await readHrPolicyBuffer(doc.storagePath);
        res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(doc.fileName)}"`
        );
        res.send(buffer);
    } catch (err) {
        console.error('[hr-policies] download', err.message);
        res.status(404).json({ error: 'Policy file not found in storage' });
    }
});

export default router;
