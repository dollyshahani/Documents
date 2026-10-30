"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/month", label: "Month" },
  { href: "/log", label: "Log" },
  { href: "/studio", label: "Reels" },
  { href: "/meds", label: "Meds" },
  { href: "/settings", label: "•••" },
];

export default function TabBar() {
  const path = usePathname();
  if (path === "/login" || path === "/talk") return null;
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-paper/95 backdrop-blur border-t border-stone-200 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md flex">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 py-4 text-center text-sm ${
              path === t.href ? "font-bold text-ink" : "text-stone-400"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
