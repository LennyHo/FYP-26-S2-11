// User Story Architecture Trace — buy-driptea/page.tsx
//
// #13  View Menu
//      View: buy-driptea/page.tsx (this file) → Route: menu.routes.js → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #15  Add to Cart
//      View: buy-driptea/page.tsx (this file) → Route: cart.routes.js → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #21  Search Beverages
//      View: buy-driptea/page.tsx (this file) → Route: menu.routes.js → Ctrl: menu.controller.js → Model: menuItem.model.js
import BuyDripTea from '../components/menu/BuyDriptea';

export default function BuyDripTeaPage() {
  return <BuyDripTea />;
}
