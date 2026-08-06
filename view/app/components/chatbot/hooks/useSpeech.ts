"use client";

import { useRef, useState, useEffect } from 'react';
import { speakText, cancelSpeech, getBrowserSpeechLang, setTTSHooks, detectChatLang } from '../../../utils/chatHelpers';
import type { Message } from '../useChatbotState';

interface UseSpeechProps {
  sendOverlayMessageRef: React.RefObject<((text: string, shouldSpeak?: boolean) => Promise<void>) | undefined>;
}

// Maps ElevenLabs ISO 639-1 code → BCP 47 locale used internally
function elToLocale(lang: string): string {
  const l = (lang || '').toLowerCase();
  if (l.startsWith('zh')) return 'zh-CN';
  if (l.startsWith('ta')) return 'ta-IN';
  if (l.startsWith('ms')) return 'ms-MY';
  return 'en-GB';
}

function getTranscribeUrl(): string {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5000/api/transcribe';
  const base = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE?.trim() || 'https://driptea-trrn.onrender.com';
  return `${base.replace(/\/$/, '')}/api/transcribe`;
}

function deduplicateTranscript(text: string): string {
  if (!text) return text;

  // 1. Sentence-level dedup — split on punctuation used across all languages
  const sentences: string[] = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if ('。！？!?.।؟'.includes(ch)) { sentences.push(buf.trim()); buf = ''; }
  }
  if (buf.trim()) sentences.push(buf.trim());

  if (sentences.length > 1) {
    const seen = new Set<string>();
    const unique = sentences.filter(s => {
      const key = s.replace(/[。！？!?.।؟\s]/g, '').toLowerCase();
      return key && !seen.has(key) && seen.add(key);
    });
    if (unique.length < sentences.length) return unique.join(' ').trim();
  }

  // 2. Word-level dedup — catches unpunctuated repetitions like "hello hello"
  //    or "I want milk tea I want milk tea"
  const words = text.trim().split(/\s+/);
  if (words.length >= 2 && words.length % 2 === 0) {
    const half = words.length / 2;
    const first = words.slice(0, half).join(' ').toLowerCase();
    const second = words.slice(half).join(' ').toLowerCase();
    if (first === second) return words.slice(0, half).join(' ');
  }

  return text;
}

