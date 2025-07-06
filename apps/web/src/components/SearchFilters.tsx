import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '../lib/api';
import {
  Filter,
  X,
  Calendar,
  Folder,
  Tag,
  Star,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SearchFilters {
  tags?: string[];
  folders?: string[];
  dateRange?: { start: string; end: string };
  starred?: boolean;
  contentType?: string[];
  wordCountRange?: { min: number; max: number };
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  className?: string;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export function SearchFilters({
  filters,
  onFiltersChange,
  className = '',
  isCollapsible = false,
  defaultCollapsed = false,
}: SearchFiltersProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllFolders, setShowAllFolders] = useState(false);

  // Fetch available filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['search-filter-options'],
    queryFn: async () => {
      const response = await notesApi.getFilterOptions();
      return response;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...newFilters });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    updateFilters({ tags: newTags.length > 0 ? newTags : undefined });
  };

  const handleFolderToggle = (folder: string) => {
    const currentFolders = filters.folders || [];
    const newFolders = currentFolders.includes(folder)
      ? currentFolders.filter((f) => f !== folder)
      : [...currentFolders, folder];

    updateFilters({ folders: newFolders.length > 0 ? newFolders : undefined });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const currentRange = filters.dateRange || { start: '', end: '' };
    const newRange = { ...currentRange, [field]: value };

    // Clear date range if both fields are empty
    if (!newRange.start && !newRange.end) {
      updateFilters({ dateRange: undefined });
    } else {
      updateFilters({ dateRange: newRange });
    }
  };

  const handleWordCountChange = (field: 'min' | 'max', value: string) => {
    const currentRange = filters.wordCountRange || { min: 0, max: 10000 };
    const numValue = parseInt(value) || 0;
    const newRange = { ...currentRange, [field]: numValue };

    updateFilters({ wordCountRange: newRange });
  };

  // Count active filters
  const activeFilterCount = [
    filters.tags?.length || 0,
    filters.folders?.length || 0,
    filters.dateRange && (filters.dateRange.start || filters.dateRange.end)
      ? 1
      : 0,
    filters.starred ? 1 : 0,
    filters.contentType?.length || 0,
    filters.wordCountRange &&
    (filters.wordCountRange.min > 0 || filters.wordCountRange.max < 10000)
      ? 1
      : 0,
  ]
    .filter(Boolean)
    .reduce((sum: number, count: number) => sum + count, 0);

  const visibleTags = showAllTags
    ? filterOptions?.tags
    : filterOptions?.tags?.slice(0, 10);

  const visibleFolders = showAllFolders
    ? filterOptions?.folders
    : filterOptions?.folders?.slice(0, 8);

  const FilterHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          Filters
        </h3>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            {activeFilterCount}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear all
          </button>
        )}

        {isCollapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  if (isCollapsible && isCollapsed) {
    return (
      <div
        className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}
      >
        <FilterHeader />
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-6 ${className}`}
    >
      <FilterHeader />

      {/* Starred Filter */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={filters.starred || false}
            onChange={(e) =>
              updateFilters({ starred: e.target.checked || undefined })
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <Star className="h-4 w-4 mr-1 text-yellow-500" />
            Starred notes only
          </div>
        </label>
      </div>

      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Calendar className="h-4 w-4 inline mr-1" />
          Date Range
        </label>
        <div className="space-y-2">
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                From
              </label>
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                To
              </label>
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick date options */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'Today', days: 0 },
              { label: 'Week', days: 7 },
              { label: 'Month', days: 30 },
              { label: 'Year', days: 365 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => {
                  const end = new Date().toISOString().split('T')[0];
                  const start = new Date(
                    Date.now() - days * 24 * 60 * 60 * 1000
                  )
                    .toISOString()
                    .split('T')[0];
                  updateFilters({ dateRange: { start, end } });
                }}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Word Count Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FileText className="h-4 w-4 inline mr-1" />
          Word Count
        </label>
        <div className="flex space-x-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Min
            </label>
            <input
              type="number"
              min="0"
              value={filters.wordCountRange?.min || 0}
              onChange={(e) => handleWordCountChange('min', e.target.value)}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Max
            </label>
            <input
              type="number"
              min="0"
              value={filters.wordCountRange?.max || 10000}
              onChange={(e) => handleWordCountChange('max', e.target.value)}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Tags Filter */}
      {filterOptions?.tags && filterOptions.tags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Tag className="h-4 w-4 inline mr-1" />
            Tags ({filters.tags?.length || 0} selected)
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {visibleTags?.map((tag: FilterOption) => (
              <label key={tag.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.tags?.includes(tag.value) || false}
                  onChange={() => handleTagToggle(tag.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    #{tag.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {tag.count}
                  </span>
                </div>
              </label>
            ))}

            {filterOptions.tags.length > 10 && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {showAllTags
                  ? 'Show less'
                  : `Show ${filterOptions.tags.length - 10} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Folders Filter */}
      {filterOptions?.folders && filterOptions.folders.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Folder className="h-4 w-4 inline mr-1" />
            Folders ({filters.folders?.length || 0} selected)
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {visibleFolders?.map((folder: FilterOption) => (
              <label key={folder.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.folders?.includes(folder.value) || false}
                  onChange={() => handleFolderToggle(folder.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {folder.label || 'Root'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {folder.count}
                  </span>
                </div>
              </label>
            ))}

            {filterOptions.folders.length > 8 && (
              <button
                onClick={() => setShowAllFolders(!showAllFolders)}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {showAllFolders
                  ? 'Show less'
                  : `Show ${filterOptions.folders.length - 8} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Active Filters
          </h4>
          <div className="flex flex-wrap gap-2">
            {filters.starred && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                <Star className="h-3 w-3 mr-1" />
                Starred
                <button
                  onClick={() => updateFilters({ starred: undefined })}
                  className="ml-1 hover:text-yellow-600 dark:hover:text-yellow-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
                <button
                  onClick={() => handleTagToggle(tag)}
                  className="ml-1 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {filters.folders?.map((folder) => (
              <span
                key={folder}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
              >
                <Folder className="h-3 w-3 mr-1" />
                {folder || 'Root'}
                <button
                  onClick={() => handleFolderToggle(folder)}
                  className="ml-1 hover:text-green-600 dark:hover:text-green-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {filters.dateRange &&
              (filters.dateRange.start || filters.dateRange.end) && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                  <Calendar className="h-3 w-3 mr-1" />
                  Date range
                  <button
                    onClick={() => updateFilters({ dateRange: undefined })}
                    className="ml-1 hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
