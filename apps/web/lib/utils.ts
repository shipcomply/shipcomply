import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return "—";
  return `${Math.round(score)}%`;
}

export function severityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case "HIGH": return "text-danger";
    case "MEDIUM": return "text-warning";
    case "LOW": return "text-info";
    default: return "text-bg-8";
  }
}
