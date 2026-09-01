"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { useWalkthrough } from "@/lib/walkthrough";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavCategory = "core" | "builder" | "experience" | "analytics" | "workspace";

type NavItem = {
  href: string;
  icon: string;
  label: string;
  category: NavCategory;
  /** Short label shown in collapsed mode */
  shortLabel?: string;
  /** Descriptive text shown below the label */
  subtitle?: string;
};

// ---------------------------------------------------------------------------
// Navigation structure — grouped by purpose
// ---------------------------------------------------------------------------

const navItems: NavItem[] = [
  // Core
  { href: "/dashboard", icon: "space_dashboard", label: "Dashboard", category: "core", subtitle: "Overview and activity" },
  { href: "/forms/all", icon: "dynamic_form", label: "Forms", category: "core", subtitle: "All forms and subscriptions" },

  // Builder — create and manage forms
  { href: "/forms/ai", icon: "auto_awesome", label: "AI Form Generator", category: "builder", shortLabel: "Generate", subtitle: "Generate forms with AI" },
  { href: "/templates", icon: "edit_note", label: "Form Builder", category: "builder", shortLabel: "Builder", subtitle: "Design and customize forms" },
  { href: "/submissions", icon: "inbox", label: "Submissions", category: "builder", shortLabel: "Submissions", subtitle: "Real-time entry stream" },

  // Experience — how respondents interact
  { href: "/forms/chat", icon: "chat_bubble", label: "Conversational", category: "experience", shortLabel: "Chat", subtitle: "AI-powered chat forms" },
  { href: "/forms/voice", icon: "mic", label: "Voice Mode", category: "experience", shortLabel: "Voice", subtitle: "Speech-to-form input" },
  { href: "/forms/translate", icon: "translate", label: "Translation", category: "experience", shortLabel: "Translate", subtitle: "Auto-translate forms" },

  // Analytics — understand and optimize
  { href: "/forms/routing", icon: "alt_route", label: "Smart Routing", category: "analytics", shortLabel: "Routing", subtitle: "AI rule-based routing" },
  { href: "/forms/new?mode=analytics", icon: "monitoring", label: "Drop-off Analytics", category: "analytics", shortLabel: "Analytics", subtitle: "Conversion insights" },
  { href: "/forms/new?mode=pdf", icon: "summarize", label: "PDF Reports", category: "analytics", shortLabel: "Reports", subtitle: "Exportable summaries" },

  // Workspace
  { href: "/api-keys", icon: "key", label: "API Keys", category: "workspace", subtitle: "Manage access tokens" },
  { href: "/settings", icon: "settings", label: "Settings", category: "workspace", subtitle: "Configure your account" },
];

const categoryMeta: Record<NavCategory, { label: string; color: string; icon: string }> = {
  core:       { label: "",             color: "",         icon: "" },
  builder:    { label: "Build",        color: "amber",    icon: "construction" },
  experience: { label: "Experience",   color: "amber",    icon: "groups" },
  analytics:  { label: "Insights",     color: "amber",    icon: "insights" },
  workspace:  { label: "Workspace",    color: "amber",    icon: "folder" },
};

