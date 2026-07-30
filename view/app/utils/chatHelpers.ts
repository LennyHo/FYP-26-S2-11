export const QUICK_PROMPTS = [
  'What should I try today?',
  'Show me low sugar options',
  'Which drink has the least calories?',
  'Recommend some healthier drinks',
];

export function createConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function convertDrinkNamesToLinks(text: string, menuLookup: Record<string, { id: string; category: string }> = {}): string {
  let result = text;

  Object.entries(menuLookup).forEach(([drinkName, { id, category }]) => {
    const url = `/menu/${category}/${id}`;
    
    // Handle **Drink Name** format
    const boldPattern = new RegExp(`\\*\\*${drinkName}\\*\\*`, 'g');
    result = result.replace(boldPattern, `<a href="${url}" class="chat-drink-link" style="color: #2b7da3; text-decoration: none; border-bottom: 2px solid #2b7da3; font-weight: bold;"><strong>${drinkName}</strong></a>`);
    
    // Handle ***Drink Name*** format
    const boldItalicPattern = new RegExp(`\\*\\*\\*${drinkName}\\*\\*\\*`, 'g');
    result = result.replace(boldItalicPattern, `<a href="${url}" class="chat-drink-link" style="color: #2b7da3; text-decoration: none; border-bottom: 2px solid #2b7da3; font-weight: bold;"><strong>${drinkName}</strong></a>`);
  });
  
  return result;
}

export function extractOrderingOptions(html: string): {
  cleanHtml: string;
  options: string[];
  question: string;
} {
  // Normalize <p> spacers the AI uses (from system prompt) into <br> separators
  const normalized = html
    .replace(/<\/p>/gi, '<br>')
    .replace(/<p[^>]*>/gi, '');
  const lines = normalized.split(/<br\s*\/?>/gi);
  const options: string[] = [];
  const cleanLines: string[] = [];
  let optionLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].replace(/<[^>]*>/g, '').trim();
    if (text.length > 0) {
      const parts = text.split(/\s*\/\s*/);
      if (
        parts.length >= 2 &&
        parts.every(p => p.trim().length > 0 && p.trim().length <= 55) &&
        !text.includes('http')
      ) {
        options.push(...parts.map(p => p.trim()));
        optionLineIdx = i;
        continue;
      }
    }
    cleanLines.push(lines[i]);
  }

  // Fallback: AI sometimes generates <button>...</button> elements instead of
  // slash-separated text. Extract non-navigation buttons (those without the
  // chat-nav-btn class) and treat their text as ordering options.
  if (options.length === 0) {
    const btnRegex = /<button(?![^>]*chat-nav-btn)[^>]*>(.*?)<\/button>/gi;
    const btnTexts: string[] = [];
    let btnMatch: RegExpExecArray | null;
    while ((btnMatch = btnRegex.exec(html)) !== null) {
      const t = btnMatch[1].replace(/<[^>]*>/g, '').trim();
      if (t && t.length <= 55) btnTexts.push(t);
    }
    if (btnTexts.length >= 2) {
      const cleanHtml = html.replace(/<button(?![^>]*chat-nav-btn)[^>]*>.*?<\/button>/gi, '').replace(/\s{2,}/g, ' ').trim();
      return { cleanHtml, options: btnTexts, question: '' };
    }
    return { cleanHtml: html, options: [], question: '' };
  }

  // Find the question line closest before the option line
  let question = '';
  for (let i = optionLineIdx - 1; i >= 0; i--) {
    const text = lines[i].replace(/<[^>]*>/g, '').trim();
    if (text.endsWith('?')) { question = text; break; }
  }

  // Strip trailing filler ("Just let me know!", "Please let me know...")
  while (cleanLines.length > 0) {
    const tail = cleanLines[cleanLines.length - 1].replace(/<[^>]*>/g, '').trim().toLowerCase();
    if (!tail || /just let me know|please let me know|let me know/i.test(tail)) {
      cleanLines.pop();
    } else break;
  }

  return { cleanHtml: cleanLines.join('<br>'), options, question };
}

export function getOrderStep(options: string[]): number {
  const text = options.join(' ').toLowerCase();
  if (text.includes('regular') || text.includes('large')) return 1;
  if (text.includes('ice') || text.includes('hot')) return 2;
  // Checked before the sugar-percent step below — "Brown Sugar" is a topping option, so
  // checking for "sugar" first would misclassify the toppings step as the sugar step.
  if (text.includes('tapioca') || text.includes('pearl') || text.includes('cheese') || text.includes('topping')) return 4;
  if (options.some(o => /^\d+%$/.test(o.trim()))) return 3;
  if (text.includes('sugar') || text.includes('sweet') || text.includes('remain at')) return 3;
  return 4;
}

export function convertMarkdownBold(html: string): string {
  return html
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
}

function detectSpeechLang(text: string): string {
  if (/[一-鿿]/.test(text)) return 'zh-CN';
  if (/[஀-௿]/.test(text)) return 'ta-IN';
  if (/\b(nak|saya|mahu|boleh|dan|yang|ada|dengan|untuk|tidak|ini|itu|awak|anda|minuman|teh|gula|ais|besar|biasa|kurang|tanpa|panas|mutiara)\b/i.test(text)) return 'ms-MY';
  return 'en-GB';
}

export function detectChatLang(text: string): string {
  return detectSpeechLang(text);
}

export function getBrowserSpeechLang(): string {
  if (typeof window === 'undefined') return 'en-US';
  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('zh')) return 'zh-CN';
  if (nav.startsWith('ta')) return 'ta-IN';
  if (nav.startsWith('ms')) return 'ms-MY';
  return 'en-GB';
}

