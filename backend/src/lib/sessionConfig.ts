const DEFAULT_TTL_HOURS = 5;
const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;

export function getSessionTtlMs(): number {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? DEFAULT_TTL_HOURS);
  return (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
}

export function getDefaultPageSize(): number {
  const size = Number(process.env.SESSIONS_PAGE_SIZE ?? DEFAULT_PAGE_SIZE);
  return Number.isFinite(size) && size > 0 ? Math.floor(size) : DEFAULT_PAGE_SIZE;
}

export function getMaxPageSize(): number {
  return MAX_PAGE_SIZE;
}

export function getSessionExpiresAt(updatedAt: string): string {
  return new Date(new Date(updatedAt).getTime() + getSessionTtlMs()).toISOString();
}

export function isSessionExpired(updatedAt: string, now = Date.now()): boolean {
  return new Date(updatedAt).getTime() + getSessionTtlMs() <= now;
}

export function normalizePagination(page: unknown, pageSize: unknown) {
  const parsedPage = Number(page);
  const parsedSize = Number(pageSize);

  const safePageSize = Math.min(
    getMaxPageSize(),
    Math.max(1, Number.isFinite(parsedSize) && parsedSize > 0 ? Math.floor(parsedSize) : getDefaultPageSize())
  );

  const safePage = Math.max(1, Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1);

  return { page: safePage, pageSize: safePageSize };
}
