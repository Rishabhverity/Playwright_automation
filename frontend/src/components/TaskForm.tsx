"use client";

import { FormEvent, useState } from "react";
import SavedSessionsPanel from "@/components/SavedSessionsPanel";
import { apiFetch } from "@/lib/api";
import { describeParsedTask, parseTaskIntent } from "@/lib/taskParser";
import type { ParsedTask, TaskResult } from "@/lib/types";

interface TaskFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onResult: (result: TaskResult) => void;
  refreshKey?: number;
}

type Step = "describe" | "pick-session";

export default function TaskForm({
  loading,
  setLoading,
  onResult,
  refreshKey = 0,
}: TaskFormProps) {
  const [step, setStep] = useState<Step>("describe");
  const [taskInput, setTaskInput] = useState("");
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleDescribe = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = parseTaskIntent(taskInput);
    if (!parsed) {
      setError('Describe what you want — e.g. "search cars" or "go to settings".');
      return;
    }

    setParsedTask(parsed);
    setSelectedSessionId(null);
    setStep("pick-session");
  };

  const handleRunTask = async () => {
    setError("");

    if (!parsedTask) {
      setError("Describe your task first.");
      return;
    }

    if (!selectedSessionId) {
      setError("Pick one of your saved sessions.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/automate-task", {
        method: "POST",
        body: JSON.stringify({
          sessionId: selectedSessionId,
          task: parsedTask.task,
          query: parsedTask.query,
        }),
      });

      const data: TaskResult = await response.json();
      onResult(data);
    } catch {
      onResult({
        success: false,
        message: "Something went wrong. Please try again.",
        screenshot: "",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === "describe") {
    return (
      <form onSubmit={handleDescribe} className="space-y-4">
        <div>
          <label
            htmlFor="task-input"
            className="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            What do you want to do?
          </label>
          <textarea
            id="task-input"
            required
            rows={3}
            placeholder={'Examples: "search cars", "find interior design", "go to settings"'}
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Continue
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
        <p className="text-sm text-indigo-200 font-medium">
          {parsedTask ? describeParsedTask(parsedTask) : "Task"}
        </p>
        <button
          type="button"
          onClick={() => {
            setStep("describe");
            setError("");
          }}
          className="mt-1 text-xs text-indigo-300 hover:text-indigo-200"
        >
          Edit task
        </button>
      </div>

      <SavedSessionsPanel
        refreshKey={refreshKey}
        selectable
        selectedSessionId={selectedSessionId}
        onSelect={(id) => setSelectedSessionId(id || null)}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleRunTask}
        disabled={loading || !selectedSessionId}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        {loading ? "Running task…" : "Run task on selected session"}
      </button>
    </div>
  );
}
