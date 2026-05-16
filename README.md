# FYP-26-S2-11

FYP-26-S2-11 for AI Chatbot for Customer.

## PLEASE CHECK YOUR FRONTEND, BACKEND, DATABASE, AND API PLATFORMS ARE WORKING ON YOUR LAPTOP BEFORE START CODING.

## To Run Frontend (React and Next.js):

1. cd "Frontend" (if you did not cd this folder, you will not able to run)
2. run `npm install`
3. run `npm run dev` (TAKE NOTE FRONTEND RUNS ON PORT 3000)

## To Run BackEnd (Node.js):

1. if you have not install the modules, run `npm install` to update.
2. run `npm run dev` (TAKE NOTE BACKEND RUNS ON PORT 5000)

Tech Stack
Frontend: React, Next.js
Backend: Node.js, Express.js
AI Brain for text input: Groq SDK (Llama 3.1 / 3.3 models)
AI Brain for image input: Gemini API Key
APIs: Axios for high-speed LLM communication

==========================================

## Prerequisites for Groq API Account setup

1. Node.js installed
2. A Groq API Key:
   https://console.groq.com/keys
   sign in and click "+ Create API Key"

## Install dependencies:

npm install

## Create a .env file in the root directory and add your API key:

GROQ_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

Use real keys (not placeholders), then restart the backend.

## Supabase

1. Start backend:
   npm start
2. Check Supabase health:
   GET http://localhost:5000/health/supabase

If the response says `configured: false`, check the Supabase URL and keys in your `.env` file.

## Verify Groq and Gemini Connection

1. Start backend:
   npm start
2. Check AI health:
   GET http://localhost:5000/health/ai
3. Test chat route:
   POST http://localhost:5000/chat
   Body: {"message":"Hello"}

## Start the server:

npm start or num run dev

============================================

## TEST PROMPT:

1. BASIC RECOMMENDATION TESTS (filter + scoring)
2. I want chocolate drinks under $5.
3. I want chocolate or milo drink.
4. Follow the flow of the conversation.
5. What is pearl or explain any toppings.
