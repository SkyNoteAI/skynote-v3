import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from '../SearchBar';
import { notesApi } from '../../lib/api';
import { vi, describe, beforeEach, it, expect } from 'vitest';

// Mock the API
vi.mock('../../lib/api', () => ({
  notesApi: {
    search: vi.fn(),
    searchSuggestions: vi.fn(),
  },
}));

const mockNotesApi = notesApi as any;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

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

describe('SearchBar', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders search input with placeholder', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar placeholder="Search notes..." />
      </Wrapper>
    );

    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows search mode toggle buttons', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    // Should show mode toggle button
    const modeToggle = screen.getByTitle('Keyword search');
    expect(modeToggle).toBeInTheDocument();
  });

  it('shows filters toggle button', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    // Should show filters toggle button
    const filtersToggle = screen.getByTitle('Search filters');
    expect(filtersToggle).toBeInTheDocument();
  });

  it('toggles between keyword and semantic search modes', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const modeToggle = screen.getByTitle('Keyword search');

    // Initially should be keyword mode
    expect(modeToggle.getAttribute('title')).toBe('Keyword search');

    // Click to switch to semantic mode
    await user.click(modeToggle);
    expect(modeToggle.getAttribute('title')).toBe('Semantic search');

    // Click again to switch back
    await user.click(modeToggle);
    expect(modeToggle.getAttribute('title')).toBe('Keyword search');
  });

  it('displays search results when query is entered', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note',
        excerpt: 'This is a test note',
        updated_at: '2024-01-01T00:00:00Z',
        score: 0.9,
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 1,
      took: 50,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test query');

    await waitFor(() => {
      expect(mockNotesApi.search).toHaveBeenCalledWith({
        query: 'test query',
        mode: 'keyword',
        filters: {},
        limit: 10,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument();
      expect(screen.getByText('This is a test note')).toBeInTheDocument();
    });
  });

  it('shows suggestions when typing', async () => {
    const mockSuggestions = ['test suggestion', 'another suggestion'];

    mockNotesApi.searchSuggestions.mockResolvedValue({
      suggestions: mockSuggestions,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    await waitFor(() => {
      expect(mockNotesApi.searchSuggestions).toHaveBeenCalledWith({
        query: 'test',
        limit: 5,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('test suggestion')).toBeInTheDocument();
      expect(screen.getByText('another suggestion')).toBeInTheDocument();
    });
  });

  it('calls onResultSelect when a result is clicked', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note',
        excerpt: 'This is a test note',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
    });

    const onResultSelect = vi.fn();
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar onResultSelect={onResultSelect} />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Test Note'));
    expect(onResultSelect).toHaveBeenCalledWith('1');
  });

  it('shows search history when input is focused', async () => {
    const mockHistory = JSON.stringify(['previous search', 'another search']);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      expect(screen.getByText('previous search')).toBeInTheDocument();
      expect(screen.getByText('another search')).toBeInTheDocument();
    });
  });

  it('clears search when clear button is clicked', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test query');

    const clearButton = screen.getByRole('button', { name: '' }); // X button
    await user.click(clearButton);

    expect(input).toHaveValue('');
  });

  it('shows loading state while searching', async () => {
    // Make the API call hang
    mockNotesApi.search.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test query');

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });
  });

  it('shows no results message when search returns empty', async () => {
    mockNotesApi.search.mockResolvedValue({
      results: [],
      total: 0,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
    });
  });

  it('highlights matching text in results', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note with Query',
        excerpt: 'This contains the query term',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'query');

    await waitFor(() => {
      const highlights = screen.getAllByText('query');
      // Should have highlighted text
      expect(highlights.length).toBeGreaterThan(0);
    });
  });

  it('shows filters panel when filters button is clicked', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const filtersButton = screen.getByTitle('Search filters');
    await user.click(filtersButton);

    await waitFor(() => {
      expect(screen.getByText('Search Filters')).toBeInTheDocument();
    });
  });

  it('saves search to history on Enter key', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test query');
    await user.keyboard('{Enter}');

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'search-history',
      expect.stringContaining('test query')
    );
  });

  it('closes dropdown on Escape key', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note',
        excerpt: 'This is a test note',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    // Results should be visible
    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard('{Escape}');

    // Results should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Test Note')).not.toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const Wrapper = createTestWrapper();

    const { container } = render(
      <Wrapper>
        <SearchBar className="custom-class" />
      </Wrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles API errors gracefully', async () => {
    mockNotesApi.search.mockRejectedValue(new Error('API Error'));

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test query');

    // Should not crash and should show some default state
    await waitFor(() => {
      expect(input).toHaveValue('test query');
    });
  });

  it('shows result metadata correctly', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note',
        excerpt: 'This is a test note',
        folder_path: 'Work/Projects',
        tags: ['important', 'work'],
        updated_at: '2024-01-01T00:00:00Z',
        score: 0.85,
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchBar />
      </Wrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Work/Projects')).toBeInTheDocument();
      expect(screen.getByText('important, work')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });
});
