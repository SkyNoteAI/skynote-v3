import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { NoteEditor } from '../components/NoteEditor';
import { notesApi } from '../lib/api';
import { Plus, FileText } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: any;
  folder_path?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export function NotesPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch notes list
  const { data: notesData, isLoading: isLoadingNotes } = useQuery<{
    notes: Note[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['notes'],
    queryFn: () => notesApi.list({ limit: 50 }),
  });

  const handleNoteClick = (noteId: string) => {
    navigate(`/notes/${noteId}`);
  };

  const handleCreateNote = async () => {
    try {
      const response = await notesApi.create({
        title: 'Untitled Note',
        content: [
          {
            type: 'paragraph',
            content: 'Start typing...',
          },
        ],
      });
      navigate(`/notes/${response.note.id}`);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  return (
    <div className="h-full flex">
      {/* Notes list */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Your Notes
            </h3>
            <button
              onClick={handleCreateNote}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              title="Create new note"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-2">
            {isLoadingNotes ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse"
                  >
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : notesData?.notes.length === 0 ? (
              <div className="text-center py-8">
                <FileText
                  size={48}
                  className="mx-auto text-gray-400 dark:text-gray-600 mb-4"
                />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No notes yet. Create your first note!
                </p>
              </div>
            ) : (
              notesData?.notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleNoteClick(note.id)}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    id === note.id
                      ? 'bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {note.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Note editor */}
      <div className="flex-1 bg-white dark:bg-gray-900">
        {id ? (
          <NoteEditor noteId={id} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Select a note to edit
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a note from the sidebar or create a new one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
