import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import InsideSalesIndia from './InsideSalesIndia';

vi.mock('../components/SectionGroup/SectionGroup', () => ({
  default: () => <div data-testid="section-group-placeholder">Sections</div>,
}));

function renderInsideSalesIndia() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <InsideSalesIndia />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('InsideSalesIndia', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders header, content, and footer', () => {
    renderInsideSalesIndia();
    expect(screen.getByText(/Inside Sales.*India/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Tools, CRMs, IVR systems, references, and analytics for the India sales team/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /myfrido\.com/i });
    expect(link).toHaveAttribute('href', 'https://www.myfrido.com');
  });
});
