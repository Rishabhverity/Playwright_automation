"use client";

import type { SessionListItem } from "@/lib/types";

interface SavedSessionsListProps {
  sessions: SessionListItem[];
  selectedSessionId?: string | null;
  onSelect?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  deletingSessionId?: string | null;
  loading?: boolean;
  selectable?: boolean;
  ttlHours?: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

function formatExpiry(expiresAt: string): string {
  const expires = new Date(expiresAt).getTime();
  const diff = expires - Date.now();

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
  return `Expires in ${minutes}m`;
}

export default function SavedSessionsList({
  sessions,
  selectedSessionId = null,
  onSelect,
  onDelete,
  deletingSessionId = null,
  loading,
  selectable = true,
  ttlHours = 5,
  pagination,
}: SavedSessionsListProps) {
  if (loading) {
    return <p className="text-sm text-zinc-500">Loading your saved sessions…</p>;
  }

  const isEmpty = sessions.length === 0;

  if (isEmpty && !pagination?.total) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 px-4 py-3">
        <p className="text-sm text-zinc-400">No saved sessions yet.</p>
        <p className="mt-1 text-xs text-zinc-500">
          {selectable
            ? "Automate a login above first — then pick that session to run tasks."
            : `Sessions auto-delete after ${ttlHours} hours of inactivity.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">
          {selectable ? "Choose which saved session to use:" : "Your saved sessions"}
        </p>
        <p className="text-xs text-zinc-600">Auto-delete after {ttlHours}h</p>
      </div>
      <div className="grid gap-2">
        {sessions.map((session) => {
          const selected = selectable && selectedSessionId === session.sessionId;
          const updated = new Date(session.updatedAt).toLocaleString();
          const isDeleting = deletingSessionId === session.sessionId;

          return (
            <div
              key={session.sessionId}
              className={`rounded-lg border px-4 py-3 transition-colors ${
                selected
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-zinc-700 bg-zinc-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {selectable ? (
                  <button
                    type="button"
                    onClick={() => onSelect?.(session.sessionId)}
                    className="flex-1 text-left min-w-0"
                  >
                    <SessionDetails session={session} updated={updated} />
                  </button>
                ) : (
                  <div className="flex-1 min-w-0">
                    <SessionDetails session={session} updated={updated} />
                  </div>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(session.sessionId)}
                    disabled={isDeleting}
                    className="shrink-0 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-zinc-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionDetails({
  session,
  updated,
}: {
  session: SessionListItem;
  updated: string;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">{session.siteLabel}</span>
        <span className="text-xs text-zinc-500">{session.siteHostname}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500 truncate">{session.url}</p>
      <p className="mt-1 text-xs text-zinc-600">
        Updated {updated} · {formatExpiry(session.expiresAt)}
      </p>
    </>
  );
}
