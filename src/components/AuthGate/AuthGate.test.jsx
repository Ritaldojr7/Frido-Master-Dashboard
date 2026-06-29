import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthGate from './AuthGate';

// Mock Clerk components
vi.mock('@clerk/react', () => ({
  Show: ({ when, children }) => {
    // In tests, simulate signed-out state
    if (when === 'signed-out') return children;
    if (when === 'signed-in') return null;
    return children;
  },
  SignInButton: ({ children }) => children,
  SignUpButton: ({ children }) => children,
}));

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isLoading: false,
  }),
}));

describe('AuthGate', () => {
  it('renders login page when signed out', () => {
    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>
    );
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders Frido branding', () => {
    render(<AuthGate><span>Child</span></AuthGate>);
    expect(screen.getByRole('img', { name: /frido master dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/analytics, feedback & admin/i)).toBeInTheDocument();
  });

  it('renders contact admin email link', () => {
    render(<AuthGate><span>Child</span></AuthGate>);
    const link = screen.getByRole('link', { name: /contact admin/i });
    expect(link).toHaveAttribute('href', 'mailto:ritwik.m@myfrido.com');
  });

  it('sign in button is always enabled (Clerk handles validation)', () => {
    render(<AuthGate><span>Child</span></AuthGate>);
    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });
});
