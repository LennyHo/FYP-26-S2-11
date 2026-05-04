"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import OurStory from '../components/OurStory';
import ChatbotSidebar from '../components/ChatbotSidebar';
import styles from './our-story.module.css';

export default function OurStoryPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const router = useRouter();

  return (
    <div style={{ display: 'flex', width: '100vw', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Main Content */}
      <div 
        style={{ 
          flex: isChatOpen ? '1 0 70%' : '1 0 100%',
          transition: 'flex 0.3s ease',
          overflowY: 'auto',
          backgroundColor: '#F9F6F0'
        }}
      >
        <Header />
        <main className={styles.main}>
          <OurStory />
        </main>
      </div>

      {/* Chatbot Sidebar */}
      {isChatOpen && (
        <div style={{ flex: '1 0 30%', height: '100vh', borderLeft: '2px solid #EFEAE6', background: 'white' }}>
          <ChatbotSidebar 
            onClose={() => setIsChatOpen(false)}
            onOpenCart={() => router.push('/cart')}
            onCheckout={() => router.push('/checkout')}
          />
        </div>
      )}

      {/* Floating Chat Toggle Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          style={{
            position: 'fixed',
            bottom: '40px',
            right: '40px',
            zIndex: 99999,
            width: '65px',
            height: '65px',
            borderRadius: '50%',
            backgroundColor: '#C87941',
            color: 'white',
            border: 'none',
            fontSize: '30px',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          💬
        </button>
      )}
    </div>
  );
}
