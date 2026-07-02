"use client";

import type { LoginAutomationResult, TaskResult } from "@/lib/types";

interface ResultDisplayProps {
  result: LoginAutomationResult | TaskResult;
  type: "login" | "task";
  onReset: () => void;
}

export default function ResultDisplay({ result, type, onReset }: ResultDisplayProps) {
  const title =
    type === "task"
      ? result.success
        ? "Task completed"
        : "Task failed"
      : result.success
        ? "Session saved"
        : "Login failed";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center">
        <span
          className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ${
            result.success
              ? "bg-green-500/15 text-green-400 ring-1 ring-green-500/30"
              : "bg-red-500/15 text-red-400 ring-1 ring-red-500/30"
          }`}
        >
          {title}
        </span>
      </div>

      <p className="text-center text-sm text-zinc-300">{result.message}</p>

      {result.success && result.browserSessionOpen && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-center">
          <p className="text-sm text-green-200 font-medium">
            Check the Chrome window on your desktop
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            That window stays open so you can browse the site. Close it when you are done.
          </p>
          {result.finalUrl && (
            <p className="mt-2 text-xs text-zinc-500 break-all">{result.finalUrl}</p>
          )}
        </div>
      )}

      {type === "login" && result.success && "siteLabel" in result && result.siteLabel && !result.browserSessionOpen && (
        <p className="text-center text-xs text-zinc-500">
          Saved session: <span className="text-zinc-300">{result.siteLabel}</span>
        </p>
      )}

      {type === "task" && "query" in result && result.query && (
        <p className="text-center text-xs text-zinc-500">
          {result.siteLabel && (
            <>
              Site: <span className="text-zinc-300">{result.siteLabel}</span>
              {" · "}
            </>
          )}
          Query: <span className="text-zinc-300">{result.query}</span>
        </p>
      )}

      {result.finalUrl && !result.browserSessionOpen && (
        <p className="text-center text-xs text-zinc-500 break-all">{result.finalUrl}</p>
      )}

      {result.screenshot && (
        <div className="rounded-lg border border-zinc-700 overflow-hidden bg-zinc-800">
          <img
            src={`data:image/png;base64,${result.screenshot}`}
            alt="Automation screenshot"
            className="w-full h-auto"
          />
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-lg border border-zinc-700 hover:bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors"
      >
        Back to dashboard
      </button>
    </div>
  );
}
