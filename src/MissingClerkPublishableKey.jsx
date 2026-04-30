export default function MissingClerkPublishableKey() {
    return (
        <div
            style={{
                fontFamily: 'system-ui, sans-serif',
                padding: '2.5rem',
                maxWidth: '36rem',
                margin: '0 auto',
                lineHeight: 1.5,
            }}
        >
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Clerk publishable key missing</h1>
            <p style={{ color: '#444', marginBottom: '1rem' }}>
                <code>VITE_CLERK_PUBLISHABLE_KEY</code> was not set when this production bundle was built, so the app
                cannot load Clerk (endless loading otherwise).
            </p>
            <p style={{ color: '#444', marginBottom: '1rem' }}>
                In Render → your web service → <strong>Environment</strong>, add{' '}
                <code>VITE_CLERK_PUBLISHABLE_KEY</code> (same application as <code>CLERK_SECRET_KEY</code>), then{' '}
                <strong>Manual Deploy</strong> with <strong>Clear build cache</strong>.
            </p>
            <p style={{ color: '#444', fontSize: '0.9rem' }}>
                Vite bakes this variable at <strong>build</strong> time, not only at runtime.
            </p>
        </div>
    );
}
