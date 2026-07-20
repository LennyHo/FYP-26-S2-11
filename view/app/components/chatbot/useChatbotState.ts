// User Story Architecture Trace — useChatbotState.ts
//
// #25  Chat with AI Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js
//
// #26  Navigate Website via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js
//
// #27  Search Beverages via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: menuItem.model.js
//
// #28  Track Order Status
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: order.model.js
//
// #29  High Sugar Warning via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: menuItem.model.js
//
// #31  Nutritional Grading via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: menuItem.model.js
//
// #32  Get Recommendations via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: menuItem.model.js
//
// #196 Preferred Language
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js
//
// #197 Speak to Chatbot (Voice Input)
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useSpeech.ts → Ctrl: chatbot.controller.js → Gemini API / Groq API (fallback) → Model: chatbotSession.model.js
//
// #198 Purchase History via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: payment.model.js
//
// #199 Add to Cart via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: menuItem.model.js, cartItem.model.js
//
// #200 View Cart via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: cartItem.model.js
//
// #201 Edit Cart via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: cartItem.model.js
//
// #202 Check Vouchers via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: Voucher.Model
//
// #203 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatbotState.ts (this file) → Hook: useChatApi.ts → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: order.model.js
"use client";

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMenuData } from './hooks/useMenuData';
import { useConversation, STORAGE_KEY } from './hooks/useConversation';
import { useSpeech } from './hooks/useSpeech';
import { useChatApi } from './hooks/useChatApi';
import { detectChatLang, cancelSpeech } from '../../utils/chatHelpers';
import { useLoadingHint } from './hooks/useLoadingHint';
import { useChatUI } from './hooks/useChatUI';
import { getStoredUser } from '../../utils/api.base';
import { getCartItems } from '../../utils/customerApi';

// ==== TYPE DEFINITIONS ====

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  images?: string[];
  feedbackOrderId?: string;
  feedbackItems?: any[];
  feedbackSubmitted?: boolean;
  recommendedDrinks?: {
    id: string;
    name: string;
    category: string;
    price: number;
    description?: string;
    image?: string;
    nutri_grade?: string | null;
    base_sugar_g?: number | null;
    base_calories?: number | null;
    rating?: number;
  }[];
  healthCard?: {
    drinkName?: string;
    currentSugar: number;
    currentGrade: string;
    recommendedSugar: number;
    recommendedGrade: string;
    recommendedSugarLevel: string;
  } | null;
  orderReceipt?: {
    drink: { name: string; price: number; image: string };
    customization: { size: string; ice: string; sugar: string; toppings: string[] };
    nutrition: { sugar: number; calories: number; grade: string } | null;
    recommendedNutrition: { sugar: number; calories: number; grade: string } | null;
    cartItems: { name: string; quantity: number; lineTotal: number }[];
    total: number;
    lang?: string;
  } | null;
  cartUpdate?: {
    message: string;
    cartItems: { name: string; quantity: number; customization: { size?: string; ice?: string; sugar?: string; toppings?: string[] }; lineTotal: number }[];
    total: number;
  } | null;
  purchaseHistory?: {
    title: string;
    orders: {
      orderNo: string;
      status: string;
      paymentStatus: string;
      items: { name: string; quantity: number; customization?: { size?: string; ice?: string; sugar?: string; toppings?: string[] }; lineTotal: number }[];
      totalAmount: number;
    }[];
  } | null;
  orderStatusCard?: {
    orderNo: string;
    phase: 1 | 2 | 3;
    message: string;
    stepLabels: [string, string, string];
  } | null;
  voucherCard?: {
    title: string;
    vouchers: {
      code: string;
      title: string;
      description?: string;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      maxDiscount?: number | null;
      minSpend?: number;
    }[];
  } | null;
  storeCards?: {
    name: string;
    address: string;
    phone?: string;
    weekdayHours: string;
    weekendHours: string;
    image?: string | null;
  }[];
}

export interface ChatbotSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenCart?: () => void;
  onCheckout?: () => void;
}

export const SLOW_HINTS = [
  'Our barista is still brewing... ',
  'Good things take a little time ',
  'Avy is thinking hard for you!',
  'Almost there, hang tight...',
  'Stirring in some extra magic ✨',
];

// ==== HOOK ====

