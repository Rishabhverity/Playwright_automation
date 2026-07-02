"use client";

import { FormEvent, useEffect, useState } from "react";
import type { LoginResult } from "@/app/dashboard/page";
import { apiFetch } from "@/lib/api";

interface SiteLoginFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onResult: (result: LoginResult) => void;
  onSessionSaved?: () => void;
}

const AUTOMATION_STEPS = [
  "Opening the target website…",
  "Detecting the login form…",
  "Filling in credentials…",
  "Submitting the login…",
  "Saving session to your account…",
];

export default function SiteLoginForm({
  loading,
  setLoading,
  onResult,
  onSessionSaved,
}: SiteLoginFormProps) {
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, AUTOMATION_STEPS.length - 1));
    }, 3000);

    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Website URL is required.");
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    if (!username.trim() && !email.trim()) {
      setError("Provide a username or email for the target site.");
      return;
    }

    const targetUrl = url.trim().startsWith("http")
      ? url.trim()
      : `https://${url.trim()}`;

    setLoading(true);
    setStepIndex(0);

    try {
      const response = await apiFetch("/automate-login", {
        method: "POST",
        body: JSON.stringify({
          url: targetUrl,
          username: username.trim() || undefined,
          email: email.trim() || undefined,
          password,
        }),
      });

      const data: LoginResult = await response.json();
      onResult(data);
      if (data.success) {
        onSessionSaved?.();
      }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Website login URL
        </label>
        <input
          id="url"
          type="url"
          required
          placeholder="https://www.pinterest.com/login/"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Any site with a standard login form — Pinterest, Shopify, etc.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-zinc-300 mb-1.5">
            Username <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <input
            id="username"
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
            Email <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading && (
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
          <p className="text-sm text-indigo-200">{AUTOMATION_STEPS[stepIndex]}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        {loading ? "Automating login…" : "Login & save session"}
      </button>
    </form>
  );
}
