"use client";

import { useRef, useState, useEffect } from 'react';
import type { Message } from '../useChatbotState';

interface UseChatUIProps {
  messages: Message[];
  input: string;
}

export function useChatUI({ messages, input }: UseChatUIProps) {
  const [addedIds, setAddedIds] = useState<string[]>([]);
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

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleMessages = normalizedSearchQuery
    ? messages.filter(msg => msg.text.replace(/<[^>]*>/g, ' ').toLowerCase().includes(normalizedSearchQuery))
    : messages;
  const searchResultCount = normalizedSearchQuery ? visibleMessages.length : 0;
  const hasUserMessage = messages.some(msg => msg.isUser);

  return {
    addedIds,
    setAddedIds,
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
    normalizedSearchQuery,
    visibleMessages,
    searchResultCount,
    hasUserMessage,
  };
}
