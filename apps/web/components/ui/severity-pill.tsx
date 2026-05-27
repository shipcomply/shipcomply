import { AlertCircle, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" | string;

const SEVERITY_MAP: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  CRITICAL: { label: "Critical", icon: ShieldAlert,    classes: "bg-danger/15 text-danger border-danger/30" },
  HIGH:     { label: "High",     icon: AlertCircle,    classes: "bg-danger/10 text-danger border-danger/25" },
  MEDIUM:   { label: "Medium",   icon: AlertTriangle,  classes: "bg-warning/15 text-warning border-warning/30" },
  LOW:      { label: "Low",      icon: Info,           classes: "bg-info/10 text-info border-info/25" },
  INFO:     { label: "Info",     icon: Info,           classes: "bg-bg-4 text-bg-8 border-bg-5" },
};

export function SeverityPill({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_MAP[severity?.toUpperCase()] ?? SEVERITY_MAP.INFO;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", cfg.classes)}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}
