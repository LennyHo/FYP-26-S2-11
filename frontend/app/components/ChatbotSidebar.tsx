"use client";

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './ChatbotSidebar.module.css';
import avyLogo from '../../../frontend/img/avy_logo/Group 2.svg';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

interface ChatbotSidebarProps {
  onClose?: () => void;
  onOpenCart?: () => void;
  onCheckout?: () => void;
}

const STORAGE_KEY = "driptea_chatbot_messages";
const CONVERSATION_ID_KEY = "driptea_chatbot_conversation_id";

function createConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export default function ChatbotSidebar({ onClose, onOpenCart, onCheckout }: ChatbotSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const chatWindowRef = useRef<HTMLDivElement>(null);

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
        const greetingMsg: Message = {
          id: Date.now().toString(),
          text: 'Hello! How can I help you today?',
          isUser: false,
        };
        setMessages([greetingMsg]);
      }
    } else {
      const greetingMsg: Message = {
        id: Date.now().toString(),
        text: 'Hello! How can I help you today?',
        isUser: false,
      };
      setMessages([greetingMsg]);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  const backendBase = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE?.trim() || 'http://localhost:5000';

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
      const response = await fetch(`${backendBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationId: conversationId,
        }),
      });

      const data = await response.json();
      const replyText = typeof data?.reply === 'string' ? data.reply : 'Error connecting to backend';

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        isUser: false,
      };
      setMessages(prev => [...prev, botMsg]);

      if (replyText.includes('hidden-cart-data')) {
        setTimeout(() => {
          const hiddenBlocks = document.querySelectorAll('.hidden-cart-data');
          if (hiddenBlocks.length > 0) {
            const latestCartData = hiddenBlocks[hiddenBlocks.length - 1].textContent || '';
            localStorage.setItem("dripTeaCartData", latestCartData.trim());
            window.dispatchEvent(new Event('cartUpdated')); 
          }
        }, 100);
      }
    } catch (error) {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Error connecting to server.',
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
      text: 'Hello! I\'m Avy, your DripTea companion. How can I help you today?',
      isUser: false,
    };
    setConversationId(newConversationId);
    setMessages([greetingMsg]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([greetingMsg]));
    localStorage.setItem(CONVERSATION_ID_KEY, newConversationId);
  }

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleChatClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' && (target.classList.contains('chat-nav-btn') || target.classList.contains('chat-nav-btn-compact'))) {
      const aiAction = target.getAttribute('onclick') || '';
      if (aiAction.includes('openCart') && onOpenCart) {
        onOpenCart();
      } else if (aiAction.includes('goToCheckoutPage') && onCheckout) {
        const priceMatch = aiAction.match(/[\d.]+/);
        if (priceMatch) {
          localStorage.setItem("dripTeaCartTotal", priceMatch[0]);
        }
        onCheckout();
      }
    }
  };

  const formatMessageTime = (id: string) => {
    const parsed = Number(id);
    if (!Number.isFinite(parsed)) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return new Date(parsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className={styles.chatbotSidebar}>
      <div className={styles.chatHeader}>
        <div className={styles.headerTop}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => onClose?.()}
            aria-label="Back"
          >
            ←
          </button>
          <div className={styles.titleWrap}>
            <Image
              src={avyLogo}
              alt="Avy Logo"
              width={32}
              height={32}
              className={styles.avyLogoImage}
              priority
            />
            <h3 className={styles.headerMainTitle}>Avy</h3>
          </div>
          <div className={styles.headerControls}>
            <button type="button" className={styles.restartBtn} onClick={restartConversation}>⟳</button>
          </div>
        </div>

        <div className={styles.headerContent}>
          <p className={styles.subtitle}>Your DripTea Health Buddy</p>
        </div>
      </div>

      <div className={styles.chatWindow} ref={chatWindowRef} onClick={handleChatClick}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.message} ${msg.isUser ? styles.userMessage : styles.botMessage}`}>
            {!msg.isUser && (
              <div className={styles.botMeta}>
                <Image
                  src={avyLogo}
                  alt="Avy"
                  width={18}
                  height={18}
                  className={styles.messageAvatar}
                />
                <span className={styles.assistantLabel}>AI-Assistant</span>
                <span className={styles.metaDivider}>•</span>
                <time className={styles.messageTime}>{formatMessageTime(msg.id)}</time>
              </div>
            )}
            <div
              className={`${styles.compactContent} ${msg.isUser ? styles.userBubble : styles.botBubble}`}
              onClick={handleChatClick}
            >
              <div
                className={styles.bubbleText}
                dangerouslySetInnerHTML={{
                  __html: msg.text
                    .replace(/<img[^>]*>/gi, '')
                    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>')
                    .replace(/\n\s*\n/g, '<br>')
                    .replace(/\n/g, '<br>')
                    .trim()
                }}
              />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.botMessage}`}>
            <div className={styles.botMeta}>
              <Image
                src={avyLogo}
                alt="Avy"
                width={18}
                height={18}
                className={styles.messageAvatar}
              />
              <span className={styles.assistantLabel}>AI-Assistant</span>
              <span className={styles.metaDivider}>•</span>
              <span className={styles.messageTime}>typing...</span>
            </div>
            <div className={styles.botBubble}>
              <span className={styles.typingIndicator}>
                <span></span><span></span><span></span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.chatInputArea}>
        <input
          type="text"
          className={styles.userInput}
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => { if (e.key === 'Enter' && !isLoading) sendMessage(); }}
          disabled={isLoading}
        />
        <button
          type="button"
          className={styles.sendBtn}
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
        >
          ➤
        </button>
      </div>
    </aside>
  );
}