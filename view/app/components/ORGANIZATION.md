# Components Organization Guide

## Structure

```
components/
├── chatbot/               # Chat UI and voice features
│   ├── index.ts          # Re-exports: ChatbotSidebar, SpeechControls, QuickPrompts, DrinkRecCards
│   ├── [components in parent folder]
│
├── layout/               # Application layout & headers/footers
│   ├── index.ts          # Re-exports: Header, Footer, AdminHeader, StaffHeader, GlobalLayout
│   ├── [components in parent folder]
│
├── pages/                # Page-level sections
│   ├── index.ts          # Re-exports: AboutUs, OurStory, MeetTheCrew, FAQ, BuyDriptea, Hero
│   ├── [components in parent folder]
│
├── drink/                # Drink menu & customization
│   ├── index.ts          # Re-exports: DrinkCard, DrinkCustomize, DrinkSidebar, MenuCategory
│   ├── [components in parent folder]
│
├── ui/                   # Reusable UI elements
│   ├── index.ts          # Re-exports: BubbleTeaSVGs, InteractiveBubbles
│   ├── [components in parent folder]
│
├── cart/                 # Shopping cart
│   ├── index.ts          # Re-exports: Cart
│   ├── [components in parent folder]
│
├── index.ts              # Master export for convenient imports
├── [original component files - unchanged]
```

## Import Examples

**Before (flat structure):**
```typescript
import Header from './components/Header';
import ChatbotSidebar from './components/ChatbotSidebar';
import Cart from './components/Cart';
```

**After (organized):**
```typescript
import { Header } from './components/layout';
import { ChatbotSidebar } from './components/chatbot';
import { Cart } from './components/cart';

// Or use master index:
import { Header, ChatbotSidebar, Cart } from './components';
```

## Notes
- Original component files remain in `components/` folder (unchanged)
- Index files provide organized logical grouping
- No code modifications - only import/export organization
- All imports remain backward compatible
