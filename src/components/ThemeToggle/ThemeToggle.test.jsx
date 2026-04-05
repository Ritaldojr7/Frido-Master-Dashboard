import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

function renderThemeToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe('ThemeToggle', () => {
  it('renders toggle button', () => {
    renderThemeToggle();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has accessible label for theme switch', () => {
    renderThemeToggle();
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label');
    expect(btn.getAttribute('aria-label')).toMatch(/switch to (light|dark) mode/i);
  });

  it('toggles on click', () => {
    renderThemeToggle();
    const btn = screen.getByRole('button');
    const labelBefore = btn.getAttribute('aria-label');
    fireEvent.click(btn);
    const labelAfter = btn.getAttribute('aria-label');
    expect(labelBefore).not.toBe(labelAfter);
  });
});
