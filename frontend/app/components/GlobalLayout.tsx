"use client";

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // 1. IMPORT ROUTER
import ChatbotSidebar from './ChatbotSidebar';
import styles from '../layout.module.css';

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
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
        >
          💬
        </button>
      )}
    </div>
  );
}