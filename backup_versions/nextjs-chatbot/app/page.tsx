"use client";

import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MeetTheCrew from './components/MeetTheCrew';
import ChatbotSidebar from './components/ChatbotSidebar';
import styles from './page.module.css';

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.mainContent}>
        <Header />
        <main className={styles.main}>
          <Hero />
          <MeetTheCrew />
        </main>
      </div>

      {/* Chat Toggle Button */}
      <button
        type="button"
        className={styles.chatToggleBtn}
        onClick={() => setIsChatOpen(!isChatOpen)}
        aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
      >
        <span className={styles.chatIcon}>💬</span>
      </button>

      {/* Backdrop Overlay */}
      {isChatOpen && (
        <div
          className={styles.chatBackdrop}
          onClick={() => setIsChatOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chatbot Sidebar - Overlay */}
      {isChatOpen && (
        <ChatbotSidebar onClose={() => setIsChatOpen(false)} />
      )}
    </div>
  );
}

