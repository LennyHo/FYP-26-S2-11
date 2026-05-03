"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // 1. IMPORT ROUTER
import ChatbotSidebar from './ChatbotSidebar';

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const router = useRouter(); // 2. INITIALIZE ROUTER

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* LEFT SIDE: MAIN WEBSITE */}
      <div 
        className="no-scrollbar"
        style={{ 
          width: isChatOpen ? '80%' : '100%', 
          transition: 'width 0.3s ease',
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: '#F9F6F0'
        }}
      >
        {children} 
      </div>

      {/* RIGHT SIDE: CHATBOT */}
      {isChatOpen && (
        <div style={{ width: '30%', height: '100vh', borderLeft: '2px solid #EFEAE6', background: 'white' }}>
          <ChatbotSidebar 
            onClose={() => setIsChatOpen(false)} 
            
            // 3. WIRE UP THE AI BUTTONS TO YOUR ROUTES!
            onOpenCart={() => router.push('/cart')}
            onCheckout={() => router.push('/checkout')}
          />
        </div>
      )}

      {/* FLOATING CHAT TOGGLE BUTTON */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          style={{
            position: 'fixed', bottom: '40px', right: '40px', zIndex: 99999,
            width: '65px', height: '65px', borderRadius: '50%',
            backgroundColor: '#C87941', color: 'white', border: 'none',
            fontSize: '30px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
        >
          💬
        </button>
      )}
    </div>
  );
}