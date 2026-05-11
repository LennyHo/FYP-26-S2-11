"use client";

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './ChatbotSidebar.module.css';
import avyLogo from '../../../frontend/img/avy_logo/Group 2.svg';
import avyIntroduction from '../../../frontend/img/avy_logo/avy_introduction.svg';
import { useRouter } from 'next/navigation';

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

const drinkData: Record<string, { id: string; category: string }> = {
  "Classic Milk Tea": { id: "b001", category: "milk-tea" },
  "Jasmine Green Tea": { id: "b002", category: "milk-tea" },
  "Oolong Milk Tea": { id: "b003", category: "milk-tea" },
  "Osmanthus Milk Tea": { id: "b004", category: "milk-tea" },
  "Da Hong Bao Milk Tea": { id: "b005", category: "milk-tea" },
  "Matcha Latte": { id: "b006", category: "matcha-teas" },
  "Strawberry Matcha Tea": { id: "b007", category: "matcha-teas" },
  "Cranberry Matcha Tea": { id: "b008", category: "matcha-teas" },
  "Jasmine Matcha Tea": { id: "b009", category: "matcha-teas" },
  "Double Chocolate Frappe": { id: "b010", category: "ice-blended" },
  "Taro Slush": { id: "b012", category: "ice-blended" },
  "Milo Dinosaur": { id: "b011", category: "local-favourites" },
};

function createConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function convertDrinkNamesToLinks(text: string): string {
  let result = text;
  
  // Replace drink names with links (bold or asterisk format from server)
  Object.entries(drinkData).forEach(([drinkName, { id, category }]) => {
    const url = `/menu/${category}/${id}`;
    
    // Handle **Drink Name** format
    const boldPattern = new RegExp(`\\*\\*${drinkName}\\*\\*`, 'g');
    result = result.replace(boldPattern, `<a href="${url}" style="color: #2b7da3; text-decoration: none; border-bottom: 2px solid #2b7da3; font-weight: bold;"><strong>${drinkName}</strong></a>`);
    
    // Handle ***Drink Name*** format
    const boldItalicPattern = new RegExp(`\\*\\*\\*${drinkName}\\*\\*\\*`, 'g');
    result = result.replace(boldItalicPattern, `<a href="${url}" style="color: #2b7da3; text-decoration: none; border-bottom: 2px solid #2b7da3; font-weight: bold;"><strong>${drinkName}</strong></a>`);
  });
  
  return result;
}

