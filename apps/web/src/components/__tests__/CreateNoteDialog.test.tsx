import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateNoteDialog } from '../CreateNoteDialog';
import { notesApi } from '../../lib/api';

// Mock the API
vi.mock('../../lib/api');
const mockNotesApi = vi.mocked(notesApi);

describe('CreateNoteDialog', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();
  const mockOnNoteCreated = vi.fn();
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

  const renderDialog = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreateNoteDialog
          isOpen={true}
          onClose={mockOnClose}
          onNoteCreated={mockOnNoteCreated}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('does not render when closed', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateNoteDialog
          isOpen={false}
          onClose={mockOnClose}
          onNoteCreated={mockOnNoteCreated}
        />
      </QueryClientProvider>
    );

    expect(screen.queryByText('Create New Note')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    renderDialog();

    expect(screen.getByText('Create New Note')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Folder')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('shows all template options', () => {
    renderDialog();

    expect(screen.getByText('blank')).toBeInTheDocument();
    expect(screen.getByText('meeting')).toBeInTheDocument();
    expect(screen.getByText('journal')).toBeInTheDocument();
    expect(screen.getByText('project')).toBeInTheDocument();
  });

  it('allows template selection', async () => {
    renderDialog();

    const meetingTemplate = screen.getByText('meeting');
    await user.click(meetingTemplate);

    expect(meetingTemplate.closest('button')).toHaveClass('border-blue-500');
  });

  it('handles title input', async () => {
    renderDialog();

    const titleInput = screen.getByLabelText('Title');
    await user.type(titleInput, 'My Custom Title');

    expect(titleInput).toHaveValue('My Custom Title');
  });

  it('handles folder input', async () => {
    renderDialog();

    const folderInput = screen.getByLabelText('Folder');
    await user.type(folderInput, 'Work/Projects');

    expect(folderInput).toHaveValue('Work/Projects');
  });

  it('handles tag input and creation', async () => {
    renderDialog();

    const tagInput = screen.getByLabelText('Tags');
    await user.type(tagInput, 'important');
    await user.keyboard('{Enter}');

    expect(screen.getByText('important')).toBeInTheDocument();
    expect(tagInput).toHaveValue('');
  });

  it('prevents duplicate tags', async () => {
    renderDialog();

    const tagInput = screen.getByLabelText('Tags');

    // Add first tag
    await user.type(tagInput, 'test');
    await user.keyboard('{Enter}');

    // Try to add duplicate
    await user.type(tagInput, 'test');
    await user.keyboard('{Enter}');

    const tagElements = screen.getAllByText('test');
    expect(tagElements).toHaveLength(1); // Should only appear once
  });

  it('allows tag removal', async () => {
    renderDialog();

    const tagInput = screen.getByLabelText('Tags');
    await user.type(tagInput, 'removeme');
    await user.keyboard('{Enter}');

    expect(screen.getByText('removeme')).toBeInTheDocument();

    // Find and click the remove button
    const removeButton = screen
      .getByText('removeme')
      .parentElement?.querySelector('button');
    if (removeButton) {
      await user.click(removeButton);
    }

    expect(screen.queryByText('removeme')).not.toBeInTheDocument();
  });

  it('creates note with correct data', async () => {
    const mockCreatedNote = {
      note: {
        id: 'new-note-id',
        title: 'Test Note',
        content: [],
      },
    };

    mockNotesApi.create.mockResolvedValue(mockCreatedNote);

    renderDialog();

    // Fill in form
    const titleInput = screen.getByLabelText('Title');
    await user.type(titleInput, 'Test Note');

    const folderInput = screen.getByLabelText('Folder');
    await user.type(folderInput, 'Test Folder');

    const tagInput = screen.getByLabelText('Tags');
    await user.type(tagInput, 'test');
    await user.keyboard('{Enter}');

    // Submit form
    const createButton = screen.getByRole('button', { name: /create note/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockNotesApi.create).toHaveBeenCalledWith({
        title: 'Test Note',
        content: expect.any(Array),
        folder: 'Test Folder',
        tags: ['test'],
      });
    });

    expect(mockOnNoteCreated).toHaveBeenCalledWith('new-note-id');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('uses template content when creating note', async () => {
    const mockCreatedNote = {
      note: {
        id: 'new-note-id',
        title: 'Meeting Notes - ',
        content: [],
      },
    };

    mockNotesApi.create.mockResolvedValue(mockCreatedNote);

    renderDialog();

    // Select meeting template
    const meetingTemplate = screen.getByText('meeting');
    await user.click(meetingTemplate);

    // Submit form
    const createButton = screen.getByRole('button', { name: /create note/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockNotesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'heading',
              content: 'Meeting Notes',
            }),
          ]),
        })
      );
    });
  });

  it('shows loading state during creation', async () => {
    mockNotesApi.create.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderDialog();

    const createButton = screen.getByRole('button', { name: /create note/i });
    await user.click(createButton);

    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(createButton).toBeDisabled();
  });

  it('shows error message on creation failure', async () => {
    mockNotesApi.create.mockRejectedValue(new Error('Creation failed'));

    renderDialog();

    const createButton = screen.getByRole('button', { name: /create note/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to create note. Please try again.')
      ).toBeInTheDocument();
    });
  });

  it('closes dialog when clicking backdrop', async () => {
    renderDialog();

    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes dialog when clicking close button', async () => {
    renderDialog();

    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes dialog when clicking cancel', async () => {
    renderDialog();

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('initializes with provided folder and tags', () => {
    renderDialog({
      initialFolder: 'Work',
      initialTags: ['urgent', 'review'],
    });

    const folderInput = screen.getByLabelText('Folder');
    expect(folderInput).toHaveValue('Work');

    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('review')).toBeInTheDocument();
  });

  it('resets form when reopened', async () => {
    const { rerender } = renderDialog();

    // Fill in some data
    const titleInput = screen.getByLabelText('Title');
    await user.type(titleInput, 'Test Title');

    // Close dialog
    rerender(
      <QueryClientProvider client={queryClient}>
        <CreateNoteDialog
          isOpen={false}
          onClose={mockOnClose}
          onNoteCreated={mockOnNoteCreated}
        />
      </QueryClientProvider>
    );

    // Reopen dialog
    rerender(
      <QueryClientProvider client={queryClient}>
        <CreateNoteDialog
          isOpen={true}
          onClose={mockOnClose}
          onNoteCreated={mockOnNoteCreated}
        />
      </QueryClientProvider>
    );

    const newTitleInput = screen.getByLabelText('Title');
    expect(newTitleInput).toHaveValue('');
  });

  it('generates title with current date when empty', async () => {
    const mockCreatedNote = {
      note: {
        id: 'new-note-id',
        title: 'Generated Title',
        content: [],
      },
    };

    mockNotesApi.create.mockResolvedValue(mockCreatedNote);

    renderDialog();

    // Submit without title
    const createButton = screen.getByRole('button', { name: /create note/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockNotesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining(new Date().toLocaleDateString()),
        })
      );
    });
  });
});
