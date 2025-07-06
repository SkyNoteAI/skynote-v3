import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchFilters } from '../SearchFilters';
import { notesApi } from '../../lib/api';
import { vi, describe, beforeEach, it, expect } from 'vitest';

// Mock the API
vi.mock('../../lib/api', () => ({
  notesApi: {
    getFilterOptions: vi.fn(),
  },
}));

const mockNotesApi = notesApi as any;

// Test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockFilterOptions = {
  tags: [
    { value: 'important', label: 'important', count: 10 },
    { value: 'work', label: 'work', count: 8 },
    { value: 'personal', label: 'personal', count: 5 },
  ],
  folders: [
    { value: 'Work', label: 'Work', count: 15 },
    { value: 'Personal', label: 'Personal', count: 7 },
    { value: '', label: '', count: 3 },
  ],
};

describe('SearchFilters', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnFiltersChange = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockNotesApi.getFilterOptions.mockResolvedValue(mockFilterOptions);
  });

  it('renders filter header with title', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('shows active filter count when filters are applied', async () => {
    const filters = {
      tags: ['important'],
      starred: true,
    };

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      </Wrapper>
    );

    expect(screen.getByText('2')).toBeInTheDocument(); // Badge showing 2 active filters
  });

  it('renders starred filter checkbox', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    expect(screen.getByText('Starred notes only')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /starred/i })
    ).toBeInTheDocument();
  });

  it('toggles starred filter when checkbox is clicked', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    const starredCheckbox = screen.getByRole('checkbox', { name: /starred/i });
    await user.click(starredCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ starred: true });
  });

  it('renders date range inputs', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('updates date range when inputs change', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    const fromInput = screen.getByLabelText('From');
    await user.type(fromInput, '2024-01-01');

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dateRange: { start: '2024-01-01', end: '' },
    });
  });

  it('renders quick date buttons and applies date ranges', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    const todayButton = screen.getByText('Today');
    await user.click(todayButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dateRange: expect.objectContaining({
        start: expect.any(String),
        end: expect.any(String),
      }),
    });
  });

  it('renders word count range inputs', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    expect(screen.getByText('Word Count')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // Min input
    expect(screen.getByDisplayValue('10000')).toBeInTheDocument(); // Max input
  });

  it('updates word count range when inputs change', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    const minInput = screen.getByDisplayValue('0');
    await user.clear(minInput);
    await user.type(minInput, '100');

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      wordCountRange: { min: 100, max: 10000 },
    });
  });

  it('renders tags filter when tags are available', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Tags (0 selected)')).toBeInTheDocument();
      expect(screen.getByText('#important')).toBeInTheDocument();
      expect(screen.getByText('#work')).toBeInTheDocument();
      expect(screen.getByText('#personal')).toBeInTheDocument();
    });
  });

  it('shows tag counts correctly', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // important tag count
      expect(screen.getByText('8')).toBeInTheDocument(); // work tag count
      expect(screen.getByText('5')).toBeInTheDocument(); // personal tag count
    });
  });

  it('toggles tag selection when tag is clicked', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('#important')).toBeInTheDocument();
    });

    const importantCheckbox = screen.getByRole('checkbox', {
      name: /important/i,
    });
    await user.click(importantCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      tags: ['important'],
    });
  });

  it('renders folders filter when folders are available', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Folders (0 selected)')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Root')).toBeInTheDocument(); // Empty folder path shows as "Root"
    });
  });

  it('toggles folder selection when folder is clicked', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    const workCheckbox = screen.getByRole('checkbox', { name: /work/i });
    await user.click(workCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      folders: ['Work'],
    });
  });

  it('shows active filters summary when filters are applied', async () => {
    const filters = {
      tags: ['important', 'work'],
      starred: true,
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
    };

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      </Wrapper>
    );

    expect(screen.getByText('Active Filters')).toBeInTheDocument();
    expect(screen.getByText('Starred')).toBeInTheDocument();
    expect(screen.getByText('important')).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('Date range')).toBeInTheDocument();
  });

  it('removes individual filters when X button is clicked', async () => {
    const filters = {
      tags: ['important'],
      starred: true,
    };

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      </Wrapper>
    );

    // Click X button next to the important tag
    const removeButtons = screen.getAllByRole('button');
    const removeTagButton = removeButtons.find((btn) =>
      btn.parentElement?.textContent?.includes('important')
    );

    if (removeTagButton) {
      await user.click(removeTagButton);
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        tags: [],
        starred: true,
      });
    }
  });

  it('clears all filters when clear all button is clicked', async () => {
    const filters = {
      tags: ['important'],
      starred: true,
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
    };

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      </Wrapper>
    );

    const clearAllButton = screen.getByText('Clear all');
    await user.click(clearAllButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('can be collapsed when isCollapsible is true', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters
          filters={{}}
          onFiltersChange={mockOnFiltersChange}
          isCollapsible={true}
        />
      </Wrapper>
    );

    // Should show collapse button
    const collapseButton = screen.getByRole('button', { name: '' }); // ChevronUp button
    await user.click(collapseButton);

    // Filter content should be hidden
    expect(screen.queryByText('Starred notes only')).not.toBeInTheDocument();
  });

  it('starts collapsed when defaultCollapsed is true', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters
          filters={{}}
          onFiltersChange={mockOnFiltersChange}
          isCollapsible={true}
          defaultCollapsed={true}
        />
      </Wrapper>
    );

    // Filter content should be hidden initially
    expect(screen.queryByText('Starred notes only')).not.toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument(); // Header should still be visible
  });

  it('shows more tags when show more button is clicked', async () => {
    // Mock many tags to trigger "show more" functionality
    const manyTags = Array.from({ length: 15 }, (_, i) => ({
      value: `tag${i}`,
      label: `tag${i}`,
      count: i + 1,
    }));

    mockNotesApi.getFilterOptions.mockResolvedValue({
      ...mockFilterOptions,
      tags: manyTags,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Show 5 more')).toBeInTheDocument();
    });

    const showMoreButton = screen.getByText('Show 5 more');
    await user.click(showMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Show less')).toBeInTheDocument();
      expect(screen.getByText('#tag14')).toBeInTheDocument(); // Should show all tags now
    });
  });

  it('applies custom className', () => {
    const Wrapper = createTestWrapper();

    const { container } = render(
      <Wrapper>
        <SearchFilters
          filters={{}}
          onFiltersChange={mockOnFiltersChange}
          className="custom-class"
        />
      </Wrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles empty filter options gracefully', async () => {
    mockNotesApi.getFilterOptions.mockResolvedValue({
      tags: [],
      folders: [],
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    // Should still render basic filters even without tag/folder options
    expect(screen.getByText('Starred notes only')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByText('Word Count')).toBeInTheDocument();
  });

  it('updates selected count display when filters change', async () => {
    const Wrapper = createTestWrapper();

    const { rerender } = render(
      <Wrapper>
        <SearchFilters filters={{}} onFiltersChange={mockOnFiltersChange} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Tags (0 selected)')).toBeInTheDocument();
    });

    // Update filters
    rerender(
      <Wrapper>
        <SearchFilters
          filters={{ tags: ['important', 'work'] }}
          onFiltersChange={mockOnFiltersChange}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Tags (2 selected)')).toBeInTheDocument();
    });
  });
});
