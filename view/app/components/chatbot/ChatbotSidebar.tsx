"use client";

/**
 * ChatbotSidebar — JSX-only shell for the Avy chatbot.
 * All state, refs, effects, and handlers live in useChatbotState.ts.
 * This file is responsible only for layout and rendering.
 */

import React from 'react';
import Image from 'next/image';
import styles from './ChatbotSidebar.module.css';
import { QUICK_PROMPTS, convertDrinkNamesToLinks, extractOrderingOptions, getOrderStep, convertMarkdownBold } from '../../utils/chatHelpers';
import QuickPrompts from './QuickPrompts';
import DrinkRecCards from '../menu/DrinkRecCards';
import OrderReceiptCard from '../ui/OrderReceiptCard';
import DrinkCard from '../menu/DrinkCard';
import { useChatbotState, type ChatbotSidebarProps } from './useChatbotState';

const avyLogo = '/img/Group 2.svg';

export default function ChatbotSidebar(props: ChatbotSidebarProps) {
  const {
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
    handleInputPaste,
    removePendingImage,
    restartConversation,
    handleChatClick,
    formatMessageTime,
    sanitizeExcessiveBreaks,
    closeOverlay,
    handleOverlayMicClick,
  } = useChatbotState(props);

  const [dismissedMsgId, setDismissedMsgId] = React.useState<string | null>(null);

  return (
    <aside className={styles.chatbotSidebar}>
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
            <div className={styles.avyTitleGroup}>
              <h3 className={styles.headerMainTitle}>Avy</h3>
              <span className={styles.headerSubtitle}>DripConcierge</span>
            </div>
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
                  {!msg.isUser && /added to your cart successfully/i.test(msg.text) && /here is your order summary/i.test(msg.text) ? (
                    <OrderReceiptCard msgText={msg.text} />
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
                      <div className={styles.healthCardTitle}>Reduce to less sugar!</div>
                      <div className={styles.healthCardSugars}>
                        <span className={styles.healthCardCurrentSugar}>{msg.healthCard.currentSugar}g</span>
                        <span className={styles.healthCardArrow}>→</span>
                        <span className={styles.healthCardRecommendedSugar}>{msg.healthCard.recommendedSugar}g</span>
                      </div>
                      <Image
                        src={`/grade_nutri_${msg.healthCard.recommendedGrade.toLowerCase()}.png`}
                        alt={`Nutri-Grade ${msg.healthCard.recommendedGrade}`}
                        width={80}
                        height={80}
                        className={styles.healthCardBadge}
                      />
                    </div>
                  )}

                  {!msg.isUser && msg.recommendedDrinks && msg.recommendedDrinks.length > 0 && (
                    <div className={styles.drinkCardList}>
                      {msg.recommendedDrinks.map((drink) => (
                        <DrinkCard
                          key={drink.id}
                          id={drink.id}
                          name={drink.name}
                          price={`S$ ${Number(drink.price).toFixed(2)}`}
                          image={drink.image ?? `/img/bubble_teas/${drink.id}.jpg`}
                          categorySlug={drink.category.toLowerCase().replace(/\s+/g, "-")}
                          nutriGrade={drink.nutri_grade ?? undefined}
                          sugar={drink.base_sugar_g ?? undefined}
                          calories={drink.base_calories ?? undefined}
                          rating={menuById[drink.id]?.rating}
                          drinkInfo={menuById[drink.id]?.drinkInfo}
                          accent={
                            drink.category?.toLowerCase().includes("matcha")
                              ? "green"
                              : drink.category?.toLowerCase().includes("ice")
                              ? "red"
                              : "brown"
                          }
                        />
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

              {!msg.isUser && (msg as any).showViewCart && (
                <div className={styles.messageActionRow}>
                  <button
                    type="button"
                    className={styles.messageActionBtn}
                    onClick={() => {
                      if (props.onOpenCart) props.onOpenCart();
                      else router.push("/cart");
                    }}
                  >
                    View cart
                  </button>

                  {(msg as any).showCustomizeLink && (
                    <button
                      type="button"
                      className={`${styles.messageActionBtn} ${styles.messageActionBtnSecondary}`}
                      onClick={() =>
                        router.push(`/menu/${(msg as any).customizeCategory}/${(msg as any).customizeDrinkId}`)
                      }
                    >
                      Customize in detail
                    </button>
                  )}
                </div>
              )}
            </div>


            {isInitialized && !normalizedSearchQuery && !hasUserMessage && index === 0 && !msg.isUser && (
              <div className={styles.welcomeIntroCard}>
                <p key={welcomeAnimationKey} className={styles.welcomeGreeting}>
                  {welcomeGreeting}
                </p>
              </div>
            )}
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
          </div>
        )}

        <QuickPrompts
          prompts={QUICK_PROMPTS}
          onPromptClick={prompt => sendMessage(prompt, false)}
          isLoading={isLoading}
          hasTypedInput={!!input.trim()}
          hideQuickPrompts={hideQuickPrompts}
        />

        <div className={styles.composerContainer}>
          <div className={styles.messageInputOuter}>
            <textarea
              ref={textareaRef}
              className={styles.userInput}
              placeholder="Text Avy..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onPaste={handleInputPaste}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isLoading}
              rows={1}
            />
            {/* Send button — inside pill, shown only when there's content */}
            {(input.trim() || pendingImages.length > 0) && (
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
            )}
          </div>

          {/* Mic + Speak — commented out
          {!input.trim() && !pendingImages.length && (
            <div className={styles.voiceButtons}>
              <button
                type="button"
                className={`${styles.micBtn} ${isListening ? styles.listening : ''}`}
                onClick={handleMicrophoneClick}
                disabled={isLoading}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
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
                <span className={styles.speakWave} aria-hidden="true">
                  <span className={styles.speakWaveBar}></span>
                  <span className={styles.speakWaveBar}></span>
                  <span className={styles.speakWaveBar}></span>
                  <span className={styles.speakWaveBar}></span>
                  <span className={styles.speakWaveBar}></span>
                </span>
                <span className={styles.speakBtnText}>{isSpeakMode ? 'Stop' : 'Speak'}</span>
              </button>
            </div>
          )}
          */}
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
            <span className={styles.speakOverlayText}>
              {overlayLoading ? 'Avy is thinking…' : isListening ? 'Listening…' : 'Tap mic to speak'}
            </span>
          </div>

          {/* Messages — same classes as main chat */}
          <div className={styles.speakMsgArea}>
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
                    {!msg.isUser && /added to your cart successfully/i.test(msg.text) && /here is your order summary/i.test(msg.text) ? (
                      <OrderReceiptCard msgText={msg.text} />
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
                          <span className={styles.healthCardArrow}>→</span>
                          <span className={styles.healthCardRecommendedSugar}>{msg.healthCard.recommendedSugar}g</span>
                        </div>
                        <Image
                          src={`/grade_nutri_${msg.healthCard.recommendedGrade.toLowerCase()}.png`}
                          alt={`Nutri-Grade ${msg.healthCard.recommendedGrade}`}
                          width={80}
                          height={80}
                          className={styles.healthCardBadge}
                        />
                      </div>
                    )}

                    {!msg.isUser && msg.recommendedDrinks && msg.recommendedDrinks.length > 0 && (
                      <div className={styles.drinkCardList}>
                        {msg.recommendedDrinks.map((drink) => (
                          <DrinkCard
                            key={drink.id}
                            id={drink.id}
                            name={drink.name}
                            price={`S$ ${Number(drink.price).toFixed(2)}`}
                            image={drink.image ?? `/img/bubble_teas/${drink.id}.jpg`}
                            categorySlug={drink.category.toLowerCase().replace(/\s+/g, "-")}
                            nutriGrade={drink.nutri_grade ?? undefined}
                            sugar={drink.base_sugar_g ?? undefined}
                            calories={drink.base_calories ?? undefined}
                            rating={menuById[drink.id]?.rating}
                            drinkInfo={menuById[drink.id]?.drinkInfo}
                            accent={
                              drink.category?.toLowerCase().includes("matcha")
                                ? "green"
                                : drink.category?.toLowerCase().includes("ice")
                                ? "red"
                                : "brown"
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
