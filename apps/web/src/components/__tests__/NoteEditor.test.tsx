import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NoteEditor } from '../NoteEditor';
import { useAppStore } from '../../store/appStore';
import { notesApi } from '../../lib/api';

// Mock the dependencies
vi.mock('../../store/appStore');
vi.mock('../../lib/api');
vi.mock('../../hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    uploadFile: vi.fn().mockResolvedValue('http://example.com/file.png'),
    isUploading: false,
    uploadProgress: null,
    error: null,
  }),
}));

// Mock BlockNote components
vi.mock('@blocknote/react', () => ({
  useBlockNote: vi.fn(() => ({
    topLevelBlocks: [],
    replaceBlocks: vi.fn(),
  })),
  BlockNoteView: vi.fn(({ children, ...props }) => (
    <div data-testid="blocknote-view" {...props}>
      {children}
    </div>
  )),
}));

const mockUseAppStore = vi.mocked(useAppStore);
const mockNotesApi = vi.mocked(notesApi);

describe('NoteEditor', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseAppStore.mockReturnValue({
      theme: 'light',
      sidebarOpen: true,
      rightPanelOpen: true,
      sidebarWidth: 240,
      toggleSidebar: vi.fn(),
      toggleRightPanel: vi.fn(),
      setSidebarWidth: vi.fn(),
      setTheme: vi.fn(),
    });
  });

  const renderNoteEditor = (noteId: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NoteEditor noteId={noteId} />
      </QueryClientProvider>
    );
  };

  it('shows loading state when fetching note', () => {
    mockNotesApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderNoteEditor('test-note-id');

    expect(screen.getByText('Loading note...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows error state when note fetch fails', async () => {
    mockNotesApi.get.mockRejectedValue(new Error('Failed to fetch'));

    renderNoteEditor('test-note-id');

    await waitFor(() => {
      expect(screen.getByText('Failed to load note')).toBeInTheDocument();
      expect(
        screen.getByText('Please try refreshing the page')
      ).toBeInTheDocument();
    });
  });

  it('renders editor when note is loaded successfully', async () => {
    const mockNote = {
      note: {
        id: 'test-note-id',
        title: 'Test Note',
        content: [
          {
            type: 'paragraph',
            content: 'Test content',
          },
        ],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      },
    };

    mockNotesApi.get.mockResolvedValue(mockNote);

    renderNoteEditor('test-note-id');

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument();
      expect(screen.getByTestId('blocknote-view')).toBeInTheDocument();
    });
  });

  it('displays note title and date in header', async () => {
    const mockNote = {
      note: {
        id: 'test-note-id',
        title: 'My Important Note',
        content: [],
        created_at: '2023-01-01T10:00:00Z',
        updated_at: '2023-01-02T15:30:00Z',
      },
    };

    mockNotesApi.get.mockResolvedValue(mockNote);

    renderNoteEditor('test-note-id');

    await waitFor(() => {
      expect(screen.getByText('My Important Note')).toBeInTheDocument();
      expect(screen.getByText('2/1/2023')).toBeInTheDocument(); // Updated date
    });
  });

  it('uses dark theme when theme is set to dark', async () => {
    mockUseAppStore.mockReturnValue({
      theme: 'dark',
      sidebarOpen: true,
      rightPanelOpen: true,
      sidebarWidth: 240,
      toggleSidebar: vi.fn(),
      toggleRightPanel: vi.fn(),
      setSidebarWidth: vi.fn(),
      setTheme: vi.fn(),
    });

    const mockNote = {
      note: {
        id: 'test-note-id',
        title: 'Test Note',
        content: [],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      },
    };

    mockNotesApi.get.mockResolvedValue(mockNote);

    renderNoteEditor('test-note-id');

    await waitFor(() => {
      const blockNoteView = screen.getByTestId('blocknote-view');
      expect(blockNoteView).toHaveAttribute('theme', 'dark');
    });
  });

  it('shows untitled note when title is empty', async () => {
    const mockNote = {
      note: {
        id: 'test-note-id',
        title: '',
        content: [],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      },
    };

    mockNotesApi.get.mockResolvedValue(mockNote);

    renderNoteEditor('test-note-id');

    await waitFor(() => {
      expect(screen.getByText('Untitled Note')).toBeInTheDocument();
    });
  });
});
