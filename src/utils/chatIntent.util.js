function isCartQuery(message) {
  const msg = String(message || "").toLowerCase();
  return /cart|check.*cart|view.*cart|my.*cart|what.*in.*cart|what.*i.*order|my.*order|review/i.test(msg);
}

function isAddToCartRequest(message) {
  const msg = String(message || "").toLowerCase();

  return (
    /add.*cart/.test(msg) ||
    /put.*cart/.test(msg) ||
    /order.*this/.test(msg) ||
    /add\s+[a-z]\d{3}/i.test(msg)
  );
}

function extractBeverageId(message) {
  const match = String(message || "").match(/\b[a-zA-Z]\d{3}\b/);
  return match ? match[0].toLowerCase() : null;
}

function isViewCartRequest(message) {
  const msg = String(message || "").toLowerCase();

  return (
    msg.includes("view cart") ||
    msg.includes("check cart") ||
    msg.includes("show cart") ||
    msg.includes("my cart") ||
    msg.includes("cart items") ||
    msg.includes("what is in my cart") ||
    msg.includes("what's in my cart")
  );
}

module.exports = {
  isCartQuery,
  isAddToCartRequest,
  extractBeverageId,
  isViewCartRequest,
};