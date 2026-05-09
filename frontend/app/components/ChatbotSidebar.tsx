"use client";

import React, { useRef, useState, useEffect } from 'react';
import styles from './ChatbotSidebar.module.css';

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
  const [logoHovered, setLogoHovered] = useState(false);
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

  return (
    <aside className={styles.chatbotSidebar}>
      <div className={styles.chatHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <svg 
              className={styles.avyLogo} 
              viewBox="0 0 100 100" 
              width="40" 
              height="40"
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
            >
              <defs>
                <radialGradient id="donutGradient" cx="40%" cy="40%">
                  <stop offset="0%" stopColor="#e89b6f" />
                  <stop offset="60%" stopColor="#c87941" />
                  <stop offset="100%" stopColor="#b86a35" />
                </radialGradient>
              </defs>
              {/* Main circle/donut */}
              <circle cx="50" cy="50" r="42" fill="url(#donutGradient)" />
              {/* Inner hole */}
              <circle cx="50" cy="50" r="20" fill="white" />
              {/* Left eye */}
              <circle 
                className={styles.eye} 
                cx="38" 
                cy="42" 
                r="4" 
                fill="#333" 
                opacity={logoHovered ? "1" : "0"}
                style={{ transition: 'opacity 0.3s ease' }}
              />
              {/* Right eye */}
              <circle 
                className={styles.eye} 
                cx="62" 
                cy="42" 
                r="4" 
                fill="#333" 
                opacity={logoHovered ? "1" : "0"}
                style={{ transition: 'opacity 0.3s ease' }}
              />
              {/* Smile */}
              <path 
                className={styles.smile} 
                d="M 38 58 Q 50 68 62 58" 
                stroke="#333" 
                strokeWidth="3" 
                fill="none" 
                strokeLinecap="round" 
                opacity={logoHovered ? "1" : "0"}
                style={{ transition: 'opacity 0.3s ease' }}
              />
            </svg>
            <h3>Avy</h3>
          </div>
          <p className={styles.subtitle}>Your DripTea Health Buddy</p>
        </div>
        <div className={styles.headerControls}>
          <button type="button" className={styles.restartBtn} onClick={restartConversation}>⟳</button>
          {onClose && <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>}
        </div>
      </div>

      <div className={styles.chatWindow} ref={chatWindowRef} onClick={handleChatClick}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.message} ${msg.isUser ? styles.userMessage : styles.botMessage}`}>
            <div 
              className={styles.compactContent}
              dangerouslySetInnerHTML={{ 
                __html: msg.text
                  .replace(/<img[^>]*>/gi, '') // Remove all img tags
                  .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>') // Turn double <br> into single <br>
                  .replace(/\n\s*\n/g, '<br>') // Turn double newlines into single <br>
                  .replace(/\n/g, '<br>') // Turn single newlines into <br>
                  .trim() 
              }}
              onClick={handleChatClick}
            />
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.botMessage}`}>
            <span className={styles.typingIndicator}>
              <span></span><span></span><span></span>
            </span>
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