"use client";

import { useRef, useState, useEffect } from 'react';
import type { Message } from '../useChatbotState';

interface UseChatUIProps {
  messages: Message[];
  input: string;
}

export function useChatUI({ messages, input }: UseChatUIProps) {
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<Array<{ name: string; previewUrl: string; source: 'camera' | 'screenshot' | 'clipboard' }>>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const chatWindowRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({ top: chatWindowRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-resize textarea as input grows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Keyboard navigation for image preview modal
  useEffect(() => {
    if (previewIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPreviewIndex(null); return; }
      if (e.key === 'ArrowLeft') { setPreviewIndex(prev => (prev && prev > 0 ? prev - 1 : prev)); return; }
      if (e.key === 'ArrowRight') { setPreviewIndex(prev => (typeof prev === 'number' && prev < pendingImages.length - 1 ? prev + 1 : prev)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewIndex, pendingImages.length]);

  const handlePickedImage = (file: File | null, source: 'camera' | 'screenshot' | 'clipboard') => {
    if (!file) return;
    setPendingImages(prev => [...prev, { name: file.name, previewUrl: URL.createObjectURL(file), source }]);
  };

  const handleInputPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items || []).find(item => item.kind === 'file' && item.type.startsWith('image/'));
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

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleMessages = normalizedSearchQuery
    ? messages.filter(msg => msg.text.replace(/<[^>]*>/g, ' ').toLowerCase().includes(normalizedSearchQuery))
    : messages;
  const searchResultCount = normalizedSearchQuery ? visibleMessages.length : 0;
  const hasUserMessage = messages.some(msg => msg.isUser);

  return {
    addedIds,
    setAddedIds,
    pendingImages,
    setPendingImages,
    previewIndex,
    setPreviewIndex,
    flippedCard,
    setFlippedCard,
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    isSettingsOpen,
    setIsSettingsOpen,
    chatWindowRef,
    textareaRef,
    handlePickedImage,
    handleInputPaste,
    removePendingImage,
    normalizedSearchQuery,
    visibleMessages,
    searchResultCount,
    hasUserMessage,
  };
}
