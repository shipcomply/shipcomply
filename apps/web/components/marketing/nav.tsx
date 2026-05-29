"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTION_LINKS = [
  { label: "What it does", href: "/#what-it-does" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "MCP",          href: "/#mcp" },
  { label: "GitHub App",   href: "/#github-app" },
  { label: "CLI",          href: "/#cli" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-bg-4/60 bg-bg-0/92 backdrop-blur-md">
      <div className="max-w-6xl mx-auto h-full px-5 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="text-mint-9 font-bold text-base tracking-tight group-hover:text-mint-11 transition-colors">
            ShipComply
          </span>
          <span className="text-bg-6 text-[10px] px-1.5 py-0.5 rounded border border-bg-5 font-mono">beta</span>
        </Link>

        {/* Desktop section nav */}
        <nav className="hidden lg:flex items-center gap-0.5 text-sm" aria-label="Page sections">
          {SECTION_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-md text-bg-8 hover:text-bg-11 hover:bg-bg-3/60 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <span className="w-px h-4 bg-bg-4 mx-2" aria-hidden />
          <a
            href="https://docs.shipcomply.dev"
            className="px-3 py-1.5 rounded-md text-bg-8 hover:text-bg-11 hover:bg-bg-3/60 transition-colors"
            target="_blank"
            rel="noopener"
          >
            Docs
          </a>
        </nav>

        {/* Auth CTAs */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started free</Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 rounded-md text-bg-7 hover:text-bg-11 hover:bg-bg-3 transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden border-t border-bg-4 bg-bg-1 px-5 py-4 space-y-1">
          {SECTION_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-center h-10 px-3 rounded-lg text-sm text-bg-8 hover:text-bg-11 hover:bg-bg-3 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://docs.shipcomply.dev"
            onClick={() => setOpen(false)}
            className="flex items-center h-10 px-3 rounded-lg text-sm text-bg-8 hover:text-bg-11 hover:bg-bg-3 transition-colors"
            target="_blank"
            rel="noopener"
          >
            Docs
          </a>
          <div className="pt-3 flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button variant="secondary" size="sm" className="w-full">Sign in</Button>
            </Link>
            <Link href="/signup" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full">Get started free</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
