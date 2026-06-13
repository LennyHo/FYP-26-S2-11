// #13 - As a customer, I want to view the menu so that I know which beverages are available.
// #15 - As a customer, I want to add a selected beverage to my cart so that I can review and purchase it later.
// #21 - As a customer, I want to search for beverages by name so that I can locate specific drinks quickly.
// Frontend: Loads BuyDriptea component → calls GET /api/menu-items?status=active → menu.controller.js
// → MenuItem.getMenu() → reads menu_items collection → displays drinks with Add to Cart option.
import BuyDripTea from '../components/menu/BuyDriptea';

export default function BuyDripTeaPage() {
  return <BuyDripTea />;
}
