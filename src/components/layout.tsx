import { ReactNode, ElementType, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, BarChart3, Users, Zap, LayoutDashboard, GitFork,
  BookMarked, Lightbulb, Beaker, History, Layers, Image, Crosshair, Radio, Network,
  ChevronDown, PanelLeft, Menu,
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useSaveStatus } from "@/contexts/SaveStatusContext";
import { ProjectPanel } from "@/components/project-panel";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem { href: string; label: string; icon: ElementType; }
interface NavGroup { label?: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Strategy",
    items: [
      { href: "/market-understanding",    label: "Market Intel", icon: Users      },
      { href: "/competitor-intelligence", label: "Competitors",  icon: BarChart3  },
      { href: "/hypothesis",              label: "Hypothesis",   icon: Lightbulb  },
    ],
  },
  {
    label: "Creative Testing",
    items: [
      { href: "/script-testing",       label: "Script Matrix",      icon: FlaskConical },
      { href: "/creative-lab",         label: "Creative Lab",        icon: Beaker       },
      { href: "/experiment-timeline",  label: "Experiment Timeline", icon: History      },
      { href: "/creative-iteration",   label: "Iteration",           icon: Zap          },
    ],
  },
  {
    label: "Methodology",
    items: [
      { href: "/framework",           label: "Framework",         icon: GitFork    },
      { href: "/awareness-levels",    label: "Awareness Levels",  icon: Radio      },
      { href: "/angle-library",       label: "Angle Library",     icon: Crosshair  },
      { href: "/hook-library",        label: "Hook Library",      icon: BookMarked },
      { href: "/format-library",      label: "Format Library",    icon: Layers     },
      { href: "/static-ad-library",   label: "Static Ad Library", icon: Image      },
      { href: "/campaign-structure",  label: "Campaign Structure", icon: Network   },
    ],
  },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { activeProject } = useProject();
  const { status } = useSaveStatus();

  // Section-level collapse (expand/contract nav groups)
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({});

  // Sidebar open / icon-only — persisted to localStorage (desktop only)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("clb:sidebar") !== "0"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem("clb:sidebar", sidebarOpen ? "1" : "0"); } catch {}
  }, [sidebarOpen]);

  // Mobile menu open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location]);

  // ── Scroll restoration ───────────────────────────────────────────────────
  const savedScrolls = useRef<Map<string, number>>(new Map());
  const prevLocation = useRef<string>(location);

  useEffect(() => {
    const save = () => { savedScrolls.current.set(location, window.scrollY); };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      save();
      window.removeEventListener("scroll", save);
    };
  }, [location]);

  useEffect(() => {
    const prev = prevLocation.current;
    if (prev === location) return;
    prevLocation.current = location;
    const saved = savedScrolls.current.get(location);
    requestAnimationFrame(() => {
      window.scrollTo({ top: saved ?? 0, behavior: "instant" });
    });
  }, [location]);
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-row">

      {/* ── Mobile backdrop overlay ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile topbar ── */}
      <header className="fixed top-0 left-0 right-0 h-14 z-40 md:hidden glass-panel border-b border-white/10 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06] transition-all duration-150"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
          <FlaskConical className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-sm leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Creative Lab
          </h1>
          {activeProject && (
            <p className="text-[9px] text-muted-foreground truncate" title={activeProject.name}>
              {activeProject.name}
            </p>
          )}
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside className={`
        glass-panel border-white/10 shrink-0 flex flex-col overflow-hidden
        fixed inset-y-0 left-0 z-50 w-64 h-full
        md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r
        transition-transform md:transition-all duration-300 ease-in-out
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        ${sidebarOpen ? "md:w-64" : "md:w-14"}
      `}>

        {/* Logo + toggle */}
        <div className={`flex items-center ${sidebarOpen ? "p-4 gap-3" : "py-4 px-2 flex-col gap-2"}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>

          {sidebarOpen && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="font-display font-bold text-base leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                Creative Lab
              </h1>
              {activeProject && (
                <p className="text-[10px] text-muted-foreground truncate" title={activeProject.name}>
                  {activeProject.name}
                </p>
              )}
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setSidebarOpen(s => !s)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={`
              hidden md:flex shrink-0 w-6 h-6 items-center justify-center rounded-lg
              text-muted-foreground/35 hover:text-muted-foreground/65 hover:bg-white/[0.06]
              transition-all duration-150
              ${sidebarOpen ? "ml-auto" : ""}
            `}
          >
            <PanelLeft
              className="w-3.5 h-3.5 transition-transform duration-300"
              style={{ transform: sidebarOpen ? "none" : "rotate(180deg)" }}
            />
          </button>
        </div>

        {/* ── Navigation ── */}
        <div className="relative flex-1 min-h-0">
          <nav className={`
            sidebar-nav h-full overflow-y-auto flex flex-col gap-0.5
            overflow-x-hidden pb-6
            ${sidebarOpen ? "px-3" : "px-2"}
          `}>
            {navGroups.map((group, gi) => {
              const isCollapsed = group.label ? (sectionCollapsed[group.label] ?? false) : false;
              const showItems = !sidebarOpen || !isCollapsed;

              return (
                <div key={gi} className={`flex flex-col gap-0.5 ${gi > 0 ? "mt-1" : ""}`}>

                  {/* Section label — hidden in icon-only mode */}
                  {sidebarOpen && group.label && (
                    <button
                      onClick={() => setSectionCollapsed(prev => ({ ...prev, [group.label!]: !prev[group.label!] }))}
                      className="flex items-center gap-2 px-2 pt-3 pb-1.5 w-full group"
                    >
                      <div className="h-px flex-none w-2 bg-white/8" />
                      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground/30 whitespace-nowrap group-hover:text-muted-foreground/50 transition-colors">
                        {group.label}
                      </span>
                      <div className="h-px flex-1 bg-white/8" />
                      <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-all duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                    </button>
                  )}

                  {/* Small divider dot in icon-only mode between groups */}
                  {!sidebarOpen && gi > 0 && (
                    <div className="flex justify-center py-1">
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                    </div>
                  )}

                  {/* Nav items */}
                  <AnimatePresence initial={false}>
                    {showItems && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden flex flex-col gap-0.5"
                      >
                        {group.items.map((item) => {
                          const isActive = location === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              title={!sidebarOpen ? item.label : undefined}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`
                                relative flex items-center py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap shrink-0
                                ${sidebarOpen ? "gap-3 px-3" : "justify-center px-0"}
                                ${isActive
                                  ? "bg-primary/10 text-primary border border-primary/20 shadow-inner"
                                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"}
                              `}
                            >
                              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/70"}`} />
                              {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                              {isActive && sidebarOpen && (
                                <motion.div
                                  layoutId="activeNav"
                                  className="absolute left-0 w-[3px] h-6 bg-primary rounded-r-full"
                                />
                              )}
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Bottom fade — expanded mode only */}
          {sidebarOpen && (
            <div
              className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
              style={{ background: "linear-gradient(to top, hsl(230 35% 7% / 0.9), transparent)" }}
            />
          )}
        </div>

        {/* Projects panel — hidden in icon-only mode */}
        {sidebarOpen && <ProjectPanel />}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-x-hidden pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
          {children}
        </div>
      </main>

      {/* ── Save status indicator (fixed top-right) ── */}
      <AnimatePresence>
        {status !== "idle" && (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-3.5 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/8 text-[11px] font-medium select-none pointer-events-none"
          >
            {status === "saving" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
                <span className="text-yellow-400/90">Saving…</span>
              </>
            )}
            {status === "saved" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-emerald-400/80">Saved</span>
              </>
            )}
            {status === "error" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="text-red-400">Error saving</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
