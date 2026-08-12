"use client";

import { useSession } from "@/lib/hooks";
import { LoginScreen } from "@/components/LoginScreen";
import { GameShell } from "@/components/GameShell";

export default function Home() {
  const { user, isLoading, mutate } = useSession();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-display animate-pulse text-gold">Loading the tables…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoggedIn={() => mutate()} />;
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    mutate();
  }

  return <GameShell username={user.username} isAdmin={user.isAdmin} onLogout={handleLogout} />;
}
