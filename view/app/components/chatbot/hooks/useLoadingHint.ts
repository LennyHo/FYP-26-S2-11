"use client";

import { useState, useEffect } from 'react';

const SLOW_HINTS = [
  'Our barista is still brewing... ',
  'Good things take a little time ',
  'Avy is thinking hard for you!',
  'Almost there, hang tight...',
  'Stirring in some extra magic ✨',
];

export function useLoadingHint(isLoading: boolean) {
  const [hintVisible, setHintVisible] = useState(false);
  const [displayedHintText, setDisplayedHintText] = useState('');

  useEffect(() => {
    if (!isLoading) { setHintVisible(false); return; }
    const FADE_MS = 350;
    let idx = 0;

    const show = (text: string) => { setDisplayedHintText(text); requestAnimationFrame(() => setHintVisible(true)); };
    const cycle = () => {
      setHintVisible(false);
      setTimeout(() => { idx = (idx + 1) % SLOW_HINTS.length; show(SLOW_HINTS[idx]); }, FADE_MS);
    };

    const firstTimer = setTimeout(() => show(SLOW_HINTS[0]), 1500);
    const interval = setInterval(cycle, 3500);
    return () => { clearTimeout(firstTimer); clearInterval(interval); };
  }, [isLoading]);

  return { hintVisible, displayedHintText };
}
