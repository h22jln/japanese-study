const USERNAME_PATTERN = /^[a-z0-9_]{4,20}$/;
const AUTH_EMAIL_DOMAINS = [
  "users.matane.jp",
  "users.kotoba.app",
  "users.kotoba.invalid",
] as const;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}

export function usernameToAuthEmail(value: string) {
  return `${normalizeUsername(value)}@users.matane.jp`;
}

export function usernameToAuthEmails(value: string) {
  const normalized = normalizeUsername(value);
  return AUTH_EMAIL_DOMAINS.map((domain) => `${normalized}@${domain}`);
}
