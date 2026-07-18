/** HR policy PDFs served from Supabase Storage (not static /public files). */

export const DEFAULT_HR_POLICY_BUCKET = 'notice-attachments';

/** @type {Record<string, { storagePath: string, fileName: string, mimeType: string }>} */
export const HR_POLICY_DOCUMENTS = {
    'leave-and-holiday-2026': {
        storagePath: 'hr-policies/leave-and-holiday-2026.pdf',
        fileName: 'POLICY - LEAVE AND HOLIDAY 2026.pdf',
        mimeType: 'application/pdf',
    },
    'marriage-gifting-policy': {
        storagePath: 'hr-policies/marriage-gifting-policy.pdf',
        fileName: 'Marriage Gifting Policy.pdf',
        mimeType: 'application/pdf',
    },
    'shopify-training-manual': {
        storagePath: 'hr-policies/shopify-training-manual.pdf',
        fileName: 'Frido Shopify Training Manual v1.pdf',
        mimeType: 'application/pdf',
    },
    'slack-training-manual': {
        storagePath: 'hr-policies/slack-training-manual.pdf',
        fileName: 'Frido Slack Training Manual v1.pdf',
        mimeType: 'application/pdf',
    },
};

/** @param {string} slug */
export function resolveHrPolicyDocument(slug) {
    return HR_POLICY_DOCUMENTS[String(slug ?? '').trim()] ?? null;
}
