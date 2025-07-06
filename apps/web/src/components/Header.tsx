import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import {
  SearchIcon,
  MenuIcon,
  SettingsIcon,
  UserIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
} from 'lucide-react';

export function Header() {
  const navigate = useNavigate();
  const { theme, setTheme, toggleSidebar, searchQuery, setSearchQuery } =
    useAppStore();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu toggle and search */}
        <div className="flex items-center space-x-4 flex-1 max-w-2xl">
          {/* Mobile menu toggle */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:block p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search notes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </form>
        </div>

        {/* Right side - Actions and user menu */}
        <div className="flex items-center space-x-2">
          {/* Theme toggle */}
          <button
            onClick={handleThemeToggle}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <MoonIcon className="w-5 h-5" />
            ) : (
              <SunIcon className="w-5 h-5" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="User menu"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <UserIcon className="w-4 h-4 text-white" />
                )}
              </div>
              {user?.name && (
                <span className="hidden sm:block text-sm font-medium truncate max-w-32">
                  {user.name}
                </span>
              )}
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <div className="font-medium">{user?.name || 'User'}</div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}
