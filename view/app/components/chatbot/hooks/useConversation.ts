"use client";

import { useState, useEffect } from 'react';
import { getStoredUser } from '../../../utils/api.base';
import { createConversationId } from '../../../utils/chatHelpers';
import type { Message } from '../useChatbotState';

const STORAGE_KEY_BASE = 'driptea_chatbot_messages';
const CONVERSATION_ID_KEY = 'driptea_chatbot_conversation_id';

export function getConversationKey(): string {
  const user = getStoredUser();
  return user?.id ? `${CONVERSATION_ID_KEY}_${user.id}` : CONVERSATION_ID_KEY;
}

function getMessagesKey(): string {
  const user = getStoredUser();
  return user?.id ? `${STORAGE_KEY_BASE}_${user.id}` : STORAGE_KEY_BASE;
}

// Keep the old export so other files that import STORAGE_KEY still compile
export const STORAGE_KEY = STORAGE_KEY_BASE;

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

export function getRandomGreeting() {
  return WELCOME_GREETINGS[Math.floor(Math.random() * WELCOME_GREETINGS.length)];
}

function buildWelcomeGreeting() {
  const user = getStoredUser();
  const randomPrompt = getRandomGreeting();
  if (user?.fullName) {
    const firstName = user.fullName.trim().split(/\s+/)[0];
    return `Hello, ${firstName}!\n${randomPrompt}`;
  }
  return randomPrompt;
}

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [welcomeGreeting, setWelcomeGreeting] = useState(WELCOME_GREETINGS[0]);
  const [welcomeAnimationKey, setWelcomeAnimationKey] = useState(0);

  useEffect(() => {
    setWelcomeGreeting(buildWelcomeGreeting());
  }, []);

  function loadConversationFromStorage() {
    const savedId = localStorage.getItem(getConversationKey());
    if (savedId) {
      setConversationId(savedId);
    } else {
      const newId = createConversationId();
      localStorage.setItem(getConversationKey(), newId);
      setConversationId(newId);
    }
    const savedMessages = localStorage.getItem(getMessagesKey());
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
    setIsInitialized(true);
  }

  // Load conversation id and messages from localStorage on mount
  useEffect(() => {
    loadConversationFromStorage();
  }, []);

  // Reset conversation when the logged-in account changes (login / logout)
  useEffect(() => {
    const handleAuthUpdated = () => {
      loadConversationFromStorage();
      setWelcomeGreeting(buildWelcomeGreeting());
    };
    window.addEventListener('authUpdated', handleAuthUpdated);
    return () => window.removeEventListener('authUpdated', handleAuthUpdated);
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(getMessagesKey(), JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  function restartConversation() {
    const newId = createConversationId();
    setWelcomeGreeting(buildWelcomeGreeting());
    setWelcomeAnimationKey(k => k + 1);
    setConversationId(newId);
    setMessages([]);
    localStorage.setItem(getMessagesKey(), JSON.stringify([]));
    localStorage.setItem(getConversationKey(), newId);
  }

  return {
    messages,
    setMessages,
    conversationId,
    setConversationId,
    isInitialized,
    welcomeGreeting,
    welcomeAnimationKey,
    restartConversation,
  };
}
