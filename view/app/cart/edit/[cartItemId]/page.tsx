// #17 - As a customer, I want to edit beverages in my cart so that I can modify my order before completing the checkout process.
// Frontend: Loads DrinkCustomize in edit mode → pre-fills current customization → on save calls PATCH /api/cart-items/:id
// → cart.controller.js → CartItem.updateCartItem() → updates quantity, customization, lineTotal in cart_items.
import DrinkCustomize from "../../../components/menu/DrinkCustomize";

export default function EditCartItemPage() {
    return <DrinkCustomize mode="edit" />;
}