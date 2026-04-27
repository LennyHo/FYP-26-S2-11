"use client";

import React, { useRef, useState } from 'react';
import styles from './ChatbotSidebar.module.css';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

interface ChatbotSidebarProps {
  onClose?: () => void;
}

export default function ChatbotSidebar({ onClose }: ChatbotSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "What can I help you with?",
    "Tell me about your menu",
  ];

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data?.reply || 'Error connecting to backend',
        isUser: false,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Error connecting to server. Is the backend running?',
        isUser: false,
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const showSuggestions = messages.length === 0;

  return (
    <aside className={styles.chatbotSidebar}>
      <div className={styles.chatHeader}>
        <div className={styles.headerContent}>
          <h3>AI Chatbot UI</h3>
          <p className={styles.subtitle}>Ask our AI anything</p>
        </div>
        {onClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close chat"
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.chatWindow} ref={chatWindowRef}>
        {showSuggestions ? (
          <div className={styles.suggestionsContainer}>
            <div className={styles.suggestionsTitle}>Suggestions</div>
            <div className={styles.suggestionsList}>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={styles.suggestionBtn}
                  onClick={() => sendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles.message} ${
                  msg.isUser ? styles.userMessage : styles.botMessage
                }`}
              >
                {msg.text}
              </div>
            ))}
          </>
        )}
        {isLoading && (
          <div className={`${styles.message} ${styles.botMessage}`}>
            <span className={styles.typingIndicator}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        )}
      </div>

      <div className={styles.chatInputArea}>
        <input
          type="text"
          className={styles.userInput}
          placeholder="Ask me anything about your projects"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter' && !isLoading) {
              sendMessage();
            }
          }}
          disabled={isLoading}
        />
        <button
          type="button"
          className={styles.sendBtn}
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </aside>
  );
}