export function useChatbotState({ isOpen, onClose, onOpenCart, onCheckout }: ChatbotSidebarProps) {
  const router = useRouter();

  // input lives here so both useSpeech (setInputRef) and useChatApi (setInput) share the same state
  const [input, setInput] = useState('');

  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const menu = useMenuData();
  const conversation = useConversation();

  // Ref bridge: useSpeech is created before useChatApi, so we use a ref to
  // hand sendOverlayMessage to speech recognition without a circular dependency.
  const sendOverlayMessageRef = useRef<((text: string, shouldSpeak?: boolean) => Promise<void>) | undefined>(undefined);
  const speech = useSpeech({ sendOverlayMessageRef });

  // Wire setInput into speech so recognition onresult can update input state
  speech.setInputRef.current = setInput;

  // ui must come before api — api consumes ui.pendingImages / ui.setPendingImages
  const ui = useChatUI({ messages: conversation.messages, input });

  const api = useChatApi({
    conversationId: conversation.conversationId,
    setConversationId: conversation.setConversationId,
    setMessages: conversation.setMessages,
    pendingImages: ui.pendingImages,
    setPendingImages: ui.setPendingImages,
    setInput,
    router,
    isListening: speech.isListening,
    setIsListening: speech.setIsListening,
    isListeningRef: speech.isListeningRef,
    recognitionRef: speech.recognitionRef,
    setIsSpeakMode: speech.setIsSpeakMode,
    speakModeRef: speech.speakModeRef,
    setHideQuickPrompts: speech.setHideQuickPrompts,
    setOverlayMessages: speech.setOverlayMessages,
    setOverlayLoading: speech.setOverlayLoading,
  });

  // Populate the ref so speak-mode recognition handlers can call sendOverlayMessage
  sendOverlayMessageRef.current = api.sendOverlayMessage;

  const hint = useLoadingHint(api.isLoading);

  // Auto-detect recognition language from messages sent in the current session only.
  // Skip the initial fire so restored history from a previous session doesn't
  // lock the mic to the last session's language on page load.
  const messages = conversation.messages;
  const sessionStartedRef = useRef(false);
  useEffect(() => {
    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;
      return;
    }
    const lastUser = [...messages].reverse().find(m => m.isUser);
    if (!lastUser) return;
    const plain = lastUser.text.replace(/<[^>]+>/g, '').trim();
    speech.setSelectedSpeechLang(detectChatLang(plain));
  }, [messages]);

  // Also watch the input field in real-time — so typing in any language already
  // switches the mic before the message is even sent. Don't reset on clear —
  // clearing the input after send would overwrite the lang set by the messages effect.
  useEffect(() => {
    if (!input.trim()) return;
    speech.setSelectedSpeechLang(detectChatLang(input));
  }, [input]);

  // ── Cross-hook effects ─────────────────────────────────────────────────────

  // Register window handlers so AI-generated onclick="handleCart()" buttons use
  // Next.js client-side navigation instead of a full page reload.
  useEffect(() => {
    (window as any).handleCart = () => { router.push('/cart'); };
    (window as any).handleCheckout = async () => {
      const user = getStoredUser();
      if (user?.id) {
        try {
          const res = await getCartItems(user.id);
          if (!res.data || res.data.length === 0) {
            alert('Your cart is empty. Please add items before checking out.');
            return;
          }
        } catch {
          // If the check fails, let the checkout page handle validation
        }
      } else {
        const localData = localStorage.getItem('dripTeaCartData');
        if (!localData || !localData.trim()) {
          alert('Your cart is empty. Please add items before checking out.');
          return;
        }
      }
      router.push('/checkout');
    };
    (window as any).goToCheckoutPage = (window as any).handleCheckout;
    (window as any).handleMenu = () => { router.push('/menu'); };
    (window as any).handlePurchaseHistory = () => { router.push('/purchase-history'); };
    (window as any).handleVouchers = () => { router.push('/vouchers'); };
  }, [router]);

  // Close sidebar on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape' && isOpen) onClose?.(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Stop mic and TTS whenever the sidebar closes
  useEffect(() => {
    if (isOpen) return;
    cancelSpeech();
    if (speech.recognitionRef.current && speech.isListeningRef.current) {
      try { speech.recognitionRef.current.stop(); } catch {}
    }
    speech.isListeningRef.current = false;
    speech.isRecognitionStartingRef.current = false;
    speech.setIsListening(false);
    if (speech.speakModeRef.current) {
      speech.setIsSpeakMode(false);
      speech.speakModeRef.current = false;
      speech.voiceConversationRef.current = false;
      speech.setHideQuickPrompts(false);
    }
  }, [isOpen]);

  // Speak mode auto-send: when mic transcript lands in input, send it automatically.
  // lastSentRef prevents re-sending the same transcript if the effect re-fires.
  const lastSentRef = useRef('');
  useEffect(() => {
    if (speech.isSpeakMode && input.trim() && input !== lastSentRef.current && !api.isLoading) {
      lastSentRef.current = input;
      api.sendMessage(input, true);
    }
  }, [input, speech.isSpeakMode, api.isLoading]);

  // ── Handlers that bridge multiple hooks ───────────────────────────────────

  // Wrapper so ChatbotSidebar can call sendMessage() with no argument (Enter key,
  // send button) and the current input value is used as the fallback text.
  const sendMessage = (text?: string, shouldSpeak?: boolean, isQuickPrompt?: boolean) =>
    api.sendMessage(text ?? input, shouldSpeak ?? speech.isSpeakMode, isQuickPrompt ?? false);

  const closeOverlay = () => speech.closeOverlay(conversation.setMessages, STORAGE_KEY);

  const handleChatClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('chat-drink-link') && target instanceof HTMLAnchorElement) {
      e.preventDefault(); e.stopPropagation();
      const href = target.getAttribute('href');
      if (href) router.push(href);
      return;
    }
    if (target.tagName === 'A' && target.classList.contains('chat-nav-btn-compact') && target instanceof HTMLAnchorElement) {
      e.preventDefault(); e.stopPropagation();
      const href = target.getAttribute('href');
      if (href) router.push(href);
      return;
    }
    if (target.tagName === 'BUTTON' && (target.classList.contains('chat-nav-btn') || target.classList.contains('chat-nav-btn-compact'))) {
      const aiAction = target.getAttribute('onclick') || '';
      if (aiAction.includes('handleCart') && onOpenCart) {
        e.preventDefault(); e.stopPropagation(); onOpenCart();
      } else if (aiAction.includes('handleCheckout') && onCheckout) {
        e.preventDefault(); e.stopPropagation(); onCheckout();
      } else if (aiAction.includes('goToCheckoutPage') && onCheckout) {
        e.preventDefault(); e.stopPropagation();
        const priceMatch = aiAction.match(/[\d.]+/);
        if (priceMatch) localStorage.setItem('dripTeaCartTotal', priceMatch[0]);
        onCheckout();
      }
    }
  };

  const formatMessageTime = (id: string) => {
    const parsed = Number(id);
    if (!Number.isFinite(parsed)) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return new Date(parsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sanitizeExcessiveBreaks = (htmlString: string) => {
    if (!htmlString) return '';
    let cleaned = htmlString.replace(/\r?\n/g, '<br>');
    cleaned = cleaned.replace(/(?:<br\s*\/?>[\s]*(?:&nbsp;)*[\s]*){3,}/gi, '<br><br>');
    return cleaned;
  };

  // Pop out feedback when customer click "Collect"
  useEffect(() => {
    function handleChatbotSystemMessage(event: Event) {
      const customEvent = event as CustomEvent<{
        text: string;
        feedbackOrderId?: string;
        feedbackItems?: any[];
      }>;

      const botMessage: Message = {
          id: `${Date.now()}`,
          text: customEvent.detail.text,
          isUser: false,
          feedbackOrderId: customEvent.detail.feedbackOrderId,
          feedbackItems: customEvent.detail.feedbackItems || [],
        };

        conversation.setMessages((prev) => [...prev, botMessage]);
    }

    window.addEventListener(
      "chatbotSystemMessage",
      handleChatbotSystemMessage
    );

    return () => {
      window.removeEventListener(
        "chatbotSystemMessage",
        handleChatbotSystemMessage
      );
    };
  }, []);

  // ── Composed return (same shape as before — ChatbotSidebar.tsx unchanged) ──
  return {
    messages: conversation.messages,
    setMessages: conversation.setMessages,
    addedIds: ui.addedIds,
    input,
    setInput,
    isLoading: api.isLoading,
    isInitialized: conversation.isInitialized,
    conversationId: conversation.conversationId,
    pendingImages: ui.pendingImages,
    previewIndex: ui.previewIndex,
    setPreviewIndex: ui.setPreviewIndex,
    flippedCard: ui.flippedCard,
    setFlippedCard: ui.setFlippedCard,
    isListening: speech.isListening,
    isSpeakMode: speech.isSpeakMode,
    hideQuickPrompts: speech.hideQuickPrompts,
    overlayTranscript: speech.overlayTranscript,
    overlayMessages: speech.overlayMessages,
    overlayLoading: speech.overlayLoading,
    isTTSSpeaking: speech.isTTSSpeaking,
    isSpeakDetected: speech.isSpeakDetected,
    welcomeGreeting: conversation.welcomeGreeting,
    welcomeAnimationKey: conversation.welcomeAnimationKey,
    isSearchOpen: ui.isSearchOpen,
    setIsSearchOpen: ui.setIsSearchOpen,
    searchQuery: ui.searchQuery,
    setSearchQuery: ui.setSearchQuery,
    isSettingsOpen: ui.isSettingsOpen,
    setIsSettingsOpen: ui.setIsSettingsOpen,
    hintVisible: hint.hintVisible,
    displayedHintText: hint.displayedHintText,
    menuLookup: menu.menuLookup,
    menuById: menu.menuById,
    chatWindowRef: ui.chatWindowRef,
    textareaRef: ui.textareaRef,
    hasUserMessage: ui.hasUserMessage,
    normalizedSearchQuery: ui.normalizedSearchQuery,
    visibleMessages: ui.visibleMessages,
    searchResultCount: ui.searchResultCount,
    router,
    sendMessage,
    sendOverlayMessage: api.sendOverlayMessage,
    handlePickedImage: ui.handlePickedImage,
    handleInputPaste: ui.handleInputPaste,
    removePendingImage: ui.removePendingImage,
    restartConversation: conversation.restartConversation,
    handleChatClick,
    formatMessageTime,
    sanitizeExcessiveBreaks,
    selectedSpeechLang: speech.selectedSpeechLang,
    setSelectedSpeechLang: speech.setSelectedSpeechLang,
    handleMicrophoneClick: speech.handleMicrophoneClick,
    handleSpeakClick: speech.handleSpeakClick,
    recognitionLangRef: speech.recognitionLangRef,
    closeOverlay,
    handleOverlayMicClick: speech.handleOverlayMicClick,
    onClose,
    onOpenCart,
    onCheckout,
  };
}
