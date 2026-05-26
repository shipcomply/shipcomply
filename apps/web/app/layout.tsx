import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ShipComply — Code to Compliance in 5 Minutes", template: "%s | ShipComply" },
  description: "Scan your repo, detect every PII flow, generate DPDP/GDPR/CCPA privacy policy with file:line citations — automatically.",
  keywords: ["DPDP", "GDPR", "compliance", "privacy policy", "PII scanner", "code compliance"],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://shipcomply.dev",
    siteName: "ShipComply",
    title: "ShipComply — Code to Compliance in 5 Minutes",
    description: "Scan your repo, detect every PII flow, generate DPDP/GDPR/CCPA compliance artifacts automatically.",
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://shipcomply.dev"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-bg-0 text-bg-11 antialiased">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
