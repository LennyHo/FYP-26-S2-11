function isCartQuery(message) {
  const msg = String(message || "").toLowerCase();
  return /cart|check.*cart|view.*cart|my.*cart|what.*in.*cart|what.*i.*order|my.*order|review/i.test(msg);
}

function extractBeverageId(message) {
  const match = String(message || "").match(/\b[a-zA-Z]\d{3}\b/);
  return match ? match[0].toLowerCase() : null;
}

module.exports = {
  isCartQuery,
  extractBeverageId,
};