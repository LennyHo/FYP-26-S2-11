# Sequence Diagram — Image Recognition Flow

```mermaid
sequenceDiagram
    actor User
    participant Sidebar as ChatbotSidebar<br/>(Frontend)
    participant UI as useChatUI<br/>(Hook)
    participant API as useChatApi<br/>(Hook)
    participant Proxy as Next.js Proxy<br/>/api/chat
    participant Controller as chatbot.controller<br/>(Express)
    participant Service as chatbot.service<br/>(Business Logic)
    participant DB as MongoDB
    participant AI as aiClient<br/>(AI Layer)
    participant Gemini as Google Gemini<br/>2.5 Flash Vision

    User->>Sidebar: Select image<br/>(file upload / camera / paste)
    Sidebar->>UI: handlePickedImage(file, source)
    UI->>UI: Create previewUrl (object URL)<br/>Store as pendingImage
    UI-->>Sidebar: Show image thumbnail + Send button

    User->>Sidebar: Click Send (with optional text)
    Sidebar->>API: sendMessage(input, pendingImages)

    Note over API: Convert image to base64
    API->>API: fetch(previewUrl) → Blob
    API->>API: FileReader.readAsDataURL()<br/>→ strip prefix → base64 string

    API->>Proxy: POST /api/chat<br/>{ message, image: base64,<br/>  mimeType, conversationId }
    Proxy->>Controller: Forward request<br/>(Express backend)

    Controller->>Controller: Detect image field in req.body
    Controller->>Service: handleImageMessage()<br/>{ image, mimeType, message, conversationId }

    Service->>DB: MenuItem.find({ status: "active" })
    DB-->>Service: Active menu items<br/>(name, description, nutrition)

    Service->>Service: Build system prompt<br/>with full menu context
    Service->>AI: generateImageAnalysis()<br/>(base64, mimeType, userPrompt, systemPrompt)

    loop API Key Rotation (on failure)
        AI->>Gemini: POST inlineData image<br/>+ text prompt
        alt Success
            Gemini-->>AI: Analysed text response
        else Key failed
            AI->>AI: Rotate to next Gemini key
        end
    end

    AI-->>Service: Matched drink / description text
    Service-->>Controller: { reply, system_action }
    Controller-->>Proxy: JSON response
    Proxy-->>API: { reply }

    API->>API: Append bot message<br/>to conversation history
    API-->>Sidebar: Updated messages
    Sidebar-->>User: Display bot reply<br/>with drink match
```

## Participants

| Participant | File | Role |
|---|---|---|
| ChatbotSidebar | `view/app/components/chatbot/ChatbotSidebar.tsx` | Image input UI (file / camera / paste) |
| useChatUI | `view/app/components/chatbot/hooks/useChatUI.ts` | Manages pending image state + preview |
| useChatApi | `view/app/components/chatbot/hooks/useChatApi.ts` | Converts image to base64, calls API |
| Next.js Proxy | `view/app/api/chat/route.ts` | Forwards request to Express backend |
| chatbot.controller | `src/controllers/chatbot.controller.js` | Detects image vs text path |
| chatbot.service | `src/services/chatbot.service.js` | Fetches menu, builds prompt |
| MongoDB | — | Stores active menu items |
| aiClient | `src/ai/aiClient.js` | Wraps Gemini API with key rotation |
| Google Gemini | External API | Vision analysis (Gemini 2.5 Flash) |

## Key Behaviours

- **Max 5 images** per message enforced in `useChatUI`
- **Base64 encoding** — images converted from object URL → Blob → base64 before being sent over JSON
- **Menu context injection** — every image request includes all active menu items so Gemini can match the photo to a real drink
- **API key rotation** — `aiClient` cycles through multiple Gemini keys automatically if one fails
- **Graceful fallback** — if all keys fail, the user receives a friendly error message instead of a crash
