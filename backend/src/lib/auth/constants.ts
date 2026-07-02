export const AUTH_COOKIE = "auth-token";

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "dev-secret-change-in-production";
}
