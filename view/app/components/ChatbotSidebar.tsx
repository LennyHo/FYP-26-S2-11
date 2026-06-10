"use client";

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './ChatbotSidebar.module.css';
import { getStoredUser } from "../utils/dripteaApi";
import {
  drinkData,
  QUICK_PROMPTS,
  createConversationId,
  convertDrinkNamesToLinks,
  applyGlossaryTooltips,
} from '../utils/chatHelpers';
// import ImageUploadButton from './ImageUploadButton';
import SpeechControls from './SpeechControls';
import QuickPrompts from './QuickPrompts';
import DrinkRecCards from './DrinkRecCards';
import OrderReceiptCard from './OrderReceiptCard';
import avyLogo from '../../img/Group 2.svg';
import menuData from '../../data/menu.json';
import DrinkCard from "./DrinkCard";

// ==== TYPE DEFINITIONS ====

/** Metadata for sources cited in bot responses */
interface MessageSource {
  title: string;
  url: string;
  snippet?: string;
  sourceName?: string;
  favicon?: string;
}

/** Represents a single message in the chat */
interface Message {
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

interface ChatbotSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenCart?: () => void;
  onCheckout?: () => void;
}

// ===== CONSTANTS =====
const STORAGE_KEY = "driptea_chatbot_messages";
const CONVERSATION_ID_KEY = "driptea_chatbot_conversation_id";
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

const getRandomGreeting = () => {
  const index = Math.floor(Math.random() * WELCOME_GREETINGS.length);
  return WELCOME_GREETINGS[index];
};

/** List of trusted health/news sources for filtering reliable information */
const TRUSTED_SOURCE_HOSTS = [
  'hpb.gov.sg',
  'moh.gov.sg',
  'nus.edu.sg',
  'ntu.edu.sg',
  'sph.com.sg',
  'channelnewsasia.com',
  'todayonline.com',
  'straitstimes.com',
];

