import { Outlet } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { RightPanel } from './RightPanel';
import { useEffect } from 'react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export function Layout() {
  const { theme } = useAppStore();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Main content with right panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main content */}
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>

          {/* Right panel for AI chat */}
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
