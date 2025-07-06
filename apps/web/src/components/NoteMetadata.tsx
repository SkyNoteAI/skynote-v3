import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../lib/api';
import {
  Calendar,
  Clock,
  Folder,
  Tag,
  Star,
  Edit3,
  Save,
  X,
  Hash,
  FileText,
  Eye,
  Archive,
  Trash2,
  RotateCcw,
} from 'lucide-react';

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
  word_count?: number;
  char_count?: number;
}

interface NoteMetadataProps {
  note: Note;
  onNoteUpdate?: (noteId: string, updates: Partial<Note>) => void;
  onNoteDelete?: (noteId: string) => void;
  onNoteRestore?: (noteId: string) => void;
  onNoteArchive?: (noteId: string) => void;
  showWordCount?: boolean;
  showCharCount?: boolean;
  allowEdit?: boolean;
}

// Simple date formatting utility
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffInMs = now.getTime() - date.getTime();
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

// Calculate content statistics
function calculateContentStats(content: any[]): {
  wordCount: number;
  charCount: number;
} {
  if (!content || content.length === 0) {
    return { wordCount: 0, charCount: 0 };
  }

  let text = '';

  const extractText = (blocks: any[]): string => {
    return blocks
      .map((block) => {
        if (block.content && Array.isArray(block.content)) {
          return block.content.map((c: any) => c.text || '').join('');
        }
        return '';
      })
      .join(' ');
  };

  text = extractText(content);

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return { wordCount, charCount };
}

export function NoteMetadata({
  note,
  onNoteUpdate,
  onNoteDelete,
  onNoteRestore,
  onNoteArchive,
  showWordCount = true,
  showCharCount = false,
  allowEdit = true,
}: NoteMetadataProps) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [tempTags, setTempTags] = useState<string[]>(note.tags || []);
  const [tempFolder, setTempFolder] = useState(note.folder_path || '');
  const [newTag, setNewTag] = useState('');

  const queryClient = useQueryClient();

  // Mutations
  const updateNoteMutation = useMutation({
    mutationFn: (updates: Partial<Note>) => notesApi.update(note.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', note.id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: () => notesApi.delete(note.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      onNoteDelete?.(note.id);
    },
  });

  const restoreNoteMutation = useMutation({
    mutationFn: () => notesApi.restore(note.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      onNoteRestore?.(note.id);
    },
  });

  // Calculate content statistics
  const contentStats = React.useMemo(() => {
    return calculateContentStats(note.content || []);
  }, [note.content]);

  // Handlers
  const handleToggleStar = () => {
    const updates = { is_starred: !note.is_starred };
    updateNoteMutation.mutate(updates);
    onNoteUpdate?.(note.id, updates);
  };

  const handleSaveTags = () => {
    const updates = { tags: tempTags };
    updateNoteMutation.mutate(updates);
    onNoteUpdate?.(note.id, updates);
    setIsEditingTags(false);
  };

  const handleSaveFolder = () => {
    const updates = { folder_path: tempFolder };
    updateNoteMutation.mutate(updates);
    onNoteUpdate?.(note.id, updates);
    setIsEditingFolder(false);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const tag = newTag.trim().toLowerCase();
      if (!tempTags.includes(tag)) {
        setTempTags((prev) => [...prev, tag]);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTempTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleCancelEdit = () => {
    setTempTags(note.tags || []);
    setTempFolder(note.folder_path || '');
    setIsEditingTags(false);
    setIsEditingFolder(false);
    setNewTag('');
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Note Details
        </h3>

        {/* Star Toggle */}
        <button
          onClick={handleToggleStar}
          className={`p-2 rounded-md transition-colors ${
            note.is_starred
              ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
          }`}
          title={note.is_starred ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className="w-5 h-5"
            fill={note.is_starred ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      {/* Basic Info */}
      <div className="space-y-3">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <div>
              <div className="font-medium">Created</div>
              <div>{formatDate(note.created_at)}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <div>
              <div className="font-medium">Updated</div>
              <div>{formatRelativeTime(note.updated_at)}</div>
            </div>
          </div>
        </div>

        {/* Content Statistics */}
        {(showWordCount || showCharCount) && (
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <Eye className="w-4 h-4" />
            <div className="flex space-x-3">
              {showWordCount && <span>{contentStats.wordCount} words</span>}
              {showCharCount && (
                <span>{contentStats.charCount} characters</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Folder */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <Folder className="w-4 h-4 mr-2" />
            Folder
          </label>
          {allowEdit && !isEditingFolder && (
            <button
              onClick={() => setIsEditingFolder(true)}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          )}
        </div>

        {isEditingFolder ? (
          <div className="space-y-2">
            <input
              type="text"
              value={tempFolder}
              onChange={(e) => setTempFolder(e.target.value)}
              placeholder="e.g., Work/Projects"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSaveFolder}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {note.folder_path || <span className="italic">No folder</span>}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <Tag className="w-4 h-4 mr-2" />
            Tags
          </label>
          {allowEdit && !isEditingTags && (
            <button
              onClick={() => setIsEditingTags(true)}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          )}
        </div>

        {isEditingTags ? (
          <div className="space-y-3">
            {/* Tag input */}
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type a tag and press Enter"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Current tags */}
            {tempTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tempTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300"
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={handleSaveTags}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            {note.tags && note.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 italic">No tags</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Actions
        </div>

        <div className="space-y-2">
          {note.deleted_at ? (
            // Deleted note actions
            <div className="space-y-2">
              <button
                onClick={() => restoreNoteMutation.mutate()}
                disabled={restoreNoteMutation.isPending}
                className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore Note</span>
              </button>

              <button
                onClick={() => deleteNoteMutation.mutate()}
                disabled={deleteNoteMutation.isPending}
                className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </button>
            </div>
          ) : (
            // Active note actions
            <div className="space-y-2">
              {onNoteArchive && (
                <button
                  onClick={() => onNoteArchive(note.id)}
                  className="w-full px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center space-x-2"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive Note</span>
                </button>
              )}

              <button
                onClick={() => deleteNoteMutation.mutate()}
                disabled={deleteNoteMutation.isPending}
                className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Note</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
