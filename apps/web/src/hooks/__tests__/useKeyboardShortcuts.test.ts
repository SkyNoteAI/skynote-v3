import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, getShortcutText } from '../useKeyboardShortcuts';
import { useAppStore } from '../../store/appStore';

// Mock the stores and router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn(),
}));

const mockUseAppStore = vi.mocked(useAppStore);

describe('useKeyboardShortcuts', () => {
  const mockStoreValues = {
    toggleSidebar: vi.fn(),
    setSearchQuery: vi.fn(),
  };

  beforeEach(() => {
    mockUseAppStore.mockReturnValue(mockStoreValues);
    vi.clearAllMocks();
  });

  const createKeyboardEvent = (
    key: string,
    options: Partial<KeyboardEvent> = {}
  ) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      ...options,
    });
    return event;
  };

  const simulateKeyPress = (
    key: string,
    options: Partial<KeyboardEvent> = {}
  ) => {
    const event = createKeyboardEvent(key, options);
    document.dispatchEvent(event);
    return event;
  };

  it('sets up keyboard event listener', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    renderHook(() => useKeyboardShortcuts());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useKeyboardShortcuts());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });

  it('handles Cmd/Ctrl + K for search focus', () => {
    // Create a mock search input
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Search notes...';
    searchInput.focus = vi.fn();
    searchInput.select = vi.fn();
    document.body.appendChild(searchInput);

    renderHook(() => useKeyboardShortcuts());

    const event = simulateKeyPress('k', { ctrlKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(searchInput.focus).toHaveBeenCalled();
    expect(searchInput.select).toHaveBeenCalled();

    document.body.removeChild(searchInput);
  });

  it('handles Cmd/Ctrl + N for new note', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useKeyboardShortcuts());

    const event = simulateKeyPress('n', { ctrlKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('Create new note shortcut');

    consoleSpy.mockRestore();
  });

  it('handles Cmd/Ctrl + S for save', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useKeyboardShortcuts());

    const event = simulateKeyPress('s', { ctrlKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('Save note shortcut');

    consoleSpy.mockRestore();
  });

  it('handles Cmd/Ctrl + B for sidebar toggle', () => {
    renderHook(() => useKeyboardShortcuts());

    const event = simulateKeyPress('b', { ctrlKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(mockStoreValues.toggleSidebar).toHaveBeenCalled();
  });

  it('handles Escape key', () => {
    mockUseAppStore.mockReturnValue({
      ...mockStoreValues,
      getState: () => ({ searchQuery: 'test query' }),
    });

    renderHook(() => useKeyboardShortcuts());

    const event = simulateKeyPress('Escape');

    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores shortcuts when typing in input fields', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts());

    // Mock the event target
    const event = createKeyboardEvent('b', { ctrlKey: true });
    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    // Should not toggle sidebar when typing in input
    expect(mockStoreValues.toggleSidebar).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('allows some shortcuts even in input fields', () => {
    const input = document.createElement('input');
    input.blur = vi.fn();
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts());

    // Mock the event target for Escape
    const event = createKeyboardEvent('Escape');
    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    expect(input.blur).toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('handles Alt + number keys', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useKeyboardShortcuts());

    const event = simulateKeyPress('1', { altKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('Navigate to note 1');

    consoleSpy.mockRestore();
  });

  it('handles F1 for help', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useKeyboardShortcuts());

    const event = simulateKeyPress('F1');

    expect(event.defaultPrevented).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('Show help');

    consoleSpy.mockRestore();
  });

  it('works with metaKey (Mac) in addition to ctrlKey', () => {
    renderHook(() => useKeyboardShortcuts());

    const event = simulateKeyPress('b', { metaKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(mockStoreValues.toggleSidebar).toHaveBeenCalled();
  });
});

describe('getShortcutText', () => {
  beforeEach(() => {
    // Reset navigator.platform
    Object.defineProperty(navigator, 'platform', {
      writable: true,
      value: 'Linux',
    });
  });

  it('returns Ctrl shortcuts for non-Mac platforms', () => {
    expect(getShortcutText('search')).toBe('Ctrl+K');
    expect(getShortcutText('newNote')).toBe('Ctrl+N');
    expect(getShortcutText('save')).toBe('Ctrl+S');
  });

  it('returns Cmd shortcuts for Mac platforms', () => {
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
    });

    expect(getShortcutText('search')).toBe('⌘+K');
    expect(getShortcutText('newNote')).toBe('⌘+N');
    expect(getShortcutText('save')).toBe('⌘+S');
  });

  it('returns empty string for unknown shortcuts', () => {
    expect(getShortcutText('unknown')).toBe('');
  });

  it('returns correct text for all defined shortcuts', () => {
    const shortcuts = [
      'search',
      'newNote',
      'save',
      'toggleSidebar',
      'settings',
      'help',
      'escape',
      'prevNote',
      'nextNote',
    ];

    shortcuts.forEach((shortcut) => {
      expect(getShortcutText(shortcut)).toBeTruthy();
    });
  });
});
