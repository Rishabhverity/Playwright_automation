"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";
import ResultDisplay from "@/components/ResultDisplay";
import SiteLoginForm from "@/components/SiteLoginForm";
import SavedSessionsPanel from "@/components/SavedSessionsPanel";
import TaskForm from "@/components/TaskForm";
import { apiFetch } from "@/lib/api";
import type { AppUser, LoginAutomationResult, TaskResult } from "@/lib/types";

export type LoginResult = LoginAutomationResult;

type View = "main" | "login-result" | "task-result";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [view, setView] = useState<View>("main");
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
      })
      .finally(() => setUserLoading(false));
  }, [router]);

  if (userLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <DashboardHeader user={user} />

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-8">
          {view === "login-result" && loginResult ? (
            <ResultDisplay
              result={loginResult}
              type="login"
              onReset={() => {
                setLoginResult(null);
                setView("main");
              }}
            />
          ) : view === "task-result" && taskResult ? (
            <ResultDisplay
              result={taskResult}
              type="task"
              onReset={() => {
                setTaskResult(null);
                setView("main");
              }}
            />
          ) : (
            <>
              <section>
                <h2 className="text-lg font-semibold text-white mb-1">
                  1. Automate login on any site
                </h2>
                <p className="text-sm text-zinc-500 mb-4">
                  We log you in with Playwright and save the session under your account.
                </p>
                <SiteLoginForm
                  loading={loginLoading}
                  setLoading={setLoginLoading}
                  onResult={(result) => {
                    setLoginResult(result);
                    setView("login-result");
                    if (result.success) {
                      setSessionRefreshKey((k) => k + 1);
                    }
                  }}
                  onSessionSaved={() => setSessionRefreshKey((k) => k + 1)}
                />
              </section>

              <div className="border-t border-zinc-800" />

              <section>
                <h2 className="text-lg font-semibold text-white mb-1">2. Manage sessions</h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Sessions expire after 5 hours. Delete any you no longer need.
                </p>
                <SavedSessionsPanel refreshKey={sessionRefreshKey} />
              </section>

              <div className="border-t border-zinc-800" />

              <section>
                <h2 className="text-lg font-semibold text-white mb-1">3. Run a task</h2>
                <p className="text-sm text-zinc-500 mb-4">
                  Describe what you want, then pick which saved session to use.
                </p>
                <TaskForm
                  loading={taskLoading}
                  setLoading={setTaskLoading}
                  refreshKey={sessionRefreshKey}
                  onResult={(result) => {
                    setTaskResult(result);
                    setView("task-result");
                    if (result.success) {
                      setSessionRefreshKey((k) => k + 1);
                    }
                  }}
                />
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
