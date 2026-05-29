"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

type Currency = "INR" | "USD";

const PLANS_USD = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["3 scans / month", "1 repository", "DPDP + GDPR + CCPA", "Community support"],
    cta: "Current plan",
    current: true,
  },
  {
    name: "Team",
    price: "$29",
    period: "/ month",
    features: ["50 scans / month", "5 repositories", "All jurisdictions", "Email support", "14-day free trial"],
    cta: "Upgrade to Team",
    current: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Unlimited scans", "Unlimited repos", "SSO + SAML", "On-prem option", "Dedicated support", "SOC 2 report"],
    cta: "Contact sales",
    current: false,
  },
];

const PLANS_INR = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    features: ["3 scans / month", "1 repository", "DPDP + GDPR + CCPA", "Community support"],
    cta: "Current plan",
    current: true,
  },
  {
    name: "Team",
    price: "₹2,499",
    period: "/ month",
    features: ["50 scans / month", "5 repositories", "All jurisdictions", "Email support", "14-day free trial"],
    cta: "Upgrade to Team",
    current: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Unlimited scans", "Unlimited repos", "SSO + SAML", "On-prem option", "Dedicated support", "SOC 2 report"],
    cta: "Contact sales",
    current: false,
  },
];

function detectDefaultCurrency(): Currency {
  if (typeof navigator === "undefined") return "USD";
  const lang = navigator.language ?? "";
  return lang.startsWith("hi") || lang === "en-IN" ? "INR" : "USD";
}

export default function BillingPage() {
  const [currency, setCurrency] = useState<Currency>("USD");

  useEffect(() => {
    setCurrency(detectDefaultCurrency());
  }, []);

  const plans = currency === "INR" ? PLANS_INR : PLANS_USD;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-bg-11">Billing</h1>
        <p className="text-sm text-bg-7 mt-1">Manage your subscription and usage.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage this month</CardTitle>
          <CardDescription>Resets on the 1st of each month.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-bg-8">Scans used</span>
            <span className="text-sm font-mono font-medium text-bg-11">0 / 3</span>
          </div>
          <div className="h-2 bg-bg-3 rounded-full overflow-hidden">
            <div
              role="progressbar"
              aria-valuenow={0}
              aria-valuemin={0}
              aria-valuemax={3}
              aria-label="Scans used this month"
              className="h-full bg-mint-9 rounded-full"
              style={{ width: "0%" }}
            />
          </div>
          <p className="text-xs text-bg-6">Free tier: 3 scans / month. Upgrade for more.</p>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-bg-11">Plans</h2>
          <div className="flex items-center gap-1 rounded-lg border border-bg-4 p-0.5 text-xs font-medium">
            {(["INR", "USD"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  currency === c
                    ? "bg-bg-3 text-mint-9"
                    : "text-bg-7 hover:text-bg-10"
                }`}
              >
                {c === "INR" ? "₹ INR" : "$ USD"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              variant="bordered"
              className={`flex flex-col gap-4 p-5 ${plan.current ? "border-mint-9/50 bg-mint-9/5" : ""}`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-bg-11">{plan.name}</h3>
                  {plan.current && <Badge variant="mint">Current</Badge>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-bg-11">{plan.price}</span>
                  {plan.period && <span className="text-sm text-bg-7">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-bg-8 flex items-center gap-2">
                    <Check size={14} className="text-mint-9 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.current ? "secondary" : "primary"}
                disabled={plan.current}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Download past invoices for your records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-bg-6 text-sm">
            No invoices yet. You are on the free plan.
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-bg-6">
        Payments processed by Stripe. Taxes calculated automatically: GST for India, VAT for EU.
        Refunds available within 14 days. Questions? Email billing@shipcomply.dev
      </p>
    </div>
  );
}
