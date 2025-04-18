import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { SendHorizontal, Copy, Check, Moon, Sun, ChevronDown, ChevronUp, AlignLeft, Settings, User, Bot } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Create Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState('medium'); // 'small', 'medium', 'large'

  useEffect(() => {
    // Check for user's preferred color scheme
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
    
    // Check for stored preferences
    const storedTheme = localStorage.getItem('chatTheme');
    const storedFontSize = localStorage.getItem('chatFontSize');
    
    if (storedTheme) setDarkMode(storedTheme === 'dark');
    if (storedFontSize) setFontSize(storedFontSize);
  }, []);
  
  useEffect(() => {
    localStorage.setItem('chatTheme', darkMode ? 'dark' : 'light');
    localStorage.setItem('chatFontSize', fontSize);
  }, [darkMode, fontSize]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

const CodeBlock = ({ code, language = '' }) => {
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
    <div className={`relative ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg overflow-hidden my-2`}>
      <div className="flex justify-between items-center px-4 py-2 bg-opacity-90 font-mono text-xs">
        <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {language || 'code'}
        </div>
        <button
          onClick={handleCopy}
          className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      <pre className={`p-4 overflow-x-auto ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const LatexBlock = ({ formula, isInline }) => {
  const { darkMode } = useContext(ThemeContext);
  const [html, setHtml] = useState('');

  useEffect(() => {
    try {
      const renderedFormula = katex.renderToString(formula, {
        throwOnError: false,
        displayMode: !isInline,
      });
      setHtml(renderedFormula);
    } catch (error) {
      setHtml(`<span class="text-red-500">LaTeX Error: ${error.message}</span>`);
    }
  }, [formula, isInline]);

  return (
    <span
      className={`${isInline ? 'inline' : 'block text-center my-2'} ${darkMode ? 'text-white' : 'text-black'}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const MessageContent = ({ text }) => {
  const { darkMode } = useContext(ThemeContext);
  
  // Process the message content with all formatting
  const processContent = () => {
    // First handle code blocks (```)
    let parts = [];
    let currentIndex = 0;
    const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > currentIndex) {
        parts.push({
          type: 'text',
          content: text.substring(currentIndex, match.index)
        });
      }
      
      // Add code block
      parts.push({
        type: 'code',
        language: match[1],
        content: match[2]
      });
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex)
      });
    }
    
    // Process each text part for other formatting
    return parts.map((part, index) => {
      if (part.type === 'code') {
        return <CodeBlock key={`code-${index}`} code={part.content} language={part.language} />;
      } else {
        return processTextFormatting(part.content, index);
      }
    });
  };
  
  const processTextFormatting = (text, partIndex) => {
    // Handle inline LaTeX delimited by $...$
    let elements = [];
    let currentIndex = 0;
    const inlineLatexRegex = /\$([^$]+)\$/g;
    let match;
    
    while ((match = inlineLatexRegex.exec(text)) !== null) {
      // Add text before LaTeX
      if (match.index > currentIndex) {
        elements.push(
          <span key={`text-${partIndex}-${currentIndex}`}>
            {processTextWithMarkdown(text.substring(currentIndex, match.index))}
          </span>
        );
      }
      
      // Add inline LaTeX
      elements.push(
        <LatexBlock key={`latex-${partIndex}-${match.index}`} formula={match[1]} isInline={true} />
      );
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      elements.push(
        <span key={`text-${partIndex}-${currentIndex}`}>
          {processTextWithMarkdown(text.substring(currentIndex))}
        </span>
      );
    }
    
    return <div key={`formatted-${partIndex}`}>{elements}</div>;
  };
  
  const processTextWithMarkdown = (text) => {
    // Split by newlines to handle block-level elements
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Handle headlines (# Headline)
      if (line.match(/^#{1,6}\s/)) {
        const level = line.match(/^(#{1,6})\s/)[1].length;
        const content = line.replace(/^#{1,6}\s/, '');
        const HeadingTag = `h${level}`;
        
        const className = {
          1: 'text-2xl font-bold my-2',
          2: 'text-xl font-bold my-2',
          3: 'text-lg font-bold my-2',
          4: 'text-base font-bold my-2',
          5: 'text-sm font-bold my-2',
          6: 'text-xs font-bold my-2'
        }[level];
        
        return React.createElement(
          HeadingTag,
          { key: `heading-${lineIndex}`, className },
          processInlineFormatting(content)
        );
      }
      
      // Handle bullet points
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <div key={`bullet-${lineIndex}`} className="flex items-baseline my-1">
            <span className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
            <span>{processInlineFormatting(line.trim().substring(2))}</span>
          </div>
        );
      }
      
      // Handle numbered lists
      else if (line.match(/^\d+\.\s/)) {
        const number = line.match(/^(\d+)\.\s/)[1];
        const content = line.replace(/^\d+\.\s/, '');
        return (
          <div key={`number-${lineIndex}`} className="flex items-baseline my-1">
            <span className={`mr-2 min-w-6 text-right ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{number}.</span>
            <span>{processInlineFormatting(content)}</span>
          </div>
        );
      }
      
      // Handle block quotes
      else if (line.trim().startsWith('> ')) {
        return (
          <blockquote 
            key={`quote-${lineIndex}`} 
            className={`border-l-4 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'} pl-4 py-1 my-2 italic`}
          >
            {processInlineFormatting(line.trim().substring(2))}
          </blockquote>
        );
      }
      
      // Normal text
      else {
        return (
          <div key={`line-${lineIndex}`} className={line.trim() === '' ? 'h-4' : 'my-1'}>
            {processInlineFormatting(line)}
          </div>
        );
      }
    });
  };
  
  const processInlineFormatting = (text) => {
    // Handle bold text (**bold**)
    let processed = text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    
    // Handle italic text (*italic*)
    processed = processed.map((part) => {
      if (typeof part === 'string') {
        return part.split(/(\*(?!\*).*?\*(?!\*))/g).map((subPart, i) => {
          if (subPart.startsWith('*') && subPart.endsWith('*') && !subPart.startsWith('**')) {
            return <em key={i}>{subPart.slice(1, -1)}</em>;
          }
          return subPart;
        });
      }
      return part;
    });
    
    // Handle code spans (`code`)
    processed = processed.map((part) => {
      if (typeof part === 'string' || Array.isArray(part)) {
        const flatPart = typeof part === 'string' ? part : part.join('');
        return flatPart.split(/(`[^`]+`)/g).map((codePart, i) => {
          if (codePart.startsWith('`') && codePart.endsWith('`')) {
            return (
              <code 
                key={i} 
                className={`px-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} font-mono text-sm`}
              >
                {codePart.slice(1, -1)}
              </code>
            );
          }
          return codePart;
        });
      }
      return part;
    });
    
    // Flatten arrays
    const flatten = (arr) => {
      return arr.reduce((acc, val) => 
        acc.concat(Array.isArray(val) ? flatten(val) : val), 
      []);
    };
    
    return flatten(processed);
  };

  return <div className="whitespace-pre-wrap">{processContent()}</div>;
};

const ThemeToggle = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
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

const SettingsPanel = ({ isOpen, togglePanel }) => {
  const { darkMode, fontSize, setFontSize } = useContext(ThemeContext);
  
  return (
    <div className={`${isOpen ? 'block' : 'hidden'} absolute right-0 top-full mt-2 z-10 rounded-lg shadow-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} min-w-60`}>
      <h3 className="font-bold mb-2">Settings</h3>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium">Font Size</label>
        <div className="flex space-x-2">
          {['small', 'medium', 'large'].map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`px-2 py-1 rounded-md text-sm ${
                fontSize === size 
                  ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                  : (darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')
              }`}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="pt-2 border-t border-gray-300 text-xs text-gray-500 mt-2">
        <p>Tip: Use markdown formatting in your messages</p>
      </div>
    </div>
  );
};

const HelpPanel = ({ isOpen }) => {
  const { darkMode } = useContext(ThemeContext);
  
  if (!isOpen) return null;
  
  return (
    <div className={`rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 mb-4 text-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <h3 className="font-bold mb-2">Formatting Guide</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-1">Markdown</h4>
          <ul className="space-y-1">
            <li><code className={`px-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>**bold**</code> for <strong>bold</strong> text</li>
            <li><code className={`px-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>*italic*</code> for <em>italic</em> text</li>
            <li><code className={`px-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>`code`</code> for <code className={`px-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>code</code></li>
            <li><code className={`px-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}># Heading</code> for headings</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-1">Lists & Math</h4>
          <ul className="space-y-1">
            <li><code className={`px-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>- item</code> for bullet points</li>
            <li><code className={`px-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>1. item</code> for numbered lists</li>
            <li><code className={`px-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>$x^2$</code> for inline LaTeX</li>
            <li><code className={`px-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>```code```</code> for code blocks</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { darkMode, fontSize } = useContext(ThemeContext);

  // Font size classes
  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

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
        text: data.output || "I received your message. How can I help?",
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
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without shift for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
    }
  };

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} ${fontSizeClasses[fontSize]}`}>
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full h-full p-4">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg flex-1 flex flex-col h-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
            <div className="flex items-center">
              <h1 className="text-xl font-bold">AI Chat Assistant</h1>
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className={`ml-2 p-1 rounded-md text-xs ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {showHelp ? 'Hide Help' : 'Help'}
              </button>
            </div>
            <div className="flex items-center space-x-2 relative">
              <button
                onClick={() => clearChat()}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                title="Clear chat"
              >
                <AlignLeft className="w-5 h-5" />
              </button>
              <ThemeToggle />
              <div className="relative">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <SettingsPanel isOpen={settingsOpen} togglePanel={() => setSettingsOpen(!settingsOpen)} />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <HelpPanel isOpen={showHelp} />
            
            <div className="p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-64">
                  <div className={`text-center p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} max-w-md`}>
                    <h2 className="text-xl font-bold mb-2">Welcome to AI Chat</h2>
                    <p className="mb-4">Start a conversation by typing a message below</p>
                    <div className="text-sm">
                      <p>Try formatting like:</p>
                      <ul className="mt-2 space-y-1 text-left">
                        <li>• Use **bold** for emphasis</li>
                        <li>• LaTeX math with $E=mc^2$</li>
                        <li>• Create bullet lists with - or *</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                      message.sender === 'user' 
                        ? 'bg-blue-500 ml-2' 
                        : darkMode ? 'bg-gray-700 mr-2' : 'bg-gray-200 mr-2'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div
                      className={`rounded-lg p-3 ${
                        message.sender === 'user'
                          ? 'bg-blue-500 text-white'
                          : darkMode 
                            ? 'bg-gray-700 text-white'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <MessageContent text={message.text} />
                      <span className="text-xs mt-2 block opacity-70">
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className={`flex rounded-lg p-3 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-600 mr-2">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex space-x-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                className={`flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-auto max-h-32 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                disabled={isLoading}
                style={{ minHeight: '44px' }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-2 text-xs text-right text-gray-500">
              Press Enter to send, Shift+Enter for new line
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