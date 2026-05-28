"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Zap } from "lucide-react";

export type ApiState = "loading" | "warming" | "ok" | "error";

interface ApiStateBannerProps {
  state: ApiState;
  errorMessage?: string;
  onRetry?: () => void;
  warmupSeconds?: number;
}

export function ApiStateBanner({
  state,
  errorMessage,
  onRetry,
  warmupSeconds = 50,
}: ApiStateBannerProps) {
  if (state === "loading" || state === "ok") return null;

  if (state === "warming") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/8 px-4 py-3 text-sm text-warning"
      >
        <Zap size={15} className="shrink-0 animate-pulse" />
        <span>
          Spinning up scanner — free tier cold start (~{warmupSeconds}s). Hang tight.
        </span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger"
    >
      <AlertCircle size={15} className="shrink-0" />
      <span className="flex-1">
        {errorMessage ?? "Couldn't reach the scanner. Check your connection or try again."}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 rounded px-2 py-0.5 text-xs font-medium border border-danger/40 hover:bg-danger/10 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function useApiState(warmingDelay = 8000) {
  const [state, setState] = useState<ApiState>("loading");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startLoading() {
    setState("loading");
    timer.current = setTimeout(() => {
      setState((prev) => (prev === "loading" ? "warming" : prev));
    }, warmingDelay);
  }

  function setOk() {
    if (timer.current) clearTimeout(timer.current);
    setState("ok");
  }

  function setError() {
    if (timer.current) clearTimeout(timer.current);
    setState("error");
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { state, startLoading, setOk, setError };
}
