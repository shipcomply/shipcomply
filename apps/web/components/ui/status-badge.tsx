import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

type ScanStatus = "queued" | "running" | "cloning" | "scanning" | "completed" | "completed_with_errors" | "failed" | string;

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "danger" | "warning"; Icon: React.ElementType }> = {
  queued:                { label: "Queued",     variant: "default",  Icon: Clock },
  running:               { label: "Running",    variant: "warning",  Icon: Loader2 },
  cloning:               { label: "Cloning",    variant: "warning",  Icon: Loader2 },
  scanning:              { label: "Scanning",   variant: "warning",  Icon: Loader2 },
  completed:             { label: "Completed",  variant: "success",  Icon: CheckCircle2 },
  completed_with_errors: { label: "Completed",  variant: "success",  Icon: CheckCircle2 },
  failed:                { label: "Failed",     variant: "danger",   Icon: XCircle },
};

export function StatusBadge({ status }: { status: ScanStatus }) {
  const cfg = STATUS_MAP[status] ?? { label: status, variant: "default" as const, Icon: Clock };
  const spin = status === "running" || status === "cloning" || status === "scanning";
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1.5">
      <cfg.Icon size={11} className={spin ? "animate-spin" : ""} />
      {cfg.label}
    </Badge>
  );
}
