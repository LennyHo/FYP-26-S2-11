function getApiEndpoint(): string {
  const configured = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE?.trim();
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5000/api/chat';
  return configured ? `${configured.replace(/\/$/, '')}/api/chat` : '/api/chat';
}

function getImageApiBase(): string {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5000';
  return process.env.NEXT_PUBLIC_DRIPTEA_API_BASE?.trim() || 'https://driptea-trrn.onrender.com';
}

// Sends a text message to the chatbot. Returns the raw Response.
export function sendChatMessage(payload: {
  message: string;
  conversationId: string;
  userId: string;
  isQuickPrompt?: boolean;
}): Promise<Response> {
  return fetch(getApiEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Sends one or more images (base64) to the chatbot. Returns the raw Response.
export function sendChatImage(payload: {
  message: string;
  images: { data: string; mimeType: string }[];
  conversationId: string;
}): Promise<Response> {
  return fetch(`${getImageApiBase()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
