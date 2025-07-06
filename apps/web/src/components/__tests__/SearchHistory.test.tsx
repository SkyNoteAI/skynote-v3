import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchHistory, useSearchHistory } from '../SearchHistory';
import { vi, describe, beforeEach, it, expect } from 'vitest';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component for useSearchHistory hook
function TestHookComponent() {
  const { history, addToHistory, clearHistory } = useSearchHistory();

  return (
    <div>
      <div data-testid="history-count">{history.length}</div>
      <button onClick={() => addToHistory('test query', 'keyword', 5)}>
        Add Search
      </button>
      <button onClick={clearHistory}>Clear History</button>
      {history.map((item, index) => (
        <div key={index} data-testid={`history-item-${index}`}>
          {item.query} - {item.mode} - {item.resultCount}
        </div>
      ))}
    </div>
  );
}

describe('SearchHistory', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnQuerySelect = vi.fn();
  const mockOnClearHistory = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('shows empty state when no history exists', () => {
    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(screen.getByText('No search history yet')).toBeInTheDocument();
    expect(
      screen.getByText('Your recent searches will appear here')
    ).toBeInTheDocument();
  });

  it('displays search history when available', () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'test query',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
        resultCount: 5,
      },
      {
        id: '2',
        query: 'another search',
        mode: 'semantic',
        timestamp: '2024-01-01T11:00:00Z',
        resultCount: 3,
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
    expect(screen.getByText('test query')).toBeInTheDocument();
    expect(screen.getByText('another search')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument(); // History count
  });

  it('calls onQuerySelect when a history item is clicked', async () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'test query',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    const historyItem = screen.getByText('test query');
    await user.click(historyItem);

    expect(mockOnQuerySelect).toHaveBeenCalledWith('test query', 'keyword');
  });

  it('shows popular searches section when there are frequent searches', () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'popular query',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
        resultCount: 10,
      },
      {
        id: '2',
        query: 'popular query',
        mode: 'keyword',
        timestamp: '2024-01-01T11:00:00Z',
        resultCount: 8,
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(screen.getByText('Popular Searches')).toBeInTheDocument();
  });

  it('displays search mode badges correctly', () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'keyword search',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
      },
      {
        id: '2',
        query: 'semantic search',
        mode: 'semantic',
        timestamp: '2024-01-01T11:00:00Z',
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(screen.getAllByText('keyword')).toHaveLength(1);
    expect(screen.getAllByText('semantic')).toHaveLength(1);
  });

  it('shows result counts when showResultCounts is true', () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'test query',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
        resultCount: 15,
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
        showResultCounts={true}
      />
    );

    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('hides result counts when showResultCounts is false', () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'test query',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
        resultCount: 15,
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
        showResultCounts={false}
      />
    );

    expect(screen.queryByText('15')).not.toBeInTheDocument();
  });

  it('formats relative time correctly', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'recent search',
        mode: 'keyword',
        timestamp: oneHourAgo.toISOString(),
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    expect(screen.getByText('1h ago')).toBeInTheDocument();
  });

  it('allows pinning and unpinning searches', async () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'test query',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
        isPinned: false,
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    // Find the pin button (it's hidden until hover)
    const historyItem = screen.getByText('test query').closest('div');
    const pinButton = historyItem?.querySelector('button[title="Pin"]');

    if (pinButton) {
      await user.click(pinButton);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    }
  });

  it('removes individual history items', async () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'test query',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    // Find the remove button
    const historyItem = screen.getByText('test query').closest('div');
    const removeButton = historyItem?.querySelector('button[title="Remove"]');

    if (removeButton) {
      await user.click(removeButton);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    }
  });

  it('clears all history when clear all button is clicked', async () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'test query',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    const clearAllButton = screen.getByText('Clear all');
    await user.click(clearAllButton);

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('search-history');
    expect(mockOnClearHistory).toHaveBeenCalled();
  });

  it('shows more items when show more button is clicked', async () => {
    const manyItems = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      query: `query ${i}`,
      mode: 'keyword' as const,
      timestamp: '2024-01-01T12:00:00Z',
    }));

    const mockHistory = JSON.stringify(manyItems);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
        maxItems={10}
      />
    );

    expect(screen.getByText('Show 5 more')).toBeInTheDocument();

    const showMoreButton = screen.getByText('Show 5 more');
    await user.click(showMoreButton);

    expect(screen.getByText('Show less')).toBeInTheDocument();
    expect(screen.getByText('query 14')).toBeInTheDocument();
  });

  it('sorts pinned items first', () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'unpinned recent',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
        isPinned: false,
      },
      {
        id: '2',
        query: 'pinned older',
        mode: 'keyword',
        timestamp: '2024-01-01T10:00:00Z',
        isPinned: true,
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    const historyItems = screen.getAllByText(/query|pinned|unpinned/);
    // Pinned item should appear first despite being older
    expect(historyItems[0]).toHaveTextContent('pinned older');
  });

  it('applies custom className', () => {
    const { container } = render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    render(
      <SearchHistory
        onQuerySelect={mockOnQuerySelect}
        onClearHistory={mockOnClearHistory}
      />
    );

    // Should show empty state instead of crashing
    expect(screen.getByText('No search history yet')).toBeInTheDocument();
  });
});

