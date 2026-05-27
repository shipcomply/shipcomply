import Link from "next/link";

const COMPLIANCE_LABELS = ["DPDP Act 2023", "GDPR", "CCPA / CPRA"];

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
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-bg-7 mb-3">Compliance</h4>
            <ul className="space-y-2">
              {COMPLIANCE_LABELS.map((label) => (
                <li key={label} className="text-sm text-bg-7">{label}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-bg-7 mb-3">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/signup" className="text-sm text-bg-9 hover:text-bg-11 transition-colors duration-fast">Get started free</Link></li>
              <li><Link href="/login" className="text-sm text-bg-9 hover:text-bg-11 transition-colors duration-fast">Sign in</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-bg-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-bg-7">© {new Date().getFullYear()} ShipComply. All rights reserved.</p>
          <p className="text-xs text-bg-7">AI-GENERATED ARTIFACTS — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING</p>
        </div>
      </div>
    </footer>
  );
}
