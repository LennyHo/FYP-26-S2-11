"use client";

/**
 * useChatbotState — custom hook that owns all logic for the Avy chatbot.
 * ChatbotSidebar.tsx is a JSX-only shell that consumes this hook.
 *
 * Responsibilities:
 *  - Chat message state and localStorage persistence
 *  - Web Speech API (recognition + synthesis) for mic and speak mode
 *  - Backend chat API calls (text and image)
 *  - Menu lookup table (drink name → id/category) for link generation
 *  - Cart data extraction from bot replies and localStorage sync
 *  - DOM refs (Avy eye tracking, chat scroll, textarea auto-resize)
 */

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, getMenuItems, type DripTeaMenuItem } from "../../utils/dripteaApi";
import { createConversationId } from '../../utils/chatHelpers';

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
  }[];
  healthCard?: {
    currentSugar: number;
    recommendedSugar: number;
    recommendedGrade: string;
  } | null;
}

export interface ChatbotSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenCart?: () => void;
  onCheckout?: () => void;
}

// ==== MODULE-LEVEL CONSTANTS ====

const STORAGE_KEY = "driptea_chatbot_messages";
const CONVERSATION_ID_KEY = "driptea_chatbot_conversation_id";

// Scoped per user so switching accounts on the same device starts a fresh conversation.
function getConversationKey(): string {
  const user = getStoredUser();
  return user?.id ? `${CONVERSATION_ID_KEY}_${user.id}` : CONVERSATION_ID_KEY;
}

const WELCOME_GREETINGS = [
  'Hello, how are you?',
  "What's the vibe for today?",
  'What are you in the mood for today?',
  'What sounds good today?',
  'How can I help your tea mood?',
  'Ready for something refreshing?',
  'What are we sipping today?',
  'Need a drink idea?',
  'Craving something sweet or light?',
  'What can Avy help with today?',
  'Tell me your mood today.',
  'Let us find your perfect drink.',
  'What kind of tea day is it?',
  'Feeling fruity, milky, or cozy?',
];

