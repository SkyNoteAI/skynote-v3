import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { notesApi } from '../lib/api';
import { Star, Trash2, FolderOpen, Calendar, Tag } from 'lucide-react';

// Simple date formatting utility
function formatRelativeTime(date: string): string {
  const now = new Date();
  const target = new Date(date);
  const diffInMs = now.getTime() - target.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`;
  return `${Math.floor(diffInDays / 365)}y ago`;
}

interface Note {
  id: string;
  title: string;
  content?: any[];
  folder_path?: string;
  tags?: string[];
  is_starred?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface NoteListProps {
  selectedNoteId?: string;
  onNoteSelect: (noteId: string) => void;
  onNoteCreate?: () => void;
  onNoteDelete?: (noteId: string) => void;
  onNoteToggleStar?: (noteId: string, isStarred: boolean) => void;
  searchQuery?: string;
  selectedFolder?: string;
  selectedTags?: string[];
  sortBy?: 'updated_at' | 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
  showDeleted?: boolean;
}

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onToggleStar?: (isStarred: boolean) => void;
}

function NoteCard({
  note,
  isSelected,
  onSelect,
  onDelete,
  onToggleStar,
}: NoteCardProps) {
  const excerpt = useMemo(() => {
    if (!note.content || note.content.length === 0) return '';

    // Extract text from the first few blocks
    const textBlocks = note.content
      .slice(0, 3)
      .map((block) => {
        if (block.content && Array.isArray(block.content)) {
          return block.content.map((c: any) => c.text || '').join('');
        }
        return '';
      })
      .filter((text) => text.trim().length > 0);

    const excerpt = textBlocks.join(' ').slice(0, 150);
    return excerpt + (excerpt.length >= 150 ? '...' : '');
  }, [note.content]);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.(!note.is_starred);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div
      className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
          : ''
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate flex-1 mr-2">
          {note.title || 'Untitled Note'}
        </h3>
        <div className="flex items-center space-x-1">
          {onToggleStar && (
            <button
              onClick={handleStarClick}
              className={`p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
                note.is_starred ? 'text-yellow-500' : 'text-gray-400'
              }`}
              aria-label={
                note.is_starred ? 'Remove from favorites' : 'Add to favorites'
              }
            >
              <Star
                className="w-4 h-4"
                fill={note.is_starred ? 'currentColor' : 'none'}
              />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500"
              aria-label="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {excerpt}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-3">
          {note.folder_path && (
            <div className="flex items-center space-x-1">
              <FolderOpen className="w-3 h-3" />
              <span>{note.folder_path}</span>
            </div>
          )}
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center space-x-1">
              <Tag className="w-3 h-3" />
              <span>{note.tags.slice(0, 2).join(', ')}</span>
              {note.tags.length > 2 && <span>+{note.tags.length - 2}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <span>{formatRelativeTime(note.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}

export function NoteList({
  selectedNoteId,
  onNoteSelect,
  onNoteCreate,
  onNoteDelete,
  onNoteToggleStar,
  searchQuery,
  selectedFolder,
  selectedTags,
  sortBy = 'updated_at',
  sortOrder = 'desc',
  showDeleted = false,
}: NoteListProps) {
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);

  // Infinite query for notes
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: [
      'notes',
      {
        searchQuery,
        selectedFolder,
        selectedTags,
        sortBy,
        sortOrder,
        showDeleted,
      },
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const params: any = {
        page: pageParam,
        limit: 20,
        sort: sortBy,
        order: sortOrder,
      };

      if (searchQuery) params.search = searchQuery;
      if (selectedFolder) params.folder = selectedFolder;
      if (selectedTags && selectedTags.length > 0)
        params.tags = selectedTags.join(',');
      if (showDeleted) params.include_deleted = 'true';

      return notesApi.list(params);
    },
    getNextPageParam: (lastPage: any) => {
      const { page, limit, total } = lastPage;
      const hasMore = page * limit < total;
      return hasMore ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Flatten the pages into a single array of notes
  const notes = useMemo(() => {
    return data?.pages.flatMap((page) => page.notes) || [];
  }, [data]);

  // Scroll observer for infinite loading
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Bulk selection handlers
  const handleNoteSelection = (noteId: string, isSelected: boolean) => {
    const newSelection = new Set(selectedNotes);
    if (isSelected) {
      newSelection.add(noteId);
    } else {
      newSelection.delete(noteId);
    }
    setSelectedNotes(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedNotes.size === notes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(notes.map((note) => note.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedNotes.size > 0 && onNoteDelete) {
      selectedNotes.forEach((noteId) => onNoteDelete(noteId));
      setSelectedNotes(new Set());
      setBulkActionMode(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load notes</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            No notes found
          </p>
          {onNoteCreate && (
            <button
              onClick={onNoteCreate}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Create your first note
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Bulk Action Header */}
      {bulkActionMode && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedNotes.size === notes.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Select all ({selectedNotes.size} selected)
                </span>
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkDelete}
                disabled={selectedNotes.size === 0}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setBulkActionMode(false)}
                className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-auto">
        {notes.map((note) => (
          <div key={note.id} className="flex items-center">
            {bulkActionMode && (
              <div className="p-4">
                <input
                  type="checkbox"
                  checked={selectedNotes.has(note.id)}
                  onChange={(e) =>
                    handleNoteSelection(note.id, e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="flex-1">
              <NoteCard
                note={note}
                isSelected={selectedNoteId === note.id}
                onSelect={() => onNoteSelect(note.id)}
                onDelete={
                  onNoteDelete ? () => onNoteDelete(note.id) : undefined
                }
                onToggleStar={
                  onNoteToggleStar
                    ? (isStarred) => onNoteToggleStar(note.id, isStarred)
                    : undefined
                }
              />
            </div>
          </div>
        ))}

        {/* Load more trigger */}
        {hasNextPage && <div ref={loadMoreRef} className="h-4" />}
      </div>

      {/* Loading More Indicator */}
      {isFetchingNextPage && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}

      {/* Bulk Actions Toggle */}
      {!bulkActionMode && notes.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setBulkActionMode(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Select multiple notes
          </button>
        </div>
      )}
    </div>
  );
}
