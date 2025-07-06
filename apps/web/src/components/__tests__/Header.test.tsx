import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../Header';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';

// Mock the stores
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseAppStore = vi.mocked(useAppStore);
const mockUseAuthStore = vi.mocked(useAuthStore);

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Header', () => {
  const mockAppStoreValues = {
    theme: 'light' as const,
    setTheme: vi.fn(),
    sidebarOpen: true,
    toggleSidebar: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
  };

  const mockAuthStoreValues = {
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    logout: vi.fn(),
  };

  beforeEach(() => {
    mockUseAppStore.mockReturnValue(mockAppStoreValues);
    mockUseAuthStore.mockReturnValue(mockAuthStoreValues);
    vi.clearAllMocks();
  });

  const renderHeader = () => {
    return render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
  };

  it('renders search input', () => {
    renderHeader();

    const searchInput = screen.getByPlaceholderText('Search notes...');
    expect(searchInput).toBeInTheDocument();
  });

  it('handles search input changes', async () => {
    const user = userEvent.setup();
    renderHeader();

    const searchInput = screen.getByPlaceholderText('Search notes...');
    await user.type(searchInput, 'test query');

    // Should be called for each character typed
    expect(mockAppStoreValues.setSearchQuery).toHaveBeenCalledTimes(10);
    expect(mockAppStoreValues.setSearchQuery).toHaveBeenLastCalledWith('y');
  });

  it('handles search form submission', async () => {
    mockUseAppStore.mockReturnValue({
      ...mockAppStoreValues,
      searchQuery: 'test query',
    });

    const user = userEvent.setup();
    renderHeader();

    const searchInput = screen.getByPlaceholderText('Search notes...');
    await user.type(searchInput, '{enter}');

    expect(mockNavigate).toHaveBeenCalledWith('/search?q=test%20query');
  });

  it('does not navigate on empty search', async () => {
    const user = userEvent.setup();
    renderHeader();

    const searchInput = screen.getByPlaceholderText('Search notes...');
    await user.type(searchInput, '{enter}');

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders menu toggle button', () => {
    renderHeader();

    const menuButtons = screen.getAllByLabelText(/toggle sidebar/i);
    expect(menuButtons.length).toBeGreaterThan(0);
  });

  it('handles sidebar toggle', async () => {
    const user = userEvent.setup();
    renderHeader();

    const menuButton = screen.getAllByLabelText(/toggle sidebar/i)[0];
    await user.click(menuButton);

    expect(mockAppStoreValues.toggleSidebar).toHaveBeenCalled();
  });

  it('renders theme toggle button', () => {
    renderHeader();

    const themeButton = screen.getByLabelText(/toggle theme/i);
    expect(themeButton).toBeInTheDocument();
  });

  it('handles theme toggle from light to dark', async () => {
    const user = userEvent.setup();
    renderHeader();

    const themeButton = screen.getByLabelText(/toggle theme/i);
    await user.click(themeButton);

    expect(mockAppStoreValues.setTheme).toHaveBeenCalledWith('dark');
  });

  it('handles theme toggle from dark to light', async () => {
    mockUseAppStore.mockReturnValue({
      ...mockAppStoreValues,
      theme: 'dark',
    });

    const user = userEvent.setup();
    renderHeader();

    const themeButton = screen.getByLabelText(/toggle theme/i);
    await user.click(themeButton);

    expect(mockAppStoreValues.setTheme).toHaveBeenCalledWith('light');
  });

  it('renders settings button', () => {
    renderHeader();

    const settingsButton = screen.getByLabelText(/settings/i);
    expect(settingsButton).toBeInTheDocument();
  });

  it('navigates to settings when settings button is clicked', async () => {
    const user = userEvent.setup();
    renderHeader();

    const settingsButton = screen.getByLabelText(/settings/i);
    await user.click(settingsButton);

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('renders user menu', () => {
    renderHeader();

    const userButton = screen.getByLabelText(/user menu/i);
    expect(userButton).toBeInTheDocument();
  });

  it('displays user name', () => {
    renderHeader();

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('shows user dropdown when user menu is clicked', async () => {
    const user = userEvent.setup();
    renderHeader();

    const userButton = screen.getByLabelText(/user menu/i);
    await user.click(userButton);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('navigates to settings from user dropdown', async () => {
    const user = userEvent.setup();
    renderHeader();

    const userButton = screen.getByLabelText(/user menu/i);
    await user.click(userButton);

    const settingsLink = screen.getAllByText('Settings')[0];
    await user.click(settingsLink);

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('handles logout from user dropdown', async () => {
    const user = userEvent.setup();
    renderHeader();

    const userButton = screen.getByLabelText(/user menu/i);
    await user.click(userButton);

    const signOutButton = screen.getByText('Sign out');
    await user.click(signOutButton);

    expect(mockAuthStoreValues.logout).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('handles logout error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuthStore.mockReturnValue({
      ...mockAuthStoreValues,
      logout: vi.fn().mockRejectedValue(new Error('Logout failed')),
    });

    const user = userEvent.setup();
    renderHeader();

    const userButton = screen.getByLabelText(/user menu/i);
    await user.click(userButton);

    const signOutButton = screen.getByText('Sign out');
    await user.click(signOutButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Logout failed:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('closes user menu when clicking outside', async () => {
    const user = userEvent.setup();
    renderHeader();

    const userButton = screen.getByLabelText(/user menu/i);
    await user.click(userButton);

    expect(screen.getByText('Sign out')).toBeInTheDocument();

    // Click on the overlay div that's created to handle outside clicks
    const overlay = document.querySelector('.fixed.inset-0.z-40');
    if (overlay) {
      await user.click(overlay);
    }

    await waitFor(
      () => {
        expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('displays user avatar when available', () => {
    mockUseAuthStore.mockReturnValue({
      ...mockAuthStoreValues,
      user: {
        ...mockAuthStoreValues.user!,
        avatar_url: 'https://example.com/avatar.jpg',
      },
    });

    renderHeader();

    const avatar = screen.getByAltText('Test User');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('displays default user icon when no avatar', () => {
    renderHeader();

    const userButton = screen.getByLabelText(/user menu/i);
    expect(userButton.querySelector('svg')).toBeInTheDocument();
  });
});
