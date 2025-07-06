import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  currentNoteId: string | null;
  searchQuery: string;
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentNoteId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  sidebarOpen: true,
  currentNoteId: null,
  searchQuery: '',
  
  setTheme: (theme) => {
    set({ theme });
    // Update document class for theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
  
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },
  
  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },
  
  setCurrentNoteId: (id) => {
    set({ currentNoteId: id });
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
}));