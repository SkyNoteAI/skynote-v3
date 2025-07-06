import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NoteList } from '../NoteList';
import { notesApi } from '../../lib/api';

// Mock the API
vi.mock('../../lib/api');
const mockNotesApi = vi.mocked(notesApi);

// Mock intersection observer
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

const mockNotes = [
  {
    id: 'note-1',
    title: 'First Note',
    content: [
      {
        type: 'paragraph',
        content: [{ text: 'This is the first note content' }],
      },
    ],
    folder_path: 'Work',
    tags: ['important', 'todo'],
    is_starred: true,
    created_at: '2023-01-01T10:00:00Z',
    updated_at: '2023-01-02T15:30:00Z',
  },
  {
    id: 'note-2',
    title: 'Second Note',
    content: [
      {
        type: 'paragraph',
        content: [{ text: 'This is the second note content' }],
      },
    ],
    folder_path: 'Personal',
    tags: ['idea'],
    is_starred: false,
    created_at: '2023-01-01T12:00:00Z',
    updated_at: '2023-01-01T18:00:00Z',
  },
];

describe('NoteList', () => {
  let queryClient: QueryClient;
  const mockOnNoteSelect = vi.fn();
  const mockOnNoteCreate = vi.fn();
  const mockOnNoteDelete = vi.fn();
  const mockOnNoteToggleStar = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  const renderNoteList = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NoteList
          onNoteSelect={mockOnNoteSelect}
          onNoteCreate={mockOnNoteCreate}
          onNoteDelete={mockOnNoteDelete}
          onNoteToggleStar={mockOnNoteToggleStar}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('shows loading state when fetching notes', () => {
    mockNotesApi.list.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderNoteList();

    expect(screen.getByText('Loading notes...')).toBeInTheDocument();
  });

  it('shows error state when notes fetch fails', async () => {
    mockNotesApi.list.mockRejectedValue(new Error('Failed to fetch'));

    renderNoteList();

    await waitFor(() => {
      expect(screen.getByText('Failed to load notes')).toBeInTheDocument();
      expect(
        screen.getByText('Please try refreshing the page')
      ).toBeInTheDocument();
    });
  });

  it('shows empty state when no notes exist', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    renderNoteList();

    await waitFor(() => {
      expect(screen.getByText('No notes found')).toBeInTheDocument();
      expect(screen.getByText('Create your first note')).toBeInTheDocument();
    });
  });

  it('renders notes list correctly', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    });

    renderNoteList();

    await waitFor(() => {
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
      expect(
        screen.getByText('This is the first note content')
      ).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('important, todo')).toBeInTheDocument();
    });
  });

  it('calls onNoteSelect when note is clicked', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    });

    renderNoteList();

    await waitFor(() => {
      expect(screen.getByText('First Note')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('First Note'));
    expect(mockOnNoteSelect).toHaveBeenCalledWith('note-1');
  });

  it('highlights selected note', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    });

    renderNoteList({ selectedNoteId: 'note-1' });

    await waitFor(() => {
      const firstNoteCard = screen.getByText('First Note').closest('div');
      expect(firstNoteCard).toHaveClass('bg-blue-50');
    });
  });

  it('handles star toggle correctly', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    });

    renderNoteList();

    await waitFor(() => {
      expect(screen.getByText('First Note')).toBeInTheDocument();
    });

    // Find star buttons
    const starButtons = screen.getAllByLabelText(/favorites/);
    fireEvent.click(starButtons[0]); // Click first note's star

    expect(mockOnNoteToggleStar).toHaveBeenCalledWith('note-1', false); // Should toggle to false
  });

  it('handles delete correctly', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    });

    renderNoteList();

    await waitFor(() => {
      expect(screen.getByText('First Note')).toBeInTheDocument();
    });

    // Find delete buttons
    const deleteButtons = screen.getAllByLabelText('Delete note');
    fireEvent.click(deleteButtons[0]);

    expect(mockOnNoteDelete).toHaveBeenCalledWith('note-1');
  });

  it('enables bulk selection mode', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    });

    renderNoteList();

    await waitFor(() => {
      expect(screen.getByText('First Note')).toBeInTheDocument();
    });

    // Enable bulk selection
    fireEvent.click(screen.getByText('Select multiple notes'));

    expect(screen.getByText(/0 selected/)).toBeInTheDocument();
    expect(screen.getByText('Delete Selected')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('handles bulk selection and deletion', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    });

    renderNoteList();

    await waitFor(() => {
      expect(screen.getByText('First Note')).toBeInTheDocument();
    });

    // Enable bulk selection
    fireEvent.click(screen.getByText('Select multiple notes'));

    // Select first note
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First note checkbox (index 0 is select all)

    expect(screen.getByText(/1 selected/)).toBeInTheDocument();

    // Delete selected
    fireEvent.click(screen.getByText('Delete Selected'));

    expect(mockOnNoteDelete).toHaveBeenCalledWith('note-1');
  });

  it('handles select all functionality', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    });

    renderNoteList();

    await waitFor(() => {
      expect(screen.getByText('First Note')).toBeInTheDocument();
    });

    // Enable bulk selection
    fireEvent.click(screen.getByText('Select multiple notes'));

    // Select all
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText(/2 selected/)).toBeInTheDocument();
  });

  it('applies search filter', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: [mockNotes[0]], // Only return first note for search
      total: 1,
      page: 1,
      limit: 20,
    });

    renderNoteList({ searchQuery: 'first' });

    await waitFor(() => {
      expect(mockNotesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'first',
        })
      );
    });
  });

  it('applies folder filter', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: [mockNotes[0]], // Only return work notes
      total: 1,
      page: 1,
      limit: 20,
    });

    renderNoteList({ selectedFolder: 'Work' });

    await waitFor(() => {
      expect(mockNotesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'Work',
        })
      );
    });
  });

  it('applies tag filter', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: [mockNotes[0]], // Only return notes with 'important' tag
      total: 1,
      page: 1,
      limit: 20,
    });

    renderNoteList({ selectedTags: ['important'] });

    await waitFor(() => {
      expect(mockNotesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: 'important',
        })
      );
    });
  });

  it('handles sorting options', async () => {
    mockNotesApi.list.mockResolvedValue({
      notes: mockNotes,
      total: 2,
      page: 1,
      limit: 20,
    });

    renderNoteList({ sortBy: 'title', sortOrder: 'asc' });

    await waitFor(() => {
      expect(mockNotesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'title',
          order: 'asc',
        })
      );
    });
  });

  it('shows deleted notes when requested', async () => {
    const deletedNote = { ...mockNotes[0], deleted_at: '2023-01-03T10:00:00Z' };
    mockNotesApi.list.mockResolvedValue({
      notes: [deletedNote],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderNoteList({ showDeleted: true });

    await waitFor(() => {
      expect(mockNotesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          include_deleted: 'true',
        })
      );
    });
  });
});
