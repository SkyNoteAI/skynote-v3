import { useCallback, useEffect, useState } from 'react';
import { useBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/react';
import '@blocknote/react/style.css';
import { useAppStore } from '../store/appStore';
import { notesApi } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFileUpload } from '../hooks/useFileUpload';

interface NoteEditorProps {
  noteId: string;
}

interface NoteData {
  id: string;
  title: string;
  content: any[];
  folder_path?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// Utility function to extract title from blocks
function extractTitleFromBlocks(blocks: any[]): string {
  if (!blocks || blocks.length === 0) return 'Untitled Note';

  const firstBlock = blocks[0];
  if (firstBlock.type === 'heading' && firstBlock.content) {
    return firstBlock.content.map((c: any) => c.text).join('');
  }

  if (firstBlock.type === 'paragraph' && firstBlock.content) {
    const text = firstBlock.content.map((c: any) => c.text).join('');
    return (
      text.slice(0, 50) + (text.length > 50 ? '...' : '') || 'Untitled Note'
    );
  }

  return 'Untitled Note';
}

// Debounced save hook
function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  return useCallback(
    ((...args: Parameters<T>) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        callback(...args);
      }, delay);

      setDebounceTimer(timer);
    }) as T,
    [callback, delay, debounceTimer]
  );
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { theme } = useAppStore();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const { uploadFile } = useFileUpload();

  // Fetch note data
  const {
    data: noteData,
    isLoading,
    error,
  } = useQuery<{ note: NoteData }>({
    queryKey: ['note', noteId],
    queryFn: () => notesApi.get(noteId),
    enabled: !!noteId,
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: (data: { title: string; content: any[] }) =>
      notesApi.update(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Create BlockNote editor
  const editor = useBlockNote({
    initialContent: noteData?.note.content || [
      {
        type: 'paragraph',
        content: 'Start typing or press "/" for commands...',
      },
    ],
    uploadFile: uploadFile,
  });

  // Initialize editor content when note data is loaded
  useEffect(() => {
    if (noteData?.note.content && !isInitialized) {
      editor.replaceBlocks(editor.topLevelBlocks, noteData.note.content);
      setIsInitialized(true);
    }
  }, [noteData, editor, isInitialized]);

  // Save function
  const saveNote = useDebouncedCallback(async (blocks: any[]) => {
    if (!blocks || blocks.length === 0) return;

    const title = extractTitleFromBlocks(blocks);

    try {
      await updateNoteMutation.mutateAsync({
        title,
        content: blocks,
      });
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  }, 2000);

  // Handle editor changes
  const handleEditorChange = useCallback(() => {
    const blocks = editor.topLevelBlocks;
    saveNote(blocks);
  }, [editor, saveNote]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div
            data-testid="loading-spinner"
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
          ></div>
          <p className="text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load note</p>
          <p className="text-gray-600 text-sm">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {noteData?.note.title || 'Untitled Note'}
          </h1>
          <div className="flex items-center space-x-2">
            {updateNoteMutation.isPending && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Saving...
              </div>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {noteData?.note.updated_at &&
                new Date(noteData.note.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <BlockNoteView
            editor={editor}
            theme={theme === 'dark' ? 'dark' : 'light'}
            onChange={handleEditorChange}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
