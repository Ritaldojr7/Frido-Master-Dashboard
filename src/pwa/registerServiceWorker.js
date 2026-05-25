import { registerSW } from 'virtual:pwa-register';

/**
 * Registers service worker in production builds only.
 * Updates are applied automatically once the new worker is ready.
 */
export function registerServiceWorker() {
    if (!import.meta.env.PROD) return;
    registerSW({ immediate: true });
}
