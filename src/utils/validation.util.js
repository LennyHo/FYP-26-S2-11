// Email and password rules used by register, login, user admin and reset password.
// The frontend copy is in view/app/utils/validation.ts and must match this file.

// Domains a customer can register with.
const CUSTOMER_EMAIL_DOMAINS = ["gmail.com", "outlook.com", "outlook.sg", "hotmail.com"];

// Staff and admin domain. Not allowed on the register page.
const STAFF_EMAIL_DOMAIN = "driptea.com";

const LOGIN_EMAIL_DOMAINS = [...CUSTOMER_EMAIL_DOMAINS, STAFF_EMAIL_DOMAIN];

// User admin creates both customers and staff, so it allows every domain.
const ADMIN_EMAIL_DOMAINS = LOGIN_EMAIL_DOMAINS;

const PASSWORD_MIN_LETTERS = 4;
const PASSWORD_SYMBOLS = "$%#@&";

// Full stops allowed before the @, but not at the start, end, or doubled up.
const EMAIL_SHAPE = /^[A-Za-z0-9_+-]+(\.[A-Za-z0-9_+-]+)*@[^\s@]+\.[^\s@]+$/;

function formatDomainList(domains) {
  const listed = domains.map((domain) => `@${domain}`);
  if (listed.length === 1) return listed[0];
  return `${listed.slice(0, -1).join(", ")} or ${listed[listed.length - 1]}`;
}

// Returns an error message, or "" when the email is valid.
function validateEmail(email, allowedDomains) {
  const value = String(email || "").trim().toLowerCase();

  if (!value) return "Email is required.";
  if (!EMAIL_SHAPE.test(value)) return "Please enter a valid email address.";

  const domain = value.split("@")[1];

  if (!allowedDomains.includes(domain)) {
    return `Please use an existing ${formatDomainList(allowedDomains)} email address.`;
  }

  return "";
}

// Only customers can reset their own password.
const STAFF_RESET_BLOCKED_MESSAGE =
  "Staff and administrator accounts cannot be reset here. Please liaise with DripTea administration to reset your password.";

function isStaffEmail(email) {
  return String(email || "").trim().toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`);
}

// Returns an error message, or "" when the email is allowed to reset its password.
function validateResetEmail(email) {
  if (isStaffEmail(email)) return STAFF_RESET_BLOCKED_MESSAGE;
  return validateEmail(email, CUSTOMER_EMAIL_DOMAINS);
}

// Password needs at least 4 letters, 1 number and 1 symbol.
// Returns an error message, or "" when the password is valid.
function validatePassword(password) {
  const value = String(password || "");

  if (!value) return "Password is required.";

  const letterCount = (value.match(/[A-Za-z]/g) || []).length;
  if (letterCount < PASSWORD_MIN_LETTERS) {
    return `Password must contain at least ${PASSWORD_MIN_LETTERS} letters.`;
  }

  if (!/\d/.test(value)) return "Password must contain at least 1 number.";

  if (!/[$%#@&]/.test(value)) {
    return `Password must contain at least 1 symbol (${PASSWORD_SYMBOLS.split("").join(" ")}).`;
  }

  return "";
}

module.exports = {
  CUSTOMER_EMAIL_DOMAINS,
  LOGIN_EMAIL_DOMAINS,
  ADMIN_EMAIL_DOMAINS,
  STAFF_EMAIL_DOMAIN,
  STAFF_RESET_BLOCKED_MESSAGE,
  isStaffEmail,
  validateResetEmail,
  PASSWORD_MIN_LETTERS,
  PASSWORD_SYMBOLS,
  validateEmail,
  validatePassword,
};
