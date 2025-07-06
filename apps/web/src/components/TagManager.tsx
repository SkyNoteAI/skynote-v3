import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '../lib/api';
import { Tag, X, Filter, Hash } from 'lucide-react';

interface TagInfo {
  name: string;
  count: number;
  color?: string;
}

interface TagManagerProps {
  selectedTags?: string[];
  onTagSelect: (tags: string[]) => void;
  onTagFilter?: (tag: string) => void;
  showFilter?: boolean;
  allowMultiSelect?: boolean;
  maxTags?: number;
}

const tagColors = [
  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-300',
  'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300',
  'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/20 dark:text-fuchsia-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
];

function getTagColor(tagName: string): string {
  // Generate consistent color based on tag name hash
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    const char = tagName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return tagColors[Math.abs(hash) % tagColors.length];
}

interface TagChipProps {
  tag: TagInfo;
  isSelected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  showCount?: boolean;
  size?: 'sm' | 'md';
}

function TagChip({
  tag,
  isSelected,
  onSelect,
  onRemove,
  showCount = true,
  size = 'md',
}: TagChipProps) {
  const colorClass = tag.color || getTagColor(tag.name);
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <div
      className={`inline-flex items-center ${sizeClass} rounded-full font-medium transition-all hover:scale-105 cursor-pointer ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900'
          : ''
      } ${colorClass}`}
      onClick={onSelect}
    >
      <Hash className="w-3 h-3 mr-1" />
      <span>{tag.name}</span>
      {showCount && <span className="ml-1 opacity-75">({tag.count})</span>}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function TagManager({
  selectedTags = [],
  onTagSelect,
  onTagFilter,
  showFilter = false,
  allowMultiSelect = true,
  maxTags,
}: TagManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'recent'>('count');

  // Fetch notes to extract tags
  const { data: notesData, isLoading } = useQuery({
    queryKey: ['notes-for-tags'],
    queryFn: () => notesApi.list({ limit: 1000 }), // Get all notes to extract tags
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Extract and process tags from notes
  const allTags = useMemo(() => {
    if (!notesData?.notes) return [];

    const tagMap = new Map<string, TagInfo>();

    notesData.notes.forEach((note: any) => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tagName: string) => {
          const existing = tagMap.get(tagName);
          if (existing) {
            existing.count++;
          } else {
            tagMap.set(tagName, {
              name: tagName,
              count: 1,
            });
          }
        });
      }
    });

    return Array.from(tagMap.values());
  }, [notesData]);

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    let filtered = allTags;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'count':
          return b.count - a.count;
        case 'recent':
          // For now, sort by name if we don't have recent data
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    // Apply max tags limit
    if (maxTags && filtered.length > maxTags) {
      filtered = filtered.slice(0, maxTags);
    }

    return filtered;
  }, [allTags, searchQuery, sortBy, maxTags]);

  const handleTagClick = (tagName: string) => {
    if (!allowMultiSelect) {
      onTagSelect([tagName]);
      return;
    }

    const isSelected = selectedTags.includes(tagName);
    if (isSelected) {
      onTagSelect(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagSelect([...selectedTags, tagName]);
    }
  };

  const handleClearAll = () => {
    onTagSelect([]);
  };

  if (isLoading) {
    return (
      <div className="p-4" data-testid="tag-loading">
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Tag className="w-4 h-4 mr-2" />
          Tags ({allTags.length})
        </h3>

        {selectedTags.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search and Filter */}
      {showFilter && (
        <div className="space-y-2">
          {/* Search */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="count">Most used</option>
              <option value="name">Alphabetical</option>
              <option value="recent">Recently used</option>
            </select>
          </div>
        </div>
      )}

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Selected ({selectedTags.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tagName) => {
              const tagInfo = allTags.find((t) => t.name === tagName) || {
                name: tagName,
                count: 0,
              };
              return (
                <TagChip
                  key={tagName}
                  tag={tagInfo}
                  isSelected={true}
                  onSelect={() => handleTagClick(tagName)}
                  onRemove={() => handleTagClick(tagName)}
                  showCount={false}
                  size="sm"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available Tags */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Available
        </h4>

        {filteredTags.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2">
              <Tag className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No tags found' : 'No tags yet'}
            </p>
            {!searchQuery && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Tags will appear here as you add them to notes
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
            {filteredTags.map((tag) => (
              <TagChip
                key={tag.name}
                tag={tag}
                isSelected={selectedTags.includes(tag.name)}
                onSelect={() => handleTagClick(tag.name)}
                showCount={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {onTagFilter && selectedTags.length === 1 && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onTagFilter(selectedTags[0])}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
          >
            <Filter className="w-3 h-3" />
            <span>Filter notes by "{selectedTags[0]}"</span>
          </button>
        </div>
      )}
    </div>
  );
}
