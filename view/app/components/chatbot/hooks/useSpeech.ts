"use client";

import { useRef, useState, useEffect } from 'react';
import { speakText } from '../../../utils/chatHelpers';
import type { Message } from '../useChatbotState';

interface UseSpeechProps {
  // Ref populated by useChatbotState after useChatApi is ready, avoiding a
  // circular dependency between useSpeech and useChatApi.
  sendOverlayMessageRef: React.MutableRefObject<((text: string, shouldSpeak?: boolean) => Promise<void>) | undefined>;
}

export function useSpeech({ sendOverlayMessageRef }: UseSpeechProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeakMode, setIsSpeakMode] = useState(false);
  const [hideQuickPrompts, setHideQuickPrompts] = useState(false);
  const [overlayTranscript, setOverlayTranscript] = useState('');
  const [overlayMessages, setOverlayMessages] = useState<Message[]>([]);
  const [overlayLoading, setOverlayLoading] = useState(false);

  // Refs let recognition event handlers (mounted once with [] deps) read
  // current values without stale closures.
  const recognitionRef = useRef<any>(null);
  const speakModeRef = useRef(false);
  const voiceConversationRef = useRef(false);
  const isListeningRef = useRef(false);
  const isRecognitionStartingRef = useRef(false);
  const speechBaseRef = useRef('');
  // Populated by useChatbotState so the recognition handler can update input state.
  const setInputRef = useRef<((value: string) => void) | undefined>(undefined);

  // Keep speakModeRef in sync with React state
  useEffect(() => { speakModeRef.current = isSpeakMode; }, [isSpeakMode]);

  // Initialize Web Speech API once on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;
    if (!SpeechRecognition) { console.warn('Speech Recognition API not supported'); return; }
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
          // Speak mode — only send final results
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
            setOverlayMessages(prev => [...prev, { id: Date.now().toString(), text, isUser: true }]);
            sendOverlayMessageRef.current?.(text, true);
          }
        } else {
          // Regular mic mode — rebuild full input from all session results
          let allFinalized = '';
          let currentInterim = '';
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) allFinalized += event.results[i][0].transcript.trim() + ' ';
            else currentInterim += event.results[i][0].transcript.trim();
          }
          const parts = [speechBaseRef.current, allFinalized.trim(), currentInterim].filter(Boolean);
          setInputRef.current?.(parts.join(' '));
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
  // transition can begin before the browser mic permission prompt appears.
  useEffect(() => {
    if (!isSpeakMode) return;
    const t = setTimeout(() => {
      if (recognitionRef.current && !isListeningRef.current && !isRecognitionStartingRef.current) {
        requestRecognitionStart();
      }
    }, 220);
    return () => clearTimeout(t);
  }, [isSpeakMode]);

  const requestRecognitionStart = (textareaValue?: string) => {
    if (!recognitionRef.current || isListeningRef.current || isRecognitionStartingRef.current) return;
    isRecognitionStartingRef.current = true;
    speechBaseRef.current = textareaValue ?? '';
    try {
      recognitionRef.current.start();
      // Auto-stop after 15 s to prevent the mic staying open indefinitely
      setTimeout(() => {
        if (recognitionRef.current && isListeningRef.current) recognitionRef.current.stop();
      }, 15000);
    } catch (error) {
      isRecognitionStartingRef.current = false;
      console.error('✗ Error starting speech recognition:', error);
    }
  };

  // Cancel TTS before starting the mic to avoid a feedback loop
  const stopNarrationAndListen = () => {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();
    if (isListeningRef.current || isRecognitionStartingRef.current || !recognitionRef.current) return;
    setTimeout(() => {
      if (!voiceConversationRef.current || !recognitionRef.current || isListeningRef.current || isRecognitionStartingRef.current) return;
      requestRecognitionStart();
    }, 120);
  };

  const handleMicrophoneClick = (textareaValue?: string) => {
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
        requestRecognitionStart(textareaValue);
      }
    } catch (error) {
      console.error('✗ Error with microphone:', error);
      setIsListening(false);
    }
  };

  const handleSpeakClick = () => {
    speakModeRef.current = true;
    voiceConversationRef.current = true;
    setIsSpeakMode(true);
    setHideQuickPrompts(true);
    stopNarrationAndListen();
  };

  // closeOverlay uses overlayMessages from closure — no need to pass it as param
  const closeOverlay = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>, storageKey: string) => {
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
        try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
        return updated;
      });
    }
    setOverlayMessages([]);
    setOverlayTranscript('');
    setOverlayLoading(false);
  };

  const handleOverlayMicClick = () => {
    // Chrome needs pause() before cancel() to reliably cut speech mid-sentence
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) { synth.pause(); synth.cancel(); }
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

  return {
    isListening,
    setIsListening,
    isListeningRef,
    isSpeakMode,
    setIsSpeakMode,
    speakModeRef,
    isRecognitionStartingRef,
    hideQuickPrompts,
    setHideQuickPrompts,
    overlayTranscript,
    overlayMessages,
    setOverlayMessages,
    overlayLoading,
    setOverlayLoading,
    voiceConversationRef,
    recognitionRef,
    setInputRef,
    speakText,
    handleMicrophoneClick,
    handleSpeakClick,
    closeOverlay,
    handleOverlayMicClick,
  };
}
