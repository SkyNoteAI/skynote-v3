import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { toggleSidebar, setSearchQuery } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, altKey, key } = event;
      const isModifierPressed = ctrlKey || metaKey;

      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow some shortcuts even in input fields
        if (key === 'Escape') {
          (target as HTMLInputElement).blur();
          return;
        }
        if (
          !(isModifierPressed && (key === 'k' || key === 'n' || key === 's'))
        ) {
          return;
        }
      }

      // Global shortcuts
      switch (true) {
        // Cmd/Ctrl + K: Focus search
        case isModifierPressed && key === 'k':
          event.preventDefault();
          const searchInput = document.querySelector(
            'input[placeholder*="Search"]'
          ) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          break;

        // Cmd/Ctrl + N: New note
        case isModifierPressed && key === 'n':
          event.preventDefault();
          // This will be implemented when we have the create note functionality
          console.log('Create new note shortcut');
          break;

        // Cmd/Ctrl + S: Save note
        case isModifierPressed && key === 's':
          event.preventDefault();
          // This will be implemented when we have the save note functionality
          console.log('Save note shortcut');
          break;

        // Cmd/Ctrl + B: Toggle sidebar
        case isModifierPressed && key === 'b':
          event.preventDefault();
          toggleSidebar();
          break;

        // Cmd/Ctrl + ,: Settings
        case isModifierPressed && key === ',':
          event.preventDefault();
          navigate('/settings');
          break;

        // Cmd/Ctrl + /: Show keyboard shortcuts help
        case isModifierPressed && key === '/':
          event.preventDefault();
          // This will show a help modal with keyboard shortcuts
          console.log('Show keyboard shortcuts help');
          break;

        // Alt + 1-9: Navigate to specific notes (future implementation)
        case altKey && /^[1-9]$/.test(key):
          event.preventDefault();
          console.log(`Navigate to note ${key}`);
          break;

        // Escape: Close modals, clear search, etc.
        case key === 'Escape':
          event.preventDefault();
          // Clear search if there's a search query
          const currentQuery = useAppStore.getState().searchQuery;
          if (currentQuery) {
            setSearchQuery('');
          }
          // Close any open modals or dropdowns
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement) {
            activeElement.blur();
          }
          break;

        // Arrow keys for navigation (future implementation)
        case key === 'ArrowUp' && isModifierPressed:
          event.preventDefault();
          console.log('Navigate to previous note');
          break;

        case key === 'ArrowDown' && isModifierPressed:
          event.preventDefault();
          console.log('Navigate to next note');
          break;

        // F1: Show help
        case key === 'F1':
          event.preventDefault();
          console.log('Show help');
          break;

        default:
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, toggleSidebar, setSearchQuery]);
}

// Helper function to get keyboard shortcut display text
export function getShortcutText(key: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? '⌘' : 'Ctrl';

  const shortcuts: Record<string, string> = {
    search: `${modifier}+K`,
    newNote: `${modifier}+N`,
    save: `${modifier}+S`,
    toggleSidebar: `${modifier}+B`,
    settings: `${modifier}+,`,
    help: `${modifier}+/`,
    escape: 'Esc',
    prevNote: `${modifier}+↑`,
    nextNote: `${modifier}+↓`,
  };

  return shortcuts[key] || '';
}
