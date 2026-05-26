"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "O" },
  { label: "Repos", href: "/repos", icon: "G" },
  { label: "Scans", href: "/scans", icon: "S" },
  { label: "Knowledge", href: "/knowledge", icon: "K" },
  { label: "Team", href: "/team", icon: "T" },
  { label: "Settings", href: "/settings", icon: "C" },
  { label: "Billing", href: "/billing", icon: "B" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-bg-1 border-r border-bg-4 flex flex-col z-40">
      <div className="h-16 flex items-center px-5 border-b border-bg-4">
        <Link href="/dashboard" className="text-mint-9 font-bold text-base tracking-tight">ShipComply</Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors",
                active ? "bg-bg-3 text-bg-11 font-medium" : "text-bg-8 hover:bg-bg-3 hover:text-bg-11"
              )}
            >
              <span className="font-mono text-xs opacity-60 w-4">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-bg-4">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-y-auto bg-bg-0">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
