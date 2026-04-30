import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey && import.meta.env.PROD) {
    console.error(
        '[Frido Dashboard] Missing VITE_CLERK_PUBLISHABLE_KEY — build with Clerk keys set (Render: define at build time).'
    );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider afterSignOutUrl="/" publishableKey={clerkPublishableKey}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)