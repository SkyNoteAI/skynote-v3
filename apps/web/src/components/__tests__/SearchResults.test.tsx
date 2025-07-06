import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchResults } from '../SearchResults';
import { notesApi } from '../../lib/api';
import { vi, describe, beforeEach, it, expect } from 'vitest';

// Mock the API
vi.mock('../../lib/api', () => ({
  notesApi: {
    search: vi.fn(),
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

describe('SearchResults', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('shows empty state when no query is provided', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="" />
      </Wrapper>
    );

    expect(screen.getByText('Start your search')).toBeInTheDocument();
    expect(
      screen.getByText('Enter a search term to find notes in your collection')
    ).toBeInTheDocument();
  });

  it('displays search results when query is provided', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note 1',
        excerpt: 'This is the first test note',
        folder_path: 'Work',
        tags: ['important'],
        updated_at: '2024-01-01T12:00:00Z',
        score: 0.9,
      },
      {
        id: '2',
        title: 'Test Note 2',
        excerpt: 'This is the second test note',
        tags: ['personal'],
        updated_at: '2024-01-02T12:00:00Z',
        score: 0.8,
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 2,
      took: 45,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Note 1')).toBeInTheDocument();
      expect(screen.getByText('Test Note 2')).toBeInTheDocument();
      expect(screen.getByText('2 results for "test"')).toBeInTheDocument();
      expect(screen.getByText('(in 45ms)')).toBeInTheDocument();
    });
  });

  it('shows loading state while searching', async () => {
    mockNotesApi.search.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ results: [] }), 100)
        )
    );

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" />
      </Wrapper>
    );

    // Should show loading skeletons
    await waitFor(() => {
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(5);
    });
  });

  it('displays no results message when search returns empty', async () => {
    mockNotesApi.search.mockResolvedValue({
      results: [],
      total: 0,
      took: 25,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="nonexistent" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(
        screen.getByText(/We couldn't find any notes matching "nonexistent"/)
      ).toBeInTheDocument();
    });
  });

  it('shows error state when search fails', async () => {
    mockNotesApi.search.mockRejectedValue(new Error('Search failed'));

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
      expect(
        screen.getByText('There was an error performing your search')
      ).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('calls onResultSelect when a result is clicked', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note',
        excerpt: 'This is a test note',
        updated_at: '2024-01-01T12:00:00Z',
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    const onResultSelect = vi.fn();
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" onResultSelect={onResultSelect} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Test Note'));
    expect(onResultSelect).toHaveBeenCalledWith('1');
  });

  it('highlights search query in results', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note with Query',
        excerpt: 'This contains the query term',
        updated_at: '2024-01-01T12:00:00Z',
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="query" />
      </Wrapper>
    );

    await waitFor(() => {
      const highlights = screen.getAllByText('query');
      expect(highlights.length).toBeGreaterThan(0);
    });
  });

  it('sorts results by relevance by default', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Less Relevant',
        excerpt: 'Less relevant content',
        updated_at: '2024-01-01T12:00:00Z',
        score: 0.5,
      },
      {
        id: '2',
        title: 'More Relevant',
        excerpt: 'More relevant content',
        updated_at: '2024-01-01T12:00:00Z',
        score: 0.9,
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 2,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" />
      </Wrapper>
    );

    await waitFor(() => {
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles[0]).toHaveTextContent('More Relevant');
      expect(titles[1]).toHaveTextContent('Less Relevant');
    });
  });

  it('changes sort order when sort buttons are clicked', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'A Note',
        excerpt: 'Content A',
        updated_at: '2024-01-01T12:00:00Z',
        score: 0.5,
      },
      {
        id: '2',
        title: 'B Note',
        excerpt: 'Content B',
        updated_at: '2024-01-02T12:00:00Z',
        score: 0.9,
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 2,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('A Note')).toBeInTheDocument();
    });

    // Click Title sort button
    const titleSortButton = screen.getByText('Title');
    await user.click(titleSortButton);

    // Results should be sorted by title
    await waitFor(() => {
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles[0]).toHaveTextContent('A Note');
      expect(titles[1]).toHaveTextContent('B Note');
    });
  });

  it('displays result metadata correctly', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note',
        excerpt: 'Test content',
        folder_path: 'Work/Projects',
        tags: ['important', 'work', 'urgent'],
        is_starred: true,
        updated_at: '2024-01-01T12:00:00Z',
        score: 0.85,
        content: [{ content: [{ text: 'Word one two three four five' }] }],
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Work/Projects')).toBeInTheDocument();
      expect(screen.getByText('important, work, urgent')).toBeInTheDocument();
      expect(screen.getByText('85% match')).toBeInTheDocument();
      expect(screen.getByText('5 words')).toBeInTheDocument();
    });
  });

  it('shows highlights when available', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Test Note',
        excerpt: 'Test content',
        updated_at: '2024-01-01T12:00:00Z',
        highlights: [
          'This is a highlight with query',
          'Another highlight with query',
        ],
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="query" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Matching content:')).toBeInTheDocument();
      expect(screen.getByText(/This is a highlight with/)).toBeInTheDocument();
      expect(screen.getByText(/Another highlight with/)).toBeInTheDocument();
    });
  });

  it('handles different search modes', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Semantic Result',
        excerpt: 'Semantically related content',
        updated_at: '2024-01-01T12:00:00Z',
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" mode="semantic" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(mockNotesApi.search).toHaveBeenCalledWith({
        query: 'test',
        mode: 'semantic',
        sort: 'relevance',
        order: 'desc',
        filters: expect.any(Object),
        limit: 50,
      });
    });
  });

  it('retries search when try again button is clicked', async () => {
    mockNotesApi.search
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce({ results: [], total: 0 });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByText('Try again');
    await user.click(tryAgainButton);

    await waitFor(() => {
      expect(mockNotesApi.search).toHaveBeenCalledTimes(2);
    });
  });

  it('displays relative time correctly', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const mockResults = [
      {
        id: '1',
        title: 'Recent Note',
        excerpt: 'Recent content',
        updated_at: yesterday.toISOString(),
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Yesterday|1 day/)).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const Wrapper = createTestWrapper();

    const { container } = render(
      <Wrapper>
        <SearchResults query="" className="custom-class" />
      </Wrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows starred icon for starred notes', async () => {
    const mockResults = [
      {
        id: '1',
        title: 'Starred Note',
        excerpt: 'Starred content',
        is_starred: true,
        updated_at: '2024-01-01T12:00:00Z',
      },
    ];

    mockNotesApi.search.mockResolvedValue({
      results: mockResults,
      total: 1,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <SearchResults query="test" />
      </Wrapper>
    );

    await waitFor(() => {
      const starIcon = document.querySelector('svg[fill="currentColor"]');
      expect(starIcon).toBeInTheDocument();
    });
  });
});
