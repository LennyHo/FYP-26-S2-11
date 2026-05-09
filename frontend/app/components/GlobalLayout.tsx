"use client";

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // 1. IMPORT ROUTER
import ChatbotSidebar from './ChatbotSidebar';
import styles from '../layout.module.css';

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const pathname = usePathname();
  const router = useRouter(); // 2. INITIALIZE ROUTER
  const hideChatbot =
    pathname.startsWith('/user-admin') ||
    pathname.startsWith('/store-staff') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register');

  return (
    <div className={styles.globalShell}>
      
      {/* LEFT SIDE: MAIN WEBSITE */}
      <div 
        className={`${styles.mainPane} no-scrollbar ${isChatOpen ? styles.mainPaneWithChat : ''}`}
      >
        {children} 
      </div>

      {/* RIGHT SIDE: CHATBOT */}
      {!hideChatbot && isChatOpen && (
        <div className={styles.chatPane}>
          <ChatbotSidebar 
            onClose={() => setIsChatOpen(false)} 
            
            // 3. WIRE UP THE AI BUTTONS TO YOUR ROUTES!
            onOpenCart={() => router.push('/cart')}
            onCheckout={() => router.push('/checkout')}
          />
        </div>
      )}

      {/* FLOATING CHAT TOGGLE BUTTON */}
      {!hideChatbot && !isChatOpen && (
        <button
          className={styles.chatToggleBtn}
          onClick={() => setIsChatOpen(true)}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
        >
          <svg viewBox="0 0 100 100" width="40" height="40">
            <defs>
              <radialGradient id="donutGradientBtn" cx="40%" cy="40%">
                <stop offset="0%" stopColor="#e89b6f" />
                <stop offset="60%" stopColor="#c87941" />
                <stop offset="100%" stopColor="#b86a35" />
              </radialGradient>
            </defs>
            {/* Main circle/donut */}
            <circle cx="50" cy="50" r="42" fill="url(#donutGradientBtn)" />
            {/* Inner hole */}
            <circle cx="50" cy="50" r="20" fill="white" />
            {/* Left eye */}
            <circle 
              cx="38" 
              cy="42" 
              r="4" 
              fill="#333" 
              opacity={isButtonHovered ? "1" : "0"}
              style={{ transition: 'opacity 0.3s ease' }}
            />
            {/* Right eye */}
            <circle 
              cx="62" 
              cy="42" 
              r="4" 
              fill="#333" 
              opacity={isButtonHovered ? "1" : "0"}
              style={{ transition: 'opacity 0.3s ease' }}
            />
            {/* Smile */}
            <path 
              d="M 38 58 Q 50 68 62 58" 
              stroke="#333" 
              strokeWidth="3" 
              fill="none" 
              strokeLinecap="round" 
              opacity={isButtonHovered ? "1" : "0"}
              style={{ transition: 'opacity 0.3s ease' }}
            />
          </svg>
        </button>
      )}
    </div>
  );
}