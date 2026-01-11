export const USER_ROLES = ["viewer", "admin", "analyst"] as const;
export type UserRole = typeof USER_ROLES[number];

export function coerceUserRole(value: unknown): UserRole {
  return USER_ROLES.includes(value as UserRole)
    ? (value as UserRole)
    : "viewer";
}