const getRandomGreeting = () =>
  WELCOME_GREETINGS[Math.floor(Math.random() * WELCOME_GREETINGS.length)];

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

  // ===== STATE =====
  const [messages, setMessages] = useState<Message[]>([]);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [pendingImages, setPendingImages] = useState<Array<{ name: string; previewUrl: string; source: 'camera' | 'screenshot' | 'clipboard' }>>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakMode, setIsSpeakMode] = useState(false);
  const [hideQuickPrompts, setHideQuickPrompts] = useState(false);
  const [overlayTranscript, setOverlayTranscript] = useState('');
  const [overlayMessages, setOverlayMessages] = useState<Message[]>([]);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [welcomeGreeting, setWelcomeGreeting] = useState(WELCOME_GREETINGS[0]);
  const [welcomeAnimationKey, setWelcomeAnimationKey] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [displayedHintText, setDisplayedHintText] = useState('');
  const [menuLookup, setMenuLookup] = useState<Record<string, { id: string; category: string }>>({});
  const [menuById, setMenuById] = useState<Record<string, DripTeaMenuItem>>({});
  const [pendingDrinkForCustomization, setPendingDrinkForCustomization] = useState<{
    name: string;
    id: string;
    step: 'size' | 'ice' | 'sugar' | 'topping';
    size?: string;
    ice?: string;
    sugar?: string;
  } | null>(null);

  // ===== REFS =====
  // Speech API refs are refs (not state) because the recognition event handlers
  // are registered once in a [] effect and would capture stale state values.
  // Refs give synchronous read access to current values inside those closures.
  const recognitionRef = useRef<any>(null);
  const speakModeRef = useRef(false);       // mirrors isSpeakMode for use inside recognition callbacks
  const voiceConversationRef = useRef(false); // true while a voice conversation session is active
  const isListeningRef = useRef(false);     // mirrors isListening for use inside recognition callbacks
  const isRecognitionStartingRef = useRef(false); // debounce guard — prevents double .start() calls
  const lastSentRef = useRef('');           // prevents auto-sending the same transcript twice
  const speechBaseRef = useRef('');         // input text before mic session started, for interim replacement
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ===== EFFECTS =====

  // Register global window handlers so AI-generated button HTML (onclick="handleCart()")
  // can trigger Next.js client-side navigation instead of a full page reload.
  useEffect(() => {
    (window as any).handleCart = () => { router.push("/cart"); };
    (window as any).handleCheckout = () => { router.push("/checkout"); };
    (window as any).goToCheckoutPage = () => { router.push("/checkout"); };
  }, [router]);

  const getCurrentUserId = () => {
    const user = getStoredUser();
    return user?.id || "";
  };

  useEffect(() => {
    getMenuItems('active').then(res => {
      const lookup: Record<string, { id: string; category: string }> = {};
      const byId: Record<string, DripTeaMenuItem> = {};
      (res.data || []).forEach(item => {
        const key = item.name.toLowerCase().replace(/\s+/g, '');
        lookup[key] = { id: item.id, category: item.category };
        byId[item.id] = item;
      });
      setMenuLookup(lookup);
      setMenuById(byId);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const greeting = getRandomGreeting();
    setWelcomeGreeting(greeting);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setHintVisible(false);
      return;
    }
    const FADE_MS = 350;
    let idx = 0;

    const show = (text: string) => {
      setDisplayedHintText(text);
      setHintVisible(true);
    };

    const cycle = () => {
      setHintVisible(false);
      setTimeout(() => {
        idx = (idx + 1) % SLOW_HINTS.length;
        show(SLOW_HINTS[idx]);
      }, FADE_MS);
    };

    const firstTimer = setTimeout(() => show(SLOW_HINTS[0]), 1500);
    const interval = setInterval(cycle, 3500);
    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
  }, [isLoading]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (previewIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPreviewIndex(null); return; }
      if (e.key === 'ArrowLeft') {
        setPreviewIndex(prev => (prev && prev > 0 ? prev - 1 : prev));
        return;
      }
      if (e.key === 'ArrowRight') {
        setPreviewIndex(prev => (typeof prev === 'number' && prev < pendingImages.length - 1 ? prev + 1 : prev));
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewIndex, pendingImages.length]);

  useEffect(() => {
    const savedConversationId = localStorage.getItem(getConversationKey());
    if (savedConversationId) {
      setConversationId(savedConversationId);
    } else {
      const newConversationId = createConversationId();
      localStorage.setItem(getConversationKey(), newConversationId);
      setConversationId(newConversationId);
    }
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch {
        const greetingMsg: Message = { id: Date.now().toString(), text: 'Hello! How can I help you today?', isUser: false };
        setMessages([greetingMsg]);
      }
    } else {
      const greetingMsg: Message = { id: Date.now().toString(), text: 'Hello! How can I help you today?', isUser: false };
      setMessages([greetingMsg]);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('⚠️ This browser does not support Speech Recognition. Use Chrome, Edge, or Safari.');
    }
  }, [messages, isInitialized]);

  // Keep speakModeRef in sync so recognition event handlers (registered with [] deps)
  // can read the current speak mode without a stale closure.
  useEffect(() => {
    speakModeRef.current = isSpeakMode;
  }, [isSpeakMode]);

  // In speak mode, auto-send whenever a new transcript lands in the input field.
  // lastSentRef guards against re-sending the same text if the effect re-fires.
  useEffect(() => {
    if (isSpeakMode && input.trim() && input !== lastSentRef.current && !isLoading) {
      lastSentRef.current = input;
      sendMessage(input, true);
    }
  }, [input, isSpeakMode, isLoading]);

  // Initialize the Web Speech API once on mount ([] deps).
  // The recognition instance is stored in a ref so its event handlers always
  // read speakModeRef / isListeningRef directly, avoiding stale closures.
  // NOTE: sendOverlayMessage is captured from first render — this is intentional;
  // the overlay send path doesn't depend on any state that changes after mount.
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported');
      return;
    }
    if (recognitionRef.current) return;
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isRecognitionStartingRef.current = false;
        setIsListening(true);
        isListeningRef.current = true;
      };
      recognition.onend = () => {
        isRecognitionStartingRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
      };
      recognition.onresult = (event: any) => {
        if (speakModeRef.current) {
          // Speak mode — only care about the most recent final result.
          let interimText = '';
          let finalText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript.trim();
            if (event.results[i].isFinal) finalText += t + ' ';
            else interimText += t;
          }
          if (interimText) setOverlayTranscript(interimText);
          if (finalText) {
            const text = finalText.trim();
            setOverlayTranscript('');
            if (recognitionRef.current && isListeningRef.current) {
              try { recognitionRef.current.stop(); } catch {}
              setIsListening(false);
              isListeningRef.current = false;
            }
            const userMsg: Message = { id: Date.now().toString(), text, isUser: true };
            setOverlayMessages(prev => [...prev, userMsg]);
            sendOverlayMessage(text, true);
          }
        } else {
          // Regular mic mode — rebuild input from ALL results in the session
          // so interim never gets double-counted when it becomes final.
          let allFinalized = '';
          let currentInterim = '';
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              allFinalized += event.results[i][0].transcript.trim() + ' ';
            } else {
              currentInterim += event.results[i][0].transcript.trim();
            }
          }
          const base = speechBaseRef.current;
          const parts = [base, allFinalized.trim(), currentInterim].filter(Boolean);
          setInput(parts.join(' '));
        }
      };
      recognition.onerror = (event: any) => {
        console.error('✗ Speech recognition error:', event.error);
        isRecognitionStartingRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
      };
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('✗ Error initializing Speech Recognition:', error);
    }
  }, []);

  // Delay mic start by 220 ms when speak mode activates so the overlay CSS
  // transition has time to begin before the browser mic permission prompt appears.
  useEffect(() => {
    if (!isSpeakMode) return;
    const t = setTimeout(() => {
      if (!recognitionRef.current) return;
      if (!isListeningRef.current && !isRecognitionStartingRef.current) {
        requestRecognitionStart();
      }
    }, 220);
    return () => clearTimeout(t);
  }, [isSpeakMode]);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({ top: chatWindowRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // ===== HELPER FUNCTIONS =====

  const requestRecognitionStart = () => {
    if (!recognitionRef.current || isListeningRef.current || isRecognitionStartingRef.current) return;
    isRecognitionStartingRef.current = true;
    speechBaseRef.current = textareaRef.current?.value ?? '';
    try {
      recognitionRef.current.start();
      // Auto-stop after 15 s to prevent the mic staying open indefinitely
      // if the user walks away without explicitly stopping.
      setTimeout(() => {
        if (recognitionRef.current && isListeningRef.current) {
          recognitionRef.current.stop();
        }
      }, 15000);
    } catch (error) {
      isRecognitionStartingRef.current = false;
      console.error('✗ Error starting speech recognition:', error);
    }
  };

  // Cancel any ongoing TTS before starting the mic — without this, the mic
  // would pick up Avy's own voice and create a feedback loop.
  const stopNarrationAndListen = () => {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();
    if (isListeningRef.current || isRecognitionStartingRef.current || !recognitionRef.current) return;
    setTimeout(() => {
      if (!voiceConversationRef.current || !recognitionRef.current || isListeningRef.current || isRecognitionStartingRef.current) return;
      requestRecognitionStart();
    }, 120);
  };

  const handleMicrophoneClick = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not available. This feature requires Chrome, Edge, or Safari.');
      return;
    }
    try {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        isListeningRef.current = false;
        isRecognitionStartingRef.current = false;
        speakModeRef.current = false;
        voiceConversationRef.current = false;
        setIsSpeakMode(false);
        setHideQuickPrompts(false);
      } else {
        requestRecognitionStart();
      }
    } catch (error) {
      console.error('✗ Error with microphone:', error);
      setIsListening(false);
    }
  };

  const speakText = (text: string, onEndCallback?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const friendlyVoice = voices.find(v =>
        v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female')
      );
      if (friendlyVoice) utterance.voice = friendlyVoice;
      utterance.pitch = 1.1;
      utterance.rate = 1.0;
      utterance.onend = () => { if (onEndCallback) onEndCallback(); };
      utterance.onerror = () => { if (onEndCallback) onEndCallback(); };
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEndCallback) onEndCallback();
    }
  };

  const handleSpeakClick = async () => {
    speakModeRef.current = true;
    voiceConversationRef.current = true;
    setIsSpeakMode(true);
    setHideQuickPrompts(true);
    stopNarrationAndListen();
  };

  const closeOverlay = () => {
    window.speechSynthesis?.cancel();
    if (recognitionRef.current && isListeningRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsSpeakMode(false);
    speakModeRef.current = false;
    voiceConversationRef.current = false;
    setHideQuickPrompts(false);
    if (overlayMessages.length > 0) {
      setMessages(prev => {
        const updated = [...prev, ...overlayMessages];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
    }
    setOverlayMessages([]);
    setOverlayTranscript('');
    setOverlayLoading(false);
  };

  const handleOverlayMicClick = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not available. This feature requires Chrome, Edge, or Safari.');
      return;
    }
    if (isListeningRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    } else {
      // Cancel any ongoing TTS before opening the mic — prevents Avy's
      // voice from being picked up and echoed back as a new message.
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) synth.cancel();
      requestRecognitionStart();
    }
  };

  // ===== MAIN MESSAGE HANDLERS =====

  async function sendMessage(text?: string, shouldSpeak: boolean = isSpeakMode) {
    const messageText = text || input.trim();

    if (pendingImages.length > 0) {
      const img = pendingImages[0];
      try {
        setIsLoading(true);
        const response = await fetch(img.previewUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === 'string') resolve(result.split(',')[1]);
            else reject(new Error('Failed to read image'));
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `<img src="${img.previewUrl}" alt="uploaded image" style="max-width:120px;max-height:120px;border-radius:8px;" />`,
          isUser: true,
        }]);
        setPendingImages([]);
        setInput('');
        let convId = conversationId;
        if (!convId) {
          convId = createConversationId();
          try { localStorage.setItem(getConversationKey(), convId); } catch {}
          setConversationId(convId);
        }
        const apiBase = process.env.NODE_ENV === 'development'
          ? 'http://localhost:5000'
          : ((process.env.NEXT_PUBLIC_DRIPTEA_API_BASE?.trim()) || 'https://driptea-trrn.onrender.com');
        const res = await fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageText || 'Describe this drink', image: base64, conversationId: convId }),
        });
        const data = await res.json();
        const replyText = typeof data?.reply === 'string' ? data.reply : 'Error connecting to backend';
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: replyText, isUser: false }]);
      } catch {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: 'Error sending image.', isUser: false }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!messageText) return;

    let convId = conversationId;
    if (!convId) {
      convId = createConversationId();
      try { localStorage.setItem(getConversationKey(), convId); } catch {}
      setConversationId(convId);
    }

    if (shouldSpeak && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
      setIsSpeakMode(false);
      speakModeRef.current = false;
      setHideQuickPrompts(true);
    }

    const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const configured = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE?.trim();
      const apiEndpoint = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000/api/chat'
        : (configured ? `${configured.replace(/\/$/, '')}/api/chat` : '/api/chat');

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, conversationId: convId, userId: getCurrentUserId() }),
      });

      const data: unknown = await response.json();
      const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      const rawReply = typeof payload.reply === 'string'
        ? payload.reply
        : "I'm so sorry for the inconvenience! Our server seems to be taking a short break. Please try again in a moment, or feel free to visit us in store and our baristas will be happy to help.";
      const recommendedDrinks = Array.isArray(payload.recommendedDrinks)
        ? (payload.recommendedDrinks as Message['recommendedDrinks'])
        : [];
      const healthCard = payload.healthCard && typeof payload.healthCard === 'object'
        ? (payload.healthCard as Message['healthCard'])
        : null;

      const strippedReply = rawReply.replace(/<div[^>]*class="[^"]*hidden-cart-data[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
      const sanitizedReply = strippedReply.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: sanitizedReply, isUser: false, recommendedDrinks, healthCard };
      setMessages(prev => [...prev, botMsg]);

      if (shouldSpeak) {
        const plainText = botMsg.text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const humaneIntro = plainText.match(/^(hello|hi|hey|sure|absolutely|of course|here's|here is)/i) ? plainText : `Sure — ${plainText}`;
        speakText(humaneIntro);
      }

      if (/added to your cart/i.test(botMsg.text)) {
        window.dispatchEvent(new Event('cartUpdated'));
      }

      // Dual cart-data extraction strategy:
      // 1. Primary — backend embeds a hidden <div class="hidden-cart-data"> in the reply HTML.
      //    We parse it client-side and write it to localStorage so the cart badge stays in sync.
      // 2. Fallback — if the hidden block is absent (older backend), parse visible markdown bullets
      //    matching the pattern "* **Name** - S$ X.XX" with sub-bullet details.
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(botMsg.text, 'text/html');
        const hiddenEls = doc.querySelectorAll('.hidden-cart-data');
        if (hiddenEls.length > 0) {
          const latestCartData = hiddenEls[hiddenEls.length - 1].textContent || '';
          localStorage.setItem('dripTeaCartData', latestCartData.trim());
          window.dispatchEvent(new Event('cartUpdated'));
        } else {
          const normalized = botMsg.text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
          const lines = normalized.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const items: string[] = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const m = line.match(/^\*\s*\*\*([^*]+)\*\*\s*-\s*S\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
            if (m) {
              const name = m[1].trim();
              const price = parseFloat(m[2]) || 0;
              const details: string[] = [];
              let j = i + 1;
              while (j < lines.length && /^[-*]/.test(lines[j])) {
                details.push(lines[j].replace(/^[-*]\s*/, '').trim());
                j++;
              }
              items.push(`${name} | ${details.join(' · ')} | S$ ${price.toFixed(2)}`);
              i = j - 1;
            }
          }
          if (items.length > 0) {
            const existing = localStorage.getItem('dripTeaCartData') || '';
            const updated = existing ? existing + '\n' + items.join('\n') : items.join('\n');
            localStorage.setItem('dripTeaCartData', updated.trim());
            window.dispatchEvent(new Event('cartUpdated'));
          }
        }
      } catch {
        setTimeout(() => {
          const hiddenBlocks = document.querySelectorAll('.hidden-cart-data');
          if (hiddenBlocks.length > 0) {
            const latestCartData = hiddenBlocks[hiddenBlocks.length - 1].textContent || '';
            localStorage.setItem('dripTeaCartData', latestCartData.trim());
            window.dispatchEvent(new Event('cartUpdated'));
          }
        }, 300);
      }
    } catch {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm so sorry for the inconvenience! It looks like our server is currently unavailable. Please try again shortly, or visit us in store and our friendly baristas will be glad to assist you.",
        isUser: false,
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  async function sendOverlayMessage(text: string, shouldSpeak: boolean = true) {
    if (!text) return;
    setOverlayLoading(true);
    let convId = conversationId;
    if (!convId) {
      convId = createConversationId();
      try { localStorage.setItem(getConversationKey(), convId); } catch {}
      setConversationId(convId);
    }
    try {
      const configured = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE?.trim();
      const apiEndpoint = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000/api/chat'
        : (configured ? `${configured.replace(/\/$/, '')}/api/chat` : '/api/chat');
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: convId, userId: getCurrentUserId() }),
      });
      const data: unknown = await response.json();
      const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      const rawReply = typeof payload.reply === 'string' ? payload.reply : "I'm so sorry for the inconvenience! Our server seems to be taking a short break. Please try again in a moment.";
      const recommendedDrinks = Array.isArray(payload.recommendedDrinks)
        ? (payload.recommendedDrinks as Message['recommendedDrinks'])
        : [];
      const healthCard = payload.healthCard && typeof payload.healthCard === 'object'
        ? (payload.healthCard as Message['healthCard'])
        : null;
      const strippedReply = rawReply.replace(/<div[^>]*class="[^"]*hidden-cart-data[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
      const sanitizedReply = strippedReply.replace(/(<br\s*\/?>(\s|&nbsp;)*){3,}/gi, '<br><br>');
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: sanitizedReply, isUser: false, recommendedDrinks, healthCard };
      setOverlayMessages(prev => [...prev, botMsg]);
      if (shouldSpeak) {
        const plainText = botMsg.text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        speakText(plainText);
      }
    } catch {
      const errorText = "I'm so sorry for the inconvenience! Our server seems to be unavailable right now. Please try again in a moment.";
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: errorText, isUser: false };
      setOverlayMessages(prev => [...prev, botMsg]);
      if (shouldSpeak) speakText(errorText);
    } finally {
      setOverlayLoading(false);
    }
  }

  const handlePickedImage = (file: File | null, source: 'camera' | 'screenshot' | 'clipboard') => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingImages(prev => [...prev, { name: file.name, previewUrl, source }]);
  };

  const handleInputPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData.items || []);
    const imageItem = items.find(item => item.kind === 'file' && item.type.startsWith('image/'));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    event.preventDefault();
    handlePickedImage(file, 'clipboard');
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => {
      const item = prev[index];
      if (item) { try { URL.revokeObjectURL(item.previewUrl); } catch {} }
      return prev.filter((_, i) => i !== index);
    });
  };

  function restartConversation() {
    const newConversationId = createConversationId();
    setWelcomeGreeting(getRandomGreeting());
    setWelcomeAnimationKey(key => key + 1);
    const greetingMsg: Message = { id: Date.now().toString(), text: "Hello! I'm Avy, your DripTea companion. How can I help you today?", isUser: false };
    setConversationId(newConversationId);
    setMessages([greetingMsg]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([greetingMsg]));
    localStorage.setItem(getConversationKey(), newConversationId);
  }

  const handleChatClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('chat-drink-link') && target instanceof HTMLAnchorElement) {
      e.preventDefault();
      e.stopPropagation();
      const href = target.getAttribute('href');
      if (href) router.push(href);
      return;
    }
    if (target.tagName === 'A' && target.classList.contains('chat-nav-btn-compact') && target instanceof HTMLAnchorElement) {
      e.preventDefault();
      e.stopPropagation();
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
        if (priceMatch) localStorage.setItem("dripTeaCartTotal", priceMatch[0]);
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

  // ===== DERIVED VALUES =====
  const hasUserMessage = messages.some(msg => msg.isUser);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleMessages = normalizedSearchQuery
    ? messages.filter(msg => msg.text.replace(/<[^>]*>/g, ' ').toLowerCase().includes(normalizedSearchQuery))
    : messages;
  const searchResultCount = normalizedSearchQuery ? visibleMessages.length : 0;

  return {
    // state
    messages,
    addedIds,
    input,
    setInput,
    isLoading,
    isInitialized,
    conversationId,
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
    isSettingsOpen,
    setIsSettingsOpen,
    hintVisible,
    displayedHintText,
    menuLookup,
    menuById,
    // DOM refs
    chatWindowRef,
    textareaRef,
    // derived
    hasUserMessage,
    normalizedSearchQuery,
    visibleMessages,
    searchResultCount,
    // handlers
    router,
    sendMessage,
    sendOverlayMessage,
    handlePickedImage,
    handleInputPaste,
    removePendingImage,
    restartConversation,
    handleChatClick,
    formatMessageTime,
    sanitizeExcessiveBreaks,
    handleMicrophoneClick,
    handleSpeakClick,
    closeOverlay,
    handleOverlayMicClick,
    // extra props needed by JSX
    onClose,
    onOpenCart,
    onCheckout,
  };
}
