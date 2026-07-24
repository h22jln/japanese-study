export const ADMIN_USERNAMES = ["admin", "admin2"] as const;

export function isAdminUsername(username: string | null | undefined) {
  return ADMIN_USERNAMES.includes((username ?? "").toLowerCase() as (typeof ADMIN_USERNAMES)[number]);
}
