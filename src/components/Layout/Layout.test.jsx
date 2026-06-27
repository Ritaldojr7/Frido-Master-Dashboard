import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardDataProvider } from '../../context/DashboardDataContext';
import { ThemeProvider } from '../../context/ThemeContext';
import Layout from './Layout';

vi.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  apiFetch: vi.fn().mockResolvedValue({ dashboards: {} }),
  useAuth: () => ({
    user: {
      id: '1',
      name: 'Admin',
      email: 'admin@myfrido.com',
      role: 'admin',
      roles: ['admin'],
      department: 'Technology',
      avatar_url: '',
      status: 'active',
    },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
    updateProfile: vi.fn(),
    hasRole: vi.fn((...roles) => roles.includes('admin')),
  }),
}));

async function renderLayout(children = <div>Page content</div>) {
  await act(async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <DashboardDataProvider>
            <Layout>{children}</Layout>
          </DashboardDataProvider>
        </MemoryRouter>
      </ThemeProvider>
    );
    await Promise.resolve();
  });
}

describe('Layout', () => {
  it('renders the sidebar with frido logo', async () => {
    await renderLayout();
    const logos = screen.getAllByAltText('frido');
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });

  it('renders main navigation links', async () => {
    await renderLayout();
    expect(screen.getByRole('link', { name: /retail staff/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retail admin/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /isd nm staff/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /data & analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /user management/i })).toBeInTheDocument();
  });

  it('renders the search placeholder', async () => {
    await renderLayout();
    expect(screen.getByPlaceholderText(/search tools & links/i)).toBeInTheDocument();
  });

  it('renders user menu for demo admin', async () => {
    await renderLayout();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders children in main content', async () => {
    await renderLayout(<div data-testid="child">Page content</div>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});