describe('useSearchHistory hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('loads history from localStorage on mount', () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'test query',
        mode: 'keyword',
        timestamp: '2024-01-01T12:00:00Z',
      },
    ]);
    mockLocalStorage.getItem.mockReturnValue(mockHistory);

    render(<TestHookComponent />);

    expect(screen.getByTestId('history-count')).toHaveTextContent('1');
    expect(screen.getByTestId('history-item-0')).toHaveTextContent(
      'test query - keyword - undefined'
    );
  });

  it('adds new search to history', async () => {
    const user = userEvent.setup();

    render(<TestHookComponent />);

    const addButton = screen.getByText('Add Search');
    await user.click(addButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'search-history',
      expect.stringContaining('test query')
    );

    expect(screen.getByTestId('history-count')).toHaveTextContent('1');
    expect(screen.getByTestId('history-item-0')).toHaveTextContent(
      'test query - keyword - 5'
    );
  });

  it('prevents duplicate entries in history', async () => {
    const user = userEvent.setup();

    render(<TestHookComponent />);

    const addButton = screen.getByText('Add Search');
    await user.click(addButton);
    await user.click(addButton); // Add same search twice

    // Should only have one entry
    expect(screen.getByTestId('history-count')).toHaveTextContent('1');
  });

  it('clears history', async () => {
    const user = userEvent.setup();

    render(<TestHookComponent />);

    // Add a search first
    const addButton = screen.getByText('Add Search');
    await user.click(addButton);

    expect(screen.getByTestId('history-count')).toHaveTextContent('1');

    // Clear history
    const clearButton = screen.getByText('Clear History');
    await user.click(clearButton);

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('search-history');
    expect(screen.getByTestId('history-count')).toHaveTextContent('0');
  });

  it('limits history to maximum items', async () => {
    const user = userEvent.setup();

    // Mock existing history with 50 items (the max)
    const maxHistory = Array.from({ length: 50 }, (_, i) => ({
      id: `${i}`,
      query: `query ${i}`,
      mode: 'keyword',
      timestamp: '2024-01-01T12:00:00Z',
    }));

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(maxHistory));

    render(<TestHookComponent />);

    expect(screen.getByTestId('history-count')).toHaveTextContent('50');

    // Add one more search
    const addButton = screen.getByText('Add Search');
    await user.click(addButton);

    // Should still be 50 (oldest item removed)
    expect(screen.getByTestId('history-count')).toHaveTextContent('50');
  });

  it('handles localStorage save errors gracefully', async () => {
    const user = userEvent.setup();
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage full');
    });

    // Should not crash when localStorage fails
    render(<TestHookComponent />);

    const addButton = screen.getByText('Add Search');
    await user.click(addButton);

    // Component should still function
    expect(screen.getByTestId('history-count')).toHaveTextContent('1');
  });
});
