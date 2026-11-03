"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

// Settings pages dispatch this after changing the workspace name or favicon, so the sidebar updates without a reload.
export const WORKSPACE_UPDATED_EVENT = "workspace-updated";

const ITEMS = [
  { key: "leads", label: "Leads", href: "/leads", icon: (c) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.5" r="2.5" stroke={c} strokeWidth="1.4" />
      <path d="M2.5 14c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ) },
  { key: "skipped", label: "Skipped emails", href: "/skipped", icon: (c) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke={c} strokeWidth="1.4" />
      <path d="M2.5 4.5l5.5 4 5.5-4" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) },
  { key: "settings", label: "Settings", href: "/settings", icon: (c) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke={c} strokeWidth="1.4" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ) },
];

export default function AppSidebar({ active }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/workspace")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (!cancelled && data) setWorkspace(data.workspace); })
        .catch(() => {});
    }
    load();
    window.addEventListener(WORKSPACE_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(WORKSPACE_UPDATED_EVENT, load);
    };
  }, []);

  // The browser tab shows the workspace favicon too.
  useEffect(() => {
    if (!workspace?.favicon_url) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = workspace.favicon_url;
  }, [workspace?.favicon_url]);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function go(href) {
    setMenuOpen(false);
    router.push(href);
  }

  return (
    <aside className={`sidebar${menuOpen ? " open" : ""}`}>
      <div className="sidebar-header">
        {workspace?.favicon_url
          ? <img className="workspace-favicon" src={workspace.favicon_url} alt="" />
          : <div className="logo-swatch"></div>}
        <span className="sidebar-title">{workspace?.name || "Workspace"}</span>
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
      <nav className="nav">
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              className={`nav-item${isActive ? " active" : ""}`}
              onClick={() => go(item.href)}
            >
              {item.icon(isActive ? "#2A5CFF" : "#9A9DA3")}
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item" onClick={handleSignOut}>Sign out</button>
      </div>
    </aside>
  );
}
