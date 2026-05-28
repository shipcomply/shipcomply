"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GitBranch,
  ScanLine,
  Map,
  Settings,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV_ITEMS: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { label: "Repos",     href: "/repos",     Icon: GitBranch },
  { label: "Scans",     href: "/scans",     Icon: ScanLine },
  { label: "Legal Map", href: "/knowledge", Icon: Map },
  { label: "Settings",  href: "/settings",  Icon: Settings },
  { label: "Billing",   href: "/billing",   Icon: CreditCard },
];

function NavItems({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNav}
            className={cn(
              "flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors",
              active ? "bg-bg-3 text-bg-11 font-medium" : "text-bg-8 hover:bg-bg-3 hover:text-bg-11"
            )}
          >
            <item.Icon size={16} className="opacity-60 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-bg-1 border-r border-bg-4 flex flex-col z-40">
      <div className="h-16 flex items-center px-5 border-b border-bg-4">
        <Link href="/dashboard" className="text-mint-9 font-bold text-base tracking-tight">ShipComply</Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <NavItems />
      </nav>
      <div className="p-4 border-t border-bg-4">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-bg-1 border-r border-bg-4 flex flex-col z-50 md:hidden">
        <div className="h-16 flex items-center justify-between px-5 border-b border-bg-4">
          <Link href="/dashboard" onClick={onClose} className="text-mint-9 font-bold text-base tracking-tight">ShipComply</Link>
          <button onClick={onClose} className="text-bg-7 hover:text-bg-11 transition-colors" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavItems onNav={onClose} />
        </nav>
        <div className="p-4 border-t border-bg-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>
    </>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  warmupBanner?: React.ReactNode;
}

export function AppShell({ children, warmupBanner }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex-1 flex flex-col md:ml-56 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden h-14 flex items-center px-4 border-b border-bg-4 bg-bg-1 flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-bg-7 hover:text-bg-11 transition-colors mr-3"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Link href="/dashboard" className="text-mint-9 font-bold text-sm tracking-tight">ShipComply</Link>
        </div>

        {warmupBanner}

        <main className="flex-1 overflow-y-auto bg-bg-0">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
