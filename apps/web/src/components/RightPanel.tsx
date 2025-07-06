import { useState } from 'react';
import {
  MessageCircleIcon,
  XIcon,
  SendIcon,
  BotIcon,
  UserIcon,
  MinimizeIcon,
  MaximizeIcon,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    excerpt: string;
    noteId: string;
  }>;
}

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      "Hello! I'm your AI assistant. I can help you search through your notes, answer questions, and provide insights based on your knowledge base. What would you like to know?",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: '2',
    role: 'user',
    content: 'What are my main project goals for this quarter?',
    timestamp: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: '3',
    role: 'assistant',
    content:
      "Based on your notes, your main project goals for this quarter include:\n\n1. **Complete the SkyNote AI application** - You're working on implementing the layout and navigation system\n2. **Improve user experience** - Focus on responsive design and accessibility\n3. **Implement AI-powered features** - Including semantic search and chat functionality\n\nWould you like me to provide more details about any of these goals?",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    sources: [
      {
        title: 'Project Planning Q1',
        excerpt:
          'Complete the SkyNote AI application with focus on user experience...',
        noteId: 'project-planning-q1',
      },
      {
        title: 'Development Tasks',
        excerpt: 'Layout and navigation system implementation...',
        noteId: 'development-tasks',
      },
    ],
  },
];

export function RightPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm processing your question. In a real implementation, this would connect to the AI chat API to provide relevant insights from your notes.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
        aria-label="Open AI Chat"
      >
        <MessageCircleIcon className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Chat panel */}
      <div
        className={`
        fixed lg:static bottom-0 right-0 z-50 lg:z-0
        w-80 lg:w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700
        shadow-xl lg:shadow-none
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        ${isMinimized ? 'h-16' : 'h-full lg:h-auto'}
        lg:h-full
      `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <BotIcon className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                AI Assistant
              </h3>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 lg:hidden"
                aria-label={isMinimized ? 'Maximize chat' : 'Minimize chat'}
              >
                {isMinimized ? (
                  <MaximizeIcon className="w-4 h-4" />
                ) : (
                  <MinimizeIcon className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 lg:hidden"
                aria-label="Close chat"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                      max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      }
                    `}
                    >
                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 rounded-full bg-opacity-20 flex items-center justify-center flex-shrink-0">
                          {message.role === 'user' ? (
                            <UserIcon className="w-4 h-4" />
                          ) : (
                            <BotIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              message.role === 'user'
                                ? 'text-blue-100'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {formatTimestamp(message.timestamp)}
                          </div>
                        </div>
                      </div>

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Sources:
                          </div>
                          {message.sources.map((source, index) => (
                            <div
                              key={index}
                              className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded mb-1 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                            >
                              <div className="font-medium text-gray-900 dark:text-white">
                                {source.title}
                              </div>
                              <div className="text-gray-600 dark:text-gray-300 truncate">
                                {source.excerpt}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex items-center space-x-2">
                      <BotIcon className="w-4 h-4 text-gray-500" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about your notes..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    <SendIcon className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
