import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import ExperienceStore from './ExperienceStore';

vi.mock('../components/SectionGroup/SectionGroup', () => ({
  default: () => <div data-testid="section-group-placeholder">Sections</div>,
}));

function renderExperienceStore() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <ExperienceStore />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('ExperienceStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders header, content, and footer', () => {
    renderExperienceStore();
    expect(screen.getByText('Experience Store')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/POS systems, CRM logins, product resources, and analytics for the Experience Store team/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /myfrido\.com/i });
    expect(link).toHaveAttribute('href', 'https://www.myfrido.com');
  });
});
