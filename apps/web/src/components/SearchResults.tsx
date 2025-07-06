import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '../lib/api';
import {
  Search,
  SortAsc,
  SortDesc,
  FileText,
  Hash,
  Calendar,
  Folder,
  Star,
  Eye,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  content?: any[];
  folder_path?: string;
  tags?: string[];
  is_starred?: boolean;
  created_at: string;
  updated_at: string;
  score?: number;
  highlights?: string[];
}

interface SearchResultsProps {
  query: string;
  mode?: 'keyword' | 'semantic';
  onResultSelect?: (noteId: string) => void;
  className?: string;
}

interface SortOption {
  value: 'relevance' | 'date' | 'title';
  label: string;
  icon: React.ReactNode;
}

const sortOptions: SortOption[] = [
  {
    value: 'relevance',
    label: 'Relevance',
    icon: <Search className="h-4 w-4" />,
  },
  {
    value: 'date',
    label: 'Date Updated',
    icon: <Calendar className="h-4 w-4" />,
  },
  { value: 'title', label: 'Title', icon: <FileText className="h-4 w-4" /> },
];

export function SearchResults({
  query,
  mode = 'keyword',
  onResultSelect,
  className = '',
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>(
    'relevance'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const filters = {
    tags: [] as string[],
    folders: [] as string[],
    starred: false,
    dateRange: { start: '', end: '' },
  };

  // Fetch search results
  const {
    data: searchData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['search-results', query, mode, sortBy, sortOrder, filters],
    queryFn: async () => {
      if (!query.trim()) return { results: [], total: 0, took: 0 };

      const response = await notesApi.search({
        query: query.trim(),
        mode,
        sort: sortBy,
        order: sortOrder,
        filters,
        limit: 50,
      });

      return response;
    },
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sort and filter results
  const sortedResults = useMemo(() => {
    if (!searchData?.results) return [];

    let results = [...searchData.results];

    // Apply sorting
    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = (b.score || 0) - (a.score || 0);
          break;
        case 'date':
          comparison =
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return results;
  }, [searchData?.results, sortBy, sortOrder]);

  const handleSortChange = (newSortBy: 'relevance' | 'date' | 'title') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;

    const regex = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getWordCount = (content: any[]) => {
    if (!content || content.length === 0) return 0;

    const text = content
      .map((block) => {
        if (block.content && Array.isArray(block.content)) {
          return block.content.map((c: any) => c.text || '').join('');
        }
        return '';
      })
      .join(' ');

    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  if (!query.trim()) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Start your search
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Enter a search term to find notes in your collection
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Search failed
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          There was an error performing your search
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Search Results
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isLoading ? (
                'Searching...'
              ) : (
                <>
                  {searchData?.total || 0} results for "{query}"
                  {searchData?.took && (
                    <span className="text-gray-500">
                      {' '}
                      (in {searchData.took}ms)
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Sort by:
            </span>
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${
                  sortBy === option.value
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {option.icon}
                <span className="ml-1">{option.label}</span>
                {sortBy === option.value &&
                  (sortOrder === 'asc' ? (
                    <SortAsc className="w-3 h-3 ml-1" />
                  ) : (
                    <SortDesc className="w-3 h-3 ml-1" />
                  ))}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        ) : sortedResults.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedResults.map((result: SearchResult) => (
              <div
                key={result.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                onClick={() => onResultSelect?.(result.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Title and Score */}
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {highlightText(result.title, query)}
                        </h3>
                      </div>

                      {result.is_starred && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}

                      {result.score && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                          {Math.round(result.score * 100)}% match
                        </span>
                      )}
                    </div>

                    {/* Excerpt */}
                    <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                      {highlightText(result.excerpt, query)}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {result.folder_path && (
                        <div className="flex items-center space-x-1">
                          <Folder className="h-4 w-4" />
                          <span>{result.folder_path}</span>
                        </div>
                      )}

                      {result.tags && result.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Hash className="h-4 w-4" />
                          <span>{result.tags.slice(0, 3).join(', ')}</span>
                          {result.tags.length > 3 && (
                            <span className="text-gray-400">
                              +{result.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span title={formatDate(result.updated_at)}>
                          {formatRelativeTime(result.updated_at)}
                        </span>
                      </div>

                      {result.content && (
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{getWordCount(result.content)} words</span>
                        </div>
                      )}
                    </div>

                    {/* Highlights */}
                    {result.highlights && result.highlights.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Matching content:
                        </p>
                        {result.highlights
                          .slice(0, 2)
                          .map((highlight, index) => (
                            <p
                              key={index}
                              className="text-sm text-gray-600 dark:text-gray-400 italic border-l-2 border-gray-300 dark:border-gray-600 pl-3"
                            >
                              ...{highlightText(highlight, query)}...
                            </p>
                          ))}
                      </div>
                    )}
                  </div>

                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No results found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We couldn't find any notes matching "{query}"
            </p>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <p>Try:</p>
              <ul className="space-y-1">
                <li>• Using different keywords</li>
                <li>• Checking spelling</li>
                <li>• Using more general terms</li>
                <li>
                  • Switching to {mode === 'keyword' ? 'semantic' : 'keyword'}{' '}
                  search
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
