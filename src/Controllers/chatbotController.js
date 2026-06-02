// ==========================================
// CHANGED: New Controller for Chatbot Cart Operations
// Handles fetching cart items from database for the chatbot
// ==========================================

const { CartItem, User } = require("../models/driptea.models");
const { Types } = require("mongoose");

// CHANGED: Helper function to convert MongoDB ObjectId to string
function toObjectId(value) {
  if (!Types.ObjectId.isValid(String(value || ""))) {
    return null;
  }
  return new Types.ObjectId(String(value));
}

/**
 * CHANGED: Chatbot Controller Function - Get User's Cart Items
 * 
 * This function retrieves all active cart items for a logged-in customer
 * so the chatbot can display their current cart when they ask "check my cart".
 * 
 * @param {string} userId - Customer ID (can be MongoDB ObjectId or string)
 * @returns {Object} Response object with:
 *   - ok: boolean
 *   - data: Array of cart items with all details (name, price, customization, etc.)
 *   - message: Human-readable status message
 */
async function getChatbotCartItems(userId) {
  console.log('[ChatBot Controller] getChatbotCartItems called with userId:', userId);
  
  // CHANGED: Validate and convert userId to ObjectId
  const objectId = toObjectId(userId);
  if (!objectId) {
    console.error('[ChatBot Controller] Invalid userId format:', userId);
    const error = new Error("A valid userId is required.");
    error.statusCode = 400;
    throw error;
  }

  // CHANGED: Check if user exists and is active
  const user = await User.findById(objectId).lean();
  if (!user) {
    console.error('[ChatBot Controller] User not found:', objectId);
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  console.log('[ChatBot Controller] Found user:', user.email);

  // CHANGED: Fetch all active cart items for this customer
  // Note: Removed status filter to get ALL cart items, not just "active"
  const cartItems = await CartItem.find({
    userId: objectId,
  }).lean();

  console.log('[ChatBot Controller] Found', cartItems.length, 'cart items for user', objectId);

  // CHANGED: Format cart items for chatbot display
  const formattedItems = cartItems.map((item) => ({
    id: String(item._id),
    name: item.name,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    image: item.image,
    category: item.category,
    customization: item.customization || {},
  }));

  // CHANGED: Return formatted response with human-readable message
  const itemCount = formattedItems.length;
  const totalPrice = formattedItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

  const response = {
    ok: true,
    data: formattedItems,
    message: itemCount > 0 
      ? `Found ${itemCount} item(s) in cart (Total: S$ ${totalPrice.toFixed(2)})`
      : "Your cart is currently empty.",
    itemCount,
    totalPrice,
  };
  
  console.log('[ChatBot Controller] Returning response:', response.message);
  return response;
}

/**
 * CHANGED: Format Cart Items for Chatbot Display
 * 
 * Converts cart items into a human-readable format for the chatbot to display
 * with all the customization details.
 * 
 * @param {Array} items - Array of cart items from database
 * @returns {string} Formatted cart display text
 */
function formatCartForChatbot(items) {
  if (!items || items.length === 0) {
    return "Your cart is currently empty. Would you like to add something?";
  }

  let cartText = "You currently have the following in your cart:<br><br>";
  let grandTotal = 0;

  items.forEach((item, index) => {
    grandTotal += item.lineTotal || 0;
    
    // CHANGED: Extract customization details
    const customization = item.customization || {};
    const size = customization.size || "Regular";
    const ice = customization.ice || "Normal Ice";
    const sugar = customization.sugar || "Normal Sweet";
    const toppings = Array.isArray(customization.toppings) && customization.toppings.length > 0
      ? customization.toppings.join(", ")
      : "None";
    
    // CHANGED: Calculate nutrition info
    const sugar_g = customization.nutritionInfo?.sugarG || 0;
    const calories = customization.nutritionInfo?.calories || 0;
    const nutriGrade = customization.nutritionInfo?.nutriGrade || "N/A";

    // CHANGED: Format each cart item
    cartText += `* **${item.name}** - S$ ${item.lineTotal.toFixed(2)}<br>`;
    cartText += `  - ${size} · ${ice} · ${sugar}, ${toppings}<br>`;
    cartText += `  - Sugar: ${sugar_g}g | Calories: ${calories} kcal | Nutri-Grade: ${nutriGrade}<br>`;
    
    if (index < items.length - 1) {
      cartText += "<br>";
    }
  });

  cartText += `<br>Total price: S$ ${grandTotal.toFixed(2)}<br>`;

  return cartText;
}

// CHANGED: Export controller functions
module.exports = {
  getChatbotCartItems,
  formatCartForChatbot,
};
