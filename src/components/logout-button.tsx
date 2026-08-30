'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/app-shell';

/**
 * LogoutButton
 *
 * Sidebar / menu logout control. Calls supabase.auth.signOut() to clear
 * the session cookies on both client and server, then redirects to /signin.
 *
 * Renders as either a full-width sidebar row (variant="sidebar") or a
 * compact icon-only header button (variant="icon"). The styling matches
 * the existing SidebarLink / header-button patterns in app-shell.tsx.
 */
type LogoutButtonProps = {
  variant?: 'sidebar' | 'icon';
  collapsed?: boolean;
};

export function LogoutButton({
  variant = 'sidebar',
  collapsed = false,
}: LogoutButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if logout fails, redirect to /signin
    }
    router.push('/signin');
    // Hard fallback in case the preview iframe blocks the client-side nav.
    window.setTimeout(() => {
      if (window.location.pathname !== '/signin') {
        window.location.assign('/signin');
      }
    }, 600);
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        aria-label="Log out"
        className="rounded-lg p-2 text-rf-on-surface-variant transition-colors hover:text-rf-primary disabled:cursor-wait disabled:opacity-60"
      >
        <Icon name={busy ? 'progress_activity' : 'logout'} className={`text-[20px] ${busy ? 'animate-pulse' : ''}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 text-rf-on-surface-variant transition-all duration-200 hover:bg-white/5 hover:text-rf-on-surface disabled:cursor-wait disabled:opacity-60 ${
        collapsed ? 'justify-center px-0' : ''
      }`}
    >
      <Icon
        name={busy ? 'progress_activity' : 'logout'}
        className={`text-[20px] ${busy ? 'animate-pulse' : ''}`}
      />
      {!collapsed ? (
        <span className="text-[14px] font-medium">
          {busy ? 'Logging out…' : 'Log Out'}
        </span>
      ) : null}
    </button>
  );
}
