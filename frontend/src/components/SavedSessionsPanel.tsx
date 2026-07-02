"use client";

import { useCallback, useEffect, useState } from "react";
import SavedSessionsList from "@/components/SavedSessionsList";
import { apiFetch } from "@/lib/api";
import type { PaginatedSessionsResponse } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 5;

interface SavedSessionsPanelProps {
  refreshKey?: number;
  selectable?: boolean;
  selectedSessionId?: string | null;
  onSelect?: (sessionId: string) => void;
}

export default function SavedSessionsPanel({
  refreshKey = 0,
  selectable = false,
  selectedSessionId = null,
  onSelect,
}: SavedSessionsPanelProps) {
  const [sessions, setSessions] = useState<PaginatedSessionsResponse["sessions"]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [ttlHours, setTtlHours] = useState(5);

  const loadSessions = useCallback(
    (pageToLoad: number) => {
      setLoading(true);
      apiFetch(`/sessions?page=${pageToLoad}&pageSize=${pageSize}`)
        .then((res) => res.json())
        .then((data: PaginatedSessionsResponse) => {
          setSessions(data.sessions ?? []);
          setPage(data.page ?? pageToLoad);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 1);
          if (data.limits?.ttlHours) setTtlHours(data.limits.ttlHours);
        })
        .catch(() => {
          setSessions([]);
          setTotal(0);
          setTotalPages(1);
        })
        .finally(() => setLoading(false));
    },
    [pageSize]
  );

  useEffect(() => {
    loadSessions(page);
  }, [loadSessions, refreshKey, page]);

  const handleDelete = async (sessionId: string) => {
    setDeletingSessionId(sessionId);
    try {
      const response = await apiFetch(`/sessions/${sessionId}`, { method: "DELETE" });
      if (response.ok) {
        if (selectedSessionId === sessionId) {
          onSelect?.("");
        }

        const nextTotal = total - 1;
        const nextTotalPages = nextTotal === 0 ? 1 : Math.ceil(nextTotal / pageSize);
        setPage((current) => Math.min(current, nextTotalPages));
      }
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    <SavedSessionsList
      sessions={sessions}
      selectedSessionId={selectedSessionId}
      onSelect={onSelect}
      onDelete={handleDelete}
      deletingSessionId={deletingSessionId}
      loading={loading}
      selectable={selectable}
      ttlHours={ttlHours}
      pagination={{
        page,
        pageSize,
        total,
        totalPages,
        onPageChange: setPage,
      }}
    />
  );
}
