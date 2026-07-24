/**
 * Retail module (server) — organization defaults.
 *
 * Default POC/leadership contacts shown on the Retail Staff portal when the
 * `VITE_RETAIL_STRUCTURE_CONTACTS` env var is not set. Imported by the shared
 * env parser (server/utils/organizationEnv.js).
 *
 * NOTE: the client bundle keeps its own copy in src/config/organizationConfig.js
 * because the browser cannot import server modules. Keep the two in sync.
 */
export const DEFAULT_RETAIL_STRUCTURE_CONTACTS = [
    { name: 'Vikal Gupta', pocFor: 'Retail VP', email: 'Vikal.g@myfrido.com', phone: '' },
    { name: 'Anirudha', pocFor: 'Customer Experience', email: 'aniruddha.b@myfrido.com', phone: '+919527907966' },
    { name: 'Anirudha', pocFor: 'Training & Development', email: 'aniruddha.b@myfrido.com', phone: '+919527907966' },
    { name: 'Rishab', pocFor: 'Retail Inside Sales', email: 'Rishab.d@myfrido.com', phone: '+919353558851' },
    { name: 'Shernyl', pocFor: 'Retail Customer Support', email: 'Shernyl.r@myfrido.com', phone: '+919029929930' },
];
