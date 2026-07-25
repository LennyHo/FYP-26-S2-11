// User Story Architecture Trace — ChatbotSidebar.tsx
//
// #25  Chat with AI Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: ChatbotSession.Model
//
// #26  Navigate Website via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js (Gemini navigation response)
//
// #27  Search Beverages via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: MenuItem.Model
//
// #28  Track Order Status
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: Order.Model
//
// #29  High Sugar Warning via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: MenuItem.Model
//
// #31  Nutritional Grading via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: MenuItem.Model
//
// #32  Get Recommendations via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: MenuItem.Model
//
// #196 Preferred Language
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js (language param in POST body)
//
// #197 Speak to Chatbot (Voice Input)
//      View: ChatbotSidebar.tsx (speechRecognition) → Ctrl: chatbot.controller.js → Svc: Gemini API / Groq API (fallback) → Model: ChatbotSession.Model
//
// #198 Purchase History via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: Payment.Model
//
// #199 Add to Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: MenuItem.Model, CartItem.Model
//
// #200 View Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: CartItem.Model
//
// #201 Edit Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: CartItem.Model
//
// #202 Check Vouchers via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: Voucher.Model
//
// #203 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: Order.Model
//
// #308 - As a customer, I want to provide feedback via the chatbot so that I can share my experience conveniently.
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: Feedback.Model, MenuItem.Model
"use client";

/**
 * ChatbotSidebar — JSX-only shell for the Avy chatbot.
 * All state, refs, effects, and handlers live in useChatbotState.ts.
 * This file is responsible only for layout and rendering.
 */

import React from 'react';
import Image from 'next/image';
import { FiCopy, FiVolume2 } from 'react-icons/fi';
import styles from './ChatbotSidebar.module.css';
import { QUICK_PROMPTS, cancelSpeech, convertDrinkNamesToLinks, extractOrderingOptions, getOrderStep, convertMarkdownBold, speakText } from '../../utils/chatHelpers';
import QuickPrompts from './QuickPrompts';
import DrinkRecCards from '../menu/DrinkRecCards';
import OrderReceiptCard from '../ui/OrderReceiptCard';
import OrderStatusCard from '../ui/OrderStatusCard';
import VoucherCard from '../ui/VoucherCard';
import FeedbackPromptCard from "./FeedbackPromptCard";
import CartSummaryCard from '../ui/CartSummaryCard';
import PurchaseHistoryCard from '../ui/PurchaseHistoryCard';
import ChatImageGallery from '../ui/ChatImageGallery';
import DrinkCard from '../menu/DrinkCard';
import { useChatbotState, type ChatbotSidebarProps } from './useChatbotState';

const avyLogo = '/img/Group 2.svg';

