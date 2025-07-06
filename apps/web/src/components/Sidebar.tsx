import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useResizable } from '../hooks/useResizable';
import {
  FolderIcon,
  FileTextIcon,
  PlusIcon,
  SearchIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XIcon,
} from 'lucide-react';

interface FolderNode {
  id: string;
  name: string;
  type: 'folder' | 'note';
  children?: FolderNode[];
  path: string;
}

// Mock data for folder tree - this will be replaced with API data
const mockFolderTree: FolderNode[] = [
  {
    id: '1',
    name: 'Personal',
    type: 'folder',
    path: '/personal',
    children: [
      {
        id: '2',
        name: 'Daily Notes',
        type: 'note',
        path: '/personal/daily-notes',
      },
      { id: '3', name: 'Ideas', type: 'note', path: '/personal/ideas' },
    ],
  },
  {
    id: '4',
    name: 'Work',
    type: 'folder',
    path: '/work',
    children: [
      {
        id: '5',
        name: 'Project Plans',
        type: 'note',
        path: '/work/project-plans',
      },
      {
        id: '6',
        name: 'Meeting Notes',
        type: 'note',
        path: '/work/meeting-notes',
      },
    ],
  },
  {
    id: '7',
    name: 'Untitled Note',
    type: 'note',
    path: '/untitled',
  },
];

interface FolderTreeItemProps {
  node: FolderNode;
  level: number;
  onSelect: (node: FolderNode) => void;
  selectedId?: string;
}

function FolderTreeItem({
  node,
  level,
  onSelect,
  selectedId,
}: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = selectedId === node.id;

  const handleToggle = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    }
    onSelect(node);
  };

  return (
    <div>
      <div
        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
      >
        {node.type === 'folder' && (
          <div className="w-4 h-4 mr-1">
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </div>
        )}

        <div className="w-4 h-4 mr-2 flex-shrink-0">
          {node.type === 'folder' ? (
            <FolderIcon className="w-4 h-4" />
          ) : (
            <FileTextIcon className="w-4 h-4" />
          )}
        </div>

        <span className="text-sm truncate">{node.name}</span>
      </div>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  // Resizable functionality
  const { width, isResizing, startResize, handleDoubleClick } = useResizable({
    initialWidth: 256, // 16rem = 256px
    minWidth: 200,
    maxWidth: 400,
    direction: 'right',
  });

  const handleNodeSelect = (node: FolderNode) => {
    setSelectedNodeId(node.id);
    if (node.type === 'note') {
      navigate(`/notes/${node.id}`);
    }
  };

  const handleCreateNote = () => {
    // This will be implemented when we have the create note functionality
    console.log('Create new note');
  };

  const handleToggleSidebar = () => {
    toggleSidebar();
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-0
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 
          shadow-lg lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${!sidebarOpen ? 'lg:w-0 lg:overflow-hidden' : ''}
          ${isResizing ? 'transition-none' : ''}
        `}
        style={{
          width: sidebarOpen ? `${width}px` : '16rem',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              SkyNote AI
            </h2>
            <button
              onClick={handleToggleSidebar}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 lg:hidden"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCreateNote}
              className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Note
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Folder Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {mockFolderTree.map((node) => (
                <FolderTreeItem
                  key={node.id}
                  node={node}
                  level={0}
                  onSelect={handleNodeSelect}
                  selectedId={selectedNodeId}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {mockFolderTree.length} folders •{' '}
              {mockFolderTree.reduce(
                (acc, node) => acc + (node.children?.length || 0),
                0
              )}{' '}
              notes
            </div>
          </div>
        </div>

        {/* Resize handle */}
        {sidebarOpen && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50 transition-colors hidden lg:block"
            onMouseDown={startResize}
            onDoubleClick={handleDoubleClick}
            style={{ right: '-2px' }}
          />
        )}
      </div>
    </>
  );
}
