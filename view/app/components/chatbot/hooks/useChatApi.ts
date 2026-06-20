// User Story Architecture Trace — useChatApi.ts
//
// #25  Chat with AI Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatApi.ts (this file) → POST /api/chat → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js
//
// #26  Navigate Website via Chatbot
//      View: ChatbotSidebar.tsx → Hook: useChatApi.ts (this file) → POST /api/chat → Ctrl: chatbot.controller.js → Svc: chatbot.service.js
//
// #27–#32, #196–#203 (all chatbot user stories)
//      View: ChatbotSidebar.tsx → Hook: useChatApi.ts (this file) → POST /api/chat → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: [varies per story]
"use client";

import { useState } from 'react';
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
    const strippedReply = rawReply.replace(/<div[^>]*class="[^"]*hidden-cart-data[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    const sanitizedReply = strippedReply.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
    return { sanitizedReply, recommendedDrinks, healthCard, orderReceipt, cartUpdate, purchaseHistory, showViewCart: payload.showViewCart };
  }

  async function sendMessage(messageText: string, shouldSpeak: boolean = false, isQuickPrompt: boolean = false) {
    // ── Image path ──────────────────────────────────────────────────────────
    if (pendingImages.length > 0) {
      const img = pendingImages[0];
      try {
        setIsLoading(true);
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
        const photoChip = `<span style="display:inline-flex;align-items:center;gap:8px;background:#f7eaf5;border:1.5px solid rgba(171,28,110,0.28);border-radius:10px;padding:5px 12px 5px 5px;"><span style="position:relative;display:inline-block;width:38px;height:38px;flex-shrink:0;"><img src="${img.previewUrl}" alt="" style="width:38px;height:38px;border-radius:7px;object-fit:cover;display:block;border:1.5px solid rgba(171,28,110,0.30);" /><span style="position:absolute;bottom:2px;right:2px;background:rgba(171,28,110,0.80);border-radius:4px;padding:2px 3px;font-size:9px;line-height:1;color:#fff;">&#128247;</span></span><span style="font-size:0.73rem;color:#7b1254;font-weight:600;white-space:nowrap;">Photo attached</span></span>`;
        const userBubbleText = messageText.trim()
          ? `${photoChip}<div style="margin-top:6px;">${messageText.trim()}</div>`
          : photoChip;
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: userBubbleText,
          isUser: true,
        }]);
        setPendingImages([]);
        setInput('');
        const convId = ensureConversationId();
        const res = await sendChatImage({ message: messageText || 'What drink is this?', image: base64, mimeType, conversationId: convId });
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

    if (shouldSpeak && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
      setIsSpeakMode(false);
      speakModeRef.current = false;
      setHideQuickPrompts(true);
    }

    setMessages(prev => [...prev, { id: Date.now().toString(), text: messageText, isUser: true }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage({ message: messageText, conversationId: convId, userId: getCurrentUserId(), isQuickPrompt });
      const { sanitizedReply, recommendedDrinks, healthCard, orderReceipt, cartUpdate, purchaseHistory, showViewCart } = parsePayload(await response.json());
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: sanitizedReply, isUser: false, recommendedDrinks, healthCard, orderReceipt, cartUpdate, purchaseHistory };
      setMessages(prev => [...prev, botMsg]);

      if (shouldSpeak) {
        const plainText = botMsg.text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const humaneIntro = plainText.match(/^(hello|hi|hey|sure|absolutely|of course|here's|here is)/i) ? plainText : `Sure — ${plainText}`;
        speakText(humaneIntro);
      }
      // #199 / #200 / #201 - Dispatch cartUpdated so Cart page and header badge re-fetch
      // from the backend after any cart change (add, edit, remove, clear).
      // showViewCart is set explicitly by the backend; text patterns are a safety net
      // for Gemini-flow responses that don't carry the flag.
      if (
        /added to your cart/i.test(botMsg.text) ||
        /removed from your cart/i.test(botMsg.text) ||
        /your cart is now empty/i.test(botMsg.text) ||
        /updated.*cart/i.test(botMsg.text) ||
        /cart.*updated/i.test(botMsg.text) ||
        botMsg.cartUpdate ||
        showViewCart
      ) {
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
        healthCard: payload.healthCard && typeof payload.healthCard === 'object' ? (payload.healthCard as Message['healthCard']) : null,
        orderReceipt: payload.orderReceipt && typeof payload.orderReceipt === 'object' ? (payload.orderReceipt as Message['orderReceipt']) : null,
        cartUpdate: payload.cartUpdate && typeof payload.cartUpdate === 'object' ? (payload.cartUpdate as Message['cartUpdate']) : null,
        purchaseHistory: payload.purchaseHistory && typeof payload.purchaseHistory === 'object' ? (payload.purchaseHistory as Message['purchaseHistory']) : null,
      };
      setOverlayMessages(prev => [...prev, botMsg]);
      if (shouldSpeak) speakText(botMsg.text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
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
