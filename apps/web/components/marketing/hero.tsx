"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileCode2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// A believable scan result: PII fields with line numbers and the sections they trigger.
const FINDINGS = [
  { field: "email", line: "L42", refs: "DPDP §4 · §7", dot: "bg-danger" },
  { field: "phoneNumber", line: "L88", refs: "DPDP §4", dot: "bg-warning" },
  { field: "dateOfBirth", line: "L103", refs: "DPDP §4 · §6", dot: "bg-warning" },
  { field: "ipAddress", line: "L17", refs: "GDPR Art. 5", dot: "bg-bg-7" },
];

export function Hero() {
  const reduce = useReducedMotion();

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };
  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <section className="relative px-6 pt-32 pb-20 overflow-hidden">
      {/* Faint technical grid, masked to fade outward. Decorative only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_0%,#000_55%,transparent_100%)]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:46px_46px]" />
      </div>

      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-10 items-center">
        {/* Left: copy */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="flex flex-wrap items-center gap-2 mb-6">
            <Badge variant="mint">DPDP Act 2023</Badge>
            <Badge variant="default">GDPR</Badge>
            <Badge variant="default">CCPA</Badge>
          </motion.div>

          <motion.h1
            variants={item}
            className="font-display text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.02] tracking-tight text-bg-11"
          >
            Compliance in <span className="text-mint-9">5 minutes.</span>
            <br />
            Not 5 months.
          </motion.h1>

          <motion.p variants={item} className="mt-6 text-lg text-bg-8 max-w-xl leading-relaxed">
            ShipComply reads your source code, detects every PII flow with file and line citations, then
            writes your privacy policy, consent banner, deletion endpoints, and audit PDF. Automatically.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Get started free <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/signup?redirect_url=/dashboard">
              <Button variant="secondary" size="lg">Try a demo scan</Button>
            </Link>
          </motion.div>

          <motion.p variants={item} className="mt-6 text-xs text-bg-7 font-mono">
            npx shipcomply scan ./your-repo&nbsp;&nbsp;·&nbsp;&nbsp;no card, no source upload
          </motion.p>
        </motion.div>

        {/* Right: code-evidence panel */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
          className="relative"
        >
          <div className="rounded-xl border border-bg-4 bg-bg-1 shadow-glow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 h-10 border-b border-bg-4 bg-bg-2">
              <span className="flex items-center gap-2 text-xs font-mono text-bg-8">
                <FileCode2 size={13} className="text-mint-9" />
                app/api/users/route.ts
              </span>
              <span className="flex items-center gap-1.5" aria-hidden>
                <span className="w-2 h-2 rounded-full bg-danger/70" />
                <span className="w-2 h-2 rounded-full bg-warning/70" />
                <span className="w-2 h-2 rounded-full bg-mint-9/70" />
              </span>
            </div>

            <div className="relative p-4 font-mono text-[13px] overflow-hidden">
              {/* Scanning beam: GPU transform only, paused under reduced motion. */}
              {!reduce && (
                <motion.div
                  aria-hidden
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: [-20, 240], opacity: [0, 0.85, 0.85, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "linear", repeatDelay: 0.7 }}
                  className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-mint-9/0 via-mint-9/10 to-mint-9/0 pointer-events-none"
                />
              )}

              <p className="flex items-center gap-2 text-bg-7 text-[11px] uppercase tracking-wider mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-mint-9 animate-pulse" />
                4 PII flows detected
              </p>

              <motion.ul variants={container} initial="hidden" animate="show" className="space-y-1.5">
                {FINDINGS.map((f) => (
                  <motion.li
                    key={f.field}
                    variants={item}
                    className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg bg-bg-2/60 border border-bg-4"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.dot}`} />
                      <span className="text-bg-10 truncate">{f.field}</span>
                      <span className="text-bg-6">{f.line}</span>
                    </span>
                    <span className="text-bg-7 text-[11px] flex-shrink-0">{f.refs}</span>
                  </motion.li>
                ))}
              </motion.ul>

              <div className="mt-4 pt-4 border-t border-bg-4 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-bg-7">Compliance</span>
                  <span className="h-1.5 w-28 rounded-full bg-bg-3 overflow-hidden block">
                    <motion.span
                      initial={{ width: reduce ? "92%" : 0 }}
                      animate={{ width: "92%" }}
                      transition={{ duration: 1, ease: EASE, delay: 0.55 }}
                      className="h-full bg-mint-9 rounded-full block"
                    />
                  </span>
                </span>
                <span className="text-bg-11 font-semibold tabular-nums">
                  92<span className="text-bg-6 text-xs">/100</span>
                </span>
              </div>
            </div>
          </div>

          {/* Artifact chip: the working output, gently floating. */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.5, ease: EASE }}
            className="absolute -bottom-4 -left-3 hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-bg-4 bg-bg-2 shadow-glow-sm animate-float-slow"
          >
            <ShieldCheck size={14} className="text-mint-9" />
            <span className="text-xs text-bg-9 font-mono">PRIVACY.md · consent.tsx · audit.pdf</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
