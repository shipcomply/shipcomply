import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PLANS = [
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

export default function BillingPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-bg-11">Billing</h1>
        <p className="text-sm text-bg-7 mt-1">Manage your subscription and usage.</p>
      </div>

      {/* Current usage */}
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
            <div className="h-full bg-mint-9 rounded-full" style={{ width: "0%" }} />
          </div>
          <p className="text-xs text-bg-6">Free tier: 3 scans per month. Upgrade for more.</p>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-bg-11 mb-4">Plans</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-5 flex flex-col gap-4 ${
                plan.current
                  ? "border-mint-9/50 bg-mint-9/5"
                  : "border-bg-5 bg-bg-2"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-bg-11">{plan.name}</h3>
                  {plan.current && <Badge variant="mint" size="sm">Current</Badge>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-bg-11">{plan.price}</span>
                  {plan.period && <span className="text-sm text-bg-7">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-bg-8 flex items-center gap-2">
                    <span className="text-mint-9 text-xs">✓</span>
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
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Download past invoices for your records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-bg-6 text-sm">
            No invoices yet — you are on the free plan.
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-bg-6">
        Payments processed by Stripe. Taxes calculated automatically for GST (India) and VAT (EU).
        Refunds available within 14 days. Questions? Email billing@shipcomply.dev
      </p>
    </div>
  );
}
