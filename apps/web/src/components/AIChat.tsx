import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../lib/api';
import {
  Send,
  Copy,
  Plus,
  RotateCcw,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
  isStreaming?: boolean;
}

interface Source {
  id: string;
  title: string;
  excerpt: string;
  url?: string;
  score?: number;
}

interface AIChatProps {
  className?: string;
  onInsertToNote?: (content: string) => void;
  currentNoteId?: string;
}

interface SuggestedQuestion {
  id: string;
  text: string;
  category: 'general' | 'current_note' | 'recent';
}

const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { id: '1', text: 'What are my most important notes?', category: 'general' },
  { id: '2', text: 'Summarize my recent work', category: 'recent' },
  { id: '3', text: 'Find notes about project planning', category: 'general' },
  {
    id: '4',
    text: 'What are the key takeaways from this note?',
    category: 'current_note',
  },
  {
    id: '5',
    text: 'Show me related notes on this topic',
    category: 'current_note',
  },
];

export function AIChat({
  className = '',
  onInsertToNote,
  currentNoteId,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSources, setShowSources] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Load chat history
  const { data: chatHistory } = useQuery({
    queryKey: ['chat-history'],
    queryFn: async () => {
      const response = await notesApi.getChatHistory();
      return response.messages || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get suggested questions based on current context
  const { data: contextQuestions } = useQuery({
    queryKey: ['suggested-questions', currentNoteId],
    queryFn: async () => {
      if (!currentNoteId) return SUGGESTED_QUESTIONS;

      const response = await notesApi.getSuggestedQuestions({
        noteId: currentNoteId,
      });
      return response.questions || SUGGESTED_QUESTIONS;
    },
    enabled: !!currentNoteId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      noteId,
    }: {
      message: string;
      noteId?: string;
    }) => {
      const response = await notesApi.chatWithAI({
        message,
        noteId,
        chatHistory: messages.slice(-10), // Last 10 messages for context
      });
      return response;
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        sources: data.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsStreaming(false);

      // Invalidate chat history to refresh
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setIsStreaming(false);

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  // Load chat history on mount
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Send message to AI
    sendMessageMutation.mutate({
      message: text.trim(),
      noteId: currentNoteId,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleInsertToNote = (content: string) => {
    onInsertToNote?.(content);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const toggleSources = (messageId: string) => {
    setShowSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const clearChat = () => {
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ['chat-history'] });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const visibleQuestions = contextQuestions || SUGGESTED_QUESTIONS;
  const hasMessages = messages.length > 0;

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            AI Assistant
          </h2>
        </div>

        {hasMessages && (
          <button
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Clear chat"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasMessages && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ask me anything about your notes or get help with your work
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white ml-4'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 mr-4'
              }`}
            >
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap m-0">{message.content}</p>
              </div>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => toggleSources(message.id)}
                    className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>{message.sources.length} sources</span>
                    {showSources[message.id] ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>

                  {showSources[message.id] && (
                    <div className="mt-2 space-y-2">
                      {message.sources.map((source) => (
                        <div
                          key={source.id}
                          className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                {source.title}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {source.excerpt}
                              </p>
                            </div>
                            {source.score && (
                              <span className="text-xs text-gray-500 ml-2">
                                {Math.round(source.score * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message Actions */}
              {message.role === 'assistant' && (
                <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() =>
                      handleCopyMessage(message.id, message.content)
                    }
                    className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>
                      {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                    </span>
                  </button>

                  {onInsertToNote && (
                    <button
                      onClick={() => handleInsertToNote(message.content)}
                      className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Insert</span>
                    </button>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-gray-800 mr-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {!hasMessages && visibleQuestions.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Suggested questions:
          </h4>
          <div className="flex flex-wrap gap-2">
            {visibleQuestions.slice(0, 3).map((question) => (
              <button
                key={question.id}
                onClick={() => handleSuggestedQuestion(question.text)}
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {question.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="relative flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your notes..."
              rows={1}
              className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              style={{ minHeight: '40px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <button
            onClick={() => handleSendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
