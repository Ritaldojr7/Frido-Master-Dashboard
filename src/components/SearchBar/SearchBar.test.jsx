import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchBar from './SearchBar';

function renderSearchBar() {
  return render(
    <MemoryRouter>
      <SearchBar />
    </MemoryRouter>
  );
}

describe('SearchBar', () => {
  it('renders search input with placeholder', () => {
    renderSearchBar();
    expect(screen.getByPlaceholderText(/search tools & links/i)).toBeInTheDocument();
  });

  it('renders Ctrl+K shortcut hint', () => {
    renderSearchBar();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
  });

  it('updates value when typing', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText(/search tools & links/i);
    fireEvent.change(input, { target: { value: 'dashboard' } });
    expect(input).toHaveValue('dashboard');
  });

  it('shows results when searching for existing term', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText(/search tools & links/i);
    fireEvent.change(input, { target: { value: 'GST' } });
    expect(screen.getByText('Raise a GST Bill')).toBeInTheDocument();
  });

  it('shows no results message when search has no matches', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText(/search tools & links/i);
    fireEvent.change(input, { target: { value: 'xyznonexistent123' } });
    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });
});
