Tech Stack
Frontend: HTML5, CSS3, JavaScript (Vanilla)
Backend: Node.js, Express.js
AI Brain for text input: Groq SDK (Llama 3.1 / 3.3 models)
AI Brain for image input: Gemini API Key
APIs: Axios for high-speed LLM communication

==========================================

## Prerequisites
1. Node.js installed
2. A Groq API Key:
https://console.groq.com/keys
sign in and click "+ Create API Key"

## Install dependencies:
npm install

## Create a .env file in the root directory and add your API key:
GROQ_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here

Use real keys (not placeholders), then restart the backend.

## Verify Groq connection
1. Start backend:
npm start
2. Check AI health:
GET http://localhost:5000/health/ai
3. Test chat route:
POST http://localhost:5000/chat
Body: {"message":"Hello"}

## Start the server:
npm start

============================================
## TEST PROMPT:
1. BASIC RECOMMENDATION TESTS (filter + scoring)
I want chocolate drinks under $5
I want chocolate or milo drink
2. Follow the flow

Coming soon:
3. MULTI-LANGUAGE TESTS
Saya mahu minuman coklat kurang gula
我要低糖巧克力饮料
I want milo kurang manis

4. MULTI-DRINK TESTS
I want 2 drinks: chocolate 0% sugar and matcha 25% sugar
SYSTEM BEHAVIOR TESTS
I want to checkout
I want another drink
Start over

5. EDGE CASE / ATTACK TESTS
I want strawberry matcha unicorn drink