export default function ChatbotSidebar({ isOpen, onClose, onOpenCart, onCheckout }: ChatbotSidebarProps) {
  // ===== STATE MANAGEMENT =====
  // Chat state
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
  const [slowHintIndex, setSlowHintIndex] = useState(-1);
  // ===== REFS (NON-STATE VALUES) =====
  // Speech API references
  const recognitionRef = useRef<any>(null);
  const speakModeRef = useRef(false);
  const voiceConversationRef = useRef(false);
  const isListeningRef = useRef(false);
  const isRecognitionStartingRef = useRef(false);
  const narrationVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const inputRef = useRef('');
  const lastSentRef = useRef('');
  /** Tracks drink customization flow (step-by-step: size → ice → sugar → topping) */
  const [pendingDrinkForCustomization, setPendingDrinkForCustomization] = useState<{
    name: string;
    id: string;
    step: 'size' | 'ice' | 'sugar' | 'topping';
    size?: string;
    ice?: string;
    sugar?: string;
  } | null>(null);

  const router = useRouter();

  useEffect(() => {
    (window as any).handleCart = () => {
      router.push("/cart");
    };

    (window as any).handleCheckout = () => {
      router.push("/checkout");
    };

    (window as any).handleMenu = () => {
      router.push("/buy-driptea");
    };

    (window as any).handlePurchaseHistory = () => {
      router.push("/purchase-history");
    };

    return () => {
      delete (window as any).handleCart;
      delete (window as any).handleCheckout;
      delete (window as any).handleMenu;
      delete (window as any).handlePurchaseHistory;
    };
  }, [router]);


  const getCurrentUserId = () => {
    const user = getStoredUser();
    return user?.id || "";
  };

  // ===== EFFECTS =====

  useEffect(() => {
    if (isOpen) {
      setWelcomeGreeting(getRandomGreeting());
      setWelcomeAnimationKey(key => key + 1);
    }
  }, [isOpen]);

  const SLOW_HINTS = [
    'Our barista is still brewing... ☕',
    'Good things take a little time 🧋',
    'Avy is thinking hard for you!',
    'Almost there, hang tight...',
    'Stirring in some extra magic ✨',
  ];

  useEffect(() => {
    if (!isLoading) { setSlowHintIndex(-1); return; }
    const interval = setInterval(() => {
      setSlowHintIndex(i => (i + 1) % SLOW_HINTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  /** Keyboard navigation for image preview (Arrow keys to navigate, Escape to close) */
  useEffect(() => {
    if (previewIndex === null) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewIndex(null);
        return;
      }
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
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const avyLogoRef = useRef<HTMLDivElement>(null);
  const avyEyeLeftRef = useRef<SVGPathElement>(null);
  const avyEyeRightRef = useRef<SVGPathElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  /** Initialize chat: restore conversation history or start fresh */
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
        const greetingMsg: Message = {
          id: Date.now().toString(),
          text: 'Hello! How can I help you today?',
          isUser: false,
        };
        setMessages([greetingMsg]);
      }
    } else {
      const greetingMsg: Message = {
        id: Date.now().toString(),
        text: 'Hello! How can I help you today?',
        isUser: false,
      };
      setMessages([greetingMsg]);
    }
    setIsInitialized(true);
  }, []);

  /** Persist messages to storage and log Speech API availability */
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    
    // Log system info for debugging
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition || 
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;
    
    console.log('🎤 Speech Recognition Available:', !!SpeechRecognition);
    if (!SpeechRecognition) {
      console.warn('⚠️ This browser does not support Speech Recognition. Use Chrome, Edge, or Safari.');
    }
  }, [messages, isInitialized]);

  /** Sync isSpeakMode state with ref so event handlers can access current value */
  useEffect(() => {
    speakModeRef.current = isSpeakMode;
  }, [isSpeakMode]);

  /** Sync input state with ref for access in event handlers */
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  /** Auto-send message in speak mode when user stops speaking and input updates */
  useEffect(() => {
    if (isSpeakMode && input.trim() && input !== lastSentRef.current && !isLoading) {
      console.log('Auto-sending in speak mode:', input);
      lastSentRef.current = input;
      sendMessage(input, true);
    }
  }, [input, isSpeakMode, isLoading]);

  /** Initialize Web Speech API (Speech Recognition for microphone input) */
  /** Sets up event handlers for start, result, error, and end events */
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition || 
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported');
      alert('Speech Recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (recognitionRef.current) return;

    try {
      const recognition = new SpeechRecognition();
      
      // Set recognition properties
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isRecognitionStartingRef.current = false;
        setIsListening(true);
        isListeningRef.current = true;
        console.log('✓ Speech recognition started');
      };

      recognition.onend = () => {
        isRecognitionStartingRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
        console.log('✓ Speech recognition ended');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          
          if (event.results[i].isFinal) {
            final += transcript + ' ';
            console.log('Final:', transcript);
          } else {
            interim += transcript;
            console.log('Interim:', transcript);
          }
        }

        if (interim) {
          if (speakModeRef.current || isSpeakMode) {
            setOverlayTranscript(interim);
          } else {
            // show interim in the normal input while not in speak overlay
            setInput((prev) => {
              const newInput = prev ? prev + ' ' + interim.trim() : interim.trim();
              return newInput;
            });
          }
        }

          if (final) {
                    const text = final.trim();
                    if (speakModeRef.current || isSpeakMode) {
                      setOverlayTranscript('');
                      
                      // CRITICAL FIX: Stop listening immediately!
                      // This prevents the bot from hearing itself speak and enables the clean turn-based loop.
                      if (recognitionRef.current && isListeningRef.current) {
                        try { recognitionRef.current.stop(); } catch (e) {}
                        setIsListening(false);
                        isListeningRef.current = false;
                      }

                      const userMsg: Message = { id: Date.now().toString(), text, isUser: true };
                      setOverlayMessages(prev => [...prev, userMsg]);
                      
                      // Send the phrase to the backend
                      sendOverlayMessage(text, true);
                    } else {
                      setInput((prev) => {
                        const newInput = prev ? prev + ' ' + text : text;
                        return newInput;
                      });
                    }
                  }
      };

      recognition.onerror = (event: any) => {
        console.error('✗ Speech recognition error:', event.error);
        isRecognitionStartingRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
        
        // Show user-friendly error messages
        const errorMessages: Record<string, string> = {
          'no-speech': 'No speech detected. Please speak louder and try again.',
          'audio-capture': 'No microphone found. Please check your device.',
          'network': 'Network error. Please check your connection.',
          'permission-denied': 'Microphone permission denied. Please allow access.',
        };
        
        const message = errorMessages[event.error] || `Error: ${event.error}`;
        console.log('Error message:', message);
      };

      recognitionRef.current = recognition;
      console.log('✓ Speech Recognition initialized successfully');
    } catch (error) {
      console.error('✗ Error initializing Speech Recognition:', error);
    }
  }, []);

  // ===== HELPER FUNCTIONS =====

  /** Track mouse position and move Avy's eyes accordingly (parallax effect) */
  const updateAvyEyes = (clientX: number, clientY: number) => {
    const bounds = avyLogoRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const deltaX = (clientX - centerX) / (bounds.width / 2);
    const deltaY = (clientY - centerY) / (bounds.height / 2);

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const x = clamp(deltaX * 5, -5, 5);
    const y = clamp(deltaY * 4, -4, 4);

    if (avyEyeLeftRef.current) {
      avyEyeLeftRef.current.style.setProperty('--avy-eye-x', `${x * 0.6}px`);
      avyEyeLeftRef.current.style.setProperty('--avy-eye-y', `${y * 0.6}px`);
    }

    if (avyEyeRightRef.current) {
      avyEyeRightRef.current.style.setProperty('--avy-eye-x', `${x * 0.95}px`);
      avyEyeRightRef.current.style.setProperty('--avy-eye-y', `${y * 0.95}px`);
    }
  };

  const resetAvyEyes = () => {
    if (avyEyeLeftRef.current) {
      avyEyeLeftRef.current.style.removeProperty('--avy-eye-x');
      avyEyeLeftRef.current.style.removeProperty('--avy-eye-y');
    }

    if (avyEyeRightRef.current) {
      avyEyeRightRef.current.style.removeProperty('--avy-eye-x');
      avyEyeRightRef.current.style.removeProperty('--avy-eye-y');
    }
  };

  /** Toggle speech recognition: start listening or stop recording */
  const handleMicrophoneClick = () => {
    if (!recognitionRef.current) {
      console.error('✗ Speech recognition not initialized');
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
        console.log('Stopped listening');
      } else {
        requestRecognitionStart();
      }
    } catch (error) {
      console.error('✗ Error with microphone:', error);
      setIsListening(false);
    }
  };

  const requestRecognitionStart = () => {
    if (!recognitionRef.current || isListeningRef.current || isRecognitionStartingRef.current) {
      return;
    }

    isRecognitionStartingRef.current = true;

    try {
      recognitionRef.current.start();
      console.log('Started listening - please speak now...');

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (recognitionRef.current && isListeningRef.current) {
          recognitionRef.current.stop();
          console.log('Auto-stopped after 15 seconds');
        }
      }, 15000);
    } catch (error) {
      isRecognitionStartingRef.current = false;
      console.error('✗ Error starting speech recognition:', error);
    }
  };

  const resumeSpeakModeListening = () => {
    if (!voiceConversationRef.current || !recognitionRef.current) {
      return;
    }

    setIsSpeakMode(true);
    speakModeRef.current = true;

    if (isListeningRef.current) return;

    setTimeout(() => {
      if (!voiceConversationRef.current || !recognitionRef.current || isListeningRef.current || isRecognitionStartingRef.current) {
        return;
      }

      requestRecognitionStart();
    }, 120);
  };

  const stopNarrationAndListen = () => {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) {
      synth.cancel();
    }

    if (isListeningRef.current || isRecognitionStartingRef.current || !recognitionRef.current) {
      return;
    }

    setTimeout(() => {
      if (!voiceConversationRef.current || !recognitionRef.current || isListeningRef.current || isRecognitionStartingRef.current) {
        return;
      }

      requestRecognitionStart();
    }, 120);
  };

  // When speak mode is activated, start recognition after a short delay
  useEffect(() => {
    if (!isSpeakMode) return;

    const t = setTimeout(() => {
      if (!recognitionRef.current) return;
      if (!isListeningRef.current && !isRecognitionStartingRef.current) {
        requestRecognitionStart();
      }
    }, 220); // allow overlay transition to begin

    return () => clearTimeout(t);
  }, [isSpeakMode]);

  /** Select best available TTS voice with preference for natural/neural voices */
  const pickNarrationVoice = () => {
    if (narrationVoiceRef.current) {
      return narrationVoiceRef.current;
    }

    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (!voices.length) {
      return null;
    }

    const preferredVoiceMatchers = [
      /microsoft .*online/i,
      /google .*male|google .*female/i,
      /natural/i,
      /premium/i,
      /neural/i,
      /samantha/i,
      /karen/i,
    ];

    const preferredLangVoices = voices.filter(voice => voice.lang?.toLowerCase().startsWith('en'));
    const candidateVoices = preferredLangVoices.length > 0 ? preferredLangVoices : voices;

    const matchedVoice = candidateVoices.find(voice =>
      preferredVoiceMatchers.some(pattern => pattern.test(voice.name))
    );

    narrationVoiceRef.current = matchedVoice || candidateVoices[0] || voices[0] || null;
    return narrationVoiceRef.current;
  };

  /** Text-to-speech using Web Speech API with selected voice, rate, pitch, and volume */
