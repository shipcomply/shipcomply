import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShipComply — DPDP/GDPR Compliance Engine",
  description: "Scan any repo, detect every PII flow, generate compliance artifacts in under 5 minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-white antialiased">{children}</body>
    </html>
  );
}
