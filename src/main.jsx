import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'
import MissingClerkPublishableKey from './MissingClerkPublishableKey.jsx'
import { registerServiceWorker } from './pwa/registerServiceWorker.js'

const clerkPublishableKey = String(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '').trim()
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)
registerServiceWorker()

const app = <App />

if (!clerkPublishableKey && import.meta.env.PROD) {
    root.render(
        <StrictMode>
            <MissingClerkPublishableKey />
        </StrictMode>,
    )
} else {
    if (!clerkPublishableKey && !import.meta.env.PROD) {
        console.warn('[Frido Dashboard] VITE_CLERK_PUBLISHABLE_KEY is empty — Clerk sign-in will not work.')
    }
    root.render(
        <StrictMode>
            {DEMO_MODE ? (
                app
            ) : (
                <ClerkProvider afterSignOutUrl="/" publishableKey={clerkPublishableKey}>
                    {app}
                </ClerkProvider>
            )}
        </StrictMode>,
    )
}