// Module-level ref so cancelSpeech() can stop ElevenLabs audio elements too
let _activeAudio: HTMLAudioElement | null = null;
export function registerAudio(audio: HTMLAudioElement | null) { _activeAudio = audio; }

// Bumped on every cancelSpeech()/speakText() call so async TTS responses that resolve
// after a newer narration has started can detect they're stale and drop themselves,
// instead of playing on top of the latest message's audio.
let _speakSeq = 0;

// Hooks called by useSpeech so it can pause/resume MediaRecorder around TTS playback
let _onTTSStart: (() => void) | null = null;
let _onTTSEnd: (() => void) | null = null;
export function setTTSHooks(onStart?: () => void, onEnd?: () => void): void {
  _onTTSStart = onStart ?? null;
  _onTTSEnd = onEnd ?? null;
}

// Stops whatever audio/utterance is currently active without touching the TTS
// hooks — used internally by speakText() so clearing the previous narration
// right before starting a new one doesn't fire a spurious "resume the mic"
// signal that a new _onTTSStart() is about to contradict a moment later.
function _stopActivePlayback(): void {
  if (_activeAudio) { _activeAudio.pause(); _activeAudio.src = ''; _activeAudio = null; }
  if ('speechSynthesis' in window) {
    const s = window.speechSynthesis;
    if (s.speaking || s.pending) { s.pause(); s.cancel(); }
  }
}

export function cancelSpeech(): void {
  _speakSeq++;
  _stopActivePlayback();
  // Always fire the end hook so MediaRecorder resumes correctly after cancellation
  _onTTSEnd?.();
}

function _browserSpeak(text: string, onEndCallback?: () => void, mySeq?: number): void {
  if (!('speechSynthesis' in window)) { _onTTSEnd?.(); onEndCallback?.(); return; }
  if (mySeq !== undefined && mySeq !== _speakSeq) return; // a newer narration has since started
  window.speechSynthesis.cancel();
  const lang = detectSpeechLang(text);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voices = window.speechSynthesis.getVoices();
  const langVoice = voices.find(v => v.lang === lang) ||
    voices.find(v => v.lang.startsWith(lang.split('-')[0]));
  const fallbackVoice = voices.find(v =>
    v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female')
  );
  utterance.voice = langVoice || fallbackVoice || null;
  utterance.pitch = 1.1;
  utterance.rate = (lang === 'zh-CN' || lang === 'ta-IN') ? 0.95 : 1.0;
  utterance.onend = () => { _onTTSEnd?.(); onEndCallback?.(); };
  utterance.onerror = () => { _onTTSEnd?.(); onEndCallback?.(); };
  window.speechSynthesis.speak(utterance);
}

export function speakText(
  text: string,
  onEndCallback?: () => void,
  options: { allowBrowserFallback?: boolean; onError?: () => void } = {},
): void {
  const clean = text.replace(/[*#]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) { onEndCallback?.(); return; }
  const allowBrowserFallback = options.allowBrowserFallback ?? true;

  const handleNarrationFailure = () => {
    if (allowBrowserFallback) {
      _browserSpeak(clean, onEndCallback, mySeq);
      return;
    }
    _onTTSEnd?.();
    options.onError?.();
    onEndCallback?.();
  };

  // Stop whatever is currently playing/pending and claim the new sequence number so
  // a slower, older request can't play its audio after this (newer) one starts.
  // Deliberately not cancelSpeech() here: that fires _onTTSEnd (mic-resume signal),
  // which would race the _onTTSStart() below and could schedule a stray resume
  // that fires mid-narration once this new response starts playing.
  _speakSeq++;
  _stopActivePlayback();
  const mySeq = _speakSeq;

  _onTTSStart?.();

  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: clean }),
  })
    .then(res => {
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      if (mySeq !== _speakSeq) return; // superseded by a newer speakText() call
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      registerAudio(audio);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        registerAudio(null);
        _onTTSEnd?.();
        onEndCallback?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        registerAudio(null);
        if (mySeq === _speakSeq) handleNarrationFailure();
      };
      audio.play().catch(() => {
        registerAudio(null);
        if (mySeq === _speakSeq) handleNarrationFailure();
      });
    })
    .catch(() => {
      if (mySeq === _speakSeq) handleNarrationFailure();
    });
}

export function parseDrinkFromHtml(html: string) {
  try {
    const imageMatch = html.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/i);
    const altMatch = html.match(/<img[^>]+alt=['"]([^'"]+)['"][^>]*>/i);
    const nameMatch =
      html.match(/\*\*([^*]+)\*\*\s*\(\$?([^)]+)\)/) ||
      html.match(/<strong>([^<]+)<\/strong>\s*\(\$?([^)]+)\)/i);
    const statsMatch = html.match(/Nutri\s*Grade:\s*([A-F])\s*\|\s*Sugar:\s*([^|<\n]+?)g?\s*\|\s*Calories:\s*([^<\n]+?)(?:\s*kcal)?(?:<|$)/i);
    const idMatch =
      html.match(/startOrder\((?:\\?["'])([^"')\\]+)(?:\\?["'])\)/i) ||
      html.match(/data-drink-id=['"]([^'"]+)['"]/i);

    if (!nameMatch || !statsMatch || !idMatch) {
      return null;
    }

    return {
      id: idMatch[1],
      name: nameMatch[1]?.trim() || altMatch?.[1]?.trim() || 'Recommended drink',
      image: imageMatch?.[1] || (/^b\d{3}$/.test(idMatch[1]) ? `/img/bubble_teas/${idMatch[1]}.jpg` : "/img/bubble_teas/b001.jpg"),
      price: nameMatch[2].trim(),
      grade: statsMatch[1].trim(),
      sugar: statsMatch[2].trim(),
      calories: statsMatch[3].trim(),
    };
  } catch (e) {
    return null;
  }
}