const categoryColors: Record<string, { bg: string; text: string; border: string; activeBg: string; activeText: string; hoverBg: string }> = {
  amber:   { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", activeBg: "bg-amber-500/15", activeText: "text-amber-400", hoverBg: "hover:bg-amber-500/8" },
};

// ---------------------------------------------------------------------------
// Icon component
// ---------------------------------------------------------------------------

export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`.trim()} aria-hidden="true">
      {name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sidebar link with tooltip for collapsed mode
// ---------------------------------------------------------------------------

function SidebarLink({
  item,
  active = false,
  collapsed = false,
}: {
  item: NavItem;
  active?: boolean;
  collapsed?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = categoryColors[categoryMeta[item.category]?.color || "amber"];

  return (
    <div className="relative">
      <Link
        href={item.href}
        aria-label={item.label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ease-out ${
          active
            ? `${colors.activeBg} ${colors.activeText} shadow-sm`
            : `text-rf-on-surface-variant ${colors.hoverBg} hover:text-rf-on-surface`
        } ${collapsed ? "justify-center px-0 py-3" : ""}`}
      >
        {/* Icon with active glow */}
        <div className="relative flex-shrink-0">
          <Icon
            name={item.icon}
            className={`text-[18px] transition-transform duration-200 group-hover:scale-110 ${
              active ? colors.activeText : ""
            }`}
          />
          {active && (
            <span
              className={`pointer-events-none absolute inset-0 -z-10 rounded-full ${colors.bg} blur-[8px] opacity-60`}
            />
          )}
        </div>

        {/* Label + subtitle */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="block truncate leading-tight">{item.shortLabel || item.label}</span>
            {item.subtitle && (
              <span className="block truncate text-[10px] leading-tight opacity-50">{item.subtitle}</span>
            )}
          </div>
        )}

        {/* Active indicator dot */}
        {active && !collapsed && (
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
        )}
      </Link>

      {/* Tooltip for collapsed mode */}
      {collapsed && hovered && (
        <div className="absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-rf-surface-container-high px-3 py-1.5 text-[12px] font-medium text-rf-on-surface shadow-xl">
          {item.label}
          <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l border-white/10 bg-rf-surface-container-high" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category section
// ---------------------------------------------------------------------------

function CategorySection({
  category,
  items,
  activePath,
  collapsed,
}: {
  category: NavCategory;
  items: NavItem[];
  activePath: string;
  collapsed: boolean;
}) {
  const meta = categoryMeta[category];
  const colors = categoryColors[meta.color] || categoryColors.amber;
  const aiCount = category !== "core" && category !== "workspace" ? items.length : 0;

  return (
    <div className="mb-1">
      {/* Category header */}
      {!collapsed && meta.label && (
        <div className="mb-1 flex items-center gap-2 px-3 pt-4 pb-1">
          <Icon name={meta.icon} className={`text-[12px] ${colors.text} opacity-60`} />
          <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${colors.text} opacity-70`}>
            {meta.label}
          </span>
          {aiCount > 0 && (
            <span className={`ml-auto rounded-full ${colors.bg} ${colors.text} px-1.5 py-px text-[9px] font-bold`}>
              {aiCount}
            </span>
          )}
        </div>
      )}

      {/* Collapsed divider */}
      {collapsed && meta.label && (
        <div className="mx-auto my-3 h-px w-6 bg-white/8" />
      )}

      {/* Items */}
      <div className="space-y-0.5">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={activePath === item.href}
            collapsed={collapsed}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand logo SVG (extracted to avoid repetition)
// ---------------------------------------------------------------------------

function BrandLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Reform Logo">
      <defs>
        <linearGradient id="rf-logo-g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="rf-logo-g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#rf-logo-g1)" opacity="0.4" />
      <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#rf-logo-g1)" opacity="0.7" transform="translate(2, 0)" />
      <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#rf-logo-g2)" transform="translate(4, 0)" />
      <g transform="translate(32, 32)" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <line x1="-22" y1="-10" x2="-6" y2="-10" />
        <line x1="-22" y1="0" x2="-6" y2="0" />
        <line x1="-22" y1="10" x2="-6" y2="10" />
        <line x1="-6" y1="0" x2="20" y2="0" />
        <polyline points="14,-6 22,0 14,6" fill="none" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main AppShell
// ---------------------------------------------------------------------------

export function AppShell({
  activePath,
  brandSubtitle,
  children,
  brandName = "Reform",
}: {
  activePath: string;
  brandSubtitle: string;
  brandName?: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const sidebarWidth = collapsed ? 72 : 260;

  // Group nav items by category, preserving order
  const grouped = useMemo(() => {
    const order: NavCategory[] = ["core", "builder", "experience", "analytics", "workspace"];
    const map = new Map<NavCategory, NavItem[]>();
    for (const item of navItems) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return order.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  }, []);

  const aiFeatureCount = navItems.filter(
    (i) => i.category === "builder" || i.category === "experience" || i.category === "analytics"
  ).length;

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-rf-surface-base text-rf-on-surface"
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Mobile header                                                       */}
      {/* ------------------------------------------------------------------ */}
      <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-b border-white/10 bg-rf-surface/80 px-4 backdrop-blur-md min-[480px]:hidden sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-3" aria-label="Reform">
          <BrandLogo className="h-8 w-8" />
          <span className="text-[14px] font-semibold text-rf-on-surface">{brandName}</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-rf-on-surface-variant transition-colors hover:text-rf-primary"
          aria-label="Toggle menu"
        >
          <Icon name={mobileOpen ? "close" : "menu"} className="text-[22px]" />
        </button>
      </header>

      {/* Mobile overlay menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 min-[480px]:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-[min(85vw,320px)] overflow-y-auto border-l border-white/10 bg-rf-surface-container py-6 shadow-2xl">
            <div className="px-4 pb-4">
              <BrandLogo className="h-10 w-10" />
            </div>
            <nav className="px-3">
              {grouped.map(({ category, items }) => (
                <CategorySection
                  key={category}
                  category={category}
                  items={items}
                  activePath={activePath}
                  collapsed={false}
                />
              ))}
            </nav>
            <div className="mt-4 border-t border-white/10 px-4 pt-4">
              <LogoutButton variant="sidebar" />
            </div>
          </aside>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Desktop sidebar                                                     */}
      {/* ------------------------------------------------------------------ */}
      <aside
        ref={sidebarRef}
        className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/8 bg-rf-surface-container transition-all duration-300 ease-out min-[480px]:flex"
        style={{ width: sidebarWidth }}
      >
        {/* Brand header */}
        <div className={`flex items-center gap-3 border-b border-white/6 px-4 pb-5 pt-6 ${collapsed ? "justify-center" : "px-5"}`}>
          <BrandLogo className={`flex-shrink-0 ${collapsed ? "h-10 w-10" : "h-9 w-9"}`} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-rf-on-surface truncate">{brandName}</p>
              <p className="text-[11px] text-rf-on-surface-variant truncate">{brandSubtitle}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {grouped.map(({ category, items }) => (
            <CategorySection
              key={category}
              category={category}
              items={items}
              activePath={activePath}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/6 px-3 pb-4 pt-3 space-y-1">
          {/* Xano badge */}
          {!collapsed && (
            <div className="mb-2 flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2">
              <Icon name="database" className="text-[13px] text-amber-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-rf-on-surface-variant/50">
                Powered by
              </span>
              <span className="text-[10px] font-extrabold text-amber-400">Xano</span>
            </div>
          )}

          {/* Collapsed Xano dot */}
          {collapsed && (
            <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/15 bg-amber-500/5">
              <Icon name="database" className="text-[12px] text-amber-400" />
            </div>
          )}

          {/* Take the Tour */}
          <button
            type="button"
            onClick={() => useWalkthrough.getState().start()}
            data-tour="start-tour"
            className={`group flex w-full items-center gap-3 rounded-xl border border-rf-primary/15 bg-rf-primary/5 px-3 py-2.5 text-left text-rf-primary transition-all duration-200 hover:bg-rf-primary/10 hover:border-rf-primary/25 ${
              collapsed ? "justify-center px-0" : ""
            }`}
            aria-label="Start guided tour"
          >
            <Icon name="tour" className="text-[18px] transition-transform group-hover:scale-110" />
            {!collapsed && <span className="text-[13px] font-medium">Take the Tour</span>}
          </button>

          {/* Logout + Collapse row */}
          <div className={`flex items-center gap-1 ${collapsed ? "flex-col" : ""}`}>
            <LogoutButton variant="sidebar" collapsed={collapsed} />
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-rf-on-surface-variant transition-all duration-200 hover:bg-white/5 hover:text-rf-on-surface ${
                collapsed ? "w-full justify-center" : "flex-1"
              }`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon
                name={collapsed ? "keyboard_arrow_right" : "keyboard_arrow_left"}
                className="text-[18px]"
              />
              {!collapsed && <span className="text-[13px] font-medium">Collapse</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="min-h-screen w-full transition-[margin-left,width] duration-300 ease-out min-[480px]:ml-[var(--sidebar-width)] min-[480px]:w-[calc(100vw-var(--sidebar-width))]">
        {children}
      </main>
    </div>
  );
}
