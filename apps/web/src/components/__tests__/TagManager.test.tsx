import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagManager } from '../TagManager';
import { notesApi } from '../../lib/api';

// Mock the API
vi.mock('../../lib/api');
const mockNotesApi = vi.mocked(notesApi);

const mockNotesWithTags = [
  {
    id: 'note-1',
    title: 'Note 1',
    tags: ['important', 'work', 'urgent'],
  },
  {
    id: 'note-2',
    title: 'Note 2',
    tags: ['personal', 'idea'],
  },
  {
    id: 'note-3',
    title: 'Note 3',
    tags: ['work', 'project'],
  },
  {
    id: 'note-4',
    title: 'Note 4',
    tags: ['important'],
  },
];

describe('TagManager', () => {
  let queryClient: QueryClient;
  const mockOnTagSelect = vi.fn();
  const mockOnTagFilter = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  const renderTagManager = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TagManager
          onTagSelect={mockOnTagSelect}
          onTagFilter={mockOnTagFilter}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('shows loading state when fetching notes', () => {
    mockNotesApi.list.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderTagManager();

    // Should show loading state before tags are loaded
    expect(screen.getByTestId('tag-loading')).toBeInTheDocument();
  });

  it('extracts and displays tags from notes', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager();

    await waitFor(() => {
      expect(screen.getByText(/Tags \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('personal')).toBeInTheDocument();
      expect(screen.getByText('idea')).toBeInTheDocument();
      expect(screen.getByText('project')).toBeInTheDocument();
    });
  });

  it('shows correct tag counts', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager();

    await waitFor(() => {
      // 'important' appears in 2 notes
      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();

      // 'work' appears in 2 notes
      expect(screen.getByText('work')).toBeInTheDocument();

      // 'urgent' appears in 1 note
      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('(1)')).toBeInTheDocument();
    });
  });

  it('handles tag selection in multi-select mode', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ allowMultiSelect: true });

    await waitFor(() => {
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    const importantTag = screen.getByText('important');
    await user.click(importantTag);

    expect(mockOnTagSelect).toHaveBeenCalledWith(['important']);
  });

  it('handles tag deselection', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({
      selectedTags: ['important'],
      allowMultiSelect: true,
    });

    await waitFor(() => {
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    const importantTag = screen.getByText('important');
    await user.click(importantTag);

    expect(mockOnTagSelect).toHaveBeenCalledWith([]);
  });

  it('handles single-select mode', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ allowMultiSelect: false });

    await waitFor(() => {
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    const importantTag = screen.getByText('important');
    await user.click(importantTag);

    expect(mockOnTagSelect).toHaveBeenCalledWith(['important']);
  });

  it('shows selected tags section when tags are selected', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ selectedTags: ['important', 'work'] });

    await waitFor(() => {
      expect(screen.getByText('Selected (2)')).toBeInTheDocument();
    });
  });

  it('allows clearing all selected tags', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ selectedTags: ['important', 'work'] });

    await waitFor(() => {
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear all');
    await user.click(clearButton);

    expect(mockOnTagSelect).toHaveBeenCalledWith([]);
  });

  it('shows search filter when enabled', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ showFilter: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Most used')).toBeInTheDocument();
    });
  });

  it('filters tags based on search query', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ showFilter: true });

    await waitFor(() => {
      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tags...');
    await user.type(searchInput, 'work');

    // After typing 'work', only 'work' tag should be visible
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.queryByText('important')).not.toBeInTheDocument();
  });

  it('sorts tags by count by default', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ showFilter: true });

    await waitFor(() => {
      const tagElements = screen.getAllByText(/important|work|urgent/);

      // Tags with higher counts should appear first
      expect(tagElements[0]).toHaveTextContent('important'); // count: 2
      expect(tagElements[1]).toHaveTextContent('work'); // count: 2
    });
  });

  it('sorts tags alphabetically when selected', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ showFilter: true });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Most used')).toBeInTheDocument();
    });

    const sortSelect = screen.getByDisplayValue('Most used');
    await user.selectOptions(sortSelect, 'name');

    // Wait for rerender and check alphabetical order
    await waitFor(() => {
      const tagElements = screen.getAllByText(/idea|important/);

      // Should be alphabetically sorted
      expect(tagElements[0]).toHaveTextContent('idea');
      expect(tagElements[1]).toHaveTextContent('important');
    });
  });

  it('shows quick filter action for single selected tag', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({
      selectedTags: ['important'],
      onTagFilter: mockOnTagFilter,
    });

    await waitFor(() => {
      expect(
        screen.getByText('Filter notes by "important"')
      ).toBeInTheDocument();
    });

    const filterButton = screen.getByText('Filter notes by "important"');
    await user.click(filterButton);

    expect(mockOnTagFilter).toHaveBeenCalledWith('important');
  });

  it('does not show quick filter for multiple selected tags', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({
      selectedTags: ['important', 'work'],
      onTagFilter: mockOnTagFilter,
    });

    await waitFor(() => {
      expect(screen.getByText('Selected (2)')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Filter notes by/)).not.toBeInTheDocument();
  });

  it('shows empty state when no tags exist', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: [],
      total: 0,
      page: 1,
      limit: 1000,
    });

    renderTagManager();

    await waitFor(() => {
      expect(screen.getByText('No tags yet')).toBeInTheDocument();
      expect(
        screen.getByText('Tags will appear here as you add them to notes')
      ).toBeInTheDocument();
    });
  });

  it('shows no results state when search has no matches', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ showFilter: true });

    await waitFor(() => {
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search tags...');
    await user.type(searchInput, 'nonexistent');

    expect(screen.getByText('No tags found')).toBeInTheDocument();
  });

  it('respects maxTags limit', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ maxTags: 3 });

    await waitFor(() => {
      // Should only show 3 tags even though there are more
      const tagElements = screen.getAllByText(/\(\d+\)/);
      expect(tagElements.length).toBeLessThanOrEqual(3);
    });
  });

  it('removes selected tags from main list', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotesWithTags,
      total: 4,
      page: 1,
      limit: 1000,
    });

    renderTagManager({ selectedTags: ['important'] });

    await waitFor(() => {
      expect(screen.getByText('Selected (1)')).toBeInTheDocument();
    });

    // Check that selected tag shows up in selected section
    const selectedSection = screen.getByText('Selected (1)').parentElement;
    expect(selectedSection).toHaveTextContent('important');
  });
});
