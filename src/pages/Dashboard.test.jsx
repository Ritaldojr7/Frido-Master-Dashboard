import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import Dashboard from './Dashboard';

// Mock SectionGroup to avoid rendering dozens of LinkCards per test
vi.mock('../components/SectionGroup/SectionGroup', () => ({
  default: () => <div data-testid="section-group-placeholder">Sections</div>,
}));

function renderDashboard() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Dashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders hero, stats, and footer in a single pass', () => {
    renderDashboard();
    expect(screen.getByText(/Frido Master/)).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('SAIYED ABDAL')).toBeInTheDocument();
    expect(screen.getByText(/Your central hub for all operational tools/)).toBeInTheDocument();
    expect(screen.getByText('CATEGORIES')).toBeInTheDocument();
    expect(screen.getByText('TOOLS & LINKS')).toBeInTheDocument();
    expect(screen.getByText('ALL SYSTEMS LIVE')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /www\.myfrido\.com/i });
    expect(link).toHaveAttribute('href', 'https://www.myfrido.com');
  });
});
