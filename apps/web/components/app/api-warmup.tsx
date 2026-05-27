"use client";
import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";

export function ApiWarmup() {
  const [show, setShow] = useState(false);
  const [warmedUp, setWarmedUp] = useState(false);

  useEffect(() => {
    let dismissed = false;
    const timer = setTimeout(() => {
      if (!warmedUp && !dismissed) setShow(true);
    }, 5000);

    fetch(`${API_BASE}/healthz`)
      .then((r) => { if (r.ok) { setWarmedUp(true); setShow(false); } })
      .catch(() => { if (!dismissed) setShow(true); });

    return () => { dismissed = true; clearTimeout(timer); };
  }, [warmedUp]);

  if (!show) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-3 border-b border-bg-5 text-sm text-bg-9">
      <Loader2 size={14} className="animate-spin text-mint-9 flex-shrink-0" />
      <span>
        Waking up the scanner — first request after idle takes ~50s.
        <span className="text-bg-7 ml-1">Free tier spin-up.</span>
      </span>
      <button
        onClick={() => setShow(false)}
        className="ml-auto text-bg-6 hover:text-bg-9 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
