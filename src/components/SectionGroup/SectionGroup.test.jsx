import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SectionGroup from './SectionGroup';

const mockLinks = [
  { title: 'Link One', url: 'https://example.com/1' },
  { title: 'Link Two', url: 'https://example.com/2', isInternal: true, route: '/two' },
];

function renderSectionGroup(props) {
  return render(
    <MemoryRouter>
      <SectionGroup {...props} />
    </MemoryRouter>
  );
}

describe('SectionGroup', () => {
  it('renders section title', () => {
    renderSectionGroup({
      title: 'Test Section',
      icon: 'chart',
      accentColor: 'amber',
      links: mockLinks,
    });
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('renders item count', () => {
    renderSectionGroup({
      title: 'Test Section',
      icon: 'chart',
      accentColor: 'blue',
      links: mockLinks,
    });
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderSectionGroup({
      title: 'Test Section',
      icon: 'chart',
      accentColor: 'emerald',
      links: mockLinks,
      description: 'Section description text',
    });
    expect(screen.getByText('Section description text')).toBeInTheDocument();
  });

  it('renders link cards for each link', () => {
    renderSectionGroup({
      title: 'Test Section',
      icon: 'chart',
      accentColor: 'purple',
      links: mockLinks,
    });
    expect(screen.getByText('Link One')).toBeInTheDocument();
    expect(screen.getByText('Link Two')).toBeInTheDocument();
  });
});
