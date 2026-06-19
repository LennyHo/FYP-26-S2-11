// User Story Architecture Trace — cart/edit/[cartItemId]/page.tsx
//
// #17  Edit Cart
//      View: cart/edit/[cartItemId]/page.tsx (this file) → Route: cart.routes.js → Ctrl: cart.controller.js → Model: cartItem.model.js
import DrinkCustomize from "../../../components/menu/DrinkCustomize";

export default function EditCartItemPage() {
    return <DrinkCustomize mode="edit" />;
}