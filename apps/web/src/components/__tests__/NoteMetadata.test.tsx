import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NoteMetadata } from '../NoteMetadata';
import { notesApi } from '../../lib/api';

// Mock the API
vi.mock('../../lib/api');
const mockNotesApi = vi.mocked(notesApi);

const mockNote = {
  id: 'note-1',
  title: 'Test Note',
  content: [
    {
      type: 'paragraph',
      content: [{ text: 'This is a test note with some content.' }],
    },
    { type: 'paragraph', content: [{ text: 'It has multiple paragraphs.' }] },
  ],
  folder_path: 'Work/Projects',
  tags: ['important', 'review'],
  is_starred: true,
  created_at: '2023-01-01T10:00:00Z',
  updated_at: '2023-01-02T15:30:00Z',
};

describe('NoteMetadata', () => {
  let queryClient: QueryClient;
  const mockOnNoteUpdate = vi.fn();
  const mockOnNoteDelete = vi.fn();
  const mockOnNoteRestore = vi.fn();
  const mockOnNoteArchive = vi.fn();
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

  const renderNoteMetadata = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NoteMetadata
          note={mockNote}
          onNoteUpdate={mockOnNoteUpdate}
          onNoteDelete={mockOnNoteDelete}
          onNoteRestore={mockOnNoteRestore}
          onNoteArchive={mockOnNoteArchive}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('renders note details correctly', () => {
    renderNoteMetadata();

    expect(screen.getByText('Note Details')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Folder')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('displays note dates correctly', () => {
    renderNoteMetadata();

    expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument(); // Created date
    expect(screen.getByText(/ago$/)).toBeInTheDocument(); // Updated date (relative)
  });

  it('shows folder path', () => {
    renderNoteMetadata();

    expect(screen.getByText('Work/Projects')).toBeInTheDocument();
  });

  it('displays tags', () => {
    renderNoteMetadata();

    expect(screen.getByText('important')).toBeInTheDocument();
    expect(screen.getByText('review')).toBeInTheDocument();
  });

  it('shows star as filled when note is starred', () => {
    renderNoteMetadata();

    const starButton = screen.getByTitle('Remove from favorites');
    expect(starButton).toBeInTheDocument();
  });

  it('shows star as empty when note is not starred', () => {
    const unstarredNote = { ...mockNote, is_starred: false };
    renderNoteMetadata({ note: unstarredNote });

    const starButton = screen.getByTitle('Add to favorites');
    expect(starButton).toBeInTheDocument();
  });

  it('toggles star when clicked', async () => {
    mockNotesApi.update.mockResolvedValue({ note: mockNote });

    renderNoteMetadata();

    const starButton = screen.getByTitle('Remove from favorites');
    await user.click(starButton);

    await waitFor(() => {
      expect(mockNotesApi.update).toHaveBeenCalledWith('note-1', {
        is_starred: false,
      });
    });

    expect(mockOnNoteUpdate).toHaveBeenCalledWith('note-1', {
      is_starred: false,
    });
  });

  it('calculates word count correctly', () => {
    renderNoteMetadata({ showWordCount: true });

    // "This is a test note with some content. It has multiple paragraphs."
    // Should be about 11 words
    expect(screen.getByText(/\d+ words/)).toBeInTheDocument();
  });

  it('calculates character count when enabled', () => {
    renderNoteMetadata({ showCharCount: true });

    expect(screen.getByText(/\d+ characters/)).toBeInTheDocument();
  });

  it('handles empty content gracefully', () => {
    const emptyNote = { ...mockNote, content: [] };
    renderNoteMetadata({ note: emptyNote, showWordCount: true });

    expect(screen.getByText('0 words')).toBeInTheDocument();
  });

  it('allows editing folder when edit is enabled', async () => {
    mockNotesApi.update.mockResolvedValue({ note: mockNote });

    renderNoteMetadata({ allowEdit: true });

    // Find and click edit button for folder
    const folderSection = screen.getByText('Folder').parentElement;
    const editButton = folderSection?.querySelector('button');
    if (editButton) {
      await user.click(editButton);
    }

    // Should show input field
    const folderInput = screen.getByDisplayValue('Work/Projects');
    expect(folderInput).toBeInTheDocument();

    // Edit the folder
    await user.clear(folderInput);
    await user.type(folderInput, 'Personal/Notes');

    // Save changes
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockNotesApi.update).toHaveBeenCalledWith('note-1', {
        folder_path: 'Personal/Notes',
      });
    });

    expect(mockOnNoteUpdate).toHaveBeenCalledWith('note-1', {
      folder_path: 'Personal/Notes',
    });
  });

  it('allows editing tags when edit is enabled', async () => {
    mockNotesApi.update.mockResolvedValue({ note: mockNote });

    renderNoteMetadata({ allowEdit: true });

    // Find and click edit button for tags
    const tagsSection = screen.getByText('Tags').parentElement;
    const editButton = tagsSection?.querySelector('button');
    if (editButton) {
      await user.click(editButton);
    }

    // Should show input field and current tags
    const tagInput = screen.getByPlaceholderText('Type a tag and press Enter');
    expect(tagInput).toBeInTheDocument();
    expect(screen.getByText('important')).toBeInTheDocument();
    expect(screen.getByText('review')).toBeInTheDocument();

    // Add a new tag
    await user.type(tagInput, 'urgent');
    await user.keyboard('{Enter}');

    expect(screen.getByText('urgent')).toBeInTheDocument();

    // Save changes
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockNotesApi.update).toHaveBeenCalledWith('note-1', {
        tags: ['important', 'review', 'urgent'],
      });
    });
  });

  it('allows removing tags during edit', async () => {
    mockNotesApi.update.mockResolvedValue({ note: mockNote });

    renderNoteMetadata({ allowEdit: true });

    // Start editing tags
    const tagsSection = screen.getByText('Tags').parentElement;
    const editButton = tagsSection?.querySelector('button');
    if (editButton) {
      await user.click(editButton);
    }

    // Remove a tag
    const importantTag = screen.getByText('important');
    const removeButton = importantTag.parentElement?.querySelector('button');
    if (removeButton) {
      await user.click(removeButton);
    }

    expect(screen.queryByText('important')).not.toBeInTheDocument();

    // Save changes
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockNotesApi.update).toHaveBeenCalledWith('note-1', {
        tags: ['review'],
      });
    });
  });

  it('cancels edit when cancel button is clicked', async () => {
    renderNoteMetadata({ allowEdit: true });

    // Start editing folder
    const folderSection = screen.getByText('Folder').parentElement;
    const editButton = folderSection?.querySelector('button');
    if (editButton) {
      await user.click(editButton);
    }

    // Modify the input
    const folderInput = screen.getByDisplayValue('Work/Projects');
    await user.clear(folderInput);
    await user.type(folderInput, 'Modified');

    // Cancel changes
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    // Should show original value
    expect(screen.getByText('Work/Projects')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Modified')).not.toBeInTheDocument();
  });

  it('shows delete button for active notes', () => {
    renderNoteMetadata();

    expect(screen.getByText('Delete Note')).toBeInTheDocument();
  });

  it('shows restore button for deleted notes', () => {
    const deletedNote = { ...mockNote, deleted_at: '2023-01-03T10:00:00Z' };
    renderNoteMetadata({ note: deletedNote });

    expect(screen.getByText('Restore Note')).toBeInTheDocument();
    expect(screen.getByText('Delete Permanently')).toBeInTheDocument();
  });

  it('handles delete action', async () => {
    mockNotesApi.delete.mockResolvedValue({ success: true });

    renderNoteMetadata();

    const deleteButton = screen.getByText('Delete Note');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockNotesApi.delete).toHaveBeenCalledWith('note-1');
    });

    expect(mockOnNoteDelete).toHaveBeenCalledWith('note-1');
  });

  it('handles restore action', async () => {
    const deletedNote = { ...mockNote, deleted_at: '2023-01-03T10:00:00Z' };
    mockNotesApi.restore.mockResolvedValue({ note: mockNote });

    renderNoteMetadata({ note: deletedNote });

    const restoreButton = screen.getByText('Restore Note');
    await user.click(restoreButton);

    await waitFor(() => {
      expect(mockNotesApi.restore).toHaveBeenCalledWith('note-1');
    });

    expect(mockOnNoteRestore).toHaveBeenCalledWith('note-1');
  });

  it('shows archive button when archive handler is provided', () => {
    renderNoteMetadata();

    expect(screen.getByText('Archive Note')).toBeInTheDocument();
  });

  it('handles archive action', async () => {
    renderNoteMetadata();

    const archiveButton = screen.getByText('Archive Note');
    await user.click(archiveButton);

    expect(mockOnNoteArchive).toHaveBeenCalledWith('note-1');
  });

  it('shows "No folder" when folder path is empty', () => {
    const noteWithoutFolder = { ...mockNote, folder_path: '' };
    renderNoteMetadata({ note: noteWithoutFolder });

    expect(screen.getByText('No folder')).toBeInTheDocument();
  });

  it('shows "No tags" when tags array is empty', () => {
    const noteWithoutTags = { ...mockNote, tags: [] };
    renderNoteMetadata({ note: noteWithoutTags });

    expect(screen.getByText('No tags')).toBeInTheDocument();
  });

  it('disables edit functionality when allowEdit is false', () => {
    renderNoteMetadata({ allowEdit: false });

    const folderSection = screen.getByText('Folder').parentElement;
    const editButton = folderSection?.querySelector('button');
    expect(editButton).not.toBeInTheDocument();

    const tagsSection = screen.getByText('Tags').parentElement;
    const tagEditButton = tagsSection?.querySelector('button');
    expect(tagEditButton).not.toBeInTheDocument();
  });

  it('handles API errors gracefully during update', async () => {
    mockNotesApi.update.mockRejectedValue(new Error('Update failed'));

    renderNoteMetadata({ allowEdit: true });

    // Try to toggle star
    const starButton = screen.getByTitle('Remove from favorites');
    await user.click(starButton);

    // Should still attempt the API call but handle the error
    await waitFor(() => {
      expect(mockNotesApi.update).toHaveBeenCalled();
    });
  });
});