export default function ChatbotSidebar(props: ChatbotSidebarProps) {
  const {
    setMessages,
    input,
    setInput,
    isLoading,
    isInitialized,
    pendingImages,
    previewIndex,
    setPreviewIndex,
    flippedCard,
    setFlippedCard,
    isListening,
    isSpeakMode,
    hideQuickPrompts,
    overlayTranscript,
    overlayMessages,
    overlayLoading,
    isTTSSpeaking,
    isSpeakDetected,
    welcomeGreeting,
    welcomeAnimationKey,
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    hintVisible,
    displayedHintText,
    menuLookup,
    menuById,
    chatWindowRef,
    textareaRef,
    hasUserMessage,
    normalizedSearchQuery,
    visibleMessages,
    searchResultCount,
    router,
    onClose,
    sendMessage,
    handlePickedImage,
    handleInputPaste,
    removePendingImage,
    restartConversation,
    handleChatClick,
    formatMessageTime,
    sanitizeExcessiveBreaks,
    closeOverlay,
    handleOverlayMicClick,
    selectedSpeechLang,
    setSelectedSpeechLang,
    handleMicrophoneClick,
    handleSpeakClick,
  } = useChatbotState(props);

  const LANG_OPTIONS: { code: string; flag: string; locale: string }[] = [
    { code: 'EN', flag: 'EN', locale: 'en-GB' },
    { code: 'BM', flag: 'BM', locale: 'ms-MY' },
    { code: 'ZH', flag: '中', locale: 'zh-CN' },
    { code: 'TA', flag: 'த', locale: 'ta-IN' },
  ];
  const currentLang =
    selectedSpeechLang.startsWith('zh') ? LANG_OPTIONS[2] :
    selectedSpeechLang.startsWith('ms') ? LANG_OPTIONS[1] :
    selectedSpeechLang.startsWith('ta') ? LANG_OPTIONS[3] : LANG_OPTIONS[0];
  function cycleLang() {
    const idx = LANG_OPTIONS.findIndex(l => l.code === currentLang.code);
    const next = LANG_OPTIONS[(idx + 1) % LANG_OPTIONS.length];
    setSelectedSpeechLang(next.locale);
  }

  const [dismissedMsgId, setDismissedMsgId] = React.useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = React.useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = React.useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const speakMsgAreaRef = React.useRef<HTMLDivElement>(null);
  const copyFeedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const getMessagePlainText = React.useCallback((html: string) => {
    const withLineBreaks = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ');
    const decoder = document.createElement('textarea');
    decoder.innerHTML = withLineBreaks;
    return decoder.value.replace(/\s*\n\s*/g, '\n').replace(/[ \t]+/g, ' ').trim();
  }, []);

  const handleReadMessage = React.useCallback((messageId: string, html: string) => {
    if (speakingMsgId === messageId && isTTSSpeaking) {
      cancelSpeech();
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(messageId);
    speakText(
      getMessagePlainText(html),
      () => setSpeakingMsgId(currentId => currentId === messageId ? null : currentId),
    );
  }, [getMessagePlainText, isTTSSpeaking, speakingMsgId]);

  const handleCopyMessage = React.useCallback(async (messageId: string, html: string) => {
    const text = getMessagePlainText(html);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    setCopiedMsgId(messageId);
    if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
    copyFeedbackTimerRef.current = setTimeout(() => setCopiedMsgId(null), 1600);
  }, [getMessagePlainText]);

  const renderMessageActions = (messageId: string, html: string) => {
    const isSpeaking = speakingMsgId === messageId && isTTSSpeaking;
    const isCopied = copiedMsgId === messageId;
    return (
      <div className={styles.botResponseActions} aria-label='Avy message actions'>
        <button
          type='button'
          className={styles.botResponseAction}
          onClick={() => handleReadMessage(messageId, html)}
          title={isSpeaking ? 'Stop reading' : 'Read aloud'}
          aria-label={isSpeaking ? 'Stop reading this Avy message' : 'Read this Avy message aloud'}
          aria-pressed={isSpeaking}
        >
          <FiVolume2 aria-hidden='true' />
        </button>
        <span className={styles.copyActionGroup}>
          <button
            type='button'
            className={styles.botResponseAction}
            onClick={() => handleCopyMessage(messageId, html)}
            title={isCopied ? 'Copied' : 'Copy message'}
            aria-label={isCopied ? 'Avy message copied' : 'Copy this Avy message'}
          >
            <FiCopy aria-hidden='true' />
          </button>
          <span
            className={[styles.narrationBars, isSpeaking ? styles.narrationBarsActive : ''].filter(Boolean).join(' ')}
            aria-hidden='true'
          >
            <span />
            <span />
            <span />
          </span>
        </span>
      </div>
    );
  };

  React.useEffect(() => () => {
    if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
  }, []);

  React.useEffect(() => {
    const el = speakMsgAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [overlayMessages]);

  return (
    <aside className={`${styles.chatbotSidebar} ${styles.chatBg}${!hasUserMessage && !input ? ` ${styles.chatBgMotionActive}` : ''}`}>
      {/* Header with logo and controls */}
      <div className={styles.chatHeader}>
        <div className={styles.headerTop}>
          <div className={styles.titleWrap}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => onClose?.()}
              aria-label="Close Avy"
            >
              <svg className={styles.headerBtnIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="4.5" y="4" width="15" height="16" rx="2.5" />
                <path d="M9 4v16" />
                <path d="M15.25 9.25L12.5 12l2.75 2.75" />
              </svg>
              <span className={styles.backBtnTooltip} role="tooltip">Close Avy</span>
            </button>
            <div
              className={styles.avyLogoAnimated}
              aria-hidden="true"
            >
              <svg className={styles.avyLogoSvgWrap} width="273" height="273" viewBox="0 0 273 273" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <g filter="url(#chatbotAvyFilter0)">
                  <circle cx="136.5" cy="132.5" r="132.5" fill="url(#chatbotAvyGradient)" />
                </g>
                <g filter="url(#chatbotAvyFilter1)">
                  <path
                    className={styles.avyEyeLeft}
                    d="M79.7874 71.3204C82.9663 64.229 93.0337 64.2291 96.2126 71.3204L115.606 114.582C119.178 122.552 110.448 130.427 102.887 126.055L92.5058 120.05C89.7183 118.438 86.2817 118.438 83.4942 120.05L73.1126 126.055C65.5524 130.427 56.8217 122.552 60.3942 114.582L79.7874 71.3204Z"
                    fill="#F9FAFA"
                  />
                </g>
                <g filter="url(#chatbotAvyFilter2)">
                  <path
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
            {!isSearchOpen && (
              <div className={styles.avyTitleGroup}>
                <h3 className={styles.headerMainTitle}>Avy</h3>
                <span className={styles.headerSubtitle}>DripConcierge</span>
              </div>
            )}
          </div>
          {isSearchOpen && (
            <div className={styles.headerSearch}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={styles.headerSearchInput}
                placeholder="Search messages"
                aria-label="Search Avy messages"
                autoFocus
              />
              {normalizedSearchQuery && (
                <span className={styles.searchCount}>{searchResultCount}</span>
              )}
            </div>
          )}
          <div className={styles.headerControls}>
            <button
              type="button"
              className={styles.headerIconBtn}
              onClick={() => {
                setIsSearchOpen(value => !value);
                if (isSearchOpen) setSearchQuery('');
              }}
              aria-label={isSearchOpen ? 'Close message search' : 'Search messages'}
            >
              <svg className={styles.headerBtnIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                {isSearchOpen ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </>
                ) : (
                  <>
                    <circle cx="11" cy="11" r="6" />
                    <path d="M16 16l4 4" />
                  </>
                )}
              </svg>
            </button>
            <button
              type="button"
              className={styles.headerIconBtn}
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
      </div>

      {/* Message display area */}
      <div className={styles.chatWindow} ref={chatWindowRef} onClick={handleChatClick}>
        {normalizedSearchQuery && visibleMessages.length === 0 && (
          <div className={styles.noSearchResults}>No messages found</div>
        )}
        {isInitialized && !hasUserMessage && !normalizedSearchQuery && visibleMessages.length === 0 && (
          <div className={styles.welcomeIntroCard}>
            <p key={welcomeAnimationKey} className={styles.welcomeGreeting}>
              {welcomeGreeting}
            </p>
          </div>
        )}
        {(() => {
          const lastBotIdx = visibleMessages.reduce((last, m, i) => !m.isUser ? i : last, -1);
          return visibleMessages.map((msg, index) => {
            const isLatestBot = !msg.isUser && index === lastBotIdx && !isLoading;
            const isDrinkCardMsg = msg.text.includes('startOrder');
            const { cleanHtml, options, question } = (isLatestBot && !isDrinkCardMsg)
              ? extractOrderingOptions(sanitizeExcessiveBreaks(msg.text))
              : { cleanHtml: '', options: [], question: '' };
            return (
          <React.Fragment key={msg.id}>
            <div className={`${styles.message} ${msg.isUser ? styles.userMessage : styles.botMessage}${(!msg.isUser && msg.recommendedDrinks?.length) ? ` ${styles.botMessageWithCards}` : ""}`}>
              {!msg.isUser && (
                <div className={styles.botMeta}>
                  <Image
                    src={avyLogo}
                    alt="Avy"
                    width={18}
                    height={18}
                    className={styles.messageAvatar}
                  />
                  <span className={styles.assistantLabel}>Avy</span>
                  <span className={styles.metaDivider}>•</span>
                  <time className={styles.messageTime}>{formatMessageTime(msg.id)}</time>
                </div>
              )}

              <div
                className={`${styles.compactContent} ${msg.isUser ? styles.userBubble : styles.botBubble}`}
                onClick={handleChatClick}
              >
                <div className={styles.bubbleText}>
                  {msg.isUser && msg.images && msg.images.length > 0 && (
                    <ChatImageGallery images={msg.images} />
                  )}
                  {!msg.isUser && msg.orderStatusCard ? (
                    <OrderStatusCard orderStatus={msg.orderStatusCard} />
                  ) : !msg.isUser && msg.voucherCard ? (
                    <VoucherCard voucherCard={msg.voucherCard} />
                  ) : !msg.isUser && msg.orderReceipt ? (
                    <OrderReceiptCard orderReceipt={msg.orderReceipt} />
                  ) : !msg.isUser && msg.cartUpdate ? (
                    <CartSummaryCard cartUpdate={msg.cartUpdate} />
                  ) : !msg.isUser && msg.purchaseHistory ? (
                    <PurchaseHistoryCard purchaseHistory={msg.purchaseHistory} />
                  ) : !msg.isUser && msg.text.includes("startOrder") ? (
                    <DrinkRecCards
                      msgText={sanitizeExcessiveBreaks(msg.text).replace(/^(<br\s*\/?>|\s)+/gi, "")}
                      flippedCard={flippedCard}
                      setFlippedCard={setFlippedCard}
                    />
                  ) : !msg.isUser && /Nutri-Grade of [ABCD]/i.test(msg.text) ? (() => {
                    const gradeMatch = msg.text.match(/Nutri-Grade of ([ABCD])/i)!;
                    const grade = gradeMatch[1].toUpperCase();
                    const parts = msg.text.split(/<br\s*\/?>/i);
                    const before = parts[0] || '';
                    const after = parts.slice(1).join('<br>').replace(/^(\s*<br\s*\/?>)*\s*/gi, '').replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
                    return (
                      <>
                        <div dangerouslySetInnerHTML={{ __html: convertMarkdownBold(sanitizeExcessiveBreaks(before)) }} />
                        <Image
                          src={`/grade_nutri_${grade.toLowerCase()}.png`}
                          alt={`Nutri-Grade ${grade}`}
                          width={72}
                          height={72}
                          className={styles.nutriGradeImg}
                        />
                        {after && <div dangerouslySetInnerHTML={{ __html: convertMarkdownBold(sanitizeExcessiveBreaks(after)) }} />}
                      </>
                    );
                  })() : (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: msg.isUser
                          ? convertDrinkNamesToLinks(msg.text, menuLookup)
                          : convertMarkdownBold(isLatestBot && cleanHtml ? cleanHtml : sanitizeExcessiveBreaks(msg.text)),
                      }}
                    />
                  )}

                  {!msg.isUser && msg.healthCard && (
                    <div className={styles.healthCard}>
                      <div className={styles.healthCardTitle}>Want to reduce your sugar intake?</div>
                      {msg.healthCard.drinkName && (
                        <div className={styles.healthCardDrinkName}>For your {msg.healthCard.drinkName}</div>
                      )}
                      <div className={styles.healthCardLabelRow}>
                        <span className={styles.healthCardLabel}>Current</span>
                        <span />
                        <span className={styles.healthCardLabel}>Reduce to {msg.healthCard.recommendedSugar}g sugar</span>
                      </div>
                      <div className={styles.healthCardImagesRow}>
                        <Image
                          src={`/grade_nutri_${msg.healthCard.currentGrade.toLowerCase()}.png`}
                          alt={`Nutri-Grade ${msg.healthCard.currentGrade}`}
                          width={72}
                          height={72}
                        />
                        <span className={styles.healthCardArrow}>
                          <svg width="36" height="16" viewBox="0 0 36 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="8" x2="28" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <polyline points="22,2 30,8 22,14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        </span>
                        <Image
                          src={`/grade_nutri_${msg.healthCard.recommendedGrade.toLowerCase()}.png`}
                          alt={`Nutri-Grade ${msg.healthCard.recommendedGrade}`}
                          width={72}
                          height={72}
                        />
                      </div>
                      <div className={styles.healthCardSugarRow}>
                        <span className={styles.healthCardCurrentSugar}>{msg.healthCard.currentSugar}g sugar</span>
                        <span />
                        <span className={styles.healthCardRecommendedSugar}>{msg.healthCard.recommendedSugar}g sugar</span>
                      </div>
                      <p className={styles.healthCardDisclaimer}>AI suggestion only — not medical advice. Drink at your own risk.</p>
                    </div>
                  )}

                  {!msg.isUser &&
                          (msg as any).feedbackOrderId &&
                          (msg as any).feedbackItems?.length > 0 && (
                            <FeedbackPromptCard
                              orderId={(msg as any).feedbackOrderId}
                              items={(msg as any).feedbackItems}
                              initialSubmitted={(msg as any).feedbackSubmitted}
                              onSubmitted={() =>
                                setMessages((prev: any) =>
                                  prev.map((m: any) =>
                                    m.id === msg.id ? { ...m, feedbackSubmitted: true } : m
                                  )
                                )
                              }
                            />
                  )}

                  {!msg.isUser && msg.recommendedDrinks && msg.recommendedDrinks.length > 0 && !msg.text.includes("startOrder") && (
                    <div className={styles.drinkCardList}>
                      {msg.recommendedDrinks.map((drink) => (
                        <div key={drink.id}>
                          {drink.description && (
                            <p className={styles.drinkDescLine}>
                              <strong>{drink.name}</strong> — {drink.description}
                            </p>
                          )}
                          <DrinkCard
                            id={drink.id}
                            name={drink.name}
                            price={`S$ ${Number(drink.price).toFixed(2)}`}
                            image={drink.image || (/^b\d{3}$/.test(drink.id) ? `/img/bubble_teas/${drink.id}.jpg` : "/img/bubble_teas/b001.jpg")}
                            categorySlug={drink.category.toLowerCase().replace(/\s+/g, "-")}
                            nutriGrade={drink.nutri_grade ?? undefined}
                            sugar={drink.base_sugar_g ?? undefined}
                            calories={drink.base_calories ?? undefined}
                            rating={drink.rating ?? menuById[drink.id]?.rating}
                            drinkInfo={menuById[drink.id]?.drinkInfo}
                            wrapClassName={styles.chatbotCard}
                            accent={
                              drink.category?.toLowerCase().includes("matcha")
                                ? "green"
                                : drink.category?.toLowerCase().includes("ice")
                                ? "red"
                                : "brown"
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {!msg.isUser && msg.storeCards && msg.storeCards.length > 0 && (
                    <div className={styles.storeCardList}>
                      {msg.storeCards.map((store) => (
                        <div key={store.name} className={styles.storeCard}>
                          {store.image && (
                            <img src={store.image} alt={store.name} className={styles.storeCardImage} />
                          )}
                          <div className={styles.storeCardBody}>
                            <p className={styles.storeCardName}>{store.name}</p>
                            <p className={styles.storeCardLine}>{store.address}</p>
                            {store.phone && <p className={styles.storeCardLine}>{store.phone}</p>}
                            <p className={styles.storeCardLine}>Mon–Fri: {store.weekdayHours} | Sat–Sun: {store.weekendHours}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isLatestBot && options.length > 0 && msg.id !== dismissedMsgId && (
                    <div className={styles.inlineOptions}>
                      <div className={styles.inlineOptionsHeader}>
                        <span className={styles.inlineOptionsStep}>Step {getOrderStep(options)} of 4</span>
                      </div>
                      {options.map((opt, i) => (
                        <button
                          key={opt}
                          type="button"
                          className={styles.inlineOptionBtn}
                          onClick={() => sendMessage(opt)}
                        >
                          <span className={styles.inlineOptionNum}>{i + 1}</span>
                          <span className={styles.inlineOptionText}>{opt}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {!msg.isUser && renderMessageActions(msg.id, msg.text)}
            </div>
            
          </React.Fragment>
            );
          });
        })()}
        {isLoading && (
          <div className={`${styles.message} ${styles.botMessage}`}>
            <div className={styles.botMeta}>
              <Image src={avyLogo} alt="Avy" width={18} height={18} className={styles.messageAvatar} />
              <span className={styles.assistantLabel}>Avy</span>
              <span className={styles.metaDivider}>•</span>
              <span className={styles.messageTime}>typing...</span>
            </div>
            <div className={`${styles.botBubble} ${styles.typingBubble}`}>
              <span className={styles.typingIndicator}>
                <span></span><span></span><span></span>
              </span>
              {displayedHintText && (
                <span className={`${styles.slowHint} ${hintVisible ? styles.slowHintVisible : ''}`}>
                  {displayedHintText}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className={styles.chatInputArea}>
        {pendingImages.length > 0 && (
          <div className={styles.pendingImagesMini} role="list" aria-label="Pasted images">
            {pendingImages.map((img, i) => (
              <div
                key={`pending-mini-${i}`}
                className={styles.pendingMiniItem}
                role="listitem"
                onClick={() => setPreviewIndex(i)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPreviewIndex(i); }}
              >
                <img src={img.previewUrl} alt={img.name} className={styles.pendingMiniThumb} />
                <button
                  type="button"
                  className={styles.pendingMiniClose}
                  onClick={(e) => { e.stopPropagation(); removePendingImage(i); }}
                  aria-label={`Remove ${img.name}`}
                >
                  ×
                </button>
              </div>
            ))}
            {pendingImages.length >= 5 && (
              <span className={styles.pendingImagesLimit}>Max 5</span>
            )}
          </div>
        )}

        <QuickPrompts
          prompts={QUICK_PROMPTS}
          onPromptClick={prompt => sendMessage(prompt, false, true)}
          isLoading={isLoading}
          hasTypedInput={!!input.trim()}
          hideQuickPrompts={hideQuickPrompts}
        />

        <div className={styles.composerContainer}>
          {/* Hidden file input — triggers native photo picker on mobile.
               Explicit MIME types (no image/* wildcard) prevent iOS from offering
               "Take Photo or Video" — it shows only the photo option. */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Take photo for image recognition"
            className={styles.hiddenFileInput}
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const isImageByType = file.type.startsWith('image/');
              const isImageByExt  = /\.(heic|heif|jpg|jpeg|png|gif|webp|bmp|tiff?)$/i.test(file.name);
              if (file.type.startsWith('video/') || (!isImageByType && !isImageByExt)) {
                alert('Only photos are supported. Videos and documents cannot be uploaded.');
                e.target.value = '';
                return;
              }
              handlePickedImage(file, 'camera');
              e.target.value = '';
            }}
          />
          <div className={styles.messageInputOuter}>
            {/* Photo upload button — left side of input pill */}
            <button
              type="button"
              className={styles.photoInputBtn}
              onClick={() => photoInputRef.current?.click()}
              disabled={isLoading || pendingImages.length >= 5}
              aria-label="Take photo for image recognition"
              title="Take photo for image recognition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              className={styles.userInput}
              placeholder="Text Avy..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onPaste={handleInputPaste}
              onFocus={() => {
                // Scroll to the latest message after the iOS keyboard finishes animating
                setTimeout(() => {
                  if (chatWindowRef.current) {
                    chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
                  }
                }, 350);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isLoading}
              rows={1}
            />
            {/* Right side of pill: mic listening → show pulsing mic (+ send if text); has text → send only; idle → mic + speak */}
            {isListening ? (
              <div className={styles.voiceButtons}>
                <button
                  type="button"
                  className={`${styles.micBtn} ${styles.listening}`}
                  onClick={() => handleMicrophoneClick()}
                  disabled={isLoading}
                  aria-label="Stop voice input"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11a5 5 0 0 1-10 0" />
                    <path d="M12 16v4" />
                  </svg>
                </button>
                {(input.trim() || pendingImages.length > 0) && (
                  <button
                    type="button"
                    className={styles.sendBtn}
                    onClick={() => sendMessage()}
                    disabled={isLoading}
                    aria-label="Send message"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5" />
                      <path d="M5 12l7-7 7 7" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (input.trim() || pendingImages.length > 0) ? (
              <button
                type="button"
                className={styles.sendBtn}
                onClick={() => sendMessage()}
                disabled={isLoading}
                title="Send message"
                aria-label="Send message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              </button>
            ) : (
              <div className={styles.voiceButtons}>
                <button
                  type="button"
                  className={styles.langBtn}
                  onClick={cycleLang}
                  title={`Mic language: ${currentLang.code} — click to switch`}
                  aria-label={`Switch mic language (currently ${currentLang.code})`}
                >
                  {currentLang.flag}
                </button>
                <button
                  type="button"
                  className={styles.micBtn}
                  onClick={() => handleMicrophoneClick()}
                  disabled={isLoading}
                  aria-label="Start voice input"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11a5 5 0 0 1-10 0" />
                    <path d="M12 16v4" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`${styles.speakBtn} ${isSpeakMode ? styles.speakBtnListening : ''}`}
                  onClick={handleSpeakClick}
                  disabled={isLoading}
                  aria-label={isSpeakMode ? 'Stop voice mode' : 'Speak to Avy'}
                >
                  <svg width="20" height="18" viewBox="0 0 20 16" fill="currentColor" aria-hidden="true">
                    <rect x="0"    y="5"   width="2.6" height="6"  rx="1.3"/>
                    <rect x="4.4"  y="2.5" width="2.6" height="11" rx="1.3"/>
                    <rect x="8.8"  y="0"   width="2.6" height="16" rx="1.3"/>
                    <rect x="13.2" y="2.5" width="2.6" height="11" rx="1.3"/>
                    <rect x="17.6" y="5"   width="2.6" height="6"  rx="1.3"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Speak mode overlay */}
      {isSpeakMode && (
        <div className={styles.speakOverlay} role="dialog" aria-modal="true">
          {/* Header: close + status */}
          <div className={styles.speakOverlayHeader}>
            <button
              type="button"
              className={styles.overlayCloseBtn}
              onClick={closeOverlay}
              aria-label="Close voice mode"
            >
              ✕
            </button>
            <span className={`${styles.speakOverlayText} ${isListening ? styles.listeningActive : ''}`}>
              {overlayLoading ? 'Avy is thinking…' : isTTSSpeaking ? 'Avy is speaking…' : isSpeakDetected ? 'Hearing you…' : isListening ? 'Listening…' : 'Tap mic to speak'}
              {(overlayLoading || isTTSSpeaking || isListening) && (
                <span className={styles.listeningBars} aria-hidden="true">
                  <span /><span /><span />
                </span>
              )}
            </span>
          </div>

          {/* Messages — same classes as main chat */}
          <div className={styles.speakMsgArea} ref={speakMsgAreaRef}>
            {overlayMessages.map(msg => (
              <div key={msg.id} className={`${styles.message} ${msg.isUser ? styles.userMessage : styles.botMessage}`}>
                {!msg.isUser && (
                  <div className={styles.botMeta}>
                    <Image src={avyLogo} alt="Avy" width={18} height={18} className={styles.messageAvatar} />
                    <span className={styles.assistantLabel}>Avy</span>
                  </div>
                )}
                <div className={`${styles.compactContent} ${msg.isUser ? styles.userBubble : styles.botBubble}`}>
                  <div className={styles.bubbleText}>
                    {!msg.isUser && msg.orderStatusCard ? (
                      <OrderStatusCard orderStatus={msg.orderStatusCard} />
                    ) : !msg.isUser && msg.voucherCard ? (
                      <VoucherCard voucherCard={msg.voucherCard} />
                    ) : !msg.isUser && msg.orderReceipt ? (
                      <OrderReceiptCard orderReceipt={msg.orderReceipt} />
                    ) : !msg.isUser && msg.cartUpdate ? (
                      <CartSummaryCard cartUpdate={msg.cartUpdate} />
                    ) : !msg.isUser && msg.text.includes("startOrder") ? (
                      <DrinkRecCards
                        msgText={sanitizeExcessiveBreaks(msg.text).replace(/^(<br\s*\/?>|\s)+/gi, "")}
                        flippedCard={flippedCard}
                        setFlippedCard={setFlippedCard}
                      />
                    ) : !msg.isUser && /Nutri-Grade of [ABCD]/i.test(msg.text) ? (() => {
                      const gradeMatch = msg.text.match(/Nutri-Grade of ([ABCD])/i)!;
                      const grade = gradeMatch[1].toUpperCase();
                      const parts = msg.text.split(/<br\s*\/?>/i);
                      const before = parts[0] || '';
                      const after = parts.slice(1).join('<br>').replace(/^(\s*<br\s*\/?>)*\s*/gi, '').replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
                      return (
                        <>
                          <div dangerouslySetInnerHTML={{ __html: sanitizeExcessiveBreaks(before) }} />
                          <Image
                            src={`/grade_nutri_${grade.toLowerCase()}.png`}
                            alt={`Nutri-Grade ${grade}`}
                            width={72}
                            height={72}
                            className={styles.nutriGradeImg}
                          />
                          {after && <div dangerouslySetInnerHTML={{ __html: sanitizeExcessiveBreaks(after) }} />}
                        </>
                      );
                    })() : (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: msg.isUser
                            ? convertDrinkNamesToLinks(msg.text, menuLookup)
                            : sanitizeExcessiveBreaks(msg.text),
                        }}
                      />
                    )}

                    {!msg.isUser && msg.healthCard && (
                      <div className={styles.healthCard}>
                        <div className={styles.healthCardTitle}>Reduce to less sugar!</div>
                        <div className={styles.healthCardSugars}>
                          <span className={styles.healthCardCurrentSugar}>{msg.healthCard.currentSugar}g</span>
                          <span className={styles.healthCardArrow}>
                          <svg width="36" height="16" viewBox="0 0 36 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="8" x2="28" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <polyline points="22,2 30,8 22,14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        </span>
                          <span className={styles.healthCardRecommendedSugar}>{msg.healthCard.recommendedSugar}g</span>
                        </div>
                        <Image
                          src={`/grade_nutri_${msg.healthCard.recommendedGrade.toLowerCase()}.png`}
                          alt={`Nutri-Grade ${msg.healthCard.recommendedGrade}`}
                          width={80}
                          height={80}
                          className={styles.healthCardBadge}
                        />
                        <p className={styles.healthCardDisclaimer}>AI suggestion only — not medical advice. Drink at your own risk.</p>
                      </div>
                    )}

                    {!msg.isUser && msg.recommendedDrinks && msg.recommendedDrinks.length > 0 && !msg.text.includes("startOrder") && (
                      <div className={styles.drinkCardList}>
                        {msg.recommendedDrinks.map((drink) => (
                          <div key={drink.id}>
                            {drink.description && (
                              <p className={styles.drinkDescLine}>
                                <strong>{drink.name}</strong> — {drink.description}
                              </p>
                            )}
                            <DrinkCard
                              id={drink.id}
                              name={drink.name}
                              price={`S$ ${Number(drink.price).toFixed(2)}`}
                              image={drink.image || (/^b\d{3}$/.test(drink.id) ? `/img/bubble_teas/${drink.id}.jpg` : "/img/bubble_teas/b001.jpg")}
                              categorySlug={drink.category.toLowerCase().replace(/\s+/g, "-")}
                              nutriGrade={drink.nutri_grade ?? undefined}
                              sugar={drink.base_sugar_g ?? undefined}
                              calories={drink.base_calories ?? undefined}
                              rating={drink.rating ?? menuById[drink.id]?.rating}
                              drinkInfo={menuById[drink.id]?.drinkInfo}
                              accent={
                                drink.category?.toLowerCase().includes("matcha")
                                  ? "green"
                                  : drink.category?.toLowerCase().includes("ice")
                                  ? "red"
                                  : "brown"
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {!msg.isUser && msg.storeCards && msg.storeCards.length > 0 && (
                      <div className={styles.storeCardList}>
                        {msg.storeCards.map((store) => (
                          <div key={store.name} className={styles.storeCard}>
                            {store.image && (
                              <img src={store.image} alt={store.name} className={styles.storeCardImage} />
                            )}
                            <div className={styles.storeCardBody}>
                              <p className={styles.storeCardName}>{store.name}</p>
                              <p className={styles.storeCardLine}>{store.address}</p>
                              {store.phone && <p className={styles.storeCardLine}>{store.phone}</p>}
                              <p className={styles.storeCardLine}>Mon–Fri: {store.weekdayHours} | Sat–Sun: {store.weekendHours}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {!msg.isUser && renderMessageActions(msg.id, msg.text)}
              </div>
            ))}
            {overlayLoading && (
              <div className={`${styles.message} ${styles.botMessage}`}>
                <div className={styles.botMeta}>
                  <Image src={avyLogo} alt="Avy" width={18} height={18} className={styles.messageAvatar} />
                  <span className={styles.assistantLabel}>Avy</span>
                </div>
                <div className={`${styles.botBubble} ${styles.typingBubble}`}>
                  <span className={styles.typingIndicator} aria-label="Avy is thinking">
                    <span></span><span></span><span></span>
                  </span>
                </div>
              </div>
            )}
            {overlayTranscript && !overlayLoading && (
              <div className={styles.speakLineContainer} aria-live="polite">
                <span className={styles.speakLine}>{overlayTranscript}</span>
              </div>
            )}
          </div>

          {/* Mic button */}
          <div className={styles.speakOverlayControls}>
            <button
              type="button"
              className={`${styles.overlayMicBtn} ${isListening ? styles.overlayMicBtnListening : ''}`}
              onClick={handleOverlayMicClick}
              disabled={overlayLoading}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11a5 5 0 0 1-10 0" />
                <path d="M12 16v4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {previewIndex !== null && pendingImages[previewIndex] && (
        <div
          className={styles.imagePreviewOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewIndex(null)}
        >
          <div className={styles.imagePreviewContent} onClick={(e) => e.stopPropagation()}>
            {pendingImages.length > 1 && (
              <button
                type="button"
                className={styles.imagePreviewNavButton + ' ' + styles.imagePreviewPrev}
                onClick={() => setPreviewIndex(i => (i && i > 0 ? i - 1 : i))}
                aria-label="Previous image"
              >
                ‹
              </button>
            )}
            <img
              src={pendingImages[previewIndex].previewUrl}
              alt={pendingImages[previewIndex].name}
              className={styles.imagePreviewImg}
            />
            {pendingImages.length > 1 && (
              <button
                type="button"
                className={styles.imagePreviewNavButton + ' ' + styles.imagePreviewNext}
                onClick={() => setPreviewIndex(i => (typeof i === 'number' && i < pendingImages.length - 1 ? i + 1 : i))}
                aria-label="Next image"
              >
                ›
              </button>
            )}
            <button
              type="button"
              className={styles.imagePreviewClose}
              onClick={() => setPreviewIndex(null)}
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
