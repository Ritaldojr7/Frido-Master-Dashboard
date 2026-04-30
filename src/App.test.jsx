import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Clerk at the top level
vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children }) => children,
  Show: ({ when, children }) => {
    if (when === 'signed-out') return children;
    if (when === 'signed-in') return null;
    return children;
  },
  SignInButton: ({ children }) => children,
  SignUpButton: ({ children }) => children,
  UserButton: () => null,
  useUser: () => ({ user: null, isLoaded: true }),
  useAuth: () => ({ isSignedIn: false, isLoaded: true, getToken: vi.fn() }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // When not authenticated, AuthGate shows the login page
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('shows Frido branding on login screen', () => {
    render(<App />);
    expect(screen.getByRole('img', { name: /frido master dashboard/i })).toBeInTheDocument();
  });
});
