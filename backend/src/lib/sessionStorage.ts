import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import {
  getSessionExpiresAt,
  isSessionExpired,
} from "./sessionConfig";
import type { PaginatedSessionsResult, SavedSiteSession, SessionListItem } from "./types";

const SESSIONS_DIR = path.join(process.cwd(), "data", "sessions");

function sessionDir(sessionId: string) {
  return path.join(SESSIONS_DIR, sessionId);
}

export function storageStatePath(sessionId: string) {
  return path.join(sessionDir(sessionId), "storage.json");
}

function metaPath(sessionId: string) {
  return path.join(sessionDir(sessionId), "meta.json");
}

function credentialsPath(sessionId: string) {
  return path.join(sessionDir(sessionId), "credentials.json");
}

function userIndexPath(userId: string) {
  return path.join(process.cwd(), "data", "users", `${userId}-sessions.json`);
}

async function ensureSessionDir(sessionId: string) {
  await fs.mkdir(sessionDir(sessionId), { recursive: true });
}

async function loadUserSessionIndex(userId: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(userIndexPath(userId), "utf-8");
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function saveUserSessionIndex(userId: string, sessionIds: string[]) {
  const usersDir = path.join(process.cwd(), "data", "users");
  await fs.mkdir(usersDir, { recursive: true });
  await fs.writeFile(userIndexPath(userId), JSON.stringify(sessionIds, null, 2));
}

export function createSessionId(): string {
  return randomUUID();
}

export interface SaveSessionInput {
  sessionId: string;
  userId: string;
  siteHostname: string;
  siteLabel: string;
  url: string;
  email?: string;
  username?: string;
  password: string;
  storageState: object;
}

export async function saveSession(input: SaveSessionInput): Promise<SavedSiteSession> {
  const now = new Date().toISOString();
  await ensureSessionDir(input.sessionId);

  const existing = await loadSessionMeta(input.sessionId).catch(() => null);

  const meta: SavedSiteSession = {
    sessionId: input.sessionId,
    userId: input.userId,
    siteHostname: input.siteHostname,
    siteLabel: input.siteLabel,
    url: input.url,
    email: input.email,
    username: input.username,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await fs.writeFile(metaPath(input.sessionId), JSON.stringify(meta, null, 2));
  await fs.writeFile(
    storageStatePath(input.sessionId),
    JSON.stringify(input.storageState, null, 2)
  );
  await fs.writeFile(
    credentialsPath(input.sessionId),
    JSON.stringify(
      {
        email: input.email,
        username: input.username,
        password: input.password,
        url: input.url,
      },
      null,
      2
    )
  );

  const index = await loadUserSessionIndex(input.userId);
  if (!index.includes(input.sessionId)) {
    index.unshift(input.sessionId);
    await saveUserSessionIndex(input.userId, index);
  }

  return meta;
}

export async function loadSessionMeta(sessionId: string): Promise<SavedSiteSession> {
  const raw = await fs.readFile(metaPath(sessionId), "utf-8");
  return JSON.parse(raw) as SavedSiteSession;
}

export async function loadSessionCredentials(sessionId: string): Promise<{
  email?: string;
  username?: string;
  password: string;
  url: string;
}> {
  const raw = await fs.readFile(credentialsPath(sessionId), "utf-8");
  return JSON.parse(raw);
}

export async function sessionExists(sessionId: string): Promise<boolean> {
  try {
    await fs.access(storageStatePath(sessionId));
    return true;
  } catch {
    return false;
  }
}

export async function sessionBelongsToUser(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const meta = await loadSessionMeta(sessionId);
    if (meta.userId !== userId) return false;
    if (isSessionExpired(meta.updatedAt)) {
      await deleteSession(sessionId, userId);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function deleteSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const meta = await loadSessionMeta(sessionId);
    if (meta.userId !== userId) {
      return false;
    }

    await fs.rm(sessionDir(sessionId), { recursive: true, force: true });

    const index = await loadUserSessionIndex(userId);
    await saveUserSessionIndex(
      userId,
      index.filter((id) => id !== sessionId)
    );

    return true;
  } catch {
    const index = await loadUserSessionIndex(userId);
    if (index.includes(sessionId)) {
      await saveUserSessionIndex(
        userId,
        index.filter((id) => id !== sessionId)
      );
    }
    return false;
  }
}

async function collectSessionsForUser(userId: string): Promise<SessionListItem[]> {
  const index = await loadUserSessionIndex(userId);
  const sessions: SessionListItem[] = [];

  for (const sessionId of index) {
    try {
      const meta = await loadSessionMeta(sessionId);
      if (meta.userId !== userId) continue;
      if (!(await sessionExists(sessionId))) continue;
      if (isSessionExpired(meta.updatedAt)) continue;

      sessions.push({
        sessionId: meta.sessionId,
        siteHostname: meta.siteHostname,
        siteLabel: meta.siteLabel,
        url: meta.url,
        updatedAt: meta.updatedAt,
        expiresAt: getSessionExpiresAt(meta.updatedAt),
      });
    } catch {
      // skip missing or corrupt sessions
    }
  }

  return sessions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function listSessionsForUser(userId: string): Promise<SessionListItem[]> {
  await purgeExpiredSessionsForUser(userId);
  return collectSessionsForUser(userId);
}

export async function listSessionsPaginatedForUser(
  userId: string,
  page: number,
  pageSize: number
): Promise<PaginatedSessionsResult> {
  await purgeExpiredSessionsForUser(userId);

  const all = await collectSessionsForUser(userId);
  const total = all.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    sessions: all.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export async function purgeExpiredSessionsForUser(userId: string): Promise<number> {
  const index = await loadUserSessionIndex(userId);
  let removed = 0;

  for (const sessionId of index) {
    try {
      const meta = await loadSessionMeta(sessionId);
      if (meta.userId !== userId) continue;

      if (isSessionExpired(meta.updatedAt)) {
        const deleted = await deleteSession(sessionId, userId);
        if (deleted) removed += 1;
      }
    } catch {
      await deleteSession(sessionId, userId).catch(() => null);
      removed += 1;
    }
  }

  return removed;
}
