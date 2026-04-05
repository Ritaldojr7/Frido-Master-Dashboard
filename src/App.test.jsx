import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// App uses AuthGate which requires AuthContext; AuthGate shows login form when not authenticated.
// So when we render App, we see the login form unless we mock AuthContext to be authenticated.
// We can test that the app renders (login form or content) and that routes work when authenticated.
// For a simple smoke test, render with MemoryRouter and check that something from the app renders.
function renderApp(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
}

describe('App', () => {
  it('renders without crashing', () => {
    renderApp();
    // When not authenticated, AuthGate shows the login form
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('shows Frido branding on login screen', () => {
    renderApp();
    expect(screen.getByText('Frido')).toBeInTheDocument();
  });
});
