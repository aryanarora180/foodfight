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
    <div className="min-h-dvh">
      {/* full-width brand banner, spans the whole page above the sidebar and content */}
      <header className="bulb-border neon-border !fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-white/10 bg-[#050f1f]/90 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-2xl">🎰</span>
          <h1 className="font-display neon-text truncate text-lg sm:text-xl">FOOD FIGHT</h1>
        </div>
        {/* phase + logout live in the sidebar on desktop; mobile has no sidebar, so they surface here instead */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
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

      {/* desktop sidebar — pinned to the true viewport edge, below the banner */}
      <aside className="fixed inset-y-0 left-0 top-16 z-20 hidden w-56 flex-col border-r border-white/5 bg-[#050f1f]/80 p-4 backdrop-blur-xl lg:flex">
        <div className="mb-5 flex flex-wrap gap-1.5">
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

      {/* content — offset past the top banner (all sizes) and the fixed sidebar (desktop) */}
      <main className="pt-16 lg:pl-56">
        <div className="mx-auto max-w-4xl px-4 pb-24 pt-4 sm:pb-8 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-6">
          {children}
        </div>
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
