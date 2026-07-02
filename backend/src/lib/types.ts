export interface AppUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface SavedSiteSession {
  sessionId: string;
  userId: string;
  siteHostname: string;
  siteLabel: string;
  url: string;
  email?: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginAutomationInput {
  url: string;
  username?: string;
  email?: string;
  password: string;
  sessionId?: string;
  userId?: string;
  siteHostname?: string;
  siteLabel?: string;
  persistSession?: boolean;
  /** When true, close the browser after saving session (used for background re-login). */
  closeAfterSave?: boolean;
}

export interface LoginAutomationResult {
  success: boolean;
  message: string;
  screenshot: string;
  finalUrl?: string;
  browserSessionOpen?: boolean;
  sessionId?: string;
  siteLabel?: string;
}

export type TaskType = "search" | "navigate";

export interface ParsedTask {
  task: TaskType;
  query: string;
  rawInput: string;
}

export interface TaskInput {
  sessionId: string;
  userId: string;
  task: TaskType;
  query: string;
}

export interface TaskResult {
  success: boolean;
  message: string;
  screenshot: string;
  finalUrl?: string;
  query?: string;
  siteLabel?: string;
  browserSessionOpen?: boolean;
}

export interface SessionListItem {
  sessionId: string;
  siteHostname: string;
  siteLabel: string;
  url: string;
  updatedAt: string;
  expiresAt: string;
}

export interface PaginatedSessionsResult {
  sessions: SessionListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
