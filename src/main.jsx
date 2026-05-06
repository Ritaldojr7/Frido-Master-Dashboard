import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'
import MissingClerkPublishableKey from './MissingClerkPublishableKey.jsx'

const clerkPublishableKey = String(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '').trim()

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)

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
            <ClerkProvider afterSignOutUrl="/" publishableKey={clerkPublishableKey}>
                <App />
            </ClerkProvider>
        </StrictMode>,
    )
}