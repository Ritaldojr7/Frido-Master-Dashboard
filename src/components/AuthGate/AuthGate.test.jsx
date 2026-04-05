import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthGate from './AuthGate';

// Mock AuthContext
const mockLogin = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    login: mockLogin,
  }),
}));

describe('AuthGate', () => {
  beforeEach(() => {
    mockLogin.mockClear();
  });

  it('renders login form when not authenticated', () => {
    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>
    );
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /access dashboard/i })).toBeInTheDocument();
  });

  it('renders Frido branding', () => {
    render(<AuthGate><span>Child</span></AuthGate>);
    expect(screen.getByText('Frido')).toBeInTheDocument();
    expect(screen.getByText('Master Dashboard')).toBeInTheDocument();
  });

  it('renders myfrido.com footer link', () => {
    render(<AuthGate><span>Child</span></AuthGate>);
    const link = screen.getByRole('link', { name: /www\.myfrido\.com/i });
    expect(link).toHaveAttribute('href', 'https://www.myfrido.com');
  });

  it('submit button is disabled when password is empty', () => {
    render(<AuthGate><span>Child</span></AuthGate>);
    expect(screen.getByRole('button', { name: /access dashboard/i })).toBeDisabled();
  });

  it('submit button is enabled when password is entered', () => {
    render(<AuthGate><span>Child</span></AuthGate>);
    fireEvent.change(screen.getByPlaceholderText('Enter password'), {
      target: { value: 'something' },
    });
    expect(screen.getByRole('button', { name: /access dashboard/i })).not.toBeDisabled();
  });
});

