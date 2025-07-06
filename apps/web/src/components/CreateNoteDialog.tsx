import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../lib/api';
import { X, Folder, Tag, Plus, FileText } from 'lucide-react';

interface CreateNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteCreated?: (noteId: string) => void;
  initialFolder?: string;
  initialTags?: string[];
}

interface CreateNoteForm {
  title: string;
  folder: string;
  tags: string[];
  template?: 'blank' | 'meeting' | 'journal' | 'project';
}

const noteTemplates = {
  blank: {
    title: '',
    content: [
      {
        type: 'paragraph',
        content: '',
      },
    ],
  },
  meeting: {
    title: 'Meeting Notes - ',
    content: [
      {
        type: 'heading',
        props: { level: 1 },
        content: 'Meeting Notes',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Attendees',
      },
      {
        type: 'bulletListItem',
        content: '',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Agenda',
      },
      {
        type: 'numberedListItem',
        content: '',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Notes',
      },
      {
        type: 'paragraph',
        content: '',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Action Items',
      },
      {
        type: 'checkListItem',
        content: '',
      },
    ],
  },
  journal: {
    title: 'Journal Entry - ',
    content: [
      {
        type: 'heading',
        props: { level: 1 },
        content: `Journal Entry - ${new Date().toLocaleDateString()}`,
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Today I...',
      },
      {
        type: 'paragraph',
        content: '',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Grateful for',
      },
      {
        type: 'bulletListItem',
        content: '',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Tomorrow I will...',
      },
      {
        type: 'paragraph',
        content: '',
      },
    ],
  },
  project: {
    title: 'Project - ',
    content: [
      {
        type: 'heading',
        props: { level: 1 },
        content: 'Project Overview',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Goals',
      },
      {
        type: 'bulletListItem',
        content: '',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Timeline',
      },
      {
        type: 'paragraph',
        content: '',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Tasks',
      },
      {
        type: 'checkListItem',
        content: '',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Resources',
      },
      {
        type: 'paragraph',
        content: '',
      },
    ],
  },
};

export function CreateNoteDialog({
  isOpen,
  onClose,
  onNoteCreated,
  initialFolder = '',
  initialTags = [],
}: CreateNoteDialogProps) {
  const [form, setForm] = useState<CreateNoteForm>({
    title: '',
    folder: initialFolder,
    tags: [...initialTags],
    template: 'blank',
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setForm({
        title: '',
        folder: initialFolder,
        tags: [...initialTags],
        template: 'blank',
      });
      setTagInput('');
    }
  }, [isOpen, initialFolder, initialTags]);

  const createNoteMutation = useMutation({
    mutationFn: (noteData: {
      title: string;
      content: any;
      folder?: string;
      tags?: string[];
    }) => notesApi.create(noteData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      onNoteCreated?.(data.note.id);
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedTemplate =
        noteTemplates[form.template as keyof typeof noteTemplates];
      const title =
        form.title || selectedTemplate.title + new Date().toLocaleDateString();

      await createNoteMutation.mutateAsync({
        title,
        content: selectedTemplate.content,
        folder: form.folder || undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
      });
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!form.tags.includes(tag)) {
        setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create New Note
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(noteTemplates).map(([key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, template: key as any }))
                  }
                  className={`p-3 rounded-md border text-left transition-colors ${
                    form.template === key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium capitalize">
                      {key}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder={`${noteTemplates[form.template as keyof typeof noteTemplates].title}${new Date().toLocaleDateString()}`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Folder */}
          <div>
            <label
              htmlFor="folder"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Folder
            </label>
            <div className="relative">
              <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="folder"
                value={form.folder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, folder: e.target.value }))
                }
                placeholder="e.g., Work, Personal, Projects"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Tags
            </label>
            <div className="space-y-2">
              {/* Tag input */}
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag and press Enter"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Selected tags */}
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error display */}
          {createNoteMutation.error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                Failed to create note. Please try again.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
