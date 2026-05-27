"use client";
import Link from "next/link";

const FOOTER_LINKS = [
  { group: "Compliance", links: [{ label: "DPDP Act 2023", href: "/knowledge?j=DPDP" }, { label: "GDPR", href: "/knowledge?j=GDPR" }, { label: "CCPA", href: "/knowledge?j=CCPA" }] },
];

export function Footer() {
  return (
    <footer className="border-t border-bg-4 bg-bg-1">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <span className="text-mint-9 font-bold text-lg">ShipComply</span>
            <p className="mt-2 text-sm text-bg-8 leading-relaxed">
              Code-aware DPDP/GDPR compliance engine. Scan any repo. Ship compliant.
            </p>
          </div>
          {FOOTER_LINKS.map((g) => (
            <div key={g.group}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-bg-7 mb-3">{g.group}</h4>
              <ul className="space-y-2">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-bg-9 hover:text-bg-11 transition-colors duration-fast">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-bg-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-bg-7">© {new Date().getFullYear()} ShipComply. All rights reserved.</p>
          <p className="text-xs text-bg-7">AI-GENERATED ARTIFACTS — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING</p>
        </div>
      </div>
    </footer>
  );
}
