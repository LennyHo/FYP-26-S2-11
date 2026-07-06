"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import ChatbotSidebar from '../chatbot/ChatbotSidebar';
import Footer from './Footer';
import styles from '../../layout.module.css';

// --- 1. TINY HELPER COMPONENT ---
function AvyQueryListener({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('avy') === 'open') {
      onOpen();
      // Clear the query param immediately so closing works
      router.replace(window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter(); // 2. INITIALIZE ROUTER

  useEffect(() => {
    const handler = () => setIsChatOpen(true);
    window.addEventListener('openAvyChat', handler);
    return () => window.removeEventListener('openAvyChat', handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsChatOpen(true);
    window.addEventListener("chatbotSystemMessage", handler);
    return () => {
      window.removeEventListener("chatbotSystemMessage", handler);
    };
  }, []);

  // Lets any page react (via plain CSS) to the chatbot actually being open —
  // container/viewport queries can't tell, since .mainPane often still stays
  // wide enough for .main to hit its own max-width cap either way.
  useEffect(() => {
    document.body.classList.toggle('driptea-chat-open', isChatOpen);
    return () => document.body.classList.remove('driptea-chat-open');
  }, [isChatOpen]);

  const hideChatbot =
    pathname.startsWith('/user-admin') ||
    pathname.startsWith('/store-staff') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/change-password') ||
    pathname.startsWith('/marketing');

  const hideFooter =
    pathname.startsWith('/user-admin') ||
    pathname.startsWith('/store-staff') ||
    pathname.startsWith('/user-admin-dashboard') ||
    pathname.startsWith('/store-staff-dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/marketing');

  const rootClass = `${styles.globalShell} ${(pathname === '/login' || hideChatbot) ? 'loginPage' : ''}`;
  
  return (
    <div className={rootClass}>
      
      {/* 👇 2. ADD THE SUSPENSE LISTENER HERE 👇 */}
      <Suspense fallback={null}>
        <AvyQueryListener onOpen={() => setIsChatOpen(true)} />
      </Suspense>
      {/* 👆 -------------------------------- 👆 */}

      {/* LEFT SIDE: MAIN WEBSITE */}
      <div
        className={`${styles.mainPane} no-scrollbar ${!hideChatbot && isChatOpen ? styles.mainPaneWithChat : ''} ${hideChatbot ? 'fullWidth' : ''}`}
      >
        {children}
        {!hideFooter && <Footer />}
      </div>

      {/* RIGHT SIDE: CHATBOT */}
      {!hideChatbot && (
        <>
          {/* Backdrop — fades in on mobile when chat opens */}
          <div
            className={`${styles.chatBackdrop} ${isChatOpen ? styles.chatBackdropVisible : ''}`}
            onClick={() => setIsChatOpen(false)}
            aria-hidden="true"
          />
          <div className={`${styles.chatPane} ${isChatOpen ? styles.chatPaneOpen : styles.chatPaneClosed}`}>
            <ChatbotSidebar
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              onOpenCart={() => router.push('/cart')}
              onCheckout={() => router.push('/checkout')}
            />
          </div>
        </>
      )}

      {/* FLOATING CHAT TOGGLE BUTTON */}
      {!hideChatbot && !isChatOpen && (
        <button
          className={styles.chatToggleBtn}
          onClick={() => setIsChatOpen(true)}
          aria-label="Open Avy chat assistant"
          title="Open Avy chat assistant"
        >
          <span className={styles.chatTogglePulse} aria-hidden="true" />
          <svg className={styles.chatToggleLogo} width="273" height="273" viewBox="0 0 273 273" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <g filter="url(#floatingAvyFilter0)">
              <circle cx="136.5" cy="132.5" r="132.5" fill="url(#floatingAvyGradient)" />
            </g>
            <g filter="url(#floatingAvyFilter1)">
              <path
                className={styles.logoEyeLeft}
                d="M79.7874 71.3204C82.9663 64.229 93.0337 64.2291 96.2126 71.3204L115.606 114.582C119.178 122.552 110.448 130.427 102.887 126.055L92.5058 120.05C89.7183 118.438 86.2817 118.438 83.4942 120.05L73.1126 126.055C65.5524 130.427 56.8217 122.552 60.3942 114.582L79.7874 71.3204Z"
                fill="#F9FAFA"
              />
            </g>
            <g filter="url(#floatingAvyFilter2)">
              <path
                className={styles.logoEyeRight}
                d="M176.787 71.3204C179.966 64.229 190.034 64.2291 193.213 71.3204L212.606 114.582C216.178 122.552 207.448 130.427 199.887 126.055L189.506 120.05C186.718 118.438 183.282 118.438 180.494 120.05L170.113 126.055C162.552 130.427 153.822 122.552 157.394 114.582L176.787 71.3204Z"
                fill="#F9FAFA"
              />
            </g>
            <defs>
              <filter id="floatingAvyFilter0" x="0" y="0" width="273" height="273" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feOffset dy="4" />
                <feGaussianBlur stdDeviation="2" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_33_1152" />
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_33_1152" result="shape" />
              </filter>
              <filter id="floatingAvyFilter1" x="55.5691" y="66.002" width="64.8618" height="69.3037" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feOffset dy="4" />
                <feGaussianBlur stdDeviation="2" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_33_1152" />
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_33_1152" result="shape" />
              </filter>
              <filter id="floatingAvyFilter2" x="152.569" y="66.002" width="64.8619" height="69.3037" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feOffset dy="4" />
                <feGaussianBlur stdDeviation="2" />
                <feComposite in2="hardAlpha" operator="out" />
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_33_1152" />
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_33_1152" result="shape" />
              </filter>
              <linearGradient id="floatingAvyGradient" x1="136.5" y1="0" x2="175" y2="235.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#AB1C6E" />
                <stop offset="0.504808" stopColor="#A55EA3" />
                <stop offset="0.774038" stopColor="#A17EBE" />
              </linearGradient>
            </defs>
          </svg>
          <span className={styles.chatToggleLabel} aria-hidden="true">Open Avy</span>
        </button>
      )}
    </div>
  );
}