export default function ChatbotSidebar({ onClose, onOpenCart, onCheckout }: ChatbotSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const avyLogoRef = useRef<HTMLDivElement>(null);
  const avyEyeLeftRef = useRef<SVGPathElement>(null);
  const avyEyeRightRef = useRef<SVGPathElement>(null);

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

  const updateAvyEyes = (clientX: number, clientY: number) => {
    const bounds = avyLogoRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const deltaX = (clientX - centerX) / (bounds.width / 2);
    const deltaY = (clientY - centerY) / (bounds.height / 2);

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const x = clamp(deltaX * 5, -5, 5);
    const y = clamp(deltaY * 4, -4, 4);

    if (avyEyeLeftRef.current) {
      avyEyeLeftRef.current.style.setProperty('--avy-eye-x', `${x * 0.6}px`);
      avyEyeLeftRef.current.style.setProperty('--avy-eye-y', `${y * 0.6}px`);
    }

    if (avyEyeRightRef.current) {
      avyEyeRightRef.current.style.setProperty('--avy-eye-x', `${x * 0.95}px`);
      avyEyeRightRef.current.style.setProperty('--avy-eye-y', `${y * 0.95}px`);
    }
  };

  const resetAvyEyes = () => {
    if (avyEyeLeftRef.current) {
      avyEyeLeftRef.current.style.removeProperty('--avy-eye-x');
      avyEyeLeftRef.current.style.removeProperty('--avy-eye-y');
    }

    if (avyEyeRightRef.current) {
      avyEyeRightRef.current.style.removeProperty('--avy-eye-x');
      avyEyeRightRef.current.style.removeProperty('--avy-eye-y');
    }
  };

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
      chatWindowRef.current.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleChatClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // Check if it's a button and has your specific chat classes
    if (target.tagName === 'BUTTON' && 
      (target.classList.contains('chat-nav-btn') || target.classList.contains('chat-nav-btn-compact'))) {
      
      const aiAction = target.getAttribute('onclick') || '';
      
      // Handle cart button
      if (aiAction.includes('handleCart') && onOpenCart) {
        e.preventDefault();
        e.stopPropagation();
        onOpenCart();
      } 
      // Handle checkout button
      else if (aiAction.includes('handleCheckout') && onCheckout) {
        e.preventDefault();
        e.stopPropagation();
        onCheckout();
      }
      // Handle goToCheckoutPage button
      else if (aiAction.includes('goToCheckoutPage') && onCheckout) {
        e.preventDefault();
        e.stopPropagation();
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

  const hasUserMessage = messages.some(msg => msg.isUser);

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
            <svg className={styles.headerBtnIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M14.5 5.5L8 12l6.5 6.5" />
              <path d="M9 12h8" />
            </svg>
          </button>
          <div className={styles.titleWrap}>
            <div
              ref={avyLogoRef}
              className={styles.avyLogoAnimated}
              aria-hidden="true"
              onPointerEnter={e => updateAvyEyes(e.clientX, e.clientY)}
              onPointerMove={e => updateAvyEyes(e.clientX, e.clientY)}
              onPointerLeave={resetAvyEyes}
            >
              <svg className={styles.avyLogoSvgWrap} width="273" height="273" viewBox="0 0 273 273" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <g filter="url(#chatbotAvyFilter0)">
                  <circle cx="136.5" cy="132.5" r="132.5" fill="url(#chatbotAvyGradient)" />
                </g>
                <g filter="url(#chatbotAvyFilter1)">
                  <path
                    ref={avyEyeLeftRef}
                    className={styles.avyEyeLeft}
                    d="M79.7874 71.3204C82.9663 64.229 93.0337 64.2291 96.2126 71.3204L115.606 114.582C119.178 122.552 110.448 130.427 102.887 126.055L92.5058 120.05C89.7183 118.438 86.2817 118.438 83.4942 120.05L73.1126 126.055C65.5524 130.427 56.8217 122.552 60.3942 114.582L79.7874 71.3204Z"
                    fill="#F9FAFA"
                  />
                </g>
                <g filter="url(#chatbotAvyFilter2)">
                  <path
                    ref={avyEyeRightRef}
                    className={styles.avyEyeRight}
                    d="M176.787 71.3204C179.966 64.229 190.034 64.2291 193.213 71.3204L212.606 114.582C216.178 122.552 207.448 130.427 199.887 126.055L189.506 120.05C186.718 118.438 183.282 118.438 180.494 120.05L170.113 126.055C162.552 130.427 153.822 122.552 157.394 114.582L176.787 71.3204Z"
                    fill="#F9FAFA"
                  />
                </g>
                <defs>
                  <filter id="chatbotAvyFilter0" x="0" y="0" width="273" height="273" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_33_1152" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_33_1152" result="shape" />
                  </filter>
                  <filter id="chatbotAvyFilter1" x="55.5691" y="66.002" width="64.8618" height="69.3037" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_33_1152" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_33_1152" result="shape" />
                  </filter>
                  <filter id="chatbotAvyFilter2" x="152.569" y="66.002" width="64.8619" height="69.3037" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_33_1152" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_33_1152" result="shape" />
                  </filter>
                  <linearGradient id="chatbotAvyGradient" x1="136.5" y1="0" x2="175" y2="235.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#AB1C6E" />
                    <stop offset="0.504808" stopColor="#A55EA3" />
                    <stop offset="0.774038" stopColor="#A17EBE" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3 className={styles.headerMainTitle}>Avy</h3>
          </div>
          <div className={styles.headerControls}>
            <button
              type="button"
              className={styles.restartBtn}
              onClick={restartConversation}
              aria-label="Restart conversation"
            >
              <svg className={styles.headerBtnIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M19 8.5A8 8 0 1 0 21 14" />
                <path d="M21 4.5V10h-5.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.headerContent}>
          <p className={styles.subtitle}>Your DripTea Health Buddy</p>
        </div>
      </div>

      <div className={styles.chatWindow} ref={chatWindowRef} onClick={handleChatClick}>
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id}>
            <div className={`${styles.message} ${msg.isUser ? styles.userMessage : styles.botMessage}`}>
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
                  __html: convertDrinkNamesToLinks(msg.text)
                    .replace(/<img[^>]*>/gi, '')
                    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>')
                    .replace(/\n\s*\n/g, '<br>')
                    .replace(/\n/g, '<br>')
                    .trim()
                }}
              />
            </div>
            </div>

            {isInitialized && !hasUserMessage && index === 0 && !msg.isUser && (
              <div className={styles.welcomeIntroCard}>
                <Image
                  src={avyIntroduction}
                  alt="A warm welcome from Avy"
                  className={styles.welcomeIntroImage}
                />
              </div>
            )}
          </React.Fragment>
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
            <div className={`${styles.botBubble} ${styles.typingBubble}`}>
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