import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '../lib/api';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
} from 'lucide-react';

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  noteCount: number;
  isExpanded?: boolean;
}

interface FolderTreeProps {
  selectedFolder?: string;
  onFolderSelect: (folderPath: string | undefined) => void;
  onCreateFolder?: (parentPath?: string) => void;
  onDeleteFolder?: (folderPath: string) => void;
  onMoveNote?: (noteId: string, targetFolder: string) => void;
}

interface FolderItemProps {
  folder: FolderNode;
  level: number;
  isSelected: boolean;
  selectedFolder?: string;
  onSelect: () => void;
  onToggleExpanded: () => void;
  onCreateSubfolder?: () => void;
  onDelete?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}

function FolderItem({
  folder,
  level,
  isSelected,
  selectedFolder,
  onSelect,
  onToggleExpanded,
  onCreateSubfolder,
  onDelete,
  onDrop,
}: FolderItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop?.(e);
  };

  const paddingLeft = level * 16 + 8;

  return (
    <div>
      <div
        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer transition-colors group ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        } ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-300 border-dashed' : ''}`}
        style={{ paddingLeft }}
        onClick={onSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-4 h-4 mr-1 flex items-center justify-center">
          {folder.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded();
              }}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {folder.isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {/* Folder Icon */}
        <div className="w-4 h-4 mr-2 flex-shrink-0">
          {folder.isExpanded ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}
        </div>

        {/* Folder Name */}
        <span className="flex-1 truncate text-sm font-medium">
          {folder.name}
        </span>

        {/* Note Count */}
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
          {folder.noteCount}
        </span>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>

          {showMenu && (
            <>
              {/* Menu backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu content */}
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                {onCreateSubfolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateSubfolder();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Subfolder</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                  >
                    <span>Delete Folder</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {folder.isExpanded && folder.children.length > 0 && (
        <div>
          {folder.children.map((child) => (
            <FolderItem
              key={child.path}
              folder={child}
              level={level + 1}
              isSelected={selectedFolder === child.path}
              selectedFolder={selectedFolder}
              onSelect={() => onSelect()}
              onToggleExpanded={() => onToggleExpanded()}
              onCreateSubfolder={onCreateSubfolder}
              onDelete={onDelete}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  selectedFolder,
  onFolderSelect,
  onCreateFolder,
  onDeleteFolder,
  onMoveNote,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([''])
  ); // Root is expanded by default

  // Fetch notes to build folder structure
  const { data: notesData, isLoading } = useQuery({
    queryKey: ['notes-for-folders'],
    queryFn: () => notesApi.list({ limit: 1000 }), // Get all notes to build folder tree
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Build folder tree from notes data
  const folderTree = useMemo(() => {
    if (!notesData?.notes) return [];

    const folderMap = new Map<string, FolderNode>();

    // Initialize root folder
    folderMap.set('', {
      name: 'All Notes',
      path: '',
      children: [],
      noteCount: 0,
      isExpanded: expandedFolders.has(''),
    });

    // Process each note to build folder structure
    notesData.notes.forEach((note: any) => {
      const folderPath = note.folder_path || '';
      const pathParts = folderPath ? folderPath.split('/').filter(Boolean) : [];

      // Update note count for root
      const rootFolder = folderMap.get('')!;
      rootFolder.noteCount++;

      // Build folder hierarchy
      let currentPath = '';
      pathParts.forEach((part: string) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!folderMap.has(currentPath)) {
          const folder: FolderNode = {
            name: part,
            path: currentPath,
            children: [],
            noteCount: 0,
            isExpanded: expandedFolders.has(currentPath),
          };
          folderMap.set(currentPath, folder);

          // Add to parent's children
          const parent = folderMap.get(parentPath);
          if (parent) {
            parent.children.push(folder);
          }
        }

        // Update note count for this folder
        const folder = folderMap.get(currentPath)!;
        folder.noteCount++;
      });
    });

    // Sort folders and build final tree
    const sortFolders = (folders: FolderNode[]) => {
      folders.sort((a, b) => a.name.localeCompare(b.name));
      folders.forEach((folder) => sortFolders(folder.children));
    };

    const root = folderMap.get('')!;
    sortFolders(root.children);

    return [root, ...root.children];
  }, [notesData, expandedFolders]);

  const handleToggleExpanded = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const handleDrop = (folderPath: string) => (e: React.DragEvent) => {
    const noteId = e.dataTransfer.getData('text/note-id');
    if (noteId && onMoveNote) {
      onMoveNote(noteId, folderPath);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Folders
        </h3>
        {onCreateFolder && (
          <button
            onClick={() => onCreateFolder()}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Create new folder"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Folder Tree */}
      <div className="space-y-1">
        {folderTree.map((folder) => (
          <FolderItem
            key={folder.path}
            folder={folder}
            level={0}
            isSelected={selectedFolder === folder.path}
            selectedFolder={selectedFolder}
            onSelect={() =>
              onFolderSelect(folder.path === '' ? undefined : folder.path)
            }
            onToggleExpanded={() => handleToggleExpanded(folder.path)}
            onCreateSubfolder={
              onCreateFolder ? () => onCreateFolder(folder.path) : undefined
            }
            onDelete={
              onDeleteFolder && folder.path !== ''
                ? () => onDeleteFolder(folder.path)
                : undefined
            }
            onDrop={handleDrop(folder.path)}
          />
        ))}
      </div>

      {/* Empty State */}
      {folderTree.length === 1 && folderTree[0].children.length === 0 && (
        <div className="mt-4 text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">No folders yet</p>
          {onCreateFolder && (
            <button
              onClick={() => onCreateFolder()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Create your first folder
            </button>
          )}
        </div>
      )}
    </div>
  );
}
