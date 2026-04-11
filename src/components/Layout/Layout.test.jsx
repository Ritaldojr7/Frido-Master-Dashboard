import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';
import Layout from './Layout';

vi.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: {
      id: '1',
      name: 'Admin',
      email: 'admin@myfrido.com',
      role: 'admin',
      department: 'Technology',
      avatar_url: '',
      status: 'active',
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    hasRole: vi.fn((...roles) => roles.includes('admin')),
    apiFetch: vi.fn(),
  }),
}));

function renderLayout(children = <div>Page content</div>) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Layout>{children}</Layout>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Layout', () => {
  it('renders the sidebar with frido logo', () => {
    renderLayout();
    const logos = screen.getAllByAltText('frido');
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });

  it('renders main navigation links', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: /retail - staff/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retail - admin/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /business analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /feedback department/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /user management/i })).toBeInTheDocument();
  });

  it('renders the search placeholder', () => {
    renderLayout();
    expect(screen.getByPlaceholderText(/search tools & links/i)).toBeInTheDocument();
  });

  it('renders user menu for demo admin', () => {
    renderLayout();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders children in main content', () => {
    renderLayout(<div data-testid="child">Page content</div>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});
