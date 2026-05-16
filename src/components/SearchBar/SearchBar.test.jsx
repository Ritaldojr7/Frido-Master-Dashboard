import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardDataProvider } from '../../context/DashboardDataContext';
import SearchBar from './SearchBar';

vi.mock('../../context/AuthContext', () => ({
  apiFetch: vi.fn().mockResolvedValue({ dashboards: {} }),
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: true,
    isLoading: false,
  })),
}));

async function setupSearchBar() {
  let utils;
  await act(async () => {
    utils = render(
      <MemoryRouter>
        <DashboardDataProvider>
          <SearchBar />
        </DashboardDataProvider>
      </MemoryRouter>
    );
    await Promise.resolve();
  });
  return utils;
}

describe('SearchBar', () => {
  it('renders search input with placeholder', async () => {
    await setupSearchBar();
    expect(screen.getByPlaceholderText(/search tools & links/i)).toBeInTheDocument();
  });

  it('renders Ctrl+K shortcut hint', async () => {
    await setupSearchBar();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
  });

  it('updates value when typing', async () => {
    await setupSearchBar();
    const input = screen.getByPlaceholderText(/search tools & links/i);
    fireEvent.change(input, { target: { value: 'dashboard' } });
    expect(input).toHaveValue('dashboard');
  });

  it('shows results when searching for existing term', async () => {
    await setupSearchBar();
    const input = screen.getByPlaceholderText(/search tools & links/i);
    fireEvent.change(input, { target: { value: 'GST' } });
    expect(screen.getByText('Raise a GST Bill')).toBeInTheDocument();
  });

  it('shows no results message when search has no matches', async () => {
    await setupSearchBar();
    const input = screen.getByPlaceholderText(/search tools & links/i);
    fireEvent.change(input, { target: { value: 'xyznonexistent123' } });
    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });
});
