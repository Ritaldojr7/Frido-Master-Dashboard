import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';
import Layout from './Layout';

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
    const fridoElements = screen.getAllByText('frido');
    expect(fridoElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders main navigation links', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sales india/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /experience store/i })).toBeInTheDocument();
  });

  it('renders the search placeholder', () => {
    renderLayout();
    expect(screen.getByPlaceholderText(/search tools & links/i)).toBeInTheDocument();
  });

  it('renders user avatar with SA', () => {
    renderLayout();
    expect(screen.getByText('SA')).toBeInTheDocument();
  });

  it('renders children in main content', () => {
    renderLayout(<div data-testid="child">Page content</div>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});
