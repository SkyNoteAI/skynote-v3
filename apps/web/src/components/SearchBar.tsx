import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '../lib/api';
import {
  Search,
  X,
  Filter,
  Clock,
  Sparkles,
  FileText,
  Hash,
  Calendar,
  Folder,
  Star,
  ArrowRight,
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  folder_path?: string;
  tags?: string[];
  updated_at: string;
  score?: number;
  highlights?: string[];
}

interface SearchBarProps {
  onResultSelect?: (noteId: string) => void;
  placeholder?: string;
  className?: string;
}

interface SearchFilters {
  tags?: string[];
  folders?: string[];
  dateRange?: { start: string; end: string };
  starred?: boolean;
}

export function SearchBar({
  onResultSelect,
  placeholder = 'Search notes...',
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'keyword' | 'semantic'>('keyword');
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search query with debouncing
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', mode, query, filters],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];

      const response = await notesApi.search({
        query: query.trim(),
        mode,
        filters,
        limit: 10,
      });

      return response.results || [];
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Type-ahead suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];

      const response = await notesApi.searchSuggestions({
        query: query.trim(),
        limit: 5,
      });

      return response.suggestions || [];
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('search-history');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);

  // Save search to history
  const saveToHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const newHistory = [
      searchQuery,
      ...searchHistory.filter((h) => h !== searchQuery),
    ].slice(0, 10); // Keep last 10 searches

    setSearchHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);

    if (value.length >= 2) {
      setShowFilters(false);
    }
  };

  const handleInputFocus = () => {
    if (query.length >= 2 || searchHistory.length > 0) {
      setShowResults(true);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setQuery(result.title);
    setShowResults(false);
    saveToHistory(result.title);
    onResultSelect?.(result.id);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowResults(true);
    saveToHistory(suggestion);
    inputRef.current?.focus();
  };

  const handleHistoryClick = (historyItem: string) => {
    setQuery(historyItem);
    setShowResults(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      saveToHistory(query);
      setShowResults(false);
      // Navigate to search results page if implemented
    }

    if (e.key === 'Escape') {
      setShowResults(false);
      setShowFilters(false);
      inputRef.current?.blur();
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setShowResults(false);
    inputRef.current?.focus();
  };

  const toggleMode = () => {
    setMode(mode === 'keyword' ? 'semantic' : 'keyword');
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
    setShowResults(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
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

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Right side controls */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
          {/* Clear button */}
          {query && (
            <button
              onClick={handleClearSearch}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Mode toggle */}
          <button
            onClick={toggleMode}
            className={`p-1 rounded transition-colors ${
              mode === 'semantic'
                ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title={mode === 'semantic' ? 'Semantic search' : 'Keyword search'}
          >
            {mode === 'semantic' ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </button>

          {/* Filters toggle */}
          <button
            onClick={toggleFilters}
            className={`p-1 rounded transition-colors ${
              showFilters
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="Search filters"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Searching...
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Search Suggestions */}
              {query.length >= 2 && suggestions && suggestions.length > 0 && (
                <div className="p-3">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Suggestions
                  </h4>
                  <div className="space-y-1">
                    {suggestions.map((suggestion: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center"
                      >
                        <Search className="h-3 w-3 mr-2 text-gray-400" />
                        {highlightText(suggestion, query)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchResults && searchResults.length > 0 && (
                <div className="p-3">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Results ({searchResults.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((result: SearchResult) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {highlightText(result.title, query)}
                              </h3>
                              {result.score && (
                                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-0.5 rounded">
                                  {Math.round(result.score * 100)}%
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {highlightText(result.excerpt, query)}
                            </p>

                            <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {result.folder_path && (
                                <div className="flex items-center space-x-1">
                                  <Folder className="h-3 w-3" />
                                  <span>{result.folder_path}</span>
                                </div>
                              )}
                              {result.tags && result.tags.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Hash className="h-3 w-3" />
                                  <span>
                                    {result.tags.slice(0, 2).join(', ')}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(result.updated_at)}</span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 ml-2 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search History */}
              {query.length < 2 && searchHistory.length > 0 && (
                <div className="p-3">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Recent Searches
                  </h4>
                  <div className="space-y-1">
                    {searchHistory.slice(0, 5).map((historyItem, index) => (
                      <button
                        key={index}
                        onClick={() => handleHistoryClick(historyItem)}
                        className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center"
                      >
                        <Clock className="h-3 w-3 mr-2 text-gray-400" />
                        {historyItem}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {query.length >= 2 &&
                searchResults &&
                searchResults.length === 0 &&
                !isLoading && (
                  <div className="p-4 text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      No results found for "{query}"
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Try adjusting your search terms or using{' '}
                      {mode === 'keyword' ? 'semantic' : 'keyword'} search
                    </p>
                    <button
                      onClick={toggleMode}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Switch to {mode === 'keyword' ? 'semantic' : 'keyword'}{' '}
                      search
                    </button>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* Search Filters Panel */}
      {showFilters && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Search Filters
          </h4>

          <div className="space-y-3">
            {/* Starred filter */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.starred || false}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, starred: e.target.checked }))
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="ml-2 flex items-center text-sm text-gray-700 dark:text-gray-300">
                <Star className="h-4 w-4 mr-1" />
                Starred only
              </div>
            </label>

            {/* Date range filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        start: e.target.value,
                        end: prev.dateRange?.end || '',
                      },
                    }))
                  }
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        end: e.target.value,
                        start: prev.dateRange?.start || '',
                      },
                    }))
                  }
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Clear filters */}
            <button
              onClick={() => setFilters({})}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
