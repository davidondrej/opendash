"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (pathname === "/login") {
    return null;
  }

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/agents", label: "Agents" },
    { href: "/settings", label: "Settings" },
  ];

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="border-b border-[var(--od-border)] bg-[var(--od-surface-1)]/70 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1380px] items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold tracking-wide text-[var(--od-soft-text)]">
            OpenDash
          </Link>
          <nav className="flex items-center gap-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-2.5 py-1.5 text-sm transition ${
                    isActive
                      ? "bg-[var(--od-surface-3)] text-[var(--od-text)]"
                      : "text-[var(--od-muted)] hover:bg-[var(--od-surface-2)] hover:text-[var(--od-soft-text)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button type="button" onClick={handleSignOut} className="od-button-ghost px-3 py-1.5" disabled={isSigningOut}>
          {isSigningOut ? "Signing out..." : "Log out"}
        </button>
      </div>
    </header>
  );
}
