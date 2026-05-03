"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './ChatbotSidebar.module.css';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

interface ChatbotSidebarProps {
  onClose?: () => void;
}

const STORAGE_KEY = "driptea_chatbot_messages";
const CONVERSATION_ID_KEY = "driptea_chatbot_conversation_id";

function createConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export default function ChatbotSidebar({ onClose }: ChatbotSidebarProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedConversationId = localStorage.getItem(CONVERSATION_ID_KEY);
    if (savedConversationId) {
      setConversationId(savedConversationId);
    } else {
      const newConversationId = createConversationId();
      localStorage.setItem(CONVERSATION_ID_KEY, newConversationId);
      setConversationId(newConversationId);
    }

    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch {
        // If localStorage is corrupted, start fresh with greeting
        const greetingMsg: Message = {
          id: Date.now().toString(),
          text: t('greeting'),
          isUser: false,
        };
        setMessages([greetingMsg]);
      }
    } else {
      // First time - show greeting
      const greetingMsg: Message = {
        id: Date.now().toString(),
        text: t('greeting'),
        isUser: false,
      };
      setMessages([greetingMsg]);
    }
    setIsInitialized(true);
  }, [t]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  const suggestions = [
    t('suggestion1'),
    t('suggestion2'),
  ];

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || !conversationId) return;

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
        body: JSON.stringify({
          message: messageText,
          language: i18n.language,
          conversationId,
        }),
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

  function restartConversation() {
    const newConversationId = createConversationId();
    const greetingMsg: Message = {
      id: Date.now().toString(),
      text: t('greeting'),
      isUser: false,
    };

    setConversationId(newConversationId);
    setMessages([greetingMsg]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([greetingMsg]));
      localStorage.setItem(CONVERSATION_ID_KEY, newConversationId);
    } catch {
      // ignore storage errors
    }
  }

  React.useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Only show suggestions if there are no user messages yet
  const showSuggestions = messages.length <= 1 && messages.every(msg => !msg.isUser);

  return (
    <aside className={styles.chatbotSidebar}>
      <div className={styles.chatHeader}>
        <div className={styles.headerContent}>
          <h3>{t('chatbotTitle')}</h3>
          <p className={styles.subtitle}>{t('chatbotSubtitle')}</p>
        </div>
        <div className={styles.headerControls}>
          <LanguageSwitcher />
          <button
            type="button"
            className={styles.restartBtn}
            onClick={restartConversation}
            aria-label={t('restartConvo')}
            title={t('restartConvo')}
          >
            ⟳
          </button>
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
      </div>

      <div className={styles.chatWindow} ref={chatWindowRef}>
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
        {showSuggestions && (
          <div className={styles.suggestionsContainer}>
            <div className={styles.suggestionsTitle}>{t('suggestionsTitle')}</div>
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
          placeholder={t('inputPlaceholder')}
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
          aria-label={t('send')}
        >
          ➤
        </button>
      </div>
    </aside>
  );
}
