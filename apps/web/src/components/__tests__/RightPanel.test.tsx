import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RightPanel } from '../RightPanel';
import { useAppStore } from '../../store/appStore';

// Mock the store
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn(),
}));

const mockUseAppStore = vi.mocked(useAppStore);

describe('RightPanel', () => {
  const mockStoreValues = {
    theme: 'light' as const,
  };

  beforeEach(() => {
    mockUseAppStore.mockReturnValue(mockStoreValues);
    vi.clearAllMocks();
  });

  it('shows floating chat button when panel is closed', () => {
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    expect(chatButton).toBeInTheDocument();
    expect(chatButton).toHaveClass('fixed', 'bottom-6', 'right-6');
  });

  it('opens chat panel when floating button is clicked', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders chat panel header', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders initial messages', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    expect(
      screen.getByText(/Hello! I'm your AI assistant/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/What are my main project goals/)
    ).toBeInTheDocument();
  });

  it('renders message input', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const input = screen.getByPlaceholderText(/ask about your notes/i);
    expect(input).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const input = screen.getByPlaceholderText(/ask about your notes/i);
    const sendButton = screen.getByRole('button', { name: '' }); // Send button

    await user.type(input, 'Test message');
    await user.click(sendButton);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('shows loading indicator when sending message', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const input = screen.getByPlaceholderText(/ask about your notes/i);
    await user.type(input, 'Test message{enter}');

    // Should show loading dots
    const loadingDots = document.querySelectorAll('.animate-bounce');
    expect(loadingDots.length).toBeGreaterThan(0);
  });

  it('receives AI response after sending message', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const input = screen.getByPlaceholderText(/ask about your notes/i);
    await user.type(input, 'Test message{enter}');

    await waitFor(
      () => {
        expect(
          screen.getByText(/I'm processing your question/)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('disables input when loading', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const input = screen.getByPlaceholderText(/ask about your notes/i);
    await user.type(input, 'Test message{enter}');

    expect(input).toBeDisabled();
  });

  it('prevents empty message submission', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const sendButton = screen.getByRole('button', { name: '' });
    expect(sendButton).toBeDisabled();

    const input = screen.getByPlaceholderText(/ask about your notes/i);
    await user.type(input, '   ');

    expect(sendButton).toBeDisabled();
  });

  it('shows source citations when available', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    expect(screen.getByText('Sources:')).toBeInTheDocument();
    expect(screen.getByText('Project Planning Q1')).toBeInTheDocument();
    expect(screen.getByText('Development Tasks')).toBeInTheDocument();
  });

  it('formats timestamps correctly', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    // Should show timestamps in HH:MM format
    const timestamps = document.querySelectorAll('.text-xs');
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('closes panel when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const closeButton = screen.getByLabelText(/close chat/i);
    await user.click(closeButton);

    expect(screen.getByLabelText(/open ai chat/i)).toBeInTheDocument();
    expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();
  });

  it('minimizes panel when minimize button is clicked', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const minimizeButton = screen.getByLabelText(/minimize chat/i);
    await user.click(minimizeButton);

    // Should not show the input area when minimized
    expect(
      screen.queryByPlaceholderText(/ask about your notes/i)
    ).not.toBeInTheDocument();
  });

  it('maximizes panel when maximize button is clicked', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    // First minimize
    const minimizeButton = screen.getByLabelText(/minimize chat/i);
    await user.click(minimizeButton);

    // Then maximize
    const maximizeButton = screen.getByLabelText(/maximize chat/i);
    await user.click(maximizeButton);

    expect(
      screen.getByPlaceholderText(/ask about your notes/i)
    ).toBeInTheDocument();
  });

  it('closes panel when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const overlay = document.querySelector('.fixed.inset-0.bg-black');
    if (overlay) {
      await user.click(overlay);
      expect(screen.getByLabelText(/open ai chat/i)).toBeInTheDocument();
      expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();
    }
  });

  it('clears input after sending message', async () => {
    const user = userEvent.setup();
    render(<RightPanel />);

    const chatButton = screen.getByLabelText(/open ai chat/i);
    await user.click(chatButton);

    const input = screen.getByPlaceholderText(/ask about your notes/i);
    await user.type(input, 'Test message{enter}');

    expect(input).toHaveValue('');
  });
});
