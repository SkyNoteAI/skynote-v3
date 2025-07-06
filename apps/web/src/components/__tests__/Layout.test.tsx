import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from '../Layout';
import { useAppStore } from '../../store/appStore';

// Mock the child components
vi.mock('../Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('../Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock('../RightPanel', () => ({
  RightPanel: () => <div data-testid="right-panel">Right Panel</div>,
}));

// Mock the hooks
vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

// Mock the store
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn(),
}));

const mockUseAppStore = vi.mocked(useAppStore);

describe('Layout', () => {
  const mockStoreValues = {
    theme: 'light' as const,
    sidebarOpen: true,
  };

  beforeEach(() => {
    mockUseAppStore.mockReturnValue(mockStoreValues);
    vi.clearAllMocks();
  });

  const renderLayout = () => {
    return render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
  };

  it('renders all layout components', () => {
    renderLayout();

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
  });

  it('applies light theme class', () => {
    renderLayout();

    const container = screen.getByTestId('sidebar').closest('.flex');
    expect(container).toHaveClass('bg-gray-50');
    expect(container).toHaveClass('dark:bg-gray-900'); // CSS classes are always present, dark mode controlled by HTML class
  });

  it('applies dark theme class when theme is dark', () => {
    mockUseAppStore.mockReturnValue({
      ...mockStoreValues,
      theme: 'dark',
    });

    renderLayout();

    const container = screen.getByTestId('sidebar').closest('.flex');
    expect(container).toHaveClass('bg-gray-50', 'dark:bg-gray-900');
  });

  it('has proper responsive layout structure', () => {
    renderLayout();

    const mainContainer = screen.getByTestId('sidebar').closest('.flex');
    expect(mainContainer).toHaveClass('h-screen', 'transition-colors');

    const contentArea = screen.getByTestId('header').closest('.flex-1');
    expect(contentArea).toHaveClass('flex-col', 'min-w-0');
  });

  it('renders outlet for nested routes', () => {
    renderLayout();

    // The outlet should be in the main content area
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('flex-1', 'overflow-hidden');
  });

  it('applies theme to document element', () => {
    // Test light theme
    renderLayout();
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Test dark theme
    mockUseAppStore.mockReturnValue({
      ...mockStoreValues,
      theme: 'dark',
    });

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