// --- NARRATIVE AUDIO HELPER ---
  // This reads text out loud and then triggers a callback when finished
  const speakText = (text: string, onEndCallback?: () => void) => {
    if ('speechSynthesis' in window) {
      // 1. Stop any currently playing audio
      window.speechSynthesis.cancel(); 

      // 2. Clean the text (remove markdown so she doesn't say "asterisk")
      const cleanText = text.replace(/[*#]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // 3. Try to find a friendly female voice
      const voices = window.speechSynthesis.getVoices();
      const friendlyVoice = voices.find(v => 
        v.name.includes('Female') || 
        v.name.includes('Samantha') || 
        v.name.includes('Google UK English Female')
      );
      if (friendlyVoice) utterance.voice = friendlyVoice;
      
      utterance.pitch = 1.1; 
      utterance.rate = 1.0;  

      // 4. THE CRITICAL PART: When she finishes speaking, run the callback!
      utterance.onend = () => {
        if (onEndCallback) onEndCallback();
      };

      // 5. If the audio engine fails, don't freeze the app—just run the callback anyway
      utterance.onerror = () => {
        console.error("Speech synthesis failed.");
        if (onEndCallback) onEndCallback();
      };

      // 6. Speak!
      window.speechSynthesis.speak(utterance);
    } else {
      // If the browser doesn't support text-to-speech, just run the callback immediately
      if (onEndCallback) onEndCallback();
    }
  };

  /** Activate speak mode: enters voice conversation where bot responses are read aloud */
  const handleSpeakClick = async () => {
    speakModeRef.current = true;
    voiceConversationRef.current = true;
    setIsSpeakMode(true);
    setHideQuickPrompts(true);

    stopNarrationAndListen();
  };

  /** Close the voice overlay and stop all speech/listening */
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

  /** Toggle mic listening inside the overlay (does NOT close the overlay) */
  const handleOverlayMicClick = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not available. This feature requires Chrome, Edge, or Safari.');
      return;
    }
    if (isListeningRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    } else {
      requestRecognitionStart();
    }
  };

  // ===== MAIN MESSAGE HANDLER =====
  /**
   * Send user message and receive bot response
   * Handles:
   * - Cart queries (local, from localStorage)
   * - Drink add-to-cart with step-by-step customization (size → ice → sugar → topping)
   * - General chat requests (sent to backend)
   * - Text-to-speech in voice conversation mode
   */
  async function sendMessage(text?: string, shouldSpeak: boolean = isSpeakMode) {
    const messageText = text || input.trim();
    // If there is a pending image, send it instead of text
    if (pendingImages.length > 0) {
      const img = pendingImages[0];
      try {
        setIsLoading(true);
        // Fetch the image as blob and convert to base64
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
        // Add user message with image preview
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `<img src="${img.previewUrl}" alt="uploaded image" style="max-width:120px;max-height:120px;border-radius:8px;" />`,
          isUser: true,
        }]);
        setPendingImages([]);
        setInput('');
        // Send to backend
        let convId = conversationId;
        if (!convId) {
          convId = createConversationId();
          try { localStorage.setItem(getConversationKey(), convId); } catch (e) {}
          setConversationId(convId);
        }
        const apiBase = process.env.NODE_ENV === 'development'
          ? 'http://localhost:5000'
          : ((process.env.NEXT_PUBLIC_DRIPTEA_API_BASE && process.env.NEXT_PUBLIC_DRIPTEA_API_BASE.trim()) || 'https://driptea-trrn.onrender.com');
        const res = await fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText || 'Describe this drink',
            image: base64,
            conversationId: convId,
          }),
        });
        const data = await res.json();
        const replyText = typeof data?.reply === 'string' ? data.reply : 'Error connecting to backend';
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: replyText,
          isUser: false,
        }]);
      } catch (err) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: 'Error sending image.',
          isUser: false,
        }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    if (!messageText) return;

    // Ensure a conversationId exists; create one as a fallback (prevents silent early return)
    let convId = conversationId;
    if (!convId) {
      convId = createConversationId();
      try { localStorage.setItem(getConversationKey(), convId); } catch (e) {}
      setConversationId(convId);
      console.warn('[Chat] No conversationId present — created fallback:', convId);
    }

    if (shouldSpeak && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
      setIsSpeakMode(false);
      speakModeRef.current = false;
        setHideQuickPrompts(true);
      console.log('Stopped listening while Avy is typing');
    }
    
    const getCurrentUserId = () => {
      const user = getStoredUser();
      return user?.id || "";
    };
    
