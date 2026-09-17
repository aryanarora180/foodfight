"use client";

export interface NavTab {
  id: string;
  label: string;
  icon: string;
}

export function NavShell({
  tabs,
  activeTab,
  onTabChange,
  username,
  isAdmin,
  phaseLabel,
  votingTypeLabel,
  onLogout,
  children,
}: {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  username: string;
  isAdmin: boolean;
  phaseLabel: string;
  votingTypeLabel: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col lg:flex-row lg:gap-6 lg:px-4 lg:py-6">
      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-[#050f1f]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xl">🎰</span>
          <h1 className="font-display neon-text truncate text-lg">FOOD FIGHT</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-sky/90">
            {phaseLabel}
          </span>
          <button
            onClick={onLogout}
            className="rounded-full px-2.5 py-1 text-[11px] text-white/50 hover:text-white/80"
          >
            log out
          </button>
        </div>
      </header>

      {/* desktop sidebar */}
      <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-60 shrink-0 flex-col rounded-3xl border border-white/5 bg-[#050f1f]/70 p-4 backdrop-blur-xl lg:flex">
        <div className="mb-1 flex items-center gap-2 px-2">
          <span className="text-2xl">🎰</span>
          <h1 className="font-display neon-text text-lg leading-tight">FOOD FIGHT</h1>
        </div>
        <div className="mb-5 flex flex-wrap gap-1.5 px-2">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-sky/90">
            {phaseLabel}
          </span>
          {votingTypeLabel && (
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/50">
              {votingTypeLabel}
            </span>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-gold/15 text-gold"
                  : "text-white/60 hover:bg-white/5 hover:text-white/85"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-4 border-t border-white/5 pt-4">
          <p className="truncate px-2 text-sm font-semibold">
            {isAdmin && "👑 "}
            {username}
          </p>
          <button
            onClick={onLogout}
            className="mt-2 w-full rounded-xl px-2 py-2 text-left text-xs text-white/40 hover:bg-white/5 hover:text-white/70"
          >
            log out
          </button>
        </div>
      </aside>

      {/* content */}
      <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:py-8 lg:px-0 lg:py-0 lg:pb-0">
        {children}
      </main>

      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-white/5 bg-[#050f1f]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
              activeTab === tab.id ? "text-gold" : "text-white/40"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
