// #25/#26/#27/#28/#29/#30/#31/#32 - Core chatbot user stories (customer-facing AI interaction).
// #197/#198/#199/#200/#201/#202/#203 - Chatbot-driven cart, history, and order management actions.
// This hook composes all chatbot sub-hooks and wires them together:
// useChatbotState → useMenuData | useConversation | useLoadingHint | useSpeech | useChatUI | useChatApi
"use client";

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMenuData } from './hooks/useMenuData';
import { useConversation, STORAGE_KEY } from './hooks/useConversation';
import { useSpeech } from './hooks/useSpeech';
import { useChatApi } from './hooks/useChatApi';
import { useLoadingHint } from './hooks/useLoadingHint';
import { useChatUI } from './hooks/useChatUI';

// ==== TYPE DEFINITIONS ====

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  recommendedDrinks?: {
    id: string;
    name: string;
    category: string;
    price: number;
    image?: string;
    nutri_grade?: string | null;
    base_sugar_g?: number | null;
    base_calories?: number | null;
    rating?: number;
  }[];
  healthCard?: {
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
  } | null;
  cartUpdate?: {
    message: string;
    cartItems: { name: string; quantity: number; customization: { size?: string; ice?: string; sugar?: string; toppings?: string[] }; lineTotal: number }[];
    total: number;
  } | null;
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

  // Populate the ref so speech recognition handlers can call sendOverlayMessage
  sendOverlayMessageRef.current = api.sendOverlayMessage;

  const hint = useLoadingHint(api.isLoading);

  // ── Cross-hook effects ─────────────────────────────────────────────────────

  // Register window handlers so AI-generated onclick="handleCart()" buttons use
  // Next.js client-side navigation instead of a full page reload.
  useEffect(() => {
    (window as any).handleCart = () => { router.push('/cart'); };
    (window as any).handleCheckout = () => { router.push('/checkout'); };
    (window as any).goToCheckoutPage = () => { router.push('/checkout'); };
    (window as any).handleMenu = () => { router.push('/menu'); };
  }, [router]);

  // Close sidebar on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape' && isOpen) onClose?.(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

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
  const sendMessage = (text?: string, shouldSpeak?: boolean) =>
    api.sendMessage(text ?? input, shouldSpeak ?? speech.isSpeakMode);

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

  // ── Composed return (same shape as before — ChatbotSidebar.tsx unchanged) ──
  return {
    messages: conversation.messages,
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
    handleMicrophoneClick: speech.handleMicrophoneClick,
    handleSpeakClick: speech.handleSpeakClick,
    closeOverlay,
    handleOverlayMicClick: speech.handleOverlayMicClick,
    onClose,
    onOpenCart,
    onCheckout,
  };
}