/*
    // HANDLER 1: Local cart queries (no backend call needed)
    const normalizedQuery = messageText.toLowerCase().trim();
    const cartQueryPatterns = [
      "what's in my cart",
      "what is in my cart",
      "what's in the cart",
      "what is in the cart",
      'show cart',
      'show my cart',
      'cart contents',
      'what are my cart items',
    ];

    if (cartQueryPatterns.includes(normalizedQuery)) {
      const userMsg: Message = {
        id: Date.now().toString(),
        text: messageText,
        isUser: true,
      };

      const raw = localStorage.getItem('dripTeaCartData') || '';
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const botText = lines.length > 0
        ? `Your cart contains:\n- ${lines.join('\n- ')}`
        : 'Your cart is empty.';

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        isUser: false,
      };

      setMessages(prev => [...prev, userMsg, botMsg]);
      setInput('');
      return;
    }
*/
/*
    // HANDLER 2: Drink add-to-cart intent with step-by-step customization
    try {
      const addRegex = /(?:add|please add|put)\s+(?:a\s+)?(?:the\s+)?(?:[0-9]+\s+)?(.+?)\s*(?:to(?:\s+my)?\s+cart)?$/i;
      const addMatch = messageText.match(addRegex);
      if (addMatch && addMatch[1]) {
        const candidate = addMatch[1].trim().toLowerCase();
        const drinkNames = Object.keys(drinkData);
        let matchedName: string | null = null;
        let matchedId: string | null = null;

        for (const name of drinkNames) {
          const n = name.toLowerCase();
          if (n === candidate || candidate.includes(n) || n.includes(candidate)) {
            matchedName = name;
            matchedId = drinkData[name].id;
            break;
          }
        }

        if (matchedName && matchedId) {
          const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
          setMessages(prev => [...prev, userMsg]);

          // Start customization step-by-step: ask for size first
          setPendingDrinkForCustomization({ name: matchedName, id: matchedId, step: 'size' });
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: `Great! Let me customize ${matchedName} for you.\n\nWhat size? M (Medium) or L (Large)?`,
            isUser: false,
          };
          setMessages(prev => [...prev, botMsg]);
          setInput('');
          return;
        }
      }
    } catch (e) {
      // ignore intent parse errors and proceed to backend
    }
*/
/*
    // HANDLER 3: Handle active customization flow (collect size → ice → sugar → topping)
    if (pendingDrinkForCustomization) {
      const customizationText = messageText.toLowerCase();

      // Customization Step 1: Collect drink size
      if (pendingDrinkForCustomization.step === 'size') {
        const sizeMatch = customizationText.match(/\b(m|l|medium|large)\b/i);
        if (sizeMatch) {
          const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
          setMessages(prev => [...prev, userMsg]);
          setIsLoading(true);

          const size = sizeMatch[1].toUpperCase().charAt(0);
          setPendingDrinkForCustomization(prev => ({ ...prev!, step: 'ice', size }));

          setTimeout(() => {
            const botMsg: Message = {
              id: (Date.now() + 1).toString(),
              text: `Got it, size ${size}.\n\nNext, ice level? Normal, Less, or No?`,
              isUser: false,
            };
            setMessages(prev => [...prev, botMsg]);
            setIsLoading(false);
          }, 600);
          setInput('');
          return;
        } else {
          const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: `I didn't catch that. Please choose: M (Medium) or L (Large)?`,
            isUser: false,
          };
          setMessages(prev => [...prev, userMsg, botMsg]);
          setInput('');
          return;
        }
      }

      // Customization Step 2: Collect ice level
      if (pendingDrinkForCustomization.step === 'ice') {
        const iceMatch = customizationText.match(/\b(normal|less|no)\b/i);
        if (iceMatch) {
          const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
          setMessages(prev => [...prev, userMsg]);
          setIsLoading(true);

          const ice = iceMatch[1].charAt(0).toUpperCase() + iceMatch[1].slice(1).toLowerCase();
          setPendingDrinkForCustomization(prev => ({ ...prev!, step: 'sugar', ice }));

          setTimeout(() => {
            const botMsg: Message = {
              id: (Date.now() + 1).toString(),
              text: `Nice, ${ice} ice.\n\nNext, sugar level? Choose: 0%, 25%, 50%, or 100%.`,
              isUser: false,
            };
            setMessages(prev => [...prev, botMsg]);
            setIsLoading(false);
          }, 600);
          setInput('');
          return;
        } else {
          const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: `I didn't catch that. Please choose: Normal, Less, or No ice?`,
            isUser: false,
          };
          setMessages(prev => [...prev, userMsg, botMsg]);
          setInput('');
          return;
        }
      }

      // Customization Step 3: Collect sugar level
      if (pendingDrinkForCustomization.step === 'sugar') {
        const namedMatch = customizationText.match(/\b(normal|less|zero|no\s*sugar)\b/i);
        const pctMatch = customizationText.match(/\b(100|50|25|0)\s*%?\b/);

        let sugar: string | null = null;
        if (namedMatch) {
          const v = namedMatch[1].toLowerCase().replace(/\s+/g, '');
          sugar = v === 'normal' ? '50%' : v === 'less' ? '25%' : '0%';
        } else if (pctMatch) {
          sugar = `${pctMatch[1]}%`;
        }

        if (sugar) {
          const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
          setMessages(prev => [...prev, userMsg]);
          setIsLoading(true);

          setPendingDrinkForCustomization(prev => ({ ...prev!, step: 'topping', sugar: sugar! }));

          const isHighSugar = sugar === '50%' || sugar === '100%';
          const replyText = isHighSugar
            ? `Just a heads-up — ${sugar} sugar is on the sweeter side (Nutri-Grade ${sugar === '100%' ? 'D' : 'C'}). Noted though!\n\nAny toppings? Tapioca Pearls (+$1.20), Aloe Vera (+$1.00), Cheese Foam (+$1.50), or No Topping?`
            : `Perfect, ${sugar} sugar!\n\nAny toppings? Tapioca Pearls (+$1.20), Aloe Vera (+$1.00), Cheese Foam (+$1.50), or No Topping?`;

          setTimeout(() => {
            const botMsg: Message = {
              id: (Date.now() + 1).toString(),
              text: replyText,
              isUser: false,
            };
            setMessages(prev => [...prev, botMsg]);
            setIsLoading(false);
          }, 600);
          setInput('');
          return;
        } else {
          const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: `I didn't catch that. Please choose: 0%, 25%, 50%, or 100% sugar.`,
            isUser: false,
          };
          setMessages(prev => [...prev, userMsg, botMsg]);
          setInput('');
          return;
        }
      }

      // Customization Step 4: Collect topping and finalize order
      if (pendingDrinkForCustomization.step === 'topping') {
        const toppingMatch = customizationText.match(/\b(tapioca|pearls|aloe|cheese|foam|no\s*topping|none)\b/i);
        if (toppingMatch) {
          const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
          setMessages(prev => [...prev, userMsg]);
          setIsLoading(true);

          const size = pendingDrinkForCustomization.size!;
          const ice = pendingDrinkForCustomization.ice!;
          const sugar = pendingDrinkForCustomization.sugar!;

          // Look up actual price from menu data
          const beverage = (menuData as any).beverages.find((b: any) => b.id === pendingDrinkForCustomization.id);
          const basePrice = beverage?.price || 0;
          const sizeModifier = size === 'L' ? 1.5 : 0; // Large adds $1.50
          const finalPrice = basePrice + sizeModifier;

          // Map topping name
          let toppingName = 'No Topping';
          if (toppingMatch[1].toLowerCase().includes('tapioca') || toppingMatch[1].toLowerCase().includes('pearls')) {
            toppingName = 'Tapioca Pearls';
          } else if (toppingMatch[1].toLowerCase().includes('aloe')) {
            toppingName = 'Aloe Vera';
          } else if (toppingMatch[1].toLowerCase().includes('cheese') || toppingMatch[1].toLowerCase().includes('foam')) {
            toppingName = 'Cheese Foam';
          }

          // Add to cart
          const details = `${size}, ${ice} Ice, ${sugar} Sugar, ${toppingName}`;
          const newItem = `${pendingDrinkForCustomization.name} | ${details} | S$ ${finalPrice.toFixed(2)}`;
          const existing = localStorage.getItem('dripTeaCartData') || '';
          const updated = existing ? existing + '\n' + newItem : newItem;
          localStorage.setItem('dripTeaCartData', updated);
          window.dispatchEvent(new Event('cartUpdated'));
          setAddedIds(prev => [...prev, pendingDrinkForCustomization.id]);
          setTimeout(() => setAddedIds(prev => prev.filter(id => id !== pendingDrinkForCustomization.id)), 2500);

          // Store customization data in sessionStorage for the customize page
          const drinkDataEntry = drinkData[pendingDrinkForCustomization.name];
          if (drinkDataEntry) {
            sessionStorage.setItem('chatCustomization', JSON.stringify({
              drinkId: pendingDrinkForCustomization.id,
              drinkName: pendingDrinkForCustomization.name,
              size: size === 'L' ? 'Large' : 'Regular',
              ice: ice === 'Normal' ? 'Normal Ice' : ice === 'Less' ? 'Less Ice' : 'No Ice',
              sugar: sugar === 'Normal' ? 'Normal Sweet' : sugar === 'Less' ? 'Less Sweet' : 'No Additional Sugar',
              category: drinkDataEntry.category,
            }));
          }

          setTimeout(() => {
            const botMsg: Message = {
              id: (Date.now() + 1).toString(),
              text: `Awesome! I've added ${pendingDrinkForCustomization.name} with ${toppingName} to your cart. (${size}, ${ice} Ice, ${sugar} Sugar) — S$ ${finalPrice.toFixed(2)}`,
              isUser: false,
              // @ts-ignore
              showViewCart: true,
              showCustomizeLink: true,
              customizeDrinkId: pendingDrinkForCustomization.id,
              customizeDrinkName: pendingDrinkForCustomization.name,
              customizeCategory: drinkDataEntry?.category || 'milk-tea',
            } as unknown as Message;
            setMessages(prev => [...prev, botMsg]);
            setIsLoading(false);
            setPendingDrinkForCustomization(null);
          }, 600);
          setInput('');
          return;
        } else {
          const userMsg: Message = { id: Date.now().toString(), text: messageText, isUser: true };
          const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: `I didn't catch that. Please choose: Tapioca Pearls, Aloe Vera, Cheese Foam, or No Topping?`,
            isUser: false,
          };
          setMessages(prev => [...prev, userMsg, botMsg]);
          setInput('');
          return;
        }
      }
    }
*/
    // HANDLER 4: Default - send to backend chat API
    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // done by "HDC" - resolved merge by keeping teammate proxy-first chat route and retaining direct 5000 fallback as commented reference.
      // Proxy-first behavior: prefer server-side Next.js API route; allow override via NEXT_PUBLIC_DRIPTEA_API_BASE.
      const configured = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE?.trim();
      const apiEndpoint = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000/api/chat'
        : (configured ? `${configured.replace(/\/$/, '')}/api/chat` : '/api/chat');

      const userId =
        localStorage.getItem("userId") ||
        localStorage.getItem("driptea_user_id") ||
        localStorage.getItem("customerId") ||
        "";
      console.log('[Chat] POST', apiEndpoint, { message: messageText, conversationId: convId });
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        message: messageText,
        conversationId: convId,
        userId: getCurrentUserId(),
      }),
      });
      console.log('[Chat] Response status', response.status);

      // Original client-side fallback, commented out:
      /*
      const apiBase = (process.env.NEXT_PUBLIC_DRIPTEA_API_BASE && process.env.NEXT_PUBLIC_DRIPTEA_API_BASE.trim()) || 'https://driptea-trrn.onrender.com';
      // const apiBase = (process.env.NEXT_PUBLIC_DRIPTEA_API_BASE && process.env.NEXT_PUBLIC_DRIPTEA_API_BASE.trim()) || 'http://localhost:5000';
      const response = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationId: conversationId,
        }),
      });
      */
      // end done by "HDC"

      const data: unknown = await response.json();
      const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      const rawReply = typeof payload.reply === 'string' ? payload.reply : "I'm so sorry for the inconvenience! Our server seems to be taking a short break. Please try again in a moment, or feel free to visit us in store and our baristas will be happy to help.";
      const recommendedDrinks = Array.isArray(payload.recommendedDrinks)
        ? (payload.recommendedDrinks as Message['recommendedDrinks'])
        : [];

      const healthCard = payload.healthCard && typeof payload.healthCard === 'object'
        ? (payload.healthCard as Message['healthCard'])
        : null;

      // Clean up excessive line breaks:
      // Replaces 3 or more consecutive <br> tags with just two for a standard paragraph gap.
      const sanitizedReply = rawReply.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: sanitizedReply,
        isUser: false,
        recommendedDrinks,
        healthCard,
      };
      setMessages(prev => [...prev, botMsg]);

      // If in voice conversation mode, speak the response using TTS
      if (shouldSpeak) {
        // Strip HTML tags for text-to-speech
          const plainText = botMsg.text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();        const humaneIntro = plainText.match(/^(hello|hi|hey|sure|absolutely|of course|here's|here is)/i)
          ? plainText
          : `Sure — ${plainText}`;

        speakText(humaneIntro);
      }

      // Trigger cart refresh whenever the bot confirms a cart addition
      if (/added to your cart/i.test(botMsg.text)) {
        window.dispatchEvent(new Event('cartUpdated'));
      }

      // Extract cart data: look for hidden HTML block with order info
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(botMsg.text, 'text/html');
        const hiddenEls = doc.querySelectorAll('.hidden-cart-data');
        if (hiddenEls.length > 0) {
          const latestCartData = hiddenEls[hiddenEls.length - 1].textContent || '';
          localStorage.setItem('dripTeaCartData', latestCartData.trim());
          window.dispatchEvent(new Event('cartUpdated'));
        } else {
          // 2) Fallback: parse visible textual bullets when hidden block is missing
          // Normalize reply: treat <br> as newline and strip other tags
          const normalized = botMsg.text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
          const lines = normalized.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const items: string[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Match patterns like: * **Name** - S$5.2  or * **Name** - S$ 5.20
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
              const detailsJoined = details.join(' · ');
              items.push(`${name} | ${detailsJoined} | S$ ${price.toFixed(2)}`);
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
      } catch (err) {
        // best-effort: try DOM lookup after render
        setTimeout(() => {
          const hiddenBlocks = document.querySelectorAll('.hidden-cart-data');
          if (hiddenBlocks.length > 0) {
            const latestCartData = hiddenBlocks[hiddenBlocks.length - 1].textContent || '';
            localStorage.setItem('dripTeaCartData', latestCartData.trim());
            window.dispatchEvent(new Event('cartUpdated'));
          }
        }, 300);
      }
    } catch (error) {
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

  

  // Send a message and render the response inside the speak overlay
// Send a message and render the response inside the speak overlay
  async function sendOverlayMessage(text: string, shouldSpeak: boolean = true) {
    if (!text) return;
    setOverlayLoading(true);

    // Ensure conversationId exists for overlay messages as well
    let convId = conversationId;
    if (!convId) {
      convId = createConversationId();
      try { localStorage.setItem(getConversationKey(), convId); } catch (e) {}
      setConversationId(convId);
      console.warn('[Chat][Overlay] No conversationId present — created fallback:', convId);
    }

    try {
      const configured = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE?.trim();
      const apiEndpoint = process.env.NODE_ENV === 'development'
        ? '/api/chat'
        : (configured ? `${configured.replace(/\/$/, '')}/chat` : '/api/chat');

      // SECRET HACK: Tell Gemini to act like a Voice Assistant
      const voiceModePrompt = `${text}\n\n[SYSTEM NOTE: The user is speaking to you via Voice Mode. Reply in 1 to 2 short, natural, conversational sentences. Do NOT use markdown, bold text, bullet points, or HTML.]`;

      console.log('[Chat][Overlay] POST', apiEndpoint, { message: voiceModePrompt, conversationId: convId });
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        message: voiceModePrompt,
        conversationId: convId,
        userId: getCurrentUserId(),
      }),
      });
      console.log('[Chat][Overlay] Response status', response.status);

      const data: unknown = await response.json();
      const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      const rawReply = typeof payload.reply === 'string' ? payload.reply : "I'm so sorry for the inconvenience! Our server seems to be taking a short break. Please try again in a moment.";
      const sanitizedReply = rawReply.replace(/(<br\s*\/?>(\s|&nbsp;)*){3,}/gi, '<br><br>');

      const botMsg: Message = { id: (Date.now() + 1).toString(), text: sanitizedReply, isUser: false };
      setOverlayMessages(prev => [...prev, botMsg]);

      if (shouldSpeak) {
        const plainText = botMsg.text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        speakText(plainText);
      }
    } catch (err) {
      const errorText = "I'm so sorry for the inconvenience! Our server seems to be unavailable right now. Please try again in a moment.";
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: errorText, isUser: false };
      setOverlayMessages(prev => [...prev, botMsg]);

      if (shouldSpeak) {
        speakText(errorText);
      }
    } finally {
      setOverlayLoading(false);
    }
  }

  const handlePickedImage = (file: File | null, source: 'camera' | 'screenshot' | 'clipboard') => {
    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImages(prev => [...prev, { name: file.name, previewUrl, source }]);
  };

const handleInputPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
  const items = Array.from(event.clipboardData.items || []);
  const imageItem = items.find(item => item.kind === 'file' && item.type.startsWith('image/'));
  if (!imageItem) {
    return;
  }

  const file = imageItem.getAsFile();
  if (!file) {
    return;
  }

  event.preventDefault();
  handlePickedImage(file, 'clipboard');
};

  const removePendingImage = (index: number) => {
    setPendingImages(prev => {
      const item = prev[index];
      if (item) {
        try { URL.revokeObjectURL(item.previewUrl); } catch {}
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  function restartConversation() {
    const newConversationId = createConversationId();
    setWelcomeGreeting(getRandomGreeting());
    setWelcomeAnimationKey(key => key + 1);
    const greetingMsg: Message = {
      id: Date.now().toString(),
      text: 'Hello! I\'m Avy, your DripTea companion. How can I help you today?',
      isUser: false,
    };
    setConversationId(newConversationId);
    setMessages([greetingMsg]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([greetingMsg]));
    localStorage.setItem(getConversationKey(), newConversationId);
  }

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  /** Handle clicks in chat window for navigation and button interactions */
  const handleChatClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;


    // Handle drink links
    if (target.classList.contains('chat-drink-link') && target instanceof HTMLAnchorElement) {
      e.preventDefault();
      e.stopPropagation();
      const href = target.getAttribute('href');
      if (href) {
        router.push(href);
      }
      return;
    }
    
    // Check if it's a button and has your specific chat classes
    if (target.tagName === 'BUTTON' &&
      (target.classList.contains('chat-nav-btn') || target.classList.contains('chat-nav-btn-compact'))) {
      
      const aiAction = target.getAttribute('onclick') || '';
      
      // Handle cart button
      if (aiAction.includes('handleCart') && onOpenCart) {
        e.preventDefault();
        e.stopPropagation();
        onOpenCart();
      } 
      // Handle checkout button
      else if (aiAction.includes('handleCheckout') && onCheckout) {
        e.preventDefault();
        e.stopPropagation();
        onCheckout();
      }
      // Handle goToCheckoutPage button
      else if (aiAction.includes('goToCheckoutPage') && onCheckout) {
        e.preventDefault();
        e.stopPropagation();
        const priceMatch = aiAction.match(/[\d.]+/);
        if (priceMatch) {
          localStorage.setItem("dripTeaCartTotal", priceMatch[0]);
        }
        onCheckout();
      }
    }
  };

  const formatMessageTime = (id: string) => {
    const parsed = Number(id);
    if (!Number.isFinite(parsed)) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return new Date(parsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasUserMessage = messages.some(msg => msg.isUser);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const messageMatchesSearch = (msg: Message) => {
    if (!normalizedSearchQuery) return true;
    return msg.text.replace(/<[^>]*>/g, ' ').toLowerCase().includes(normalizedSearchQuery);
  };
  const visibleMessages = normalizedSearchQuery ? messages.filter(messageMatchesSearch) : messages;
  const searchResultCount = normalizedSearchQuery ? visibleMessages.length : 0;

  /** Send quick prompt as message when user clicks suggested prompt button */
  // const handleQuickPromptClick = (prompt: string) => {
  //   if (isLoading) return;
  //   sendMessage(prompt, false);
  // };

  // Add this right above the `return (` statement
const sanitizeExcessiveBreaks = (htmlString: string) => {
    if (!htmlString) return '';
    // 1. Convert all raw newlines/returns into standard <br> tags first
    let cleaned = htmlString.replace(/\r?\n/g, '<br>');
    // 2. Nuke 3 or more consecutive <br> tags (even if the AI put spaces or &nbsp; between them)
    cleaned = cleaned.replace(/(?:<br\s*\/?>[\s]*(?:&nbsp;)*[\s]*){3,}/gi, '<br><br>');
    return cleaned;
  };

  // ===== RENDER =====
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
              ref={avyLogoRef}
              className={styles.avyLogoAnimated}
              aria-hidden="true"
              onPointerEnter={e => updateAvyEyes(e.clientX, e.clientY)}
              onPointerMove={e => updateAvyEyes(e.clientX, e.clientY)}
              onPointerLeave={resetAvyEyes}
            >
              <svg className={styles.avyLogoSvgWrap} width="273" height="273" viewBox="0 0 273 273" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <g filter="url(#chatbotAvyFilter0)">
                  <circle cx="136.5" cy="132.5" r="132.5" fill="url(#chatbotAvyGradient)" />
                </g>
                <g filter="url(#chatbotAvyFilter1)">
                  <path
                    ref={avyEyeLeftRef}
                    className={styles.avyEyeLeft}
                    d="M79.7874 71.3204C82.9663 64.229 93.0337 64.2291 96.2126 71.3204L115.606 114.582C119.178 122.552 110.448 130.427 102.887 126.055L92.5058 120.05C89.7183 118.438 86.2817 118.438 83.4942 120.05L73.1126 126.055C65.5524 130.427 56.8217 122.552 60.3942 114.582L79.7874 71.3204Z"
                    fill="#F9FAFA"
                  />
                </g>
                <g filter="url(#chatbotAvyFilter2)">
                  <path
                    ref={avyEyeRightRef}
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
                setIsSettingsOpen(false);
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
            {/*
            <div className={styles.settingsWrap}>
              <button
                type="button"
                className={styles.headerIconBtn}
                onClick={() => {
                  setIsSettingsOpen(value => !value);
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                aria-label="Open Avy settings"
                aria-expanded={isSettingsOpen}
              >
                <svg className={styles.headerBtnIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2.75v2.1" />
                  <path d="M12 19.15v2.1" />
                  <path d="M4.9 4.9l1.48 1.48" />
                  <path d="M17.62 17.62l1.48 1.48" />
                  <path d="M2.75 12h2.1" />
                  <path d="M19.15 12h2.1" />
                  <path d="M4.9 19.1l1.48-1.48" />
                  <path d="M17.62 6.38l1.48-1.48" />
                </svg>
              </button>
              {isSettingsOpen && (
                <div className={styles.settingsMenu}>
                  <button type="button" onClick={restartConversation}>Restart conversation</button>
                  <button type="button" onClick={() => onClose?.()}>Close Avy</button>
                </div>
              )}
            </div>
            */}
          </div>
        </div>
      </div>

      {/* Message display area - scrollable with auto-scroll to newest message */}
      <div className={styles.chatWindow} ref={chatWindowRef} onClick={handleChatClick}>
        {normalizedSearchQuery && visibleMessages.length === 0 && (
          <div className={styles.noSearchResults}>No messages found</div>
        )}
        {visibleMessages.map((msg, index) => (
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
                  ) : !msg.isUser && msg.text.includes("<img") && msg.text.includes("startOrder") ? (
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
                          ? convertDrinkNamesToLinks(msg.text)
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
                          image={drink.image}
                          categorySlug={drink.category.toLowerCase().replace(/\s+/g, "-")}
                          nutriGrade={drink.nutri_grade ?? undefined}
                          sugar={drink.base_sugar_g ?? undefined}
                          calories={drink.base_calories ?? undefined}
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

              {!msg.isUser && (msg as any).showViewCart && (
                <div className={styles.messageActionRow}>
                  <button
                    type="button"
                    className={styles.messageActionBtn}
                    onClick={() => {
                      if (onOpenCart) onOpenCart();
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
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.botMessage}`}>
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
              <span className={styles.messageTime}>typing...</span>
            </div>
            <div className={`${styles.botBubble} ${styles.typingBubble}`}>
              <span className={styles.typingIndicator}>
                <span></span><span></span><span></span>
              </span>
              {slowHintIndex >= 0 && (
                <span className={styles.slowHint}>{SLOW_HINTS[slowHintIndex]}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input area: images, quick prompts, message composer */}
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
            {/*
            // Old inline image upload UI moved to ImageUploadButton component
            <div className={styles.plusBtnWrap}> ... </div>
            */}
            {/* <ImageUploadButton
              onImagePicked={(file, source) => {
                const previewUrl = URL.createObjectURL(file);
                setPendingImages(prev => [...prev, { name: file.name, previewUrl, source }]);
              }}
              disabled={isLoading}
            /> */}
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
              style={{resize: 'none', overflow: 'hidden'}}
            />
            <div className={styles.chatActionRow}>
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
              {/* <SpeechControls
                isListening={isListening}
                isLoading={isLoading}
                onMicClick={handleMicrophoneClick}
                onSpeakClick={handleSpeakClick}
                isSpeakMode={isSpeakMode}
              /> */}
            </div>
          </div>
        </div>
        {/*
        <SpeechControls
          isListening={isListening}
          isLoading={isLoading}
          onMicClick={handleMicrophoneClick}
          onSpeakClick={handleSpeakClick}
          isSpeakMode={isSpeakMode}
        />
        */}
      </div>


        {/* Speak mode full-screen overlay */}
              {isSpeakMode && (
                <div className={styles.speakOverlay} role="dialog" aria-modal="true">
                  {/* X close button — top left */}
                  <button
                    type="button"
                    className={styles.overlayCloseBtn}
                    onClick={closeOverlay}
                    aria-label="Close voice mode"
                  >
                    ✕
                  </button>

                  <div className={styles.speakOverlayInner}>
                    <div className={styles.speakOverlayText}>
                      {overlayLoading ? "Avy is thinking..." : isListening ? "Listening..." : "Tap mic to speak"}
                    </div>

                    <div className={styles.speakTranscript}>
                      {overlayMessages.map(msg => (
                        <div key={msg.id} className={msg.isUser ? styles.speakUserMsg : styles.speakBotMsg}>
                          <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                        </div>
                      ))}

                      {overlayTranscript && !overlayLoading && (
                        <div className={styles.speakLineContainer} aria-live="polite">
                          <span className={styles.speakLine}>{overlayTranscript}</span>
                        </div>
                      )}
                    </div>

                    {/* Single mic button at the bottom */}
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
                </div>
              )}


      {/* Full-screen image preview modal with arrow navigation */}
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

