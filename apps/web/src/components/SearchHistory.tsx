import { useState, useEffect } from 'react';
import { Clock, X, Trash2, TrendingUp, Search, Star } from 'lucide-react';

interface SearchHistoryItem {
  id: string;
  query: string;
  mode: 'keyword' | 'semantic';
  timestamp: string;
  resultCount?: number;
  isPinned?: boolean;
}

interface SearchHistoryProps {
  onQuerySelect?: (query: string, mode: 'keyword' | 'semantic') => void;
  onClearHistory?: () => void;
  className?: string;
  maxItems?: number;
  showResultCounts?: boolean;
}

const STORAGE_KEY = 'search-history';
const MAX_HISTORY_ITEMS = 50;

export function SearchHistory({
  onQuerySelect,
  onClearHistory,
  className = '',
  maxItems = 10,
  showResultCounts = true,
}: SearchHistoryProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
      setHistory([]);
    }
  };

  const saveHistory = (newHistory: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  // Note: addToHistory functionality is available in the useSearchHistory hook

  // Remove item from history
  const removeFromHistory = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    saveHistory(newHistory);
  };

  // Toggle pin status
  const togglePin = (id: string) => {
    const newHistory = history.map((item) =>
      item.id === id ? { ...item, isPinned: !item.isPinned } : item
    );
    saveHistory(newHistory);
  };

  // Clear all history
  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    onClearHistory?.();
  };

  // Get popular searches (most frequent)
  const getPopularSearches = () => {
    const queryCount = new Map<string, number>();
    history.forEach((item) => {
      const key = `${item.query}:${item.mode}`;
      queryCount.set(key, (queryCount.get(key) || 0) + 1);
    });

    return Array.from(queryCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key]) => {
        const [query, mode] = key.split(':');
        return history.find(
          (item) => item.query === query && item.mode === mode
        );
      })
      .filter(Boolean) as SearchHistoryItem[];
  };

  // Sort history: pinned first, then by timestamp
  const sortedHistory = [...history].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const displayedHistory = showAll
    ? sortedHistory
    : sortedHistory.slice(0, maxItems);
  const popularSearches = getPopularSearches();

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return `${Math.floor(diffInDays / 30)}mo ago`;
  };

  const handleQueryClick = (item: SearchHistoryItem) => {
    onQuerySelect?.(item.query, item.mode);
  };

  // Hook to expose methods for parent components (unused in this component)
  // React.useImperativeHandle could be used here if needed

  if (history.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <Clock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No search history yet
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Your recent searches will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Popular Searches */}
      {popularSearches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Popular Searches
            </h3>
          </div>
          <div className="space-y-1">
            {popularSearches.map((item) => (
              <button
                key={`popular-${item.id}`}
                onClick={() => handleQueryClick(item)}
                className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {item.query}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        item.mode === 'semantic'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {item.mode}
                    </span>
                  </div>
                  {showResultCounts && item.resultCount !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.resultCount} results
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Recent Searches
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              ({history.length})
            </span>
          </h3>

          {history.length > 0 && (
            <button
              onClick={clearAllHistory}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        <div className="space-y-1">
          {displayedHistory.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <button
                onClick={() => handleQueryClick(item)}
                className="flex items-center space-x-2 flex-1 min-w-0 text-left"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {item.isPinned ? (
                    <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                  ) : (
                    <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {item.query}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      item.mode === 'semantic'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {item.mode}
                  </span>
                </div>
              </button>

              <div className="flex items-center space-x-2">
                {showResultCounts && item.resultCount !== undefined && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.resultCount}
                  </span>
                )}

                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(item.timestamp)}
                </span>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => togglePin(item.id)}
                    className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                      item.isPinned
                        ? 'text-yellow-500'
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    title={item.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Star
                      className="w-3 h-3"
                      fill={item.isPinned ? 'currentColor' : 'none'}
                    />
                  </button>

                  <button
                    onClick={() => removeFromHistory(item.id)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show more/less button */}
        {history.length > maxItems && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {showAll ? 'Show less' : `Show ${history.length - maxItems} more`}
          </button>
        )}
      </div>
    </div>
  );
}

// Hook for managing search history
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  const addToHistory = (
    query: string,
    mode: 'keyword' | 'semantic',
    resultCount?: number
  ) => {
    if (!query.trim()) return;

    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query: query.trim(),
      mode,
      timestamp: new Date().toISOString(),
      resultCount,
    };

    const filteredHistory = history.filter(
      (item) => item.query !== newItem.query || item.mode !== newItem.mode
    );

    const newHistory = [newItem, ...filteredHistory].slice(
      0,
      MAX_HISTORY_ITEMS
    );

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    history,
    addToHistory,
    clearHistory,
  };
}
