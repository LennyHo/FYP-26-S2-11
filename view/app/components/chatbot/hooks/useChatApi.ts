// User Story Architecture Trace — useChatApi.ts
//
// #25  Chat with AI Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatApi.ts (this file) → POST /api/chat → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js
//
// #26  Navigate Website via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatApi.ts (this file) → POST /api/chat → Ctrl: chatbot.controller.js → Svc: chatbot.service.js
//
// #27–#32, #196–#304 (all chatbot user stories)
//      View: ChatbotSidebar.tsx → Hook: useChatApi.ts (this file) → POST /api/chat → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: [varies per story]
"use client";

import { useState } from 'react';
import type { useRouter } from 'next/navigation';
import { getStoredUser } from '../../../utils/api.base';
import { sendChatMessage, sendChatImage } from '../../../utils/chatbotApi';
import { createConversationId, speakText } from '../../../utils/chatHelpers';
import { getConversationKey } from './useConversation';
import type { Message } from '../useChatbotState';

function getCurrentUserId(): string {
  return getStoredUser()?.id || '';
}

interface UseChatApiProps {
  conversationId: string;
  setConversationId: (id: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  pendingImages: Array<{ name: string; previewUrl: string; source: string }>;
  setPendingImages: React.Dispatch<React.SetStateAction<any[]>>;
  setInput: (value: string) => void;
  router: ReturnType<typeof useRouter>;
  // Speech refs needed to stop mic when sending in speak mode
  isListening: boolean;
  setIsListening: (v: boolean) => void;
  isListeningRef: React.MutableRefObject<boolean>;
  recognitionRef: React.MutableRefObject<any>;
  setIsSpeakMode: (v: boolean) => void;
  speakModeRef: React.MutableRefObject<boolean>;
  setHideQuickPrompts: (v: boolean) => void;
  setOverlayMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setOverlayLoading: (v: boolean) => void;
}

export function useChatApi({
  conversationId,
  setConversationId,
  setMessages,
  pendingImages,
  setPendingImages,
  setInput,
  router,
  isListening,
  setIsListening,
  isListeningRef,
  recognitionRef,
  setIsSpeakMode,
  speakModeRef,
  setHideQuickPrompts,
  setOverlayMessages,
  setOverlayLoading,
}: UseChatApiProps) {
  const [isLoading, setIsLoading] = useState(false);

  function ensureConversationId(): string {
    if (conversationId) return conversationId;
    const newId = createConversationId();
    try { localStorage.setItem(getConversationKey(), newId); } catch {}
    setConversationId(newId);
    return newId;
  }

  function parsePayload(data: unknown) {
    const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const rawReply = typeof payload.reply === 'string' ? payload.reply
      : "I'm so sorry for the inconvenience! Our server seems to be taking a short break. Please try again in a moment, or feel free to visit us in store and our baristas will be happy to help.";
    const recommendedDrinks = Array.isArray(payload.recommendedDrinks)
      ? (payload.recommendedDrinks as Message['recommendedDrinks']) : [];
    const healthCard = payload.healthCard && typeof payload.healthCard === 'object'
      ? (payload.healthCard as Message['healthCard']) : null;
    const orderReceipt = payload.orderReceipt && typeof payload.orderReceipt === 'object'
      ? (payload.orderReceipt as Message['orderReceipt']) : null;
    const cartUpdate = payload.cartUpdate && typeof payload.cartUpdate === 'object'
      ? (payload.cartUpdate as Message['cartUpdate']) : null;
    const purchaseHistory = payload.purchaseHistory && typeof payload.purchaseHistory === 'object'
      ? (payload.purchaseHistory as Message['purchaseHistory']) : null;
    const orderStatusCard = payload.orderStatusCard && typeof payload.orderStatusCard === 'object'
      ? (payload.orderStatusCard as Message['orderStatusCard']) : null;
    const voucherCard = payload.voucherCard && typeof payload.voucherCard === 'object'
      ? (payload.voucherCard as Message['voucherCard']) : null;
    const storeCards = Array.isArray(payload.storeCards)
      ? (payload.storeCards as Message['storeCards']) : [];
    const systemAction = payload.system_action && typeof payload.system_action === 'object'
      ? (payload.system_action as { ui_navigation?: string }) : null;
    const multiIntent = payload.multiIntent === true;
    const segments = Array.isArray(payload.segments) ? (payload.segments as Message['segments']) : undefined;
    const agentHandoff = payload.agentHandoff && typeof payload.agentHandoff === 'object'
      ? (payload.agentHandoff as { delayMs?: number; name?: string; reply?: string }) : null;
    const strippedReply = rawReply.replace(/<div[^>]*class="[^"]*hidden-cart-data[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    const sanitizedReply = strippedReply.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
    return { sanitizedReply, recommendedDrinks, healthCard, orderReceipt, cartUpdate, purchaseHistory, orderStatusCard, voucherCard, storeCards, multiIntent, segments, agentHandoff, showViewCart: payload.showViewCart, systemAction };
  }

  async function sendMessage(messageText: string, shouldSpeak: boolean = false, isQuickPrompt: boolean = false) {
    // ── Image path ──────────────────────────────────────────────────────────
    if (pendingImages.length > 0) {
      try {
        setIsLoading(true);
        // Every attached image is analysed and shown in the message gallery.
        const thumbnails: string[] = [];
        const analysisImages: { data: string; mimeType: string }[] = [];
        for (const img of pendingImages) {
          const blob = await (await fetch(img.previewUrl)).blob();
          const mimeType = blob.type || 'image/jpeg';
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result;
              if (typeof result === 'string') resolve(result.split(',')[1]);
              else reject(new Error('Failed to read image'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          analysisImages.push({ data: base64, mimeType });
          // Build a thumbnail data URL too so the gallery survives page reloads
          // (blob: URLs are session-only and break on refresh)
          thumbnails.push(await createThumbnail(blob, 480));
        }
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: messageText.trim(),
          isUser: true,
          images: thumbnails,
        }]);
        setPendingImages([]);
        setInput('');
        const convId = ensureConversationId();
        const res = await sendChatImage({ message: messageText || 'What drink is this?', images: analysisImages, conversationId: convId });
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

    // ── Text path ───────────────────────────────────────────────────────────
    if (!messageText.trim()) return;
    const convId = ensureConversationId();

    if (recognitionRef.current && (isListening || isListeningRef.current)) {
      recognitionRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
      if (shouldSpeak) {
        setIsSpeakMode(false);
        speakModeRef.current = false;
        setHideQuickPrompts(true);
      }
    }

    setMessages(prev => [...prev, { id: Date.now().toString(), text: messageText, isUser: true }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage({ message: messageText, conversationId: convId, userId: getCurrentUserId(), isQuickPrompt });
      const { sanitizedReply, recommendedDrinks, healthCard, orderReceipt, cartUpdate, purchaseHistory, orderStatusCard, voucherCard, storeCards, multiIntent, segments, agentHandoff, showViewCart, systemAction } = parsePayload(await response.json());
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: sanitizedReply, isUser: false, recommendedDrinks, healthCard, orderReceipt, cartUpdate, purchaseHistory, orderStatusCard, voucherCard, storeCards, multiIntent, segments };
      setMessages(prev => [...prev, botMsg]);
      scheduleAgentHandoff(agentHandoff, (msg) => setMessages(prev => [...prev, msg]), shouldSpeak);

      // #26 - Navigate Website via Chatbot: backend resolved a destination page, jump there now.
      if (systemAction?.ui_navigation && systemAction.ui_navigation !== 'none') {
        router.push(systemAction.ui_navigation);
      }

      if (shouldSpeak) {
        const plainText = botMsg.text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const humaneIntro = plainText.match(/^(hello|hi|hey|sure|absolutely|of course|here's|here is)/i) ? plainText : `Sure, ${plainText}`;
        speakText(humaneIntro);
      }
      // #199 / #200 / #201 - Dispatch cartUpdated only when the backend confirms a real cart
      // change via showViewCart. Text-pattern matching is a false-positive risk — Gemini sometimes
      // says "added to your cart" without producing Phase 6 data, so only the backend flag is reliable.
      if (showViewCart || botMsg.cartUpdate) {
        window.dispatchEvent(new Event('cartUpdated'));
      }
      syncCartFromReply(botMsg.text);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "I'm so sorry for the inconvenience! It looks like our server is currently unavailable. Please try again shortly, or visit us in store and our friendly baristas will be glad to assist you.",
        isUser: false,
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function sendOverlayMessage(text: string, shouldSpeak: boolean = true) {
    if (!text) return;
    setOverlayLoading(true);
    const convId = ensureConversationId();
    try {
      const response = await sendChatMessage({ message: text, conversationId: convId, userId: getCurrentUserId() });
      const payload = await response.json() as Record<string, unknown>;
      const rawReply = typeof payload.reply === 'string' ? payload.reply
        : "I'm so sorry for the inconvenience! Our server seems to be taking a short break. Please try again in a moment.";
      const strippedReply = rawReply.replace(/<div[^>]*class="[^"]*hidden-cart-data[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
      const sanitizedReply = strippedReply.replace(/(<br\s*\/?>(\s|&nbsp;)*){3,}/gi, '<br><br>');
      const botMsg: Message = {
        id: (Date.now() + 1).toString(), text: sanitizedReply, isUser: false,
        recommendedDrinks: Array.isArray(payload.recommendedDrinks) ? (payload.recommendedDrinks as Message['recommendedDrinks']) : [],
        multiIntent: payload.multiIntent === true,
        segments: Array.isArray(payload.segments) ? (payload.segments as Message['segments']) : undefined,
        healthCard: payload.healthCard && typeof payload.healthCard === 'object' ? (payload.healthCard as Message['healthCard']) : null,
        orderReceipt: payload.orderReceipt && typeof payload.orderReceipt === 'object' ? (payload.orderReceipt as Message['orderReceipt']) : null,
        cartUpdate: payload.cartUpdate && typeof payload.cartUpdate === 'object' ? (payload.cartUpdate as Message['cartUpdate']) : null,
        purchaseHistory: payload.purchaseHistory && typeof payload.purchaseHistory === 'object' ? (payload.purchaseHistory as Message['purchaseHistory']) : null,
        orderStatusCard: payload.orderStatusCard && typeof payload.orderStatusCard === 'object' ? (payload.orderStatusCard as Message['orderStatusCard']) : null,
        voucherCard: payload.voucherCard && typeof payload.voucherCard === 'object' ? (payload.voucherCard as Message['voucherCard']) : null,
        storeCards: Array.isArray(payload.storeCards) ? (payload.storeCards as Message['storeCards']) : [],
      };
      setOverlayMessages(prev => [...prev, botMsg]);
      const overlayAgentHandoff = payload.agentHandoff && typeof payload.agentHandoff === 'object'
        ? (payload.agentHandoff as { delayMs?: number; name?: string; reply?: string }) : null;
      scheduleAgentHandoff(overlayAgentHandoff, (msg) => setOverlayMessages(prev => [...prev, msg]), shouldSpeak);

      // #26 - Navigate Website via Chatbot: also honour navigation intents spoken in speak mode.
      const overlaySystemAction = payload.system_action && typeof payload.system_action === 'object'
        ? (payload.system_action as { ui_navigation?: string }) : null;
      if (overlaySystemAction?.ui_navigation && overlaySystemAction.ui_navigation !== 'none') {
        router.push(overlaySystemAction.ui_navigation);
      }
      if (shouldSpeak) {
        const baseText = botMsg.text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const drinks = botMsg.recommendedDrinks;
        if (drinks && drinks.length > 0) {
          const drinkList = drinks
            .slice(0, 5)
            .map(d => d.nutri_grade ? `${d.name}, Grade ${d.nutri_grade.toUpperCase()}` : d.name)
            .join('. ');
          speakText(`${baseText} We have: ${drinkList}. These are our options. What would you like?`);
        } else {
          speakText(baseText);
        }
      }

      // Same cart signalling the typed path does. Speak mode lacked it, so a voice order saved
      // server-side left the cart page and header badge showing stale (empty) state.
      if (payload.showViewCart || botMsg.cartUpdate) {
        window.dispatchEvent(new Event('cartUpdated'));
      }
      syncCartFromReply(botMsg.text);
    } catch {
      const errorText = "I'm so sorry for the inconvenience! Our server seems to be unavailable right now. Please try again in a moment.";
      setOverlayMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: errorText, isUser: false }]);
      if (shouldSpeak) speakText(errorText);
    } finally {
      setOverlayLoading(false);
    }
  }

  return { isLoading, sendMessage, sendOverlayMessage };
}

// ── Simulated human-agent handoff ───────────────────────────────────────────
// Pushes the agent's message after a delay (like a real transfer taking a moment) with a
// distinct `agentName` so ChatbotSidebar renders it with a different name/avatar than Avy.
function scheduleAgentHandoff(
  agentHandoff: { delayMs?: number; name?: string; reply?: string } | null | undefined,
  pushMessage: (msg: Message) => void,
  shouldSpeak: boolean,
) {
  if (!agentHandoff?.reply) return;
  const replyText = agentHandoff.reply;
  setTimeout(() => {
    pushMessage({
      id: (Date.now() + 2).toString(),
      text: replyText,
      isUser: false,
      agentName: agentHandoff.name,
    });
    if (shouldSpeak) {
      speakText(replyText.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
    }
  }, agentHandoff.delayMs ?? 1500);
}

// ── Thumbnail helper ────────────────────────────────────────────────────────

function createThumbnail(blob: Blob, maxPx = 48): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}

// ── Cart sync (extracted for clarity) ──────────────────────────────────────

function syncCartFromReply(msgText: string) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(msgText, 'text/html');
    const hiddenEls = doc.querySelectorAll('.hidden-cart-data');
    if (hiddenEls.length > 0) {
      localStorage.setItem('dripTeaCartData', (hiddenEls[hiddenEls.length - 1].textContent || '').trim());
      window.dispatchEvent(new Event('cartUpdated'));
      return;
    }
    const normalized = msgText.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
    const lines = normalized.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\*\s*\*\*([^*]+)\*\*\s*-\s*S\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (m) {
        const details: string[] = [];
        let j = i + 1;
        while (j < lines.length && /^[-*]/.test(lines[j])) { details.push(lines[j].replace(/^[-*]\s*/, '').trim()); j++; }
        items.push(`${m[1].trim()} | ${details.join(' · ')} | S$ ${(parseFloat(m[2]) || 0).toFixed(2)}`);
        i = j - 1;
      }
    }
    // #199 - Replace (not append) so repeated cart-view replies don't inflate the badge count.
    if (items.length > 0) {
      localStorage.setItem('dripTeaCartData', items.join('\n').trim());
      window.dispatchEvent(new Event('cartUpdated'));
    }
  } catch {
    setTimeout(() => {
      const hiddenBlocks = document.querySelectorAll('.hidden-cart-data');
      if (hiddenBlocks.length > 0) {
        localStorage.setItem('dripTeaCartData', (hiddenBlocks[hiddenBlocks.length - 1].textContent || '').trim());
        window.dispatchEvent(new Event('cartUpdated'));
      }
    }, 300);
  }
}
