import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AIChat } from '../AIChat';
import { notesApi } from '../../lib/api';
import { vi, describe, beforeEach, it, expect } from 'vitest';

// Mock the API
vi.mock('../../lib/api', () => ({
  notesApi: {
    chatWithAI: vi.fn(),
    getChatHistory: vi.fn(),
    getSuggestedQuestions: vi.fn(),
    clearChatHistory: vi.fn(),
  },
}));

const mockNotesApi = notesApi as any;

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock scrollIntoView for JSDOM environment
Element.prototype.scrollIntoView = vi.fn();

// Test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AIChat', () => {
  let user: ReturnType<typeof userEvent.setup>;

  // Helper function to find the send button by its icon
  const getSendButton = () => {
    return screen.getByRole('button', { name: '' }).closest('button');
  };

  // Helper to get input and type a message
  const typeMessage = async (message: string) => {
    const input = screen.getByPlaceholderText(
      'Ask me anything about your notes...'
    );
    await user.type(input, message);
    return input;
  };

  // Helper to send a message
  const sendMessage = async (message: string) => {
    await typeMessage(message);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1]; // Send button is the last one
    await user.click(sendButton);
  };

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();

    // Default mock responses
    mockNotesApi.getChatHistory.mockResolvedValue({ messages: [] });
    mockNotesApi.getSuggestedQuestions.mockResolvedValue({
      questions: [
        {
          id: '1',
          text: 'What are my most important notes?',
          category: 'general',
        },
        { id: '2', text: 'Summarize my recent work', category: 'recent' },
      ],
    });
  });

  it('renders chat interface with header and input', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Ask me anything about your notes...')
    ).toBeInTheDocument();

    // Check for send button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows welcome message when no chat history', () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ask me anything about your notes or get help with your work'
      )
    ).toBeInTheDocument();
  });

  it('displays suggested questions when no messages', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Suggested questions:')).toBeInTheDocument();
      expect(
        screen.getByText('What are my most important notes?')
      ).toBeInTheDocument();
      expect(screen.getByText('Summarize my recent work')).toBeInTheDocument();
    });
  });

  it('sends message when input is submitted', async () => {
    mockNotesApi.chatWithAI.mockResolvedValue({
      response: 'AI response',
      sources: [],
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await sendMessage('Test question');

    expect(mockNotesApi.chatWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test question',
        noteId: undefined,
        chatHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Test question',
          }),
        ]),
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument();
      expect(screen.getByText('AI response')).toBeInTheDocument();
    });
  });

  it('sends message on Enter key press', async () => {
    mockNotesApi.chatWithAI.mockResolvedValue({
      response: 'AI response',
      sources: [],
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    const input = await typeMessage('Test question');
    await user.keyboard('{Enter}');

    expect(mockNotesApi.chatWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test question',
        noteId: undefined,
        chatHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Test question',
          }),
        ]),
      })
    );
  });

  it('does not send message on Shift+Enter', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await typeMessage('Test question');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(mockNotesApi.chatWithAI).not.toHaveBeenCalled();
  });

  it('shows loading state while sending message', async () => {
    // Make the API call hang
    mockNotesApi.chatWithAI.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await sendMessage('Test question');

    await waitFor(() => {
      expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    });
  });

  it('displays sources when available', async () => {
    const mockSources = [
      {
        id: '1',
        title: 'Source Note',
        excerpt: 'This is a source excerpt',
        score: 0.85,
      },
    ];

    mockNotesApi.chatWithAI.mockResolvedValue({
      response: 'AI response with sources',
      sources: mockSources,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await sendMessage('Test question');

    await waitFor(() => {
      expect(screen.getByText('1 sources')).toBeInTheDocument();
    });

    // Click to expand sources
    await user.click(screen.getByText('1 sources'));

    await waitFor(() => {
      expect(screen.getByText('Source Note')).toBeInTheDocument();
      expect(screen.getByText('This is a source excerpt')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  it('shows copy button for assistant messages', async () => {
    mockNotesApi.chatWithAI.mockResolvedValue({
      response: 'AI response to copy',
      sources: [],
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await sendMessage('Test question');

    await waitFor(() => {
      expect(screen.getByText('AI response to copy')).toBeInTheDocument();
    });

    // Check that copy button exists for assistant messages
    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });
  });

  it('calls onInsertToNote when insert button is clicked', async () => {
    const mockOnInsertToNote = vi.fn();

    mockNotesApi.chatWithAI.mockResolvedValue({
      response: 'AI response to insert',
      sources: [],
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat onInsertToNote={mockOnInsertToNote} />
      </Wrapper>
    );

    await sendMessage('Test question');

    await waitFor(() => {
      expect(screen.getByText('AI response to insert')).toBeInTheDocument();
    });

    const insertButton = screen.getByText('Insert');
    await user.click(insertButton);

    expect(mockOnInsertToNote).toHaveBeenCalledWith('AI response to insert');
  });

  it('fills input when suggested question is clicked', async () => {
    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByText('What are my most important notes?')
      ).toBeInTheDocument();
    });

    await user.click(screen.getByText('What are my most important notes?'));

    const input = screen.getByPlaceholderText(
      'Ask me anything about your notes...'
    );
    expect(input).toHaveValue('What are my most important notes?');
  });

  it('shows clear chat button when messages exist', async () => {
    const mockChatHistory = [
      {
        id: '1',
        role: 'user',
        content: 'Previous question',
        timestamp: '2024-01-01T00:00:00Z',
      },
    ];

    mockNotesApi.getChatHistory.mockResolvedValue({
      messages: mockChatHistory,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Previous question')).toBeInTheDocument();
      expect(screen.getByTitle('Clear chat')).toBeInTheDocument();
    });
  });

  it('loads and displays chat history', async () => {
    const mockChatHistory = [
      {
        id: '1',
        role: 'user',
        content: 'Previous question',
        timestamp: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Previous answer',
        timestamp: '2024-01-01T00:01:00Z',
        sources: [],
      },
    ];

    mockNotesApi.getChatHistory.mockResolvedValue({
      messages: mockChatHistory,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Previous question')).toBeInTheDocument();
      expect(screen.getByText('Previous answer')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockNotesApi.chatWithAI.mockRejectedValue(new Error('API Error'));

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat />
      </Wrapper>
    );

    await sendMessage('Test question');

    await waitFor(() => {
      expect(
        screen.getByText('Sorry, I encountered an error. Please try again.')
      ).toBeInTheDocument();
    });
  });

  it('includes currentNoteId in chat requests when provided', async () => {
    mockNotesApi.chatWithAI.mockResolvedValue({
      response: 'AI response',
      sources: [],
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat currentNoteId="note-123" />
      </Wrapper>
    );

    await sendMessage('Test question');

    expect(mockNotesApi.chatWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test question',
        noteId: 'note-123',
        chatHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Test question',
          }),
        ]),
      })
    );
  });

  it('fetches context-specific questions when currentNoteId is provided', async () => {
    const mockContextQuestions = [
      { id: '1', text: 'What is this note about?', category: 'current_note' },
      { id: '2', text: 'Summarize this note', category: 'current_note' },
    ];

    mockNotesApi.getSuggestedQuestions.mockResolvedValue({
      questions: mockContextQuestions,
    });

    const Wrapper = createTestWrapper();

    render(
      <Wrapper>
        <AIChat currentNoteId="note-123" />
      </Wrapper>
    );

    expect(mockNotesApi.getSuggestedQuestions).toHaveBeenCalledWith({
      noteId: 'note-123',
    });

    await waitFor(() => {
      expect(screen.getByText('What is this note about?')).toBeInTheDocument();
      expect(screen.getByText('Summarize this note')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const Wrapper = createTestWrapper();

    const { container } = render(
      <Wrapper>
        <AIChat className="custom-class" />
      </Wrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