async function transcribeBlob(blob: Blob): Promise<{ text: string; language: string }> {
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');
  const res = await fetch(getTranscribeUrl(), { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
  return res.json();
}

export function useSpeech({ sendOverlayMessageRef }: UseSpeechProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeakMode, setIsSpeakMode] = useState(false);
  const [hideQuickPrompts, setHideQuickPrompts] = useState(false);
  const [overlayTranscript, setOverlayTranscript] = useState('');
  const [overlayMessages, setOverlayMessages] = useState<Message[]>([]);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false);
  const [isSpeakDetected, setIsSpeakDetected] = useState(false);
  const [selectedSpeechLang, setSelectedSpeechLang] = useState<string>(getBrowserSpeechLang);

  // Compat shim: useChatbotState calls recognitionRef.current.stop() when sidebar closes
  const recognitionRef = useRef<any>({ stop: () => stopCapture() });
  // The plain mic button's own native SpeechRecognition instance (separate from speak mode's
  // speechRecognitionRef). stopCapture() must be able to reach this directly — recognitionRef.current
  // gets reset back to the compat shim on every render (see the effect below), so it can't be relied
  // on to still hold the live instance by the time the user clicks stop.
  const activeMicRecognitionRef = useRef<any>(null);
  const recognitionLangRef = useRef<string>(getBrowserSpeechLang());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);
  const ttsPausedRef = useRef(false); // true while bot TTS is playing

  const speakModeRef = useRef(false);
  const voiceConversationRef = useRef(false);
  const isListeningRef = useRef(false);
  const isRecognitionStartingRef = useRef(false);
  // Speak mode's own capture path — native browser recognition when available, so
  // continuous voice conversation keeps working even if ElevenLabs transcription is
  // unavailable (quota, key issues, network). Decided once per Speak-mode session.
  const speechRecognitionRef = useRef<any>(null);
  const useNativeSpeakRef = useRef(false);
  const abortedForPauseRef = useRef(false); // true while we're deliberately aborting for TTS pause
  const isSpeakRecognitionStartingRef = useRef(false); // guards against overlapping start() calls
  const speakRecognitionFailStreakRef = useRef(0); // consecutive empty/error rounds — drives backoff
  const chunkStartTimeRef = useRef(0);
  const isSpeakDetectedRef = useRef(false);
  const hadVoiceInChunkRef = useRef(false); // did real voice occur in the current recording chunk
  const noiseFloorRef = useRef(8); // ambient noise baseline — calibrated during grace period
  const setInputRef = useRef<React.Dispatch<React.SetStateAction<string>> | undefined>(undefined);
  // Keep for interface compat with useChatbotState (accumulatedText / send timer not used in EL mode)
  const accumulatedTextRef = useRef('');
  const sendDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { speakModeRef.current = isSpeakMode; }, [isSpeakMode]);
  useEffect(() => { recognitionLangRef.current = selectedSpeechLang; }, [selectedSpeechLang]);

  // Native SpeechRecognition (unlike ElevenLabs) can't detect the spoken language
  // from the audio — it has to be told what to expect *before* it starts listening.
  // Infer it from Avy's last reply so a conversation that's turned to Chinese/Malay/
  // Tamil doesn't stay stuck listening in the browser's default (English) locale.
  useEffect(() => {
    if (!useNativeSpeakRef.current) return;
    const lastBotMsg = [...overlayMessages].reverse().find(m => !m.isUser);
    if (!lastBotMsg?.text) return;
    const detected = detectChatLang(lastBotMsg.text.replace(/<[^>]+>/g, ''));
    if (detected && detected !== selectedSpeechLang) setSelectedSpeechLang(detected);
  }, [overlayMessages]);

  // Keep compat shim pointing at the latest stopCapture
  useEffect(() => {
    recognitionRef.current = { stop: stopCapture };
  });

  // Pause/resume MediaRecorder around bot TTS to prevent feedback loop
  useEffect(() => {
    setTTSHooks(
      () => {
        ttsPausedRef.current = true;
        setIsTTSSpeaking(true);
        if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }
        if (mediaRecorderRef.current?.state === 'recording') {
          try { mediaRecorderRef.current.stop(); } catch {}
          audioChunksRef.current = []; // discard captured TTS audio
        }
        if (speechRecognitionRef.current) {
          abortedForPauseRef.current = true;
          try { speechRecognitionRef.current.abort(); } catch {}
        }
      },
      () => {
        ttsPausedRef.current = false;
        setIsTTSSpeaking(false);
        // Resume listening after TTS finishes (speak mode only). Wait long enough
        // for the speaker's echo/reverb tail to die down first — starting the mic
        // (and its noise-floor calibration, for the MediaRecorder/VAD path) too soon
        // after Avy stops talking lets that tail skew the voice threshold, or get
        // misheard as the start of a new utterance, for the whole next turn.
        setTimeout(() => {
          if (!speakModeRef.current || isProcessingRef.current) return;
          if (useNativeSpeakRef.current) {
            startSpeakRecognition();
          } else if (streamRef.current) {
            startSpeakChunk(streamRef.current);
          }
        }, 450);
      }
    );
    return () => setTTSHooks();
  }, []);

  // ── Shared helpers ─────────────────────────────────────────────────────────

  function stopCapture() {
    if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }
    if (activeMicRecognitionRef.current) {
      // abort(), not stop() — stop() is graceful and keeps finalizing whatever audio was already
      // buffered, which can fire onresult again seconds later with the same transcript, silently
      // repopulating the input after the user already deactivated the mic. An explicit user click
      // to stop should mean stop now, not "finish transcribing in the background."
      try { activeMicRecognitionRef.current.abort(); } catch {}
      activeMicRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      try { mediaRecorderRef.current?.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (speechRecognitionRef.current) {
      abortedForPauseRef.current = true;
      try { speechRecognitionRef.current.abort(); } catch {}
      speechRecognitionRef.current = null;
    }
    setIsListening(false);
    isListeningRef.current = false;
    isRecognitionStartingRef.current = false;
  }

  async function getStream(): Promise<MediaStream> {
    // Explicit (not just relying on browser defaults) since speak mode plays Avy's
    // TTS reply back through the same device the mic is listening on.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    streamRef.current = stream;
    return stream;
  }

  async function flushChunks(chunks: Blob[], mode: 'mic' | 'speak') {
    if (chunks.length === 0 || isProcessingRef.current) return;

    const blob = new Blob(chunks, { type: 'audio/webm' });
    // Skip transcription for truly empty blobs (< 1 KB) — nothing real to transcribe
    if (blob.size < 1000) return;

    isProcessingRef.current = true;

    try {
      const { text: rawText, language } = await transcribeBlob(blob);
      // Collapse all whitespace (incl. newlines from ElevenLabs) to single spaces
      const text = deduplicateTranscript(rawText.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim());

      if (language) {
        const locale = elToLocale(language);
        setSelectedSpeechLang(locale);
        recognitionLangRef.current = locale;
      }

      // Silence chunk — nothing to do; stay in "Listening…" without touching loading state
      if (!text.trim()) return;

      // Real speech confirmed — now enter the thinking state
      if (mode === 'speak') {
        setOverlayLoading(true);
        setOverlayTranscript('');
        setIsListening(false);
        isListeningRef.current = false;
      }

      if (mode === 'mic') {
        setInputRef.current?.(text.trim());
      } else {
        setOverlayMessages(prev => [...prev, { id: Date.now().toString(), text: text.trim(), isUser: true }]);
        await sendOverlayMessageRef.current?.(text.trim(), true);
      }
    } catch (err) {
      // 400 means silence/too-short — expected, no need to log
      if (!String(err).includes('400')) console.error('[Speech] Transcription error:', err);
    } finally {
      isProcessingRef.current = false;
      if (mode === 'speak') setOverlayLoading(false);
    }
  }

  // ── Mic button mode ────────────────────────────────────────────────────────

  async function startMicRecording() {
    if (isListeningRef.current || isRecognitionStartingRef.current) return;
    isRecognitionStartingRef.current = true;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      // Primary path: native browser SpeechRecognition — text appears live, no network round trip
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = recognitionLangRef.current;
      // continuous=true so the mic keeps listening through natural pauses (breaths, thinking
      // mid-sentence) instead of the browser ending the session on the very first silence gap —
      // that was cutting the user off before they'd finished speaking. End-of-turn is now our own
      // 10s-of-silence timer below, not the browser's built-in single-utterance cutoff.
      recognition.continuous = true;
      recognition.interimResults = true;

      let accumulated = '';
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;

      // Auto-stop 10s after the last new word (final or interim) — not 10s from when listening
      // started. Resets on every onresult, so a long pause mid-thought doesn't cut the mic, but
      // genuinely finishing (or walking away) does eventually stop it.
      const resetSilenceTimer = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          try { recognition.stop(); } catch {}
        }, 10000);
      };

      recognition.onresult = (event: any) => {
        if (activeMicRecognitionRef.current !== recognition) return;
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) accumulated += t;
          else interim = t;
        }
        setInputRef.current?.((accumulated + interim).trim());
        resetSilenceTimer();
      };

      recognition.onend = () => {
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
        if (accumulated.trim()) setInputRef.current?.(prev => (prev.trim() ? accumulated.trim() : prev));
        if (activeMicRecognitionRef.current === recognition) activeMicRecognitionRef.current = null;
        setIsListening(false);
        isListeningRef.current = false;
        isRecognitionStartingRef.current = false;
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('[Speech] Recognition error:', event.error);
        }
        if (activeMicRecognitionRef.current === recognition) activeMicRecognitionRef.current = null;
        setIsListening(false);
        isListeningRef.current = false;
        isRecognitionStartingRef.current = false;
      };

      recognitionRef.current = recognition;
      activeMicRecognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      isListeningRef.current = true;
      isRecognitionStartingRef.current = false;
      resetSilenceTimer();

      // Hard outer cap — safety net in case background noise keeps resetting the silence timer
      // indefinitely (continuous mode has no built-in maximum duration on its own).
      setTimeout(() => { if (isListeningRef.current) try { recognition.stop(); } catch {} }, 60000);
      return;
    }

    // Fallback path: ElevenLabs via MediaRecorder (non-Chrome browsers)
    try {
      const stream = await getStream();
      const chunks: Blob[] = [];
      audioChunksRef.current = chunks;

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        await flushChunks(chunks, 'mic');
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setIsListening(false);
        isListeningRef.current = false;
        isRecognitionStartingRef.current = false;
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsListening(true);
      isListeningRef.current = true;
      isRecognitionStartingRef.current = false;

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      }, 15000);
    } catch (err) {
      isRecognitionStartingRef.current = false;
      console.error('[Speech] Mic error:', err);
      alert('Could not access microphone. Please allow microphone access and try again.');
    }
  }

  // ── Speak mode ─────────────────────────────────────────────────────────────

  function startSpeakChunk(stream: MediaStream) {
    if (ttsPausedRef.current || !speakModeRef.current) return;
    const chunks: Blob[] = [];
    audioChunksRef.current = chunks;

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      return;
    }

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    // Hard cap: force-stop after 10 s so a noisy environment never blocks forever
    const maxTimer = setTimeout(() => {
      if (mediaRecorderRef.current === recorder && recorder.state === 'recording') recorder.stop();
    }, 10000);

    recorder.onstop = async () => {
      clearTimeout(maxTimer);
      if (ttsPausedRef.current) { audioChunksRef.current = []; return; } // discard if TTS triggered the stop
      await flushChunks(chunks, 'speak');
      if (speakModeRef.current && !ttsPausedRef.current && !isProcessingRef.current) {
        startSpeakChunk(stream);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100);
    chunkStartTimeRef.current = Date.now();
    noiseFloorRef.current = 8;      // reset ambient baseline for each new chunk
    hadVoiceInChunkRef.current = false; // reset voice flag for each new chunk
    setIsListening(true);
    isListeningRef.current = true;
  }

  // Native-recognition path for Speak mode — no server round trip, so it keeps
  // working regardless of ElevenLabs quota/availability. The browser handles
  // end-of-utterance detection itself, so no VAD/AudioContext needed here.
  function startSpeakRecognition() {
    if (ttsPausedRef.current || !speakModeRef.current || isSpeakRecognitionStartingRef.current) return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    isSpeakRecognitionStartingRef.current = true;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = recognitionLangRef.current;
    recognition.continuous = false;
    recognition.interimResults = false;

    let finalText = '';
    let gotError = false;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
    };

    recognition.onend = () => {
      speechRecognitionRef.current = null;
      isSpeakRecognitionStartingRef.current = false;
      setIsListening(false);
      isListeningRef.current = false;

      // Ended because TTS start deliberately aborted us — the TTS onEnd hook owns
      // restarting capture once Avy is done, so don't also restart here.
      if (abortedForPauseRef.current) { abortedForPauseRef.current = false; return; }

      const text = finalText.trim();
      if (text) {
        speakRecognitionFailStreakRef.current = 0;
        void handleSpeakRecognitionResult(text);
        return;
      }

      if (!speakModeRef.current || ttsPausedRef.current || isProcessingRef.current) return;

      // Nothing captured this round (silence timeout, or a real error like
      // "network"/"audio-capture"). Restarting instantly can make the browser's
      // recognition service fail immediately every time — a tight loop that looks
      // like the mic flickering and never actually listens. Back off instead, and
      // give up after repeated failures rather than spinning forever.
      if (gotError) {
        speakRecognitionFailStreakRef.current += 1;
        if (speakRecognitionFailStreakRef.current > 5) {
          console.error('[Speech] Speak-mode recognition failing repeatedly — stopping auto-restart.');
          return;
        }
      } else {
        speakRecognitionFailStreakRef.current = 0;
      }

      const delay = gotError ? Math.min(600 * speakRecognitionFailStreakRef.current, 4000) : 300;
      setTimeout(() => {
        if (speakModeRef.current && !ttsPausedRef.current && !isProcessingRef.current) startSpeakRecognition();
      }, delay);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        gotError = true;
        console.error('[Speech] Speak-mode recognition error:', event.error);
      }
      // onend always fires after onerror — it owns cleanup/restart
    };

    try {
      recognition.start();
      speechRecognitionRef.current = recognition;
      setIsListening(true);
      isListeningRef.current = true;
    } catch {
      // e.g. "already started" — safe to drop, the next resume will retry
      isSpeakRecognitionStartingRef.current = false;
    }
  }

  async function handleSpeakRecognitionResult(text: string) {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setOverlayLoading(true);
    setOverlayTranscript('');
    setOverlayMessages(prev => [...prev, { id: Date.now().toString(), text, isUser: true }]);
    try {
      await sendOverlayMessageRef.current?.(text, true);
    } finally {
      isProcessingRef.current = false;
      setOverlayLoading(false);
    }
  }

  function startVAD(stream: MediaStream) {
    try {
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioCtx;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        if (!speakModeRef.current) return;

        // Do nothing while TTS is playing
        if (ttsPausedRef.current) { requestAnimationFrame(poll); return; }

        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const elapsed = Date.now() - chunkStartTimeRef.current;

        // Calibrate noise floor during the grace period.
        if (elapsed < 300) {
          noiseFloorRef.current = 0.1 * avg + 0.9 * noiseFloorRef.current;
        }

        // Voice threshold: at least 20, or 2.5× the measured noise floor.
        const voiceThreshold = Math.max(20, noiseFloorRef.current * 2.5);

        if (avg > voiceThreshold) {
          // Voice detected — mark it so silence timeout can be shorter
          if (!isSpeakDetectedRef.current) { isSpeakDetectedRef.current = true; setIsSpeakDetected(true); }
          hadVoiceInChunkRef.current = true;
          if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }
        } else {
          if (isSpeakDetectedRef.current) { isSpeakDetectedRef.current = false; setIsSpeakDetected(false); }
          // Silence — start countdown after 300 ms grace period.
          // 650 ms if user actually spoke (enough for natural pauses without feeling laggy),
          // 950 ms if no voice yet (conservative).
          if (!vadTimerRef.current && elapsed > 300 && mediaRecorderRef.current?.state === 'recording' && !isProcessingRef.current) {
            const silenceMs = hadVoiceInChunkRef.current ? 650 : 950;
            vadTimerRef.current = setTimeout(() => {
              vadTimerRef.current = null;
              if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
            }, silenceMs);
          }
        }

        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    } catch (err) {
      console.error('[Speech] VAD error:', err);
    }
  }

  async function startSpeakMode() {
    speakRecognitionFailStreakRef.current = 0;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      // Primary path: native browser recognition — keeps working regardless of
      // ElevenLabs transcription quota/availability.
      useNativeSpeakRef.current = true;
      startSpeakRecognition();
      return;
    }

    useNativeSpeakRef.current = false;
    try {
      const stream = await getStream();
      startVAD(stream);
      startSpeakChunk(stream);
    } catch (err) {
      console.error('[Speech] Speak mode error:', err);
      alert('Could not access microphone. Please allow microphone access and try again.');
      setIsSpeakMode(false);
      speakModeRef.current = false;
    }
  }

  // Start capture when speak mode activates
  useEffect(() => {
    if (!isSpeakMode) return;
    const t = setTimeout(() => {
      if (speakModeRef.current && !isListeningRef.current) startSpeakMode();
    }, 220);
    return () => clearTimeout(t);
  }, [isSpeakMode]);

  // ── Handlers exposed to UI ─────────────────────────────────────────────────

  const handleMicrophoneClick = () => {
    if (isListening) {
      // Stops both native SpeechRecognition (primary) and MediaRecorder shim (fallback)
      try { recognitionRef.current?.stop?.(); } catch {}
      setIsSpeakMode(false);
      speakModeRef.current = false;
      voiceConversationRef.current = false;
      setHideQuickPrompts(false);
    } else {
      startMicRecording();
    }
  };

  const handleSpeakClick = () => {
    cancelSpeech();
    speakModeRef.current = true;
    voiceConversationRef.current = true;
    setIsSpeakMode(true);
    setHideQuickPrompts(true);
  };

  const clearSendTimer = () => {
    if (sendDelayTimerRef.current) { clearTimeout(sendDelayTimerRef.current); sendDelayTimerRef.current = null; }
    accumulatedTextRef.current = '';
  };

  const closeOverlay = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>, storageKey: string) => {
    clearSendTimer();
    cancelSpeech();
    stopCapture();
    setIsSpeakMode(false);
    speakModeRef.current = false;
    voiceConversationRef.current = false;
    setHideQuickPrompts(false);
    if (overlayMessages.length > 0) {
      setMessages(prev => {
        const ids = new Set(prev.map(m => m.id));
        const merged = [...prev, ...overlayMessages.filter(m => !ids.has(m.id))];
        try { localStorage.setItem(storageKey, JSON.stringify(merged)); } catch {}
        return merged;
      });
    }
    setOverlayMessages([]);
    setOverlayTranscript('');
    setOverlayLoading(false);
  };

  const handleOverlayMicClick = () => {
    clearSendTimer();
    if (isListeningRef.current) {
      // Pause: stop capture without auto-restart
      // speakModeRef = false FIRST so _onTTSEnd hook and onstop/onend don't restart capture
      speakModeRef.current = false;
      cancelSpeech();
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      if (speechRecognitionRef.current) {
        abortedForPauseRef.current = true;
        try { speechRecognitionRef.current.abort(); } catch {}
      }
      setIsListening(false);
      isListeningRef.current = false;
    } else if (ttsPausedRef.current) {
      // Interrupt Avy mid-speech — cancelSpeech fires _onTTSEnd which restarts capture after 450ms
      speakModeRef.current = true;
      cancelSpeech();
    } else {
      // Paused or idle — resume listening
      speakModeRef.current = true;
      if (useNativeSpeakRef.current) {
        startSpeakRecognition();
      } else if (streamRef.current) {
        startSpeakChunk(streamRef.current);
      }
    }
  };

  return {
    isListening,
    setIsListening,
    isListeningRef,
    selectedSpeechLang,
    setSelectedSpeechLang,
    recognitionLangRef,
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
    isTTSSpeaking,
    isSpeakDetected,
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
