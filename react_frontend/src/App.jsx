import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { SendHorizontal, Copy, Check, Moon, Sun } from 'lucide-react';

// Create Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for user's preferred color scheme
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

const CodeBlock = ({ code }) => {
  const [isCopied, setIsCopied] = useState(false);
  const { darkMode } = useContext(ThemeContext);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className={`relative ${darkMode ? 'bg-gray-900' : 'bg-gray-800'} rounded-lg p-4 my-2`}>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
      >
        {isCopied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
      <pre className="text-white overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const MessageContent = ({ text }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3);
          return <CodeBlock key={index} code={code} />;
        }
        return <p key={index} className="whitespace-pre-wrap">{part}</p>;
      })}
    </>
  );
};

const ThemeToggle = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
      aria-label="Toggle theme"
    >
      {darkMode ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { darkMode } = useContext(ThemeContext);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await response.json();
      const botMessage = {
        text: data.output,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-3xl mx-auto p-4 w-full">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md flex-1 flex flex-col`}>
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
            <h1 className="text-xl font-bold">AI Chat Assistant</h1>
            <ThemeToggle />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : darkMode 
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <MessageContent text={message.text} />
                  <span className="text-xs mt-1 block opacity-70">
                    {message.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`rounded-lg p-3 max-w-[70%] ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className={`flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <SendHorizontal className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Wrap the ChatInterface with ThemeProvider
const App = () => {
  return (
    <ThemeProvider>
      <ChatInterface />
    </ThemeProvider>
  );
};

export default App;