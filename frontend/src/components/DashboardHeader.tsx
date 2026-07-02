"use client";

import { useRouter } from "next/navigation";
import { apiFetch, clearAuthToken } from "@/lib/api";
import type { AppUser } from "@/lib/types";

interface DashboardHeaderProps {
  user: AppUser;
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    clearAuthToken();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Automation Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Signed in as <span className="text-zinc-200">{user.name}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="shrink-0 rounded-lg border border-zinc-700 hover:bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors"
      >
        Sign out
      </button>
    </header>
  );
}
