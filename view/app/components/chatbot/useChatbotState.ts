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
  // Set only on a simulated human-agent handoff message — renders with that name/a distinct
  // avatar instead of Avy's, so the handoff actually looks like someone else joined the chat.
  agentName?: string;
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
  // True when the reply answers more than one request, so the UI stacks the cards.
  multiIntent?: boolean;
  // One entry per request answered, each carrying its own cards so they render together.
  segments?: {
    reply: string;
    voucherCard?: Message['voucherCard'];
    storeCards?: Message['storeCards'];
    purchaseHistory?: Message['purchaseHistory'];
    orderStatusCard?: Message['orderStatusCard'];
    cartUpdate?: Message['cartUpdate'];
    orderReceipt?: Message['orderReceipt'];
    recommendedDrinks?: Message['recommendedDrinks'];
    healthCard?: Message['healthCard'];
  }[];
  healthCard?: {
    drinkName?: string;
    currentSugar: number;
    currentGrade: string;
    currentSugarLevel?: string | null;
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
    orderId?: string;
    orderNo: string;
    phase: number;
    message: string;
    stepLabels: string[];
    orderType?: 'pickup' | 'delivery';
    deliveryAddress?: string | null;
    lang?: string;
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
      if (!user?.id) {
        router.push('/login');
        return;
      }

      try {
        const res = await getCartItems(user.id);
        if (!res.data || res.data.length === 0) {
          alert('Your cart is empty. Please add items before checking out.');
          return;
        }
      } catch {
        // If the check fails, let the checkout page handle validation
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

        // Snapping any earlier order-status card to "fully complete" is handled
        // by OrderStatusCard.tsx itself (it listens for this same event) —
        // it owns its own live-polled display state, so pushing an update
        // through this message's props wouldn't be picked up after mount.
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
