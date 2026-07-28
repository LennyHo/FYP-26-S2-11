// Email and password rules for the register, login, user admin and reset password forms.
// These are only for showing error messages. The backend checks the same rules
// in src/utils/validation.util.js, and both files must match.

// Domains a customer can register with.
export const CUSTOMER_EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'outlook.sg', 'hotmail.com'];

// Staff and admin domain. Not allowed on the register page.
export const STAFF_EMAIL_DOMAIN = 'driptea.com';

export const LOGIN_EMAIL_DOMAINS = [...CUSTOMER_EMAIL_DOMAINS, STAFF_EMAIL_DOMAIN];

// User admin creates both customers and staff, so it allows every domain.
export const ADMIN_EMAIL_DOMAINS = LOGIN_EMAIL_DOMAINS;

export const PASSWORD_MIN_LETTERS = 4;
export const PASSWORD_SYMBOLS = '$%#@&';

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LETTERS} letters, 1 number, and 1 symbol (${PASSWORD_SYMBOLS})`;

// No full stop allowed before the @.
const EMAIL_SHAPE = /^[A-Za-z0-9_+-]+@[^\s@]+\.[^\s@]+$/;

function formatDomainList(domains: string[]) {
  const listed = domains.map(domain => `@${domain}`);
  if (listed.length === 1) return listed[0];
  return `${listed.slice(0, -1).join(', ')} or ${listed[listed.length - 1]}`;
}

// Returns an error message, or '' when the email is valid.
export function validateEmail(email: string, allowedDomains: string[]): string {
  const value = String(email || '').trim().toLowerCase();

  if (!value) return 'Email is required.';
  if (!EMAIL_SHAPE.test(value)) return 'Please enter a valid email address.';

  const domain = value.split('@')[1];

  if (!allowedDomains.includes(domain)) {
    return `Please use an existing ${formatDomainList(allowedDomains)} email address.`;
  }

  return '';
}

// Only customers can reset their own password.
export const STAFF_RESET_BLOCKED_MESSAGE =
  'Staff and administrator accounts cannot be reset here. Please liaise with DripTea administration to reset your password.';

export function isStaffEmail(email: string): boolean {
  return String(email || '').trim().toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`);
}

// Returns an error message, or '' when the email is allowed to reset its password.
export function validateResetEmail(email: string): string {
  if (isStaffEmail(email)) return STAFF_RESET_BLOCKED_MESSAGE;
  return validateEmail(email, CUSTOMER_EMAIL_DOMAINS);
}

// Password needs at least 4 letters, 1 number and 1 symbol.
// Returns an error message, or '' when the password is valid.
export function validatePassword(password: string): string {
  const value = String(password || '');

  if (!value) return 'Password is required.';

  const letterCount = (value.match(/[A-Za-z]/g) || []).length;
  if (letterCount < PASSWORD_MIN_LETTERS) {
    return `Password must contain at least ${PASSWORD_MIN_LETTERS} letters.`;
  }

  if (!/\d/.test(value)) return 'Password must contain at least 1 number.';

  if (!/[$%#@&]/.test(value)) {
    return `Password must contain at least 1 symbol (${PASSWORD_SYMBOLS.split('').join(' ')}).`;
  }

  return '';
}
