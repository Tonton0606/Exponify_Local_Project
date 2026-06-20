import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, X, Sparkles } from "lucide-react";

import { cn, initials } from "../../../lib/adminUtils";

import {
  buildNavigationRegistry,
  getERPRegistryData,
} from "../../../services/operations/erp_registry";

export default function AdminSidebar({ open, onClose, user }) {
  const location = useLocation();

  const [registryDivisions, setRegistryDivisions] = useState([]);
  const [registryFeatures, setRegistryFeatures] = useState([]);
  const [loadingRegistry, setLoadingRegistry] = useState(true);
  const [registryError, setRegistryError] = useState("");
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    let mounted = true;

    async function loadAdminNavigation() {
      try {
        setLoadingRegistry(true);
        setRegistryError("");

        const data = await getERPRegistryData();

        if (!mounted) return;

        setRegistryDivisions(data.divisions || []);
        setRegistryFeatures(data.features || []);
      } catch (err) {
        console.error("Admin sidebar registry load error:", err);

        if (mounted) {
          setRegistryError(err.message || "Failed to load admin navigation.");
        }
      } finally {
        if (mounted) {
          setLoadingRegistry(false);
        }
      }
    }

    loadAdminNavigation();

    return () => {
      mounted = false;
    };
  }, []);

  const navSections = useMemo(() => {
    return buildNavigationRegistry({
      divisions: registryDivisions,
      features: registryFeatures,
      enabledFeatureKeys: [],
      mode: "admin",
    });
  }, [registryDivisions, registryFeatures]);

  const activeDivisionKey = useMemo(() => {
    const match = navSections.find((section) =>
      section.items.some((item) => item.adminRoute === location.pathname)
    );

    return match?.key || navSections[0]?.key || "";
  }, [location.pathname, navSections]);

  useEffect(() => {
    if (!activeDivisionKey) return;

    setOpenSections((prev) => ({
      ...prev,
      [activeDivisionKey]: true,
    }));
  }, [activeDivisionKey]);

  function toggleSection(sectionKey) {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-dvh w-[min(280px,86vw)] flex-col overflow-hidden border-r shadow-xl transition-transform duration-300 ease-out lg:w-[280px] lg:translate-x-0 lg:shadow-none",
        "border-[var(--border-color)] bg-[var(--bg-sidebar)] text-[var(--text-primary)]",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.13),transparent_32%),radial-gradient(circle_at_top_right,rgba(103,232,249,0.10),transparent_30%)]",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="relative flex h-[65px] flex-shrink-0 items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--brand-gold-border)] bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] shadow-lg shadow-yellow-500/10">
            <span className="text-sm font-black text-[#050816]">E</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-base font-black tracking-tight text-[var(--text-primary)]">
                ExponifyPH
              </span>
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[var(--brand-gold)]" />
            </div>
            <p className="truncate text-[11px] font-medium text-[var(--text-muted)]">
              AI Enterprise OS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close admin sidebar"
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="no-scrollbar relative min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {loadingRegistry && (
          <div className="space-y-2 px-3 py-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-9 animate-pulse rounded-xl bg-[var(--hover-bg)]"
              />
            ))}
          </div>
        )}

        {!loadingRegistry && registryError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
            {registryError}
          </div>
        )}

        {!loadingRegistry &&
          !registryError &&
          navSections.map((section) => {
            const SectionIcon = section.icon;
            const isSectionOpen = !!openSections[section.key];
            const isSectionActive = section.key === activeDivisionKey;

            return (
              <div key={section.key} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className={cn(
                    "group flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-150",
                    isSectionActive
                      ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] font-bold text-[var(--brand-gold)]"
                      : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <SectionIcon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isSectionActive
                        ? "text-[var(--brand-gold)]"
                        : "text-[var(--text-muted)] group-hover:text-[var(--brand-cyan)]"
                    )}
                  />

                  <span className="min-w-0 flex-1 truncate text-left">
                    {section.title}
                  </span>

                  {isSectionOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                </button>

                {isSectionOpen && (
                  <div className="ml-5 space-y-1 border-l border-[var(--border-color)] pl-2">
                    {section.items.map(({ key, adminRoute, icon: Icon, label }) => (
                      <NavLink
                        key={key}
                        to={adminRoute}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            "group flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-150",
                            isActive
                              ? "border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] font-semibold text-[var(--brand-gold)]"
                              : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isActive
                                  ? "text-[var(--brand-gold)]"
                                  : "text-[var(--text-muted)] group-hover:text-[var(--brand-cyan)]"
                              )}
                            />

                            <span className="min-w-0 flex-1 truncate">
                              {label}
                            </span>

                            {isActive && (
                              <ChevronRight className="h-3 w-3 flex-shrink-0 text-[var(--brand-gold)]" />
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      <div className="relative flex-shrink-0 border-t border-[var(--border-color)] px-4 py-3">
        {user && (
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--hover-bg)] p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-cyan-bright)] text-xs font-black text-[#050816]">
              {initials(user.full_name || user.email || "Admin")}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                {user.full_name || "Admin"}
              </p>

              <p className="truncate text-xs text-[var(--text-muted)]">
                {user.role || "Administrator"}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
