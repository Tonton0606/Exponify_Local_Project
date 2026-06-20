import { useState } from "react";
import { Menu, ChevronDown, LogOut, Settings, Sparkles, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../../config/supabaseClient.js";
import { initials } from "../../../lib/adminUtils.js";
import { useTheme } from "../../../context/ThemeContext.jsx";


function ClientHeader({
  onMenu,
  onToggleSidebar,
  title = "Client Portal",
  user,
  workspace,
}) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [showUser, setShowUser] = useState(false);

  const openSidebar = onMenu || onToggleSidebar;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const goToSettings = () => {
    navigate("/ClientDashboard/settings");
    setShowUser(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-[65px] w-full items-center gap-3 border-b border-[var(--border-color)] bg-[var(--bg-header)]/95 px-4 py-3 backdrop-blur-xl transition-colors duration-300">
      <button
        type="button"
        onClick={openSidebar}
        aria-label="Open client sidebar"
        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-sm font-black tracking-tight text-[var(--text-primary)] sm:max-w-[220px] sm:text-base md:max-w-[320px] lg:max-w-none">
            {title}
          </h1>
          <Sparkles className="hidden h-3.5 w-3.5 flex-shrink-0 text-[var(--brand-gold)] sm:block" />
        </div>

        <p className="hidden text-[11px] font-medium text-[var(--text-muted)] sm:block">
          {workspace?.name || "Workspace"} · ExponifyPH Client OS
        </p>
      </div>

      <div className="ml-auto flex min-w-0 flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-gold-border)] hover:text-[var(--brand-gold)]"
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <div className="hidden rounded-full border border-[var(--brand-cyan-border)] bg-[var(--brand-cyan-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-cyan)] md:inline-flex">
          AI Workspace
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUser((current) => !current)}
            className="flex max-w-[220px] items-center gap-2 rounded-2xl border border-transparent px-2 py-1.5 transition-colors hover:border-[var(--border-color)] hover:bg-[var(--hover-bg)]"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] text-xs font-black text-[#050816]">
              {initials(user?.full_name || user?.email || "Client")}
            </div>

            <span className="hidden max-w-[130px] truncate text-sm font-semibold text-[var(--text-secondary)] sm:block">
              {user?.full_name || "Client"}
            </span>

            <ChevronDown className="hidden h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)] sm:block" />
          </button>

          {showUser && (
            <>
              <button
                type="button"
                aria-label="Close client user menu"
                className="fixed inset-0 z-40 cursor-default bg-black/0 pointer-events-none"
                onClick={() => setShowUser(false)}
              />

              <div className="absolute right-0 top-full z-50 mt-2 w-[min(14rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2 shadow-2xl">
                <div className="border-b border-[var(--border-color)] px-3 py-2">
                  <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                    {user?.full_name || "Client User"}
                  </p>

                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {user?.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                >
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {isDark ? "Dark Mode" : "Light Mode"}
                </button>

                <button
                  type="button"
                  onClick={goToSettings}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default ClientHeader;
