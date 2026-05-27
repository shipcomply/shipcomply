"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-bg-4 bg-bg-0/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-mint-9 font-bold text-lg tracking-tight group-hover:text-mint-11 transition-colors duration-fast">
            ShipComply
          </span>
          <span className="text-bg-7 text-xs px-1.5 py-0.5 rounded border border-bg-5">beta</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-bg-9">
          <a href="https://docs.shipcomply.dev" className="hover:text-bg-11 transition-colors duration-fast" target="_blank" rel="noopener">Docs</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started free</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
