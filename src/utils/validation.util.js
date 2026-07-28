// Shared credential validation rules — used by the register, login and
// user-admin create-account paths so the server enforces the same rules the
// browser forms show. The client-side copy lives in view/app/utils/validation.ts;
// keep the two in sync.

// Consumer mailbox providers a customer may self-register with.
const CUSTOMER_EMAIL_DOMAINS = ["gmail.com", "outlook.com", "outlook.sg", "hotmail.com"];

// Internal staff/admin domain — never allowed on the public register form,
// only on login and on admin-created accounts.
const STAFF_EMAIL_DOMAIN = "driptea.com";

const LOGIN_EMAIL_DOMAINS = [...CUSTOMER_EMAIL_DOMAINS, STAFF_EMAIL_DOMAIN];

// The user admin creates both customers and staff, so it accepts the full set.
const ADMIN_EMAIL_DOMAINS = LOGIN_EMAIL_DOMAINS;

// No separate length rule: 4 letters + 1 digit + 1 symbol already implies a
// 6-character minimum, and a second length check only produced a message that
// contradicted the composition rules.
const PASSWORD_MIN_LETTERS = 4;
const PASSWORD_SYMBOLS = "$%#@&";

// The local part (before the @) may not contain a full stop at all — this is a
// DripTea house rule, not an RFC one, and applies to staff and customers alike.
// Note it rejects addresses real providers do issue, e.g. first.last@gmail.com.
const EMAIL_SHAPE = /^[A-Za-z0-9_+-]+@[^\s@]+\.[^\s@]+$/;

function formatDomainList(domains) {
  const listed = domains.map((domain) => `@${domain}`);
  if (listed.length === 1) return listed[0];
  return `${listed.slice(0, -1).join(", ")} or ${listed[listed.length - 1]}`;
}

// Returns an error message, or "" when the email is acceptable.
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

// Self-service password reset is for customers only. Staff and admin accounts
// (@driptea.com) must go through DripTea administration instead, so that a
// privileged account can never be taken over by whoever knows its email address.
const STAFF_RESET_BLOCKED_MESSAGE =
  "Staff and administrator accounts cannot be reset here. Please liaise with DripTea administration to reset your password.";

function isStaffEmail(email) {
  return String(email || "").trim().toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`);
}

// Returns an error message, or "" when the email may use self-service reset.
function validateResetEmail(email) {
  if (isStaffEmail(email)) return STAFF_RESET_BLOCKED_MESSAGE;
  return validateEmail(email, CUSTOMER_EMAIL_DOMAINS);
}

// Returns an error message, or "" when the password meets every rule.
// Rules: at least 4 letters, at least 1 digit, and at least 1 symbol from $%#@&.
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
