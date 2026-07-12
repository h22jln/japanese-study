const USERNAME_PATTERN = /^[a-z0-9_]{4,20}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}

export function usernameToAuthEmail(value: string) {
  return `${normalizeUsername(value)}@users.matane.jp`;